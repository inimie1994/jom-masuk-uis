"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function EventGridManagerPage() {
    const [grids, setGrids] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState<any | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        x: 0,
        y: 0,
        grid_config: {
            type: 'standard',
            radius: 5,
            rewards: 'Prospectus'
        },
        is_active: true,
        tile_type: 0 // Will be calculated on submit
    });


    useEffect(() => {
        fetchGrids();
    }, []);

    const fetchGrids = async () => {
        setIsLoading(true);
        const { data, error } = await supabase.from('event_grids').select('*').order('created_at', { ascending: false });
        if (!error) setGrids(data || []);
        setIsLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (isEditing) {
                const { error } = await supabase
                    .from('event_grids')
                    .update({
                        name: formData.name,
                        x: formData.x,
                        y: formData.y,
                        grid_config: formData.grid_config,
                        is_active: formData.is_active
                    })
                    .eq('id', isEditing.id);
                if (error) throw error;
            } else {
                // Determine new unique tile_type
                const maxType = grids.length > 0 
                    ? Math.max(...grids.map(g => g.tile_type || 0)) 
                    : 1000;
                
                const { error } = await supabase
                    .from('event_grids')
                    .insert([{
                        ...formData,
                        tile_type: Math.max(1001, maxType + 1)
                    }]);
                if (error) throw error;
            }

            setFormData({
                name: '',
                x: 0,
                y: 0,
                grid_config: { type: 'standard', radius: 5, rewards: 'Prospectus' },
                is_active: true,
                tile_type: 0
            });

            setIsEditing(null);
            fetchGrids();
        } catch (error: any) {
            alert('Error: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Event Grid Manager</h2>
                <p className="text-neutral-400 mt-1">Configure interactive event zones across the campus.</p>
            </div>

            {/* FORM */}
            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none group-hover:bg-purple-600/10 transition-colors" />
                
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                   <span className="w-1.5 h-6 bg-purple-500 rounded-full" />
                   {isEditing ? 'Edit Event Grid' : 'Create New Event Grid'}
                </h3>
                
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Event Name</label>
                            <input 
                                required
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                placeholder="e.g. Open Day 2026"
                                className="w-full bg-black/50 border border-white/10 focus:border-purple-500 rounded-xl px-4 py-3 text-white transition-all outline-none"
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">X Coordinate</label>
                                <input 
                                    type="number"
                                    required
                                    value={formData.x}
                                    onChange={e => setFormData({...formData, x: parseInt(e.target.value)})}
                                    className="w-full bg-black/50 border border-white/10 focus:border-purple-500 rounded-xl px-4 py-3 text-white transition-all outline-none"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Y Coordinate</label>
                                <input 
                                    type="number"
                                    required
                                    value={formData.y}
                                    onChange={e => setFormData({...formData, y: parseInt(e.target.value)})}
                                    className="w-full bg-black/50 border border-white/10 focus:border-purple-500 rounded-xl px-4 py-3 text-white transition-all outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Reward Type</label>
                            <select 
                                value={formData.grid_config.rewards}
                                onChange={e => setFormData({...formData, grid_config: {...formData.grid_config, rewards: e.target.value}})}
                                className="w-full bg-black/50 border border-white/10 focus:border-purple-500 rounded-xl px-4 py-3 text-white transition-all outline-none"
                            >
                                <option value="Prospectus">Digital Prospectus</option>
                                <option value="Voucher">Starbucks Voucher</option>
                                <option value="Scholarship">Scholarship Guide</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-5 rounded-2xl bg-white/5 border border-white/5">
                            <div>
                                <label className="text-sm font-semibold text-neutral-300">Active Status</label>
                                <p className="text-[10px] text-neutral-500 font-medium">Toggle whether this grid is live on campus.</p>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setFormData({...formData, is_active: !formData.is_active})}
                                className={`w-12 h-6 rounded-full transition-all relative ${formData.is_active ? 'bg-purple-500' : 'bg-neutral-800'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.is_active ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>

                        <div className="flex gap-3">
                            <button 
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1 py-4 px-6 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-2xl font-bold shadow-lg shadow-purple-900/40 transition-all hover:scale-[1.02] active:scale-95"
                            >
                                {isSubmitting ? 'Saving...' : (isEditing ? 'Update Grid' : 'Create Grid')}
                            </button>
                            {isEditing && (
                                <button 
                                    type="button"
                                    onClick={() => setIsEditing(null)}
                                    className="px-6 py-4 bg-neutral-800 hover:bg-neutral-700 text-white rounded-2xl font-bold border border-white/5"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>

            {/* LIST */}
            <div className="rounded-3xl border border-white/10 bg-black/40 overflow-hidden backdrop-blur-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/5 bg-white/5">
                            <th className="px-6 py-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Name</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Configuration</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {grids.length === 0 ? (
                            <tr><td colSpan={4} className="px-6 py-12 text-center text-neutral-500">No event grids configured.</td></tr>
                        ) : (
                            grids.map(grid => (
                                <tr key={grid.id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-6 py-4 font-semibold text-sm">{grid.name}</td>
                                    <td className="px-6 py-4 text-xs text-neutral-400">
                                        Type: {grid.grid_config.type} | Reward: {grid.grid_config.rewards} | Pos: ({grid.x}, {grid.y})
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider ${grid.is_active ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                            {grid.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 flex gap-2">
                                        <button onClick={() => { 
                                            setIsEditing(grid); 
                                            setFormData({ 
                                                name: grid.name, 
                                                x: grid.x, 
                                                y: grid.y, 
                                                grid_config: {
                                                    type: grid.grid_config.type || 'standard',
                                                    radius: grid.grid_config.radius || 5,
                                                    rewards: grid.grid_config.rewards || 'Prospectus'
                                                }, 
                                                is_active: grid.is_active,
                                                tile_type: grid.tile_type || 0
                                            }); 
                                        }} className="text-blue-400 hover:text-white text-xs font-bold uppercase tracking-tighter transition-colors">Edit</button>
                                        <button onClick={async () => { if(confirm('Delete?')) await supabase.from('event_grids').delete().eq('id', grid.id); fetchGrids(); }} className="text-red-400 hover:text-white text-xs font-bold uppercase tracking-tighter transition-colors">Delete</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
