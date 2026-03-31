"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function NPCManagerPage() {
    const [npcs, setNpcs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState<any | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        faculty_name: '',
        content: '',
        tile_type: 0,
        cta_enabled: false,
        cta_text: 'Visit Now',
        cta_link: '',
        sprite_name: 'NPC1',
        scale: 1.0,
        dialog_sequence_id: ''
    });

    const [dialogs, setDialogs] = useState<any[]>([]);

    useEffect(() => {
        fetchNPCs();
    }, []);

    const fetchNPCs = async () => {
        setIsLoading(true);
        const { data, error } = await supabase.from('npc_data').select('*').order('created_at', { ascending: false });
        if (!error) setNpcs(data || []);
        
        // Fetch dialogs too
        const { data: dialogData } = await supabase.from('dialog_sequences').select('id, title');
        if (dialogData) setDialogs(dialogData);
        
        setIsLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (isEditing) {
                const { error } = await supabase
                    .from('npc_data')
                    .update({
                        faculty_name: formData.faculty_name,
                        content: formData.content,
                        cta_enabled: formData.cta_enabled,
                        cta_text: formData.cta_text,
                        cta_link: formData.cta_link,
                        sprite_name: formData.sprite_name,
                        scale: formData.scale,
                        dialog_sequence_id: formData.dialog_sequence_id || null
                    })
                    .eq('id', isEditing.id);
                if (error) throw error;
            } else {
                // Determine new unique tile_type
                const maxType = npcs.length > 0 
                    ? Math.max(...npcs.map(n => n.tile_type || 0)) 
                    : 100;
                
                const { error } = await supabase
                    .from('npc_data')
                    .insert([{
                        ...formData,
                        dialog_sequence_id: formData.dialog_sequence_id || null,
                        tile_type: Math.max(101, maxType + 1)
                    }]);
                if (error) throw error;
            }

            setFormData({
                faculty_name: '',
                content: '',
                tile_type: 0,
                cta_enabled: false,
                cta_text: 'Visit Now',
                cta_link: '',
                sprite_name: 'NPC1',
                scale: 1.0,
                dialog_sequence_id: ''
            });
            setIsEditing(null);
            fetchNPCs();
        } catch (error: any) {
            alert('Error: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (npc: any) => {
        setIsEditing(npc);
        setFormData({
            faculty_name: npc.faculty_name || '',
            content: npc.content || '',
            tile_type: npc.tile_type || 3,
            cta_enabled: npc.cta_enabled || false,
            cta_text: npc.cta_text || 'Visit Now',
            cta_link: npc.cta_link || '',
            sprite_name: npc.sprite_name || 'NPC1',
            scale: npc.scale || 1.0,
            dialog_sequence_id: npc.dialog_sequence_id || ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this NPC?')) return;
        const { error } = await supabase.from('npc_data').delete().eq('id', id);
        if (!error) fetchNPCs();
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">NPC Manager</h2>
                <p className="text-neutral-400 mt-1">Create and manage NPC dialogues and interactions.</p>
            </div>

            {/* FORM */}
            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none group-hover:bg-blue-600/10 transition-colors" />
                
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                   <span className="w-1.5 h-6 bg-blue-500 rounded-full" />
                   {isEditing ? 'Edit NPC' : 'Create New NPC'}
                </h3>
                
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Location / NPC Name</label>
                            <input 
                                required
                                value={formData.faculty_name}
                                onChange={e => setFormData({...formData, faculty_name: e.target.value})}
                                placeholder="e.g. Faculty of IT"
                                className="w-full bg-black/50 border border-white/10 focus:border-blue-500 rounded-xl px-4 py-3 text-white transition-all outline-none"
                            />
                        </div>
                        
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Dialogue Content</label>
                            <textarea 
                                required
                                rows={4}
                                value={formData.content}
                                onChange={e => setFormData({...formData, content: e.target.value})}
                                placeholder="Enter the dialogue message..."
                                className="w-full bg-black/50 border border-white/10 focus:border-blue-500 rounded-xl px-4 py-3 text-white transition-all outline-none resize-none"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Optional: RPG Dialog Sequence</label>
                            <select 
                                value={formData.dialog_sequence_id}
                                onChange={e => setFormData({...formData, dialog_sequence_id: e.target.value})}
                                className="w-full bg-black/50 border border-white/10 focus:border-blue-500 rounded-xl px-4 py-3 text-white transition-all outline-none"
                            >
                                <option value="">None (Use standard modal)</option>
                                {dialogs.map(d => (
                                    <option key={d.id} value={d.id}>{d.title}</option>
                                ))}
                            </select>
                            <p className="text-[10px] text-neutral-500 italic px-1">If selected, this will replace the standard dialogue content.</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-4">
                            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Character Appearance</h4>
                            
                            <div className="flex gap-4 items-start">
                                <div className="w-24 h-24 bg-black/50 border border-white/10 rounded-xl overflow-hidden flex items-center justify-center relative shrink-0">
                                    <img 
                                        src={`/characters/npc/${formData.sprite_name}.png`}
                                        alt="Preview"
                                        className="w-full h-full object-contain"
                                    />
                                    <div className="absolute inset-0 border border-blue-500/30 pointer-events-none" />
                                </div>
                                <div className="flex-1 space-y-3">
                                    <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Select Look</label>
                                    <div className="grid grid-cols-5 gap-2">
                                        {[1,2,3,4,5,6,7,8,9].map(num => (
                                            <button
                                                key={num}
                                                type="button"
                                                onClick={() => setFormData({...formData, sprite_name: `NPC${num}`})}
                                                className={`aspect-square rounded-lg border flex items-center justify-center overflow-hidden transition-all ${formData.sprite_name === `NPC${num}` ? 'border-blue-500 bg-blue-500/20' : 'border-white/10 bg-black/30 hover:border-white/30'}`}
                                            >
                                                <img 
                                                    src={`/characters/npc/NPC${num}.png`} 
                                                    alt={`NPC ${num}`} 
                                                    className="w-full h-full object-cover p-1"
                                                />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="text-[10px] text-neutral-500 font-medium leading-relaxed bg-black/20 p-2 rounded-lg border border-white/5">
                                Select one of the 9 available character looks for this NPC.
                            </div>
                        </div>

                        <div className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-4">
                            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Sprite Scale ({formData.scale}x)</h4>
                            <div className="space-y-4">
                                <input 
                                    type="range"
                                    min="0.5"
                                    max="3.0"
                                    step="0.1"
                                    value={formData.scale}
                                    onChange={e => setFormData({...formData, scale: parseFloat(e.target.value)})}
                                    className="w-full accent-blue-500 h-1.5 bg-neutral-800 rounded-full appearance-none cursor-pointer"
                                />
                                <div className="flex justify-between text-[10px] text-neutral-500 font-bold tracking-widest uppercase">
                                    <span>Small (0.5x)</span>
                                    <span>Standard (1.0x)</span>
                                    <span>Large (3.0x)</span>
                                </div>
                                <p className="text-[10px] text-neutral-400 italic leading-relaxed">
                                    Allows the NPC to exceed the standard 48px grid tile size. 1.0 is default.
                                </p>
                            </div>
                        </div>

                        <div className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-semibold text-neutral-300">Enable CTA Button</label>
                                <button 
                                    type="button"
                                    onClick={() => setFormData({...formData, cta_enabled: !formData.cta_enabled})}
                                    className={`w-12 h-6 rounded-full transition-all relative ${formData.cta_enabled ? 'bg-blue-500' : 'bg-neutral-800'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.cta_enabled ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>

                            {formData.cta_enabled && (
                                <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Button Text</label>
                                        <input 
                                            value={formData.cta_text}
                                            onChange={e => setFormData({...formData, cta_text: e.target.value})}
                                            className="w-full bg-black/40 border border-white/10 focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-white outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Target Link (URL)</label>
                                        <input 
                                            value={formData.cta_link}
                                            onChange={e => setFormData({...formData, cta_link: e.target.value})}
                                            placeholder="https://..."
                                            className="w-full bg-black/40 border border-white/10 focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-white outline-none"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button 
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1 py-4 px-6 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-2xl font-bold shadow-lg shadow-blue-900/40 transition-all hover:scale-[1.02] active:scale-95"
                            >
                                {isSubmitting ? 'Saving...' : (isEditing ? 'Update NPC' : 'Create NPC')}
                            </button>
                            {isEditing && (
                                <button 
                                    type="button"
                                    onClick={() => { setIsEditing(null); setFormData({ faculty_name: '', content: '', tile_type: 0, cta_enabled: false, cta_text: 'Visit Now', cta_link: '', sprite_name: 'NPC1', scale: 1.0, dialog_sequence_id: '' }); }}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isLoading ? (
                    <div className="col-span-2 py-20 text-center text-neutral-500 italic">Loading NPCs...</div>
                ) : npcs.length === 0 ? (
                    <div className="col-span-2 py-20 text-center text-neutral-500 italic">No NPCs found.</div>
                ) : (
                    npcs.map(npc => (
                        <div key={npc.id} className="p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-blue-500/30 transition-all flex flex-col justify-between group">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                <div className="flex gap-4 items-center mb-4">
                                    <div className="w-12 h-12 bg-black/30 rounded-xl border border-white/5 overflow-hidden shrink-0">
                                        <img 
                                            src={`/characters/npc/${npc.sprite_name || 'NPC1'}.png`}
                                            alt={npc.faculty_name}
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                    <h4 className="text-lg font-bold group-hover:text-blue-400 transition-colors">{npc.faculty_name}</h4>
                                </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => handleEdit(npc)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-all">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                        </button>
                                        <button onClick={() => handleDelete(npc.id)} className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 transition-all">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </div>
                                <p className="text-sm text-neutral-400 line-clamp-3 mb-6 leading-relaxed italic">"{npc.content}"</p>
                            </div>
                            
                            {npc.cta_enabled && (
                                <div className="mt-auto pt-4 border-t border-white/5">
                                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                                        <span className="text-blue-500">CTA Enabled</span>
                                        <span className="text-neutral-500">{npc.cta_text}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
