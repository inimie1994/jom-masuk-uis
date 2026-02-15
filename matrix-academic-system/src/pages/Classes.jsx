import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabaseClient';
import PageHeader from '../components/common/PageHeader';
import EmptyState from '../components/common/EmptyState';
import Modal from '../components/common/Modal';
import { Plus, Trash2, Calendar } from 'lucide-react';

const Classes = () => {
    const { user } = useAuth();
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ subject_id: '', section: '', semester: '' });
    const [error, setError] = useState(null);

    useEffect(() => {
        if (user?.faculty_id) {
            fetchClasses();
            fetchSubjects();
        }
    }, [user?.faculty_id]);

    const fetchClasses = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('classes')
                .select(`
                    *,
                    subjects (
                        code,
                        name
                    )
                `)
                .eq('faculty_id', user.faculty_id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setClasses(data || []);
        } catch (err) {
            console.error('Error fetching classes:', err);
            setError('Failed to load classes.');
        } finally {
            setLoading(false);
        }
    };

    const fetchSubjects = async () => {
        try {
            const { data, error } = await supabase
                .from('subjects')
                .select('id, code, name')
                .eq('faculty_id', user.faculty_id)
                .order('code', { ascending: true });

            if (error) throw error;
            setSubjects(data || []);
        } catch (err) {
            console.error('Error fetching subjects:', err);
        }
    };

    const handleCreateClass = async (e) => {
        e.preventDefault();
        if (!user?.faculty_id) return;

        try {
            const { error } = await supabase
                .from('classes')
                .insert([
                    {
                        ...formData,
                        faculty_id: user.faculty_id
                    }
                ]);

            if (error) throw error;

            setIsModalOpen(false);
            setFormData({ subject_id: '', section: '', semester: '' });
            fetchClasses();
        } catch (err) {
            console.error('Error creating class:', err);
            setError('Failed to create class.');
        }
    };

    const handleDeleteClass = async (id) => {
        if (!window.confirm('Are you sure you want to delete this class? This action cannot be undone.')) return;

        try {
            const { error } = await supabase
                .from('classes')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchClasses();
        } catch (err) {
            console.error('Error deleting class:', err);
            setError('Failed to delete class.');
        }
    };

    return (
        <div>
            <PageHeader
                title="Classes"
                actionLabel="Add Class"
                onAction={() => setIsModalOpen(true)}
            />

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-md mb-4 text-sm">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : classes.length > 0 ? (
                <div className="bg-white dark:bg-slate-900 shadow-sm rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-800">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-50 dark:divide-slate-800">
                            <thead className="bg-slate-50 dark:bg-slate-950">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Subject</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Section</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Semester</th>
                                    <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-50 dark:divide-slate-800">
                                {classes.map((cls) => (
                                    <tr key={cls.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            {cls.subjects?.code} - {cls.subjects?.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">{cls.section}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">{cls.semester}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => handleDeleteClass(cls.id)}
                                                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                                                title="Delete Class"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <EmptyState
                    icon={Calendar}
                    message="No classes found. Add your first class to get started."
                    actionLabel="Add Class"
                    onAction={() => setIsModalOpen(true)}
                />
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Add New Class"
            >
                <form onSubmit={handleCreateClass} className="space-y-4">
                    <div>
                        <label htmlFor="subject" className="block text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Subject
                        </label>
                        <select
                            id="subject"
                            required
                            className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                            value={formData.subject_id}
                            onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                        >
                            <option value="">Select a Subject</option>
                            {subjects.map((subject) => (
                                <option key={subject.id} value={subject.id}>
                                    {subject.code} - {subject.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="section" className="block text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Section
                        </label>
                        <input
                            type="text"
                            id="section"
                            required
                            className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                            placeholder="e.g. 01"
                            value={formData.section}
                            onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                        />
                    </div>
                    <div>
                        <label htmlFor="semester" className="block text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Semester
                        </label>
                        <input
                            type="text"
                            id="semester"
                            required
                            className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                            placeholder="e.g. 2023/2024-1"
                            value={formData.semester}
                            onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                        />
                    </div>
                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-50 dark:border-slate-800 mt-6">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-bold uppercase tracking-wider text-white bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all"
                        >
                            Create Class
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Classes;
