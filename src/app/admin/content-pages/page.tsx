"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function ContentPagesManager() {
    const [pages, setPages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState<any | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [courses, setCourses] = useState<any[]>([]);
    const [newCourse, setNewCourse] = useState({ title: '', code: '' });

    const [formData, setFormData] = useState({
        title: '',
        image_url: '',
        content: '',
        cta_text: 'Learn More',
        cta_link: '',
        has_spm_form: false
    });

    useEffect(() => {
        fetchPages();
    }, []);

    const fetchPages = async () => {
        setIsLoading(true);
        const { data, error } = await supabase.from('content_pages').select('*').order('created_at', { ascending: false });
        if (!error) setPages(data || []);
        setIsLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (isEditing) {
                const { error } = await supabase
                    .from('content_pages')
                    .update(formData)
                    .eq('id', isEditing.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('content_pages')
                    .insert([formData]);
                if (error) throw error;
            }

            setFormData({
                title: '',
                image_url: '',
                content: '',
                cta_text: 'Learn More',
                cta_link: '',
                has_spm_form: false
            });
            setCourses([]);

            setIsEditing(null);
            fetchPages();
        } catch (error: any) {
            alert('Error: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this page?')) return;
        
        const { error } = await supabase.from('content_pages').delete().eq('id', id);
        if (error) {
            alert('Error deleting page: ' + error.message);
        } else {
            fetchPages();
        }
    };

    const fetchCourses = async (pageId: string) => {
        const { data } = await supabase.from('courses').select('*').eq('content_page_id', pageId).order('created_at', { ascending: true });
        setCourses(data || []);
    };

    const handleAddCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isEditing || !newCourse.title) return;
        const { error } = await supabase.from('courses').insert([{ ...newCourse, content_page_id: isEditing.id }]);
        if (error) {
            alert('Error adding course: ' + error.message);
        } else {
            setNewCourse({ title: '', code: '' });
            fetchCourses(isEditing.id);
        }
    };

    const handleDeleteCourse = async (courseId: string) => {
        if (!confirm('Are you sure you want to delete this course?')) return;
        const { error } = await supabase.from('courses').delete().eq('id', courseId);
        if (error) alert('Error deleting course: ' + error.message);
        else fetchCourses(isEditing.id);
    };

    const startEdit = (page: any) => {
        setIsEditing(page);
        setFormData({
            title: page.title,
            image_url: page.image_url || '',
            content: page.content,
            cta_text: page.cta_text || 'Learn More',
            cta_link: page.cta_link || '',
            has_spm_form: page.has_spm_form || false
        });
        fetchCourses(page.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Content Page Creator</h2>
                <p className="text-neutral-400 mt-1">Design immersive web pages to link with event grids.</p>
            </div>

            {/* FORM */}
            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-pink-600/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none group-hover:bg-pink-600/10 transition-colors" />
                
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                   <span className="w-1.5 h-6 bg-pink-500 rounded-full" />
                   {isEditing ? 'Edit Content Page' : 'Create New Content Page'}
                </h3>
                
                <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Page Title</label>
                                <input 
                                    required
                                    value={formData.title}
                                    onChange={e => setFormData({...formData, title: e.target.value})}
                                    placeholder="e.g. Welcome to UIS"
                                    className="w-full bg-black/50 border border-white/10 focus:border-pink-500 rounded-xl px-4 py-3 text-white transition-all outline-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Header Image URL</label>
                                <input 
                                    value={formData.image_url}
                                    onChange={e => setFormData({...formData, image_url: e.target.value})}
                                    placeholder="https://example.com/image.jpg"
                                    className="w-full bg-black/50 border border-white/10 focus:border-pink-500 rounded-xl px-4 py-3 text-white transition-all outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">CTA Button Text</label>
                                    <input 
                                        value={formData.cta_text}
                                        onChange={e => setFormData({...formData, cta_text: e.target.value})}
                                        placeholder="Learn More"
                                        className="w-full bg-black/50 border border-white/10 focus:border-pink-500 rounded-xl px-4 py-3 text-white transition-all outline-none"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">CTA Link (External)</label>
                                    <input 
                                        value={formData.cta_link}
                                        onChange={e => setFormData({...formData, cta_link: e.target.value})}
                                        placeholder="https://uis.edu.my"
                                        className="w-full bg-black/50 border border-white/10 focus:border-pink-500 rounded-xl px-4 py-3 text-white transition-all outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-black/30 rounded-xl border border-white/5 group/toggle">
                                <input 
                                    type="checkbox"
                                    id="has_spm_form"
                                    checked={formData.has_spm_form}
                                    onChange={e => setFormData({...formData, has_spm_form: e.target.checked})}
                                    className="w-5 h-5 rounded border-white/10 bg-black/50 text-pink-600 focus:ring-pink-500 focus:ring-offset-0 transition-all cursor-pointer"
                                />
                                <label htmlFor="has_spm_form" className="text-sm font-medium text-neutral-300 cursor-pointer select-none">
                                    Include SPM Results Form
                                    <span className="block text-[10px] text-neutral-500 font-normal uppercase tracking-wider mt-0.5">Allows players to submit their exam results on this page</span>
                                </label>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Page Content (HTML supported)</label>
                            <textarea 
                                required
                                value={formData.content}
                                onChange={e => setFormData({...formData, content: e.target.value})}
                                placeholder="Write your page content here..."
                                rows={8}
                                className="w-full bg-black/50 border border-white/10 focus:border-pink-500 rounded-xl px-4 py-3 text-white transition-all outline-none h-[calc(100%-1.75rem)]"
                            />
                        </div>
                    </div>

                    {isEditing && (
                        <div className="mt-8 pt-8 border-t border-white/10">
                            <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <span className="w-1.5 h-4 bg-blue-500 rounded-full" />
                                Manage Courses for this Page
                            </h4>
                            
                            <div className="bg-black/30 rounded-2xl border border-white/5 p-4 mb-6">
                                <div className="flex gap-4 items-end">
                                    <div className="flex-1 space-y-1.5">
                                        <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Course Title</label>
                                        <input 
                                            value={newCourse.title}
                                            onChange={e => setNewCourse({...newCourse, title: e.target.value})}
                                            placeholder="e.g. Bachelor of IT"
                                            className="w-full bg-black/50 border border-white/10 focus:border-blue-500 rounded-xl px-4 py-2 text-white transition-all outline-none"
                                        />
                                    </div>
                                    <div className="w-48 space-y-1.5">
                                        <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Course Code</label>
                                        <input 
                                            value={newCourse.code}
                                            onChange={e => setNewCourse({...newCourse, code: e.target.value})}
                                            placeholder="e.g. BIT"
                                            className="w-full bg-black/50 border border-white/10 focus:border-blue-500 rounded-xl px-4 py-2 text-white transition-all outline-none"
                                        />
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={(e) => handleAddCourse(e as any)}
                                        className="py-2 px-6 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-900/40 transition-all hover:scale-[1.02] active:scale-95 h-[42px]"
                                    >
                                        Add Course
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                {courses.length === 0 ? (
                                    <div className="text-center py-6 text-neutral-500 text-sm border border-dashed border-white/10 rounded-xl">No courses added yet.</div>
                                ) : (
                                    courses.map(course => (
                                        <div key={course.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 group relative hover:bg-white/10 transition-colors">
                                            <div>
                                                <div className="font-bold text-sm text-neutral-200">{course.title}</div>
                                                {course.code && <div className="text-[10px] text-neutral-500 font-mono mt-0.5">{course.code}</div>}
                                            </div>
                                            <button 
                                                type="button"
                                                onClick={() => handleDeleteCourse(course.id)}
                                                className="text-red-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors px-3 py-1 bg-red-500/10 hover:bg-red-500/20 rounded-lg"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <button 
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 py-4 px-6 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white rounded-2xl font-bold shadow-lg shadow-pink-900/40 transition-all hover:scale-[1.02] active:scale-95"
                        >
                            {isSubmitting ? 'Saving...' : (isEditing ? 'Update Page' : 'Create Page')}
                        </button>
                        {isEditing && (
                            <button 
                                type="button"
                                onClick={() => {
                                    setIsEditing(null);
                                    setCourses([]);
                                    setFormData({ title: '', image_url: '', content: '', cta_text: 'Learn More', cta_link: '', has_spm_form: false });
                                }}
                                className="px-6 py-4 bg-neutral-800 hover:bg-neutral-700 text-white rounded-2xl font-bold border border-white/5"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* LIST */}
            <div className="rounded-3xl border border-white/10 bg-black/40 overflow-hidden backdrop-blur-sm">
                <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-neutral-400">All Content Pages</h4>
                    <span className="text-[10px] font-mono text-neutral-500">{pages.length} Pages Created</span>
                </div>
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/5">
                            <th className="px-6 py-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Title</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Preview</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">CTA</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Courses</th>
                            <th className="px-6 py-1 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">SPM Form</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {isLoading ? (
                            <tr><td colSpan={4} className="px-6 py-12 text-center text-neutral-500">Loading pages...</td></tr>
                        ) : pages.length === 0 ? (
                            <tr><td colSpan={4} className="px-6 py-12 text-center text-neutral-500">No content pages found. Create your first one above!</td></tr>
                        ) : (
                            pages.map(page => (
                                <tr key={page.id} className="hover:bg-white/[0.02] transition-colors group/row">
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-sm">{page.title}</div>
                                        <div className="text-[10px] text-neutral-500 font-mono mt-0.5 truncate max-w-[200px]">{page.id}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {page.image_url ? (
                                            <img src={page.image_url} alt="" className="w-12 h-8 rounded object-cover border border-white/10 bg-neutral-800" />
                                        ) : (
                                            <div className="w-12 h-8 rounded bg-neutral-800 flex items-center justify-center text-[8px] text-neutral-600">NO IMG</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs font-medium text-neutral-300">{page.cta_text}</div>
                                        <div className="text-[10px] text-neutral-500 truncate max-w-[150px]">{page.cta_link || 'No Link'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <CourseCount pageId={page.id} />
                                    </td>
                                    <td className="px-6 py-4">
                                        {page.has_spm_form ? (
                                            <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-400 text-[9px] font-bold uppercase tracking-tighter border border-pink-500/20">Enabled</span>
                                        ) : (
                                            <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-500 text-[9px] font-bold uppercase tracking-tighter border border-white/5">Disabled</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-3">
                                            <button 
                                                onClick={() => startEdit(page)}
                                                className="text-pink-400 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors"
                                            >
                                                Edit
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(page.id)}
                                                className="text-red-400 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors"
                                            >
                                                Delete
                                            </button>
                                        </div>
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

function CourseCount({ pageId }: { pageId: string }) {
    const [count, setCount] = React.useState<number | null>(null);

    React.useEffect(() => {
        const getCount = async () => {
            const { count } = await supabase
                .from('courses')
                .select('*', { count: 'exact', head: true })
                .eq('content_page_id', pageId);
            setCount(count || 0);
        };
        getCount();
    }, [pageId]);

    return (
        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[9px] font-bold border border-blue-500/20">
            {count === null ? '...' : `${count} Courses`}
        </span>
    );
}
