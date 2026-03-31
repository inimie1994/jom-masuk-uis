"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const SUBJECT_LIST = [
    { category: "Teras", subjects: ["Bahasa Melayu", "Bahasa Inggeris", "Sejarah", "Matematik", "Sains", "Pendidikan Islam", "Pendidikan Moral"] },
    { category: "Sains & Matematik", subjects: ["Fizik", "Kimia", "Biologi", "Matematik Tambahan"] },
    { category: "Ekonomi & Perniagaan", subjects: ["Prinsip Perakaunan", "Ekonomi", "Perniagaan"] },
    { category: "Agama (KBD/KBT)", subjects: ["5302 Usul al-Din", "5304 Al-Lughah al-Arabiah al-Mu'asirah", "5305 Manahij al-'Ulum al-Islamiyah", "5401 Al-Adab wa al-Balaghah", "5226 Tasawwur Islam", "Pendidikan Syariah Islamiah", "Pendidikan Al-Quran & As-Sunnah"] },
    { category: "Bahasa", subjects: ["6351 Bahasa Cina", "6354 Bahasa Tamil", "6356 Bahasa Arab", "6357 Bahasa Jepun", "6358 Bahasa Semai", "6359 Bahasa Kadazandusun", "6360 Bahasa Iban", "6361 Bahasa Jerman", "6362 Bahasa Perancis", "6401 Bahasa Korea"] },
    { category: "Vokasional & Teknikal", subjects: ["Grafik Komunikasi Teknikal", "Asas Kelestarian", "Sains Rumah Tangga", "Sains Komputer"] }
];

const GRADES = ["A+", "A", "A-", "B+", "B", "C+", "C", "D", "E", "G"];

export const SPMResultsForm: React.FC = () => {
    const [selectedResults, setSelectedResults] = useState<{ subject: string, grade: string }[]>([]);
    const [currentSubject, setCurrentSubject] = useState("");
    const [currentGrade, setCurrentGrade] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        // Load existing results if any
        const savedPlayer = localStorage.getItem('campusQuestPlayer');
        if (savedPlayer) {
            const player = JSON.parse(savedPlayer);
            if (player.spm_result) {
                try {
                    const results = JSON.parse(player.spm_result);
                    if (Array.isArray(results)) {
                        setSelectedResults(results);
                        setSubmitted(true);
                    }
                } catch (e) {
                    console.error("Error parsing spm_result", e);
                }
            }
        }
    }, []);

    const handleAdd = () => {
        if (!currentSubject || !currentGrade) return;
        if (selectedResults.find(r => r.subject === currentSubject)) {
            setError("Subject already added");
            return;
        }
        setSelectedResults([...selectedResults, { subject: currentSubject, grade: currentGrade }]);
        setCurrentSubject("");
        setCurrentGrade("");
        setError("");
    };

    const handleRemove = (index: number) => {
        setSelectedResults(selectedResults.filter((_, i) => i !== index));
        setSubmitted(false);
    };

    const handleSubmit = async () => {
        if (selectedResults.length === 0) {
            setError("Please add at least one subject");
            return;
        }

        setIsSubmitting(true);
        setError("");

        try {
            const savedPlayer = localStorage.getItem('campusQuestPlayer');
            if (!savedPlayer) throw new Error("Player data not found");
            
            const player = JSON.parse(savedPlayer);
            const { icNo } = player;

            const spmJson = JSON.stringify(selectedResults);

            const { error: updateError } = await supabase
                .from('players')
                .update({ spm_result: spmJson })
                .eq('ic_no', icNo);

            if (updateError) throw updateError;

            // Update local storage
            player.spm_result = spmJson;
            localStorage.setItem('campusQuestPlayer', JSON.stringify(player));
            
            setSubmitted(true);
        } catch (err: any) {
            setError(err.message || "Failed to submit results");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="mt-8 p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-pink-500 rounded-full" />
                SPM Results Form
            </h3>
            <p className="text-sm text-neutral-400 mb-6 font-medium">Please enter your SPM subjects and grades below.</p>

            {/* Input Row */}
            {!submitted && (
                <div className="space-y-4 mb-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <select 
                            value={currentSubject}
                            onChange={e => setCurrentSubject(e.target.value)}
                            className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-pink-500 outline-none"
                        >
                            <option value="">Select Subject</option>
                            {SUBJECT_LIST.map(cat => (
                                <optgroup key={cat.category} label={cat.category} className="bg-[#1a1a1a]">
                                    {cat.subjects.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>

                        <div className="flex gap-2">
                            <select 
                                value={currentGrade}
                                onChange={e => setCurrentGrade(e.target.value)}
                                className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-pink-500 outline-none"
                            >
                                <option value="">Grade</option>
                                {GRADES.map(g => (
                                    <option key={g} value={g}>{g}</option>
                                ))}
                            </select>
                            <button 
                                onClick={handleAdd}
                                className="px-6 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all active:scale-95 border border-white/5"
                            >
                                Add
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {error && <p className="text-red-400 text-xs font-bold mb-4 bg-red-400/10 p-3 rounded-lg border border-red-400/20">{error}</p>}

            {/* Selected Results List */}
            {selectedResults.length > 0 && (
                <div className="space-y-2 mb-6">
                    {selectedResults.map((res, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 group">
                            <div className="flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center text-[10px] font-black text-pink-400 border border-pink-500/20">
                                    {res.grade}
                                </span>
                                <span className="text-sm font-medium text-neutral-200">{res.subject}</span>
                            </div>
                            {!submitted && (
                                <button 
                                    onClick={() => handleRemove(index)}
                                    className="text-neutral-500 hover:text-red-400 transition-colors p-1"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {!submitted ? (
                <button 
                    onClick={handleSubmit}
                    disabled={isSubmitting || selectedResults.length === 0}
                    className="w-full py-4 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white rounded-2xl font-bold transition-all shadow-lg shadow-pink-900/20"
                >
                    {isSubmitting ? "Submitting..." : "Submit Results"}
                </button>
            ) : (
                <div className="text-center p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-emerald-400 font-bold text-sm flex items-center justify-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Results Submitted Successfully
                    </p>
                    <button 
                        onClick={() => setSubmitted(false)}
                        className="text-[10px] text-neutral-500 hover:text-white uppercase tracking-widest font-bold mt-2 transition-colors"
                    >
                        Edit Results
                    </button>
                </div>
            )}
        </div>
    );
};
