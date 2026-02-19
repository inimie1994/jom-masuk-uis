import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { BookOpen } from 'lucide-react';
import EmptyState from '../common/EmptyState';

const HodHopSubjects = () => {
    const { user } = useAuth();
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (user?.role === 'hod' || user?.role === 'hop') {
            fetchSubjects();
        }
    }, [user]);

    const fetchSubjects = async () => {
        try {
            setLoading(true);

            // Base query
            let query = supabase
                .from('subjects')
                .select('*, departments(code, name)')
                .eq('faculty_id', user.faculty_id)
                .order('code', { ascending: true });

            if (user.role === 'hod' && user.department_id) {
                query = query.eq('department_id', user.department_id);
            }
            // For HOP, it's tricker. Subjects don't always have program_code directly. 
            // They belong to a department. 
            // Often subjects are shared. 
            // Strategy: Show subjects that belong to the HOP's department? 
            // Or subjects that have CLASSES for the HOP's program?
            // "according to department/program respectively"
            // Let's filter by department for now if department_id is available for HOP (it might not be perfectly mapped).
            // Actually, usually HOP belongs to a department too.
            // If HOP is purely program based, we might need to filter subjects by usage in timetable or strict mapping.
            // Requirement said "Students & Subjects (according to department/program respectively)"
            // For HOP, let's fetch subjects where timetable entries exist for their program groups?
            // OR simply show all subjects in their department if they have one.
            // Let's assume HOP also has department_id set in `lecturers` table.

            else if (user.role === 'hop' && user.department_id) {
                query = query.eq('department_id', user.department_id);
            } else {
                // Fallback or specific HOP logic if no department_id
                // Maybe fetch all and filter by program usage? 
                // Let's stick to department filter if available, otherwise all.
            }

            const { data, error } = await query;
            if (error) throw error;
            setSubjects(data || []);

        } catch (err) {
            console.error('Error fetching subjects:', err);
            setError('Failed to load subjects.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : subjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {subjects.map((subject) => (
                        <div
                            key={subject.id}
                            className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-indigo-100 dark:border-indigo-900/30">
                                    {subject.code}
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                                {subject.name}
                            </h3>

                            <div className="flex items-center gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest mt-6 pt-4 border-t border-gray-50 dark:border-slate-800">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-slate-700"></div>
                                    {subject.credits} Credits
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary/40"></div>
                                    {subject.departments?.code || 'N/A'}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <EmptyState
                    icon={BookOpen}
                    message="No subjects found for your department."
                />
            )}
        </div>
    );
};

export default HodHopSubjects;
