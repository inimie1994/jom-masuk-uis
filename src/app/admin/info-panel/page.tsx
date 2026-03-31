'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function InfoPanelEditor() {
    const [config, setConfig] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('info_panel_config')
            .select('*')
            .single();
        
        if (data) {
            setConfig(data);
        }
        setLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        const { error } = await supabase
            .from('info_panel_config')
            .update({
                header_label: config.header_label,
                exploration_label: config.exploration_label,
                quests_label: config.quests_label,
                log_label: config.log_label,
                exploration_max: parseInt(config.exploration_max),
                quests_total: parseInt(config.quests_total),
                exploration_source: config.exploration_source,
                quests_source: config.quests_source,
                is_active: config.is_active
            })
            .eq('id', config.id);

        if (error) {
            setMessage({ type: 'error', text: 'Failed to save configuration.' });
        } else {
            setMessage({ type: 'success', text: 'Configuration saved successfully!' });
        }
        setSaving(false);
    };

    if (loading) return <div className="flex justify-center p-20 text-blue-500 animate-pulse font-bold tracking-widest">LOADING CONFIG...</div>;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black tracking-tight">Info Panel Editor</h2>
                    <p className="text-neutral-400 mt-1 uppercase text-xs font-bold tracking-widest">Configure HUD and Pause Menu Labels</p>
                </div>
            </div>

            {message && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in zoom-in-95 ${message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                    <span className="text-sm font-bold uppercase tracking-wider">{message.text}</span>
                </div>
            )}

            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Visual Customization Card */}
                <div className="p-8 rounded-[40px] bg-white/5 border border-white/10 flex flex-col gap-6 shadow-2xl">
                    <h3 className="text-xs font-black text-blue-400 uppercase tracking-[0.3em] flex items-center gap-3">
                        <span className="w-1.5 h-4 bg-blue-500 rounded-full" />
                        Label Configuration
                    </h3>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1">Header Label</label>
                            <input 
                                type="text" 
                                value={config.header_label} 
                                onChange={(e) => setConfig({ ...config, header_label: e.target.value })}
                                className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-white focus:border-blue-500 transition-all outline-none font-bold"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1">Exploration Progress Label</label>
                            <input 
                                type="text" 
                                value={config.exploration_label} 
                                onChange={(e) => setConfig({ ...config, exploration_label: e.target.value })}
                                className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-white focus:border-emerald-500 transition-all outline-none font-bold"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1">Quests Label</label>
                            <input 
                                type="text" 
                                value={config.quests_label} 
                                onChange={(e) => setConfig({ ...config, quests_label: e.target.value })}
                                className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-white focus:border-purple-500 transition-all outline-none font-bold"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1">Activity Log Label</label>
                            <input 
                                type="text" 
                                value={config.log_label} 
                                onChange={(e) => setConfig({ ...config, log_label: e.target.value })}
                                className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-white focus:border-orange-500 transition-all outline-none font-bold"
                            />
                        </div>
                    </div>
                </div>

                {/* Progress & Values Card */}
                <div className="flex flex-col gap-8">
                    <div className="p-8 rounded-[40px] bg-white/5 border border-white/10 flex flex-col gap-6 shadow-2xl">
                        <h3 className="text-xs font-black text-emerald-400 uppercase tracking-[0.3em] flex items-center gap-3">
                            <span className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                            Game Progression Settings
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1">Exploration Max (%)</label>
                                <input 
                                    type="number" 
                                    disabled={config.exploration_source !== 'manual'}
                                    value={config.exploration_max} 
                                    onChange={(e) => setConfig({ ...config, exploration_max: e.target.value })}
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-white focus:border-emerald-500 transition-all outline-none font-black disabled:opacity-30"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1">Total Quests Count</label>
                                <input 
                                    type="number" 
                                    disabled={config.quests_source !== 'manual'}
                                    value={config.quests_total} 
                                    onChange={(e) => setConfig({ ...config, quests_total: e.target.value })}
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-white focus:border-purple-500 transition-all outline-none font-black disabled:opacity-30"
                                />
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-white/5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    Exploration Source
                                    <span className="px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-[8px]">AUTO-CALC</span>
                                </label>
                                <select 
                                    value={config.exploration_source}
                                    onChange={(e) => setConfig({ ...config, exploration_source: e.target.value })}
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-white focus:border-blue-500 transition-all outline-none font-bold appearance-none"
                                >
                                    <option value="manual">Manual (Use Max Value above)</option>
                                    <option value="npc">Based on Unique NPCs Talked To</option>
                                    <option value="event">Based on Unique Events Triggered</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    Quests Source
                                    <span className="px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-400 text-[8px]">AUTO-CALC</span>
                                </label>
                                <select 
                                    value={config.quests_source}
                                    onChange={(e) => setConfig({ ...config, quests_source: e.target.value })}
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-white focus:border-purple-500 transition-all outline-none font-bold appearance-none"
                                >
                                    <option value="manual">Manual (Use Total Count above)</option>
                                    <option value="npc">Based on Unique NPCs Talked To</option>
                                    <option value="event">Based on Unique Events Triggered</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                            <div>
                                <h4 className="text-sm font-bold">Menu Active</h4>
                                <p className="text-[10px] text-neutral-500 uppercase font-black tracking-widest">Enable or disable the pause menu interface</p>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setConfig({ ...config, is_active: !config.is_active })}
                                className={`w-12 h-6 rounded-full transition-all relative ${config.is_active ? 'bg-emerald-500' : 'bg-neutral-800'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${config.is_active ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>
                    </div>

                    <button 
                        type="submit"
                        disabled={saving}
                        className="w-full py-6 rounded-[30px] bg-blue-600 hover:bg-blue-500 text-white font-black text-sm uppercase tracking-[0.3em] shadow-[0_20px_40px_rgba(37,99,235,0.3)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                    >
                        {saving ? 'SAVING CHANGES...' : 'UPDATE CONFIGURATION'}
                    </button>
                </div>
            </form>
        </div>
    );
}
