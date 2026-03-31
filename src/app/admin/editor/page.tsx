"use client";

import GameWorld from '@/components/GameWorld';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function MapEditorPage() {
    const [maps, setMaps] = useState<any[]>([]);
    const [selectedMapId, setSelectedMapId] = useState<number>(1);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMaps();
    }, []);

    const fetchMaps = async () => {
        try {
            const res = await fetch('/api/maps');
            const data = await res.json();
            if (data.maps) {
                setMaps(data.maps);
                if (data.maps.length > 0 && !data.maps.find((m: any) => m.map_id === selectedMapId)) {
                    setSelectedMapId(data.maps[0].map_id);
                }
            }
        } catch (error) {
            console.error('Error fetching maps:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateMap = async () => {
        const name = prompt('Enter map name (e.g. Room 1):');
        if (!name) return;

        setLoading(true);
        try {
            // Create a default 10x10 empty grid
            const defaultGrid = Array(10).fill(0).map(() => Array(10).fill(0));

            const { data, error } = await supabase
                .from('campus_maps')
                .insert([
                    { 
                        name, 
                        grid_data: defaultGrid, 
                        npcs_data: [], 
                        event_grids_data: [] 
                    }
                ])
                .select()
                .single();

            if (error) throw error;
            
            if (data) {
                setMaps(prev => [...prev, data]);
                setSelectedMapId(data.map_id);
            }
        } catch (error: any) {
            console.error('Error creating map:', error);
            alert('Failed to create map: ' + (error.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    const handleDuplicateMap = async () => {
        if (!selectedMapId) return;
        const sourceMap = maps.find(m => m.map_id === selectedMapId);
        if (!sourceMap) return;

        setLoading(true);
        try {
            // Fetch full data for duplication (including grid, npcs, etc)
            const { data: fullData, error: fetchError } = await supabase
                .from('campus_maps')
                .select('*')
                .eq('map_id', selectedMapId)
                .single();

            if (fetchError) throw fetchError;

            const { data, error } = await supabase
                .from('campus_maps')
                .insert([
                    { 
                        name: `${fullData.name} (Copy)`, 
                        grid_data: fullData.grid_data, 
                        npcs_data: fullData.npcs_data, 
                        event_grids_data: fullData.event_grids_data,
                        background_image: fullData.background_image
                    }
                ])
                .select()
                .single();

            if (error) throw error;
            
            if (data) {
                setMaps(prev => [...prev, data]);
                setSelectedMapId(data.map_id);
                alert('Map duplicated successfully!');
            }
        } catch (error: any) {
            console.error('Error duplicating map:', error);
            alert('Failed to duplicate map: ' + (error.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteMap = async () => {
        if (!selectedMapId) return;
        const mapToDelete = maps.find(m => m.map_id === selectedMapId);
        if (!mapToDelete) return;

        if (!confirm(`Are you sure you want to delete "${mapToDelete.name}"? This action cannot be undone.`)) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('campus_maps')
                .delete()
                .eq('map_id', selectedMapId);

            if (error) throw error;

            const remainingMaps = maps.filter(m => m.map_id !== selectedMapId);
            setMaps(remainingMaps);
            
            if (remainingMaps.length > 0) {
                setSelectedMapId(remainingMaps[0].map_id);
            } else {
                setSelectedMapId(0);
            }
            alert('Map deleted successfully.');
        } catch (error: any) {
            console.error('Error deleting map:', error);
            alert('Failed to delete map: ' + (error.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    const handleRenameMap = async () => {
        if (!selectedMapId) return;
        const currentMap = maps.find(m => m.map_id === selectedMapId);
        if (!currentMap) return;

        const newName = prompt('Enter new map name:', currentMap.name);
        if (!newName || newName === currentMap.name) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('campus_maps')
                .update({ name: newName })
                .eq('map_id', selectedMapId);

            if (error) throw error;

            setMaps(prev => prev.map(m => m.map_id === selectedMapId ? { ...m, name: newName } : m));
            alert('Map renamed successfully.');
        } catch (error: any) {
            console.error('Error renaming map:', error);
            alert('Failed to rename map: ' + (error.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    const handleMapUpdate = (newName: string) => {
        setMaps(prev => prev.map(m => m.map_id === selectedMapId ? { ...m, name: newName } : m));
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Map Editor</h2>
                    <p className="text-neutral-400 mt-1">Design and modify the campus layout in real-time.</p>
                </div>
                <div className="flex gap-4">
                    <Link 
                        href="/admin/editor/fullscreen"
                        className="group relative px-6 py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold transition-all flex items-center gap-3 overflow-hidden"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                        <span>Fullscreen</span>
                    </Link>
                    <button 
                        onClick={handleCreateMap}
                        className="group relative px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-[0_10px_30px_rgba(37,99,235,0.3)] active:scale-95 flex items-center gap-3 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] pointer-events-none" />
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Add New Map</span>
                    </button>
                </div>
            </div>

            <div className="p-4 bg-black/40 border border-white/5 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center gap-6">
                <div className="flex-1">
                    <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1.5 ml-1">Active Exploration Map</label>
                    <select 
                        value={selectedMapId}
                        onChange={(e) => setSelectedMapId(Number(e.target.value))}
                        className="w-full bg-neutral-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-blue-500/50 transition-all outline-none appearance-none cursor-pointer"
                    >
                        {maps.length === 0 && <option value="0">No Maps Found - Please Create One</option>}
                        {maps.map(map => (
                            <option key={map.map_id} value={map.map_id}>
                                {map.name} (ID: {map.map_id})
                            </option>
                        ))}
                    </select>
                </div>
                
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleDuplicateMap}
                        disabled={loading || !selectedMapId}
                        className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-all border border-white/10 flex items-center justify-center gap-2 disabled:opacity-50"
                        title="Duplicate current map"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                        Duplicate
                    </button>

                    <button 
                        onClick={handleRenameMap}
                        disabled={loading || !selectedMapId}
                        className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-all border border-white/10 flex items-center justify-center gap-2 disabled:opacity-50"
                        title="Rename current map"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        Rename
                    </button>
                    
                    <button 
                        onClick={handleDeleteMap}
                        disabled={loading || !selectedMapId}
                        className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold transition-all border border-red-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                        title="Delete current map"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Delete
                    </button>
                </div>

                <div className="hidden md:block h-10 w-px bg-white/10" />
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Map Status</span>
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {loading ? 'Processing...' : 'System Ready'}
                    </div>
                </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/50 backdrop-blur-xl shadow-2xl relative overflow-hidden h-[600px] w-full">
                {!loading && (
                    <GameWorld 
                        key={selectedMapId}
                        mapId={selectedMapId}
                        gender="male" 
                        isEditor={true} 
                        onMapUpdate={handleMapUpdate}
                    />
                )}
            </div>
            
            <div className="p-6 rounded-3xl bg-blue-500/5 border border-blue-500/10 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                    <h4 className="font-bold text-blue-400">Editor Instructions</h4>
                    <p className="text-sm text-neutral-400 mt-1 leading-relaxed">
                        Use the <strong>Admin Space</strong> panel on the top right of the map to select brushes and save changes. 
                        <strong> Wall (1)</strong> tiles block player movement, while <strong>Trigger (3)</strong> tiles are used for interactions.
                    </p>
                </div>
            </div>
        </div>
    );
}
