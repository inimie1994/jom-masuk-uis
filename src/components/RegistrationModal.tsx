"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';


export interface PlayerData {
    fullName: string;
    icNo: string;
    gender: 'male' | 'female';
    spmResult: string;
}

interface RegistrationModalProps {
    onSubmit: (data: PlayerData) => void;
    onClose: () => void;
}

export default function RegistrationModal({ onSubmit, onClose }: RegistrationModalProps) {
    const [formData, setFormData] = useState<PlayerData>({
        fullName: '',
        icNo: '',
        gender: 'male',
        spmResult: '',
    });

    const [errors, setErrors] = useState<Partial<Record<keyof PlayerData, string>>>({});

    const [isSubmitting, setIsSubmitting] = useState(false);

    const validate = () => {
        const newErrors: Partial<Record<keyof PlayerData, string>> = {};
        if (!formData.fullName.trim()) newErrors.fullName = "Full Name is required.";
        if (!formData.icNo.trim()) newErrors.icNo = "IC Number is required.";
        if (!formData.spmResult.trim()) newErrors.spmResult = "SPM Result is required.";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            setIsSubmitting(true);
            try {
                // Save to Supabase
                const { error } = await supabase
                    .from('players')
                    .insert([{
                        full_name: formData.fullName,
                        ic_no: formData.icNo,
                        gender: formData.gender,
                        spm_result: formData.spmResult
                    }]);

                if (error) throw error;
                
                onSubmit(formData);
            } catch (error: any) {
                console.error('Registration error:', error);
                alert('Registration failed: ' + error.message);
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-neutral-900 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">

                {/* Decorative background glow */}
                <div className="absolute -top-20 -left-20 w-40 h-40 bg-blue-600/30 rounded-full blur-[60px] pointer-events-none" />
                <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-purple-600/30 rounded-full blur-[60px] pointer-events-none" />

                <div className="relative z-10">
                    <button 
                        onClick={onClose}
                        className="absolute -top-2 -right-2 p-2 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-all z-20 group"
                        aria-label="Close"
                    >
                        <svg className="w-5 h-5 group-active:scale-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <h2 className="text-2xl font-black text-white mb-2 text-center tracking-tight">ENROLLMENT DESK</h2>
                    <p className="text-neutral-400 text-sm text-center mb-6">Please provide your details to enter CampusQuest.</p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider ml-1">Full Name</label>
                            <input
                                type="text"
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                className="w-full bg-black/50 border border-white/10 focus:border-blue-500 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                placeholder="Enter your full name"
                            />
                            {errors.fullName && <p className="text-red-400 text-xs mt-1 ml-1">{errors.fullName}</p>}
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider ml-1">IC No.</label>
                            <input
                                type="text"
                                value={formData.icNo}
                                onChange={(e) => setFormData({ ...formData, icNo: e.target.value })}
                                className="w-full bg-black/50 border border-white/10 focus:border-blue-500 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                placeholder="E.g., 010203-04-0506"
                            />
                            {errors.icNo && <p className="text-red-400 text-xs mt-1 ml-1">{errors.icNo}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider ml-1">Select Character (Gender)</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, gender: 'male' })}
                                    className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 transition-all ${formData.gender === 'male' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-black/50 border-white/10 text-neutral-400 hover:bg-neutral-800'}`}
                                >
                                    Male Sprite
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, gender: 'female' })}
                                    className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 transition-all ${formData.gender === 'female' ? 'bg-purple-600/20 border-purple-500 text-purple-400' : 'bg-black/50 border-white/10 text-neutral-400 hover:bg-neutral-800'}`}
                                >
                                    Female Sprite
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider ml-1">SPM Result</label>
                            <input
                                type="text"
                                value={formData.spmResult}
                                onChange={(e) => setFormData({ ...formData, spmResult: e.target.value })}
                                className="w-full bg-black/50 border border-white/10 focus:border-blue-500 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                placeholder="E.g., 5A 2B 1C"
                            />
                            <p className="text-[10px] text-neutral-500 ml-1">Needed for your custom campus experience.</p>
                            {errors.spmResult && <p className="text-red-400 text-xs mt-1 ml-1">{errors.spmResult}</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] active:scale-[0.98] mt-4 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    REGISTERING...
                                </>
                            ) : "ENTER CAMPUS"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
