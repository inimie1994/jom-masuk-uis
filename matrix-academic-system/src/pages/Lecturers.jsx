import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabaseClient';
import PageHeader from '../components/common/PageHeader';
import Modal from '../components/common/Modal';
import { Plus, Trash2, Clock, BookOpen, ChevronRight, Briefcase, Eye, Key, Mail, Lock, User } from 'lucide-react';

const Lecturers = () => {
    const { user } = useAuth();
    const [lecturers, setLecturers] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLecturer, setSelectedLecturer] = useState(null);
    const [workloads, setWorkloads] = useState([]);
    const [loadingWorkload, setLoadingWorkload] = useState(false);

    // Modal States
    const [isAddLecturerModalOpen, setIsAddLecturerModalOpen] = useState(false);
    const [isWorkloadModalOpen, setIsWorkloadModalOpen] = useState(false);
    const [isViewCredentialsModalOpen, setIsViewCredentialsModalOpen] = useState(false);

    // Form States
    const [lecturerForm, setLecturerForm] = useState({
        name: '',
        username: '',
        password: '',
    });

    const [workloadForm, setWorkloadForm] = useState({
        subject_id: '',
        type: 'Lecture',
        hours: 1
    });

    const [error, setError] = useState(null);
    const [credentialsView, setCredentialsView] = useState(null);

    useEffect(() => {
        if (user?.faculty_id) {
            fetchLecturers();
            fetchSubjects();
        }
    }, [user?.faculty_id]);

    useEffect(() => {
        if (selectedLecturer) {
            fetchWorkload(selectedLecturer.id);
        } else {
            setWorkloads([]);
        }
    }, [selectedLecturer]);

    const fetchLecturers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('lecturers')
                .select('*')
                .eq('faculty_id', user.faculty_id)
                .order('name', { ascending: true });

            if (error) throw error;
            setLecturers(data || []);
        } catch (err) {
            console.error('Error fetching lecturers:', err);
            setError('Failed to load lecturers.');
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

    const fetchWorkload = async (lecturerId) => {
        try {
            setLoadingWorkload(true);
            const { data, error } = await supabase
                .from('workload')
                .select(`
                    id,
                    type,
                    hours,
                    created_at,
                    subjects (id, code, name)
                `)
                .eq('lecturer_id', lecturerId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setWorkloads(data || []);
        } catch (err) {
            console.error('Error fetching workload:', err);
            setError('Failed to load workload.');
        } finally {
            setLoadingWorkload(false);
        }
    };

    const handleAddLecturer = async (e) => {
        e.preventDefault();
        setError(null);
        if (!lecturerForm.name.trim() || !lecturerForm.username.trim() || !lecturerForm.password.trim()) {
            setError('All fields are required.');
            return;
        }

        try {
            setLoading(true);

            // Invoke the Edge Function to handle Auth creation and Database inserts securely
            // This bypasses email verification and rate limits
            const { data, error: functionError } = await supabase.functions.invoke('create-lecturer', {
                body: {
                    name: lecturerForm.name,
                    username: lecturerForm.username,
                    password: lecturerForm.password,
                    faculty_id: user.faculty_id
                }
            });

            if (functionError) throw functionError;
            if (data?.error) throw new Error(data.error);

            setIsAddLecturerModalOpen(false);
            setLecturerForm({ name: '', username: '', password: '' });
            fetchLecturers();

            // Log success to console for verification
            console.log('Lecturer added successfully:', data);
        } catch (err) {
            console.error('Error adding lecturer:', err);
            setError(err.message || 'Failed to add lecturer. Please check if the username already exists.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddWorkload = async (e) => {
        e.preventDefault();
        if (!selectedLecturer || !workloadForm.subject_id) return;

        try {
            const { error } = await supabase
                .from('workload')
                .insert([{
                    lecturer_id: selectedLecturer.id,
                    subject_id: workloadForm.subject_id,
                    type: workloadForm.type,
                    hours: parseInt(workloadForm.hours)
                }]);

            if (error) throw error;

            setIsWorkloadModalOpen(false);
            setWorkloadForm({ subject_id: '', type: 'Lecture', hours: 1 });
            fetchWorkload(selectedLecturer.id);
        } catch (err) {
            console.error('Error adding workload:', err);
            setError('Failed to assign workload.');
        }
    };

    const handleDeleteWorkload = async (workloadId) => {
        if (!window.confirm('Remove this workload assignment?')) return;
        try {
            const { error } = await supabase
                .from('workload')
                .delete()
                .eq('id', workloadId);

            if (error) throw error;
            fetchWorkload(selectedLecturer.id);
        } catch (err) {
            console.error('Error removing workload:', err);
            setError('Failed to remove workload.');
        }
    };

    const [success, setSuccess] = useState(null);

    const handleDeleteLecturer = async (lecturerId) => {
        if (!window.confirm('Delete this lecturer? (This will NOT delete the Auth User account currently)')) return;
        try {
            setLoading(true);
            const { error: deleteError } = await supabase
                .from('lecturers')
                .delete()
                .eq('id', lecturerId);

            if (deleteError) throw deleteError;

            setSuccess('Lecturer deleted successfully.');
            setTimeout(() => setSuccess(null), 3000);

            if (selectedLecturer?.id === lecturerId) setSelectedLecturer(null);
            fetchLecturers();
        } catch (err) {
            console.error('Error deleting lecturer:', err);
            setError(err.message || 'Failed to delete lecturer.');
        } finally {
            setLoading(false);
        }
    };

    const handleViewCredentials = (lecturer) => {
        setCredentialsView(lecturer);
        setIsViewCredentialsModalOpen(true);
    };

    return (
        <div>
            <PageHeader
                title="Lecturers & Workload"
                actionLabel="Add Lecturer"
                onAction={() => setIsAddLecturerModalOpen(true)}
            />

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-md mb-4 text-sm flex justify-between items-center animate-in">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="text-sm underline">Dismiss</button>
                </div>
            )}

            {success && (
                <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-4 rounded-md mb-4 text-sm flex justify-between items-center animate-in">
                    <span>{success}</span>
                    <button onClick={() => setSuccess(null)} className="text-sm underline">Dismiss</button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[calc(100vh-12rem)]">
                {/* Left Column: Lecturers List */}
                <div className="md:col-span-5 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-gray-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                        <h3 className="font-bold text-xs uppercase tracking-wider text-gray-400 dark:text-slate-500">Lecturers</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                        {loading ? (
                            <div className="flex justify-center p-4">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                            </div>
                        ) : lecturers.length > 0 ? (
                            <ul className="space-y-1">
                                {lecturers.map((lecturer) => (
                                    <li key={lecturer.id} className="group flex items-center pr-2">
                                        <button
                                            onClick={() => setSelectedLecturer(lecturer)}
                                            className={`flex-1 text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between ${selectedLecturer?.id === lecturer.id
                                                ? 'bg-pastel-indigo dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 shadow-sm'
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-gray-700 dark:text-gray-300'
                                                }`}
                                        >
                                            <div>
                                                <div className="font-medium">{lecturer.name}</div>
                                                {lecturer.email && <div className="text-xs text-gray-400 mt-0.5">{lecturer.email}</div>}
                                            </div>
                                            <ChevronRight size={16} className={`opacity-0 group-hover:opacity-100 transition-opacity ${selectedLecturer?.id === lecturer.id ? 'opacity-100 text-indigo-600' : 'text-gray-400'}`} />
                                        </button>
                                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleViewCredentials(lecturer)}
                                                className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                                                title="View Credentials"
                                            >
                                                <Key size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteLecturer(lecturer.id)}
                                                className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="p-4 text-center text-gray-500 text-sm">No lecturers found.</div>
                        )}
                    </div>
                </div>

                {/* Right Column: Workload Details */}
                <div className="md:col-span-7 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900">
                        <h3 className="font-semibold text-gray-700 dark:text-gray-200">
                            {selectedLecturer ? `Workload: ${selectedLecturer.name}` : 'Select a lecturer to manage workload'}
                        </h3>
                        {selectedLecturer && (
                            <button
                                onClick={() => setIsWorkloadModalOpen(true)}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm text-white bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all"
                            >
                                <Plus size={16} className="mr-1.5" />
                                Assign Subject
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {!selectedLecturer ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                                <Briefcase size={48} className="mb-4 opacity-10" />
                                <p>Select a lecturer from the left column to view or manage their subject assignments.</p>
                            </div>
                        ) : loadingWorkload ? (
                            <div className="flex justify-center p-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                        ) : workloads.length > 0 ? (
                            <div className="p-4 grid grid-cols-1 gap-4">
                                {workloads.map((work) => (
                                    <div key={work.id} className="flex items-center justify-between p-4 border border-gray-100 dark:border-slate-700 rounded-lg bg-gray-50/50 dark:bg-slate-800/50 group">
                                        <div className="flex items-start space-x-4">
                                            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg text-indigo-600 dark:text-indigo-400">
                                                <BookOpen size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-gray-900 dark:text-gray-100">{work.subjects?.code} - {work.subjects?.name}</h4>
                                                <div className="flex items-center mt-1 space-x-4 text-sm text-gray-500 dark:text-gray-400">
                                                    <span className="flex items-center">
                                                        <span className={`w-2 h-2 rounded-full mr-2 ${work.type === 'Lecture' ? 'bg-blue-400' :
                                                            work.type === 'Tutorial' ? 'bg-green-400' : 'bg-orange-400'
                                                            }`}></span>
                                                        {work.type}
                                                    </span>
                                                    <span className="flex items-center">
                                                        <Clock size={14} className="mr-1" />
                                                        {work.hours} Hour{work.hours > 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteWorkload(work.id)}
                                            className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 flex justify-end text-sm font-medium text-gray-600 dark:text-gray-300">
                                    Total Assigned Hours: {workloads.reduce((sum, w) => sum + w.hours, 0)}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-500 p-8">
                                <p>No subjects assigned to this lecturer yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add Lecturer Modal */}
            <Modal isOpen={isAddLecturerModalOpen} onClose={() => setIsAddLecturerModalOpen(false)} title="Add New Lecturer">
                <form onSubmit={handleAddLecturer} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                        <input
                            type="text"
                            required
                            className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                            value={lecturerForm.name}
                            onChange={(e) => setLecturerForm({ ...lecturerForm, name: e.target.value })}
                            placeholder="e.g. Prof. Aris"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                        <input
                            type="text"
                            required
                            className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                            value={lecturerForm.username}
                            onChange={(e) => setLecturerForm({ ...lecturerForm, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                            placeholder="e.g. aris123"
                        />
                        <p className="mt-1 text-[10px] text-gray-500 italic">No spaces allowed. This will be used for login.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Initial Password</label>
                        <input
                            type="text"
                            required
                            className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                            value={lecturerForm.password}
                            onChange={(e) => setLecturerForm({ ...lecturerForm, password: e.target.value })}
                            placeholder="Min 6 characters"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Stored temporarily for admin view.
                        </p>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={() => setIsAddLecturerModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 transition-colors">Cancel</button>
                        <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-bold uppercase tracking-wider text-white bg-primary hover:opacity-90 rounded-xl shadow-sm shadow-indigo-200 dark:shadow-none transition-all disabled:opacity-50">
                            {loading ? 'Creating...' : 'Create Lecturer'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Workload Modal */}
            <Modal isOpen={isWorkloadModalOpen} onClose={() => setIsWorkloadModalOpen(false)} title={`Assign Subject to ${selectedLecturer?.name}`}>
                <form onSubmit={handleAddWorkload} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subject</label>
                        <select
                            required
                            className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                            value={workloadForm.subject_id}
                            onChange={(e) => setWorkloadForm({ ...workloadForm, subject_id: e.target.value })}
                        >
                            <option value="">Select a Subject...</option>
                            {subjects.map((sub) => (
                                <option key={sub.id} value={sub.id}>{sub.code} - {sub.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Session Type</label>
                            <select
                                required
                                className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                                value={workloadForm.type}
                                onChange={(e) => setWorkloadForm({ ...workloadForm, type: e.target.value })}
                            >
                                <option value="Lecture">Lecture</option>
                                <option value="Tutorial">Tutorial</option>
                                <option value="Lab">Lab</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Hours per Week</label>
                            <input
                                type="number"
                                required
                                min="1"
                                max="10"
                                className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                                value={workloadForm.hours}
                                onChange={(e) => setWorkloadForm({ ...workloadForm, hours: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-50 dark:border-slate-800 mt-6">
                        <button type="button" onClick={() => setIsWorkloadModalOpen(false)} className="px-6 py-2 text-xs font-bold uppercase tracking-widest text-gray-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 transition-all font-bold">Cancel</button>
                        <button type="submit" className="px-6 py-2 text-xs font-bold uppercase tracking-widest text-white bg-primary hover:opacity-90 rounded-xl shadow-pastel transition-all">Assign Workload</button>
                    </div>
                </form>
            </Modal>

            {/* View Credentials Modal */}
            <Modal isOpen={isViewCredentialsModalOpen} onClose={() => setIsViewCredentialsModalOpen(false)} title="Lecturer Credentials">
                <div className="space-y-4">
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-md">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <Key className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Admin View Only</h3>
                                <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                                    <p>
                                        These credentials are stored for management purposes. Please share them securely with the lecturer.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Username</label>
                            <div className="mt-1 flex items-center bg-gray-50 dark:bg-slate-900 px-3 py-2 rounded border border-gray-200 dark:border-slate-700">
                                <User size={16} className="text-gray-400 mr-2" />
                                <span className="text-gray-900 dark:text-white select-all">{credentialsView?.username || 'N/A'}</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Initial Password</label>
                            <div className="mt-1 flex items-center bg-gray-50 dark:bg-slate-900 px-3 py-2 rounded border border-gray-200 dark:border-slate-700">
                                <Lock size={16} className="text-gray-400 mr-2" />
                                <span className="text-gray-900 dark:text-white font-mono select-all">
                                    {credentialsView?.temp_password || 'Not stored'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button
                            type="button"
                            onClick={() => setIsViewCredentialsModalOpen(false)}
                            className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Lecturers;
