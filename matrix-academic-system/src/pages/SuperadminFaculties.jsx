import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../auth/AuthContext';
import PageHeader from '../components/common/PageHeader';
import Modal from '../components/common/Modal';
import { Building2, Plus, Edit2, Trash2, ArrowRight } from 'lucide-react';

const SuperadminFaculties = () => {
    const { user, enterFaculty } = useAuth();
    const navigate = useNavigate();
    const [faculties, setFaculties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingFaculty, setEditingFaculty] = useState(null);
    const [formData, setFormData] = useState({ name: '', theme_color: '', logo_url: '', semester_name: '' });
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    useEffect(() => {
        if (!user || user.role !== 'superadmin') {
            navigate('/dashboard');
            return;
        }
        fetchFaculties();
    }, [user, navigate]);

    const fetchFaculties = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('faculties')
                .select('*')
                .order('name');
            if (error) throw error;
            setFaculties(data || []);
        } catch (err) {
            console.error('Error fetching faculties:', err);
            setError('Failed to load faculties.');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveFaculty = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        try {
            if (editingFaculty) {
                const { error } = await supabase
                    .from('faculties')
                    .update(formData)
                    .eq('id', editingFaculty.id);
                if (error) throw error;
                setSuccess('Faculty updated successfully.');
            } else {
                const { error } = await supabase
                    .from('faculties')
                    .insert([formData]);
                if (error) throw error;
                setSuccess('Faculty created successfully.');
            }
            setIsModalOpen(false);
            setEditingFaculty(null);
            setFormData({ name: '', theme_color: '', logo_url: '', semester_name: '' });
            fetchFaculties();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error('Error saving faculty:', err);
            setError('Failed to save faculty.');
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete ${name}? This action cannot be undone and may cascade to related records.`)) return;

        try {
            const { error } = await supabase
                .from('faculties')
                .delete()
                .eq('id', id);
            if (error) throw error;
            setSuccess('Faculty deleted successfully.');
            fetchFaculties();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error('Error deleting faculty:', err);
            setError('Failed to delete faculty. Ensure there are no linked records before deleting.');
        }
    };

    const handleEnterFaculty = (faculty) => {
        enterFaculty(faculty);
        navigate('/dashboard');
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                <PageHeader
                    title="Platform Management"
                />
                <button
                    onClick={() => {
                        setEditingFaculty(null);
                        setFormData({ name: '', theme_color: '#4f46e5', logo_url: '', semester_name: 'Semester 1 2023/2024' });
                        setIsModalOpen(true);
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-xl shadow-pastel text-sm font-bold text-white bg-primary hover:opacity-90"
                >
                    <Plus size={18} className="mr-2" />
                    Add Faculty
                </button>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">{error}</div>
            )}
            {success && (
                <div className="bg-green-50 text-green-600 p-4 rounded-md mb-6">{success}</div>
            )}

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            ) : faculties.length === 0 ? (
                <div className="text-center bg-white dark:bg-slate-900 rounded-3xl p-12 shadow-sm border border-gray-100 dark:border-slate-800">
                    <Building2 size={48} className="mx-auto text-gray-300 dark:text-slate-700 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">No faculties present</h3>
                    <p className="mt-1 text-gray-500 dark:text-slate-400">Get started by creating a new faculty.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {faculties.map((faculty) => (
                        <div key={faculty.id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 flex flex-col hover:shadow-md transition-shadow relative overflow-hidden group">

                            <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                                <button
                                    onClick={() => {
                                        setEditingFaculty(faculty);
                                        setFormData(faculty);
                                        setIsModalOpen(true);
                                    }}
                                    className="p-1.5 bg-white/90 backdrop-blur-sm rounded-lg text-gray-400 hover:text-indigo-600 border border-gray-200 shadow-sm"
                                >
                                    <Edit2 size={14} />
                                </button>
                                <button
                                    onClick={() => handleDelete(faculty.id, faculty.name)}
                                    className="p-1.5 bg-white/90 backdrop-blur-sm rounded-lg text-gray-400 hover:text-red-600 border border-gray-200 shadow-sm"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>

                            <div className="flex items-center mb-4">
                                {faculty.logo_url ? (
                                    <img src={faculty.logo_url} alt={faculty.name} className="h-12 w-12 object-contain rounded border border-gray-100 p-1" />
                                ) : (
                                    <div className="h-12 w-12 rounded-xl flex items-center justify-center font-bold text-white text-lg" style={{ backgroundColor: faculty.theme_color || '#4f46e5' }}>
                                        {faculty.name.substring(0, 1)}
                                    </div>
                                )}
                            </div>

                            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1 line-clamp-2" title={faculty.name}>
                                {faculty.name}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-slate-400 mb-6 flex-grow">
                                {faculty.semester_name || 'No Semester Defined'}
                            </p>

                            <button
                                onClick={() => handleEnterFaculty(faculty)}
                                className="w-full flex items-center justify-center px-4 py-2 border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-700 font-medium rounded-xl transition-colors dark:text-indigo-300 dark:border-indigo-900/50 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40"
                            >
                                Manage Faculty
                                <ArrowRight size={16} className="ml-2" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingFaculty ? "Edit Faculty" : "Add New Faculty"}
            >
                <form onSubmit={handleSaveFaculty} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 py-2 px-3 border dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Active Semester Name</label>
                        <input
                            type="text"
                            value={formData.semester_name}
                            onChange={(e) => setFormData({ ...formData, semester_name: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 py-2 px-3 border dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Logo URL (Optional)</label>
                        <input
                            type="text"
                            value={formData.logo_url}
                            onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 py-2 px-3 border dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Theme Color Hex (Optional)</label>
                        <input
                            type="color"
                            value={formData.theme_color || '#4f46e5'}
                            onChange={(e) => setFormData({ ...formData, theme_color: e.target.value })}
                            className="mt-1 block w-16 h-10 rounded-md border-gray-300"
                        />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                            {editingFaculty ? "Update" : "Create"}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default SuperadminFaculties;
