import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

type FacultyModalProps = {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description: string;
    isQuest?: boolean;
    cta?: { enabled: boolean; text: string; link: string };
};


export default function FacultyModal({ isOpen, onClose, title, description, isQuest = false, cta }: FacultyModalProps) {
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ name: '', whatsapp: '' });
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setShowForm(false);
            setSubmitted(false);
            setIsSubmitting(false);
        }
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const { error } = await supabase
                .from('leads')
                .insert([formData]);

            if (!error) {
                setSubmitted(true);
            } else {
                throw error;
            }
        } catch (error: any) {
            console.error('Submission error:', error);
            alert('Error submitting form: ' + (error.message || 'Unknown error'));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity duration-300">
            <div className="bg-neutral-900 rounded-3xl shadow-2xl max-w-lg w-full border border-white/10 overflow-hidden ring-1 ring-white/5 animate-in fade-in zoom-in duration-300">
                <div className="p-8">
                    {!showForm ? (
                        <>
                            <h3 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 mb-4 tracking-tight">{title}</h3>
                            <p className="text-neutral-300 leading-relaxed text-lg mb-8">{description}</p>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-4 px-6 bg-neutral-800 hover:bg-neutral-700 text-white rounded-2xl font-semibold transition-all hover:scale-[1.02] active:scale-95 border border-white/5"
                                >
                                    Return to Campus
                                </button>
                                <button
                                    onClick={() => setShowForm(true)}
                                    className="flex-1 py-4 px-6 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-semibold shadow-lg shadow-blue-900/40 transition-all hover:scale-[1.02] active:scale-95"
                                >
                                    {isQuest ? "Accept Quest" : "Get Prospectus"}
                                </button>
                                {cta?.enabled && cta.link && (
                                    <a
                                        href={cta.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 py-4 px-6 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-semibold shadow-lg shadow-orange-900/40 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        {cta.text || 'Learn More'}
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                    </a>
                                )}
                            </div>

                        </>
                    ) : submitted ? (
                        <div className="text-center py-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">✓</div>
                            <h3 className="text-2xl font-bold text-white mb-2">Quest Complete!</h3>
                            <p className="text-neutral-400 mb-8 whitespace-pre-line">
                                Your digital prospectus has been unlocked.
                                We will contact you via WhatsApp with more details.
                            </p>
                            <button
                                onClick={onClose}
                                className="w-full py-4 px-6 bg-neutral-800 text-white rounded-2xl font-semibold border border-white/5 hover:bg-neutral-700 transition-colors"
                            >
                                Continue Exploring
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="mb-2">
                                <h3 className="text-2xl font-bold text-white mb-1 tracking-tight">Lead Capture Quest</h3>
                                <p className="text-neutral-400">Step 1: Provide your details to unlock the curriculum.</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-400 mb-1.5 ml-1">Full Name</label>
                                    <input
                                        required
                                        disabled={isSubmitting}
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Enter your name"
                                        className="w-full bg-neutral-800 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all disabled:opacity-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-400 mb-1.5 ml-1">WhatsApp Number</label>
                                    <input
                                        required
                                        disabled={isSubmitting}
                                        type="tel"
                                        value={formData.whatsapp}
                                        onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                                        placeholder="+60123456789"
                                        className="w-full bg-neutral-800 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all disabled:opacity-50"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={() => setShowForm(false)}
                                    className="flex-1 py-4 px-6 bg-neutral-800 text-white rounded-2xl font-semibold border border-white/5 hover:bg-neutral-700 transition-all disabled:opacity-50"
                                >
                                    Back
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 py-4 px-6 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-semibold shadow-lg shadow-blue-900/40 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Submitting...
                                        </>
                                    ) : "Submit & Unlock"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
