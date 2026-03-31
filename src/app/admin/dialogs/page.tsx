'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface DialogNode {
    type: 'message' | 'event';
    character_name?: string;
    character_image?: string;
    text?: string;
    trigger_event?: string;
}

interface DialogSequence {
    id: string;
    title: string;
    sequence_data: DialogNode[];
    created_at: string;
}

export default function DialogsPage() {
    const [dialogs, setDialogs] = useState<DialogSequence[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editingDialog, setEditingDialog] = useState<Partial<DialogSequence>>({
        title: '',
        sequence_data: [{ type: 'message', character_name: '', character_image: '', text: '', trigger_event: '' }]
    });
    const [npcImages, setNpcImages] = useState<{label: string, value: string}[]>([]);

    const characterImages = [
        { label: 'Hero', value: 'male/character-down.png' },
        { label: 'Heroine', value: 'female/character-down.png' },
        { label: 'NPC 1', value: 'npc/NPC1.png' },
        { label: 'NPC 2', value: 'npc/NPC2.png' },
        { label: 'NPC 3', value: 'npc/NPC3.png' },
        { label: 'Guide', value: 'npc/GUIDE.png' },
    ];

    useEffect(() => {
        fetchDialogs();
        fetchNpcImages();
    }, []);

    const fetchNpcImages = async () => {
        try {
            const res = await fetch('/api/npc-images');
            const data = await res.json();
            if (data.images) {
                setNpcImages(data.images);
            }
        } catch (error) {
            console.error('Failed to fetch NPC images:', error);
        }
    };

    const fetchDialogs = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('dialog_sequences')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setDialogs(data);
        }
        setLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const dialogPayload = {
            title: editingDialog.title,
            sequence_data: editingDialog.sequence_data
        };

        let error;
        if (editingDialog.id) {
            const { error: updateError } = await supabase
                .from('dialog_sequences')
                .update(dialogPayload)
                .eq('id', editingDialog.id);
            error = updateError;
        } else {
            const { error: insertError } = await supabase
                .from('dialog_sequences')
                .insert([dialogPayload]);
            error = insertError;
        }

        if (error) {
            alert('Error saving dialog sequence: ' + error.message);
        } else {
            setIsEditing(false);
            setEditingDialog({ title: '', sequence_data: [{ type: 'message', character_name: '', character_image: '', text: '', trigger_event: '' }] });
            fetchDialogs();
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this dialog sequence?')) return;
        
        setLoading(true);
        const { error } = await supabase
            .from('dialog_sequences')
            .delete()
            .eq('id', id);

        if (error) {
            alert('Error deleting: ' + error.message);
        } else {
            fetchDialogs();
        }
        setLoading(false);
    };

    const addNode = () => {
        setEditingDialog(prev => ({
            ...prev,
            sequence_data: [...(prev.sequence_data || []), { type: 'message', character_name: '', character_image: '', text: '', trigger_event: '' }]
        }));
    };

    const addEventNode = () => {
        setEditingDialog(prev => ({
            ...prev,
            sequence_data: [...(prev.sequence_data || []), { type: 'event', trigger_event: '' }]
        }));
    };

    const removeNode = (index: number) => {
        setEditingDialog(prev => ({
            ...prev,
            sequence_data: (prev.sequence_data || []).filter((_, i) => i !== index)
        }));
    };

    const updateNode = (index: number, field: keyof DialogNode, value: string) => {
        setEditingDialog(prev => {
            const newData = [...(prev.sequence_data || [])];
            newData[index] = { ...newData[index], [field]: value };
            return { ...prev, sequence_data: newData };
        });
    };

    const moveNode = (index: number, direction: 'up' | 'down') => {
        setEditingDialog(prev => {
            const newData = [...(prev.sequence_data || [])];
            const targetIndex = direction === 'up' ? index - 1 : index + 1;
            if (targetIndex < 0 || targetIndex >= newData.length) return prev;
            
            [newData[index], newData[targetIndex]] = [newData[targetIndex], newData[index]];
            return { ...prev, sequence_data: newData };
        });
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="flex justify-between items-center bg-black/40 p-6 rounded-3xl border border-white/10 backdrop-blur-md relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-3xl rounded-full -mr-16 -mt-16" />
                <div>
                    <h1 className="text-3xl font-black tracking-tighter text-white sm:text-4xl">Dialog Sequences</h1>
                    <p className="text-neutral-400 text-sm mt-1 uppercase tracking-widest font-bold">RPG-style conversation management</p>
                </div>
                {!isEditing && (
                    <button 
                        onClick={() => {
                            setIsEditing(true);
                            setEditingDialog({ title: '', sequence_data: [{ type: 'message', character_name: '', character_image: '', text: '', trigger_event: '' }] });
                        }}
                        className="bg-cyan-500 hover:bg-cyan-400 text-black px-6 py-3 rounded-2xl font-black transition-all active:scale-95 shadow-[0_0_20px_rgba(6,182,212,0.3)] flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        NEW DIALOG
                    </button>
                )}
            </header>

            {isEditing ? (
                <div className="bg-neutral-900/50 rounded-3xl border border-white/10 p-8">
                    <form onSubmit={handleSave} className="space-y-8">
                        <div>
                            <label className="block text-xs font-black text-neutral-500 uppercase tracking-widest mb-2">Sequence Title</label>
                            <input 
                                type="text"
                                value={editingDialog.title}
                                onChange={e => setEditingDialog({...editingDialog, title: e.target.value})}
                                placeholder="e.g., Quest Giver Introduction"
                                className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-neutral-600 focus:outline-none focus:border-cyan-500/50 transition-all font-bold"
                                required
                            />
                        </div>

                        <div className="space-y-4">
                            <label className="block text-xs font-black text-neutral-500 uppercase tracking-widest">Sequence Order</label>
                            {editingDialog.sequence_data?.map((node, index) => (
                                <div key={index} className="bg-black/60 border border-white/5 rounded-2xl p-6 relative group border-l-4 border-l-cyan-500/50">
                                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center text-[10px] font-black text-black">
                                        {index + 1}
                                    </div>
                                    
                                    {node.type === 'message' ? (
                                        <>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                                <div>
                                                    <label className="block text-[10px] font-black text-neutral-600 uppercase mb-2">Character Name</label>
                                                    <input 
                                                        type="text"
                                                        value={node.character_name}
                                                        onChange={e => updateNode(index, 'character_name', e.target.value)}
                                                        placeholder="Enter name..."
                                                        className="w-full bg-neutral-900 border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 transition-all"
                                                        required
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="block text-[10px] font-black text-neutral-600 uppercase mb-1">Character Appearance</label>
                                                    <div className="flex gap-4 items-start bg-neutral-900/50 p-4 rounded-xl border border-white/5">
                                                        <div className="w-16 h-16 bg-black/50 border border-white/10 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                                                            {node.character_image ? (
                                                                <img 
                                                                    src={`/characters/${node.character_image}`}
                                                                    alt="Preview"
                                                                    className="w-full h-full object-contain"
                                                                />
                                                            ) : (
                                                                <div className="text-[10px] text-neutral-700 font-bold text-center italic">None</div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="grid grid-cols-5 sm:grid-cols-8 gap-2 overflow-y-auto max-h-[100px] p-1 custom-scrollbar">
                                                                {[
                                                                    ...characterImages,
                                                                    ...npcImages.map(img => ({ label: img.label, value: `npc/${img.value}` }))
                                                                ].map((img, i) => (
                                                                    <button
                                                                        key={i}
                                                                        type="button"
                                                                        onClick={() => updateNode(index, 'character_image', img.value)}
                                                                        className={`aspect-square rounded-lg border flex items-center justify-center overflow-hidden transition-all ${node.character_image === img.value ? 'border-cyan-500 bg-cyan-500/20' : 'border-white/10 bg-black/30 hover:border-white/30'}`}
                                                                        title={img.label}
                                                                    >
                                                                        <img 
                                                                            src={`/characters/${img.value}`} 
                                                                            alt={img.label} 
                                                                            className="w-full h-full object-contain p-0.5"
                                                                        />
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                <div className="md:col-span-1">
                                                    <label className="block text-[10px] font-black text-neutral-600 uppercase mb-1">Trigger Event (Optional)</label>
                                                    <div className="flex gap-2">
                                                        <input 
                                                            type="text"
                                                            value={node.trigger_event || ''}
                                                            onChange={e => updateNode(index, 'trigger_event', e.target.value)}
                                                            placeholder="e.g., OPEN_QUEST_MODAL"
                                                            className="flex-1 bg-neutral-900 border border-white/5 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-cyan-500/50 transition-all text-cyan-400 font-mono"
                                                        />
                                                    </div>
                                                    <p className="text-[9px] text-neutral-600 mt-1 uppercase font-bold tracking-tighter">Adds an action button after this dialog</p>
                                                </div>
                                            </div>
                                            
                                            <div>
                                                <label className="block text-[10px] font-black text-neutral-600 uppercase mb-1">Dialog Text</label>
                                                <textarea 
                                                    value={node.text}
                                                    onChange={e => updateNode(index, 'text', e.target.value)}
                                                    rows={2}
                                                    placeholder="What does the character say?"
                                                    className="w-full bg-neutral-900 border border-white/5 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-cyan-500/50 transition-all resize-none"
                                                    required
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-4">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="p-2 bg-cyan-500 rounded-lg text-black">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
                                                </div>
                                                <h4 className="text-cyan-400 font-black uppercase tracking-widest text-xs">Event Trigger</h4>
                                            </div>
                                            <label className="block text-[10px] font-black text-neutral-600 uppercase mb-1">Event Name</label>
                                            <input 
                                                type="text"
                                                value={node.trigger_event || ''}
                                                onChange={e => updateNode(index, 'trigger_event', e.target.value)}
                                                placeholder="e.g., START_QUEST"
                                                className="w-full bg-neutral-900 border border-cyan-500/20 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-cyan-500/50 transition-all text-cyan-400 font-mono"
                                                required
                                            />
                                        </div>
                                    )}

                                    <div className="flex justify-end gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button type="button" onClick={() => moveNode(index, 'up')} disabled={index === 0} className="p-2 hover:bg-white/10 rounded-lg text-neutral-400 disabled:opacity-30">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                                        </button>
                                        <button type="button" onClick={() => moveNode(index, 'down')} disabled={index === (editingDialog.sequence_data?.length || 0) - 1} className="p-2 hover:bg-white/10 rounded-lg text-neutral-400 disabled:opacity-30">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                        </button>
                                        <button type="button" onClick={() => removeNode(index)} className="p-2 hover:bg-red-500/20 rounded-lg text-red-500">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button 
                                    type="button" 
                                    onClick={addNode}
                                    className="w-full py-4 border border-dashed border-white/10 rounded-2xl text-neutral-500 hover:text-cyan-500 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                    ADD MESSAGE
                                </button>
                                <button 
                                    type="button" 
                                    onClick={addEventNode}
                                    className="w-full py-4 border border-dashed border-cyan-500/20 rounded-2xl text-neutral-500 hover:text-cyan-400 hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
                                    ADD EVENT
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
                            <button 
                                type="button" 
                                onClick={() => setIsEditing(false)}
                                className="px-6 py-3 rounded-2xl font-bold text-neutral-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                disabled={loading}
                                className="bg-cyan-500 hover:bg-cyan-400 text-black px-8 py-3 rounded-2xl font-black transition-all active:scale-95 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                            >
                                {loading ? 'Saving...' : 'SAVE SEQUENCE'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {dialogs.map(dialog => (
                        <div key={dialog.id} className="bg-neutral-900/50 border border-white/10 rounded-3xl p-6 flex flex-col gap-4 group hover:border-cyan-500/30 transition-all duration-300">
                            <div>
                                <h3 className="text-xl font-bold text-white group-hover:text-cyan-400 transition-colors">{dialog.title}</h3>
                                <p className="text-neutral-500 text-xs font-bold uppercase tracking-wider mt-1">{dialog.sequence_data.length} Messages</p>
                            </div>
                            
                            <div className="flex -space-x-3 overflow-hidden mt-2">
                                {Array.from(new Set(dialog.sequence_data.map(n => n.character_image))).slice(0, 5).map((img, i) => (
                                    <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-black bg-neutral-800 p-1 overflow-hidden">
                                        <img src={`/characters/${img}`} alt="" className="h-full w-full object-contain" />
                                    </div>
                                ))}
                                {new Set(dialog.sequence_data.map(n => n.character_image)).size > 5 && (
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-800 ring-2 ring-black text-[10px] font-bold text-neutral-400">
                                        +{new Set(dialog.sequence_data.map(n => n.character_image)).size - 5}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between items-center mt-auto pt-4 border-t border-white/5">
                                <button 
                                    onClick={() => {
                                        setEditingDialog(dialog);
                                        setIsEditing(true);
                                    }}
                                    className="text-neutral-400 hover:text-white text-sm font-bold transition-colors flex items-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                                    Edit
                                </button>
                                <button 
                                    onClick={() => handleDelete(dialog.id)}
                                    className="text-red-500/50 hover:text-red-500 text-sm font-bold transition-colors flex items-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}

                    {dialogs.length === 0 && !loading && (
                        <div className="col-span-full py-16 flex flex-col items-center justify-center text-neutral-500 gap-4 bg-black/20 rounded-3xl border border-dashed border-white/10">
                            <svg className="w-12 h-12 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                            <p className="font-bold uppercase tracking-widest text-xs">No dialog sequences found</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
