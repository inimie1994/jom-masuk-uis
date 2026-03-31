"use client";
import React, { useState, useEffect } from 'react';
import { SPMResultsForm } from './SPMResultsForm';
import { supabase } from '@/lib/supabase';

interface ContentPage {
    id: string;
    title: string;
    image_url?: string;
    content: string;
    cta_text?: string;
    cta_link?: string;
    has_spm_form?: boolean;
}

interface ContentPageModalProps {
    page: ContentPage;
    onClose: () => void;
}

export const ContentPageModal: React.FC<ContentPageModalProps> = ({ page, onClose }) => {
    const [courses, setCourses] = useState<any[]>([]);

    useEffect(() => {
        const fetchCourses = async () => {
            const { data } = await supabase.from('courses').select('*').eq('content_page_id', page.id).order('created_at', { ascending: true });
            if (data) setCourses(data);
        };
        fetchCourses();
    }, [page.id]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-8 animate-in fade-in duration-300">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/80 backdrop-blur-md" 
                onClick={onClose}
            />
            
            {/* Modal Content */}
            <div className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-500">
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>

                {/* Header Image */}
                {page.image_url && (
                    <div className="relative w-full h-48 sm:h-64 shrink-0">
                        <img 
                            src={page.image_url} 
                            alt={page.title}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
                    </div>
                )}

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
                    <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-4 leading-tight">
                        {page.title}
                    </h2>
                    
                    <div 
                        className="prose prose-invert max-w-none text-neutral-300 space-y-4 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: page.content }}
                    />

                    {page.has_spm_form && (
                        <SPMResultsForm />
                    )}

                    {courses.length > 0 && (
                        <div className="mt-10 pt-8 border-t border-white/10 space-y-4">
                            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                <span className="w-1.5 h-5 bg-blue-500 rounded-full" />
                                Available Courses
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {courses.map(course => (
                                    <div key={course.id} className="p-4 rounded-2xl bg-black/40 border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all cursor-pointer group flex items-center justify-between">
                                        <div>
                                            <div className="font-bold text-sm text-neutral-200 group-hover:text-white transition-colors">{course.title}</div>
                                            {course.code && <div className="text-[10px] text-blue-400 font-mono mt-1 font-bold tracking-widest uppercase">{course.code}</div>}
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer / CTA */}
                {(page.cta_text || page.cta_link) && (
                    <div className="p-6 sm:p-8 pt-0 shrink-0">
                        <a 
                            href={page.cta_link || '#'}
                            target={page.cta_link ? "_blank" : "_self"}
                            rel="noopener noreferrer"
                            className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-blue-900/20"
                        >
                            {page.cta_text || 'Learn More'}
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
                        </a>
                    </div>
                )}
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
            `}</style>
        </div>
    );
};
