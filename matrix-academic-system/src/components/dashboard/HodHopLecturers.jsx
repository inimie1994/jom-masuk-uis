import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import PageHeader from '../common/PageHeader';
import Modal from '../common/Modal';
import { Plus, Trash2, Clock, BookOpen, ChevronRight, Briefcase, Key, User, Lock, Pencil, Calendar } from 'lucide-react';

const HodHopLecturers = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [lecturers, setLecturers] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLecturer, setSelectedLecturer] = useState(null);
    const [workloads, setWorkloads] = useState([]);
    const [loadingWorkload, setLoadingWorkload] = useState(false);

    // Modal States
    const [isAddLecturerModalOpen, setIsAddLecturerModalOpen] = useState(false);
    const [isEditLecturerModalOpen, setIsEditLecturerModalOpen] = useState(false);
    const [isWorkloadModalOpen, setIsWorkloadModalOpen] = useState(false);
    const [isViewCredentialsModalOpen, setIsViewCredentialsModalOpen] = useState(false);

    // Form States
    const [lecturerForm, setLecturerForm] = useState({
        name: '',
        username: '',
        password: '',
        role: 'lecturer'
    });

    const [editLecturerForm, setEditLecturerForm] = useState({
        id: '',
        name: '',
        username: '',
        role: 'lecturer'
    });

    const [workloadForm, setWorkloadForm] = useState({
        subject_id: '',
        type: 'Lecture',
        hours: 1,
        student_group: ''
    });

    const [error, setError] = useState(null);
    const [credentialsView, setCredentialsView] = useState(null);

    // Derived Department ID from HOD/HOP user
    const [departmentId, setDepartmentId] = useState(user?.department_id || null);
    const [isCheckingDept, setIsCheckingDept] = useState(!user?.department_id);

    const departmentCode = user?.department_code || user?.department; // Fallback

    useEffect(() => {
        const resolveDepartment = async () => {
            if (user?.department_id) {
                setDepartmentId(user.department_id);
                setIsCheckingDept(false);
                return;
            }

            if (user?.lecturer_id) {
                try {
                    const { data, error } = await supabase
                        .from('lecturers')
                        .select('department_id')
                        .eq('id', user.lecturer_id)
                        .single();

                    if (data) {
                        setDepartmentId(data.department_id);
                    }
                } catch (err) {
                    console.error('Error resolving department:', err);
                }
            }
            setIsCheckingDept(false);
        };

        resolveDepartment();
    }, [user]);

    useEffect(() => {
        if (!isCheckingDept) {
            if (departmentId) {
                fetchLecturers();
                fetchSubjects();
            } else {
                setLoading(false);
            }
        }
    }, [departmentId, isCheckingDept]);

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
                .select('*, departments(code, name)')
                .eq('faculty_id', user?.faculty_id)
                .eq('department_id', departmentId) // FILTER BY DEPARTMENT
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
                .eq('faculty_id', user?.faculty_id)
                .eq('department_id', departmentId) // FILTER BY DEPARTMENT
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

            // Fetch Workload manually assigned
            const { data: workloadData, error: workloadError } = await supabase
                .from('workload')
                .select(`
                    id,
                    type,
                    hours,
                    student_group,
                    created_at,
                    subjects (id, code, name)
                `)
                .eq('lecturer_id', lecturerId)
                .order('created_at', { ascending: false });

            if (workloadError) throw workloadError;

            // Fetch Timetable entries to get dynamic group names
            const { data: timetableData, error: timetableError } = await supabase
                .from('timetable')
                .select('subject_id, class_type, group_names')
                .eq('lecturer_id', lecturerId);

            if (timetableError) throw timetableError;

            // Process workload to include timetable group info
            const enhancedWorkload = (workloadData || []).map(work => {
                // Get unique groups
                const groups = [...new Set((timetableData || []).filter(t =>
                    t.subject_id === work.subjects?.id &&
                    t.class_type === work.type
                ).flatMap(t => Array.isArray(t.group_names) ? t.group_names : [t.group_names]))].filter(Boolean);
                const derivedGroup = groups.length > 0 ? groups.join(', ') : work.student_group;

                return {
                    ...work,
                    displayReference: derivedGroup
                };
            });

            setWorkloads(enhancedWorkload);
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
            const { data, error: functionError } = await supabase.functions.invoke('create-lecturer', {
                body: {
                    name: lecturerForm.name,
                    username: lecturerForm.username,
                    password: lecturerForm.password,
                    faculty_id: user?.faculty_id,
                    department_id: departmentId // AUTO-ASSIGN DEPARTMENT
                }
            });

            if (functionError) throw functionError;
            if (data?.error) throw new Error(data.error);

            // POST-CREATION UPDATE:
            // The edge function only creates the basic user/lecturer.
            // We need to now apply the Role
            if (lecturerForm.role && lecturerForm.role !== 'lecturer') {
                const newUsername = lecturerForm.username;

                // 1. Find the newly created lecturer to get their ID (and link to user)
                const { data: newLecturer } = await supabase
                    .from('lecturers')
                    .select('id')
                    .eq('username', newUsername)
                    .single();

                if (newLecturer) {
                    // Update Lecturers Table
                    await supabase
                        .from('lecturers')
                        .update({ role: lecturerForm.role })
                        .eq('id', newLecturer.id);

                    // Update Users Table
                    await supabase
                        .from('users')
                        .update({ role: lecturerForm.role })
                        .eq('lecturer_id', newLecturer.id);
                }
            }

            setIsAddLecturerModalOpen(false);
            setLecturerForm({ name: '', username: '', password: '', role: 'lecturer' });
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

    const handleEditLecturer = (lecturer) => {
        setEditLecturerForm({
            id: lecturer.id,
            name: lecturer.name,
            username: lecturer.username,
            role: lecturer.role || 'lecturer'
        });
        setIsEditLecturerModalOpen(true);
    };

    const handleUpdateLecturer = async (e) => {
        e.preventDefault();
        setError(null);

        try {
            setLoading(true);
            const { error } = await supabase
                .from('lecturers')
                .update({
                    name: editLecturerForm.name,
                    role: editLecturerForm.role,
                    // No department update allowed here, tied to HOD
                })
                .eq('id', editLecturerForm.id);

            if (error) throw error;

            // If role changed, update user role as well if applicable
            await supabase
                .from('users')
                .update({ role: editLecturerForm.role })
                .eq('lecturer_id', editLecturerForm.id);

            setSuccess('Lecturer updated successfully.');
            setTimeout(() => setSuccess(null), 3000);

            setIsEditLecturerModalOpen(false);
            fetchLecturers();
        } catch (err) {
            console.error('Error updating lecturer:', err);
            setError(err.message || 'Failed to update lecturer.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddWorkload = async (e) => {
        e.preventDefault();
        if (!selectedLecturer || !workloadForm.subject_id) return;

        try {
            // Verify subject belongs to department (extra safety) or just trust the select list
            const { error } = await supabase
                .from('workload')
                .insert([{
                    lecturer_id: selectedLecturer.id,
                    subject_id: workloadForm.subject_id,
                    type: workloadForm.type,
                    hours: parseInt(workloadForm.hours),
                    student_group: workloadForm.student_group
                }]);

            if (error) throw error;

            setIsWorkloadModalOpen(false);
            setWorkloadForm({ subject_id: '', type: 'Lecture', hours: 1, student_group: '' });
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

    const [success, setSuccess] = useState(null);

    return (
        <div>
            <PageHeader
                title={`${departmentCode || 'Department'} Lecturers`}
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

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[calc(100vh-14rem)]">
                {/* Left Column: Lecturers List */}
                <div className="md:col-span-5 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-gray-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                        <h3 className="font-bold text-xs uppercase tracking-wider text-gray-400 dark:text-slate-500">Lecturers List</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                        {loading ? (
                            <div className="flex justify-center p-4">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                            </div>
                        ) : lecturers.length > 0 ? (
                            <div className="space-y-6">
                                {(() => {
                                    // Helper to group lecturers by Department
                                    const groups = {};
                                    lecturers.forEach(lecturer => {
                                        const deptName = lecturer.departments?.name || 'Unknown Department';
                                        const deptCode = lecturer.departments?.code || 'OTHERS';

                                        if (!groups[deptCode]) {
                                            groups[deptCode] = {
                                                name: deptName,
                                                code: deptCode,
                                                lecturers: []
                                            };
                                        }
                                        groups[deptCode].lecturers.push(lecturer);
                                    });

                                    // Sort groups by code
                                    const groupedLecturers = Object.values(groups).sort((a, b) => a.code.localeCompare(b.code));

                                    return groupedLecturers.map((group) => (
                                        <div key={group.code}>
                                            <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800/50 border-y border-gray-100 dark:border-slate-800 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
                                                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    {group.code}
                                                </h4>
                                                <span className="text-[10px] font-bold bg-white dark:bg-slate-700 px-2 py-0.5 rounded-full text-gray-400">
                                                    {group.lecturers.length}
                                                </span>
                                            </div>
                                            <ul className="space-y-1 mt-1">
                                                {group.lecturers.map((lecturer) => (
                                                    <li key={lecturer.id} className="group flex items-center pr-2">
                                                        <button
                                                            onClick={() => setSelectedLecturer(lecturer)}
                                                            className={`flex-1 text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between ${selectedLecturer?.id === lecturer.id
                                                                ? 'bg-pastel-indigo dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 shadow-sm'
                                                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-gray-700 dark:text-gray-300'
                                                                }`}
                                                        >
                                                            <div>
                                                                <div className="font-medium text-sm">{lecturer.name}</div>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    {lecturer.email && <span className="text-[10px] text-gray-400 truncate max-w-[150px]">{lecturer.email}</span>}
                                                                </div>
                                                            </div>
                                                            <ChevronRight size={16} className={`opacity-0 group-hover:opacity-100 transition-opacity ${selectedLecturer?.id === lecturer.id ? 'opacity-100 text-indigo-600' : 'text-gray-400'}`} />
                                                        </button>
                                                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => handleEditLecturer(lecturer)}
                                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                title="Edit Lecturer Details"
                                                            >
                                                                <Pencil size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedLecturer(lecturer);
                                                                    setIsWorkloadModalOpen(true);
                                                                }}
                                                                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                                title="Manage Workload"
                                                            >
                                                                <Briefcase size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setCredentialsView(lecturer);
                                                                    setIsViewCredentialsModalOpen(true);
                                                                }}
                                                                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                                title="View Credentials"
                                                            >
                                                                <Key size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteLecturer(lecturer.id)}
                                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Delete Lecturer"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ));
                                })()}
                            </div>
                        ) : (
                            <div className="p-4 text-center text-gray-500 text-sm">No lecturers found in your department.</div>
                        )}
                    </div>
                </div>

                {/* Right Column: Workload Details */}
                <div className="md:col-span-7 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900">
                        <h3 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                            {selectedLecturer ? (
                                <>
                                    Workload: {selectedLecturer.name}
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${selectedLecturer.role === 'hod' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800' :
                                        selectedLecturer.role === 'hop' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800' :
                                            'bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-600'
                                        }`}>
                                        {selectedLecturer.role === 'hod' ? 'Head of Department' :
                                            selectedLecturer.role === 'hop' ? 'Head of Program' :
                                                'Lecturer'}
                                    </span>
                                </>
                            ) : 'Select a lecturer to manage workload'}
                        </h3>
                        {selectedLecturer && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => navigate('/timetable', { 
                                        state: { 
                                            viewMode: 'lecturer', 
                                            selectedFilterId: selectedLecturer.id 
                                        } 
                                    })}
                                    className="inline-flex items-center px-4 py-2 border border-gray-200 dark:border-slate-700 text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all"
                                >
                                    <Calendar size={16} className="mr-1.5" />
                                    View Timetable
                                </button>
                                <button
                                    onClick={() => setIsWorkloadModalOpen(true)}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm text-white bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all"
                                >
                                    <Plus size={16} className="mr-1.5" />
                                    Assign Subject
                                </button>
                            </div>
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
                                {(() => {
                                    // Group workloads by subject
                                    const groupedWorkloads = {};
                                    workloads.forEach(work => {
                                        const subjectId = work.subjects?.id;
                                        if (!groupedWorkloads[subjectId]) {
                                            groupedWorkloads[subjectId] = {
                                                subject: work.subjects,
                                                assignments: []
                                            };
                                        }
                                        groupedWorkloads[subjectId].assignments.push(work);
                                    });

                                    return Object.values(groupedWorkloads).map((group) => (
                                        <div key={group.subject?.id} className="relative bg-white dark:bg-slate-900/40 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm hover:shadow-pastel transition-all overflow-hidden">
                                            <div className="flex flex-col gap-4">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <span className="text-xs font-black tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded uppercase">
                                                            {group.subject?.code}
                                                        </span>
                                                        <h4 className="text-lg font-bold text-gray-900 dark:text-white mt-2">
                                                            {group.subject?.name}
                                                        </h4>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-[10px] uppercase font-black tracking-widest text-gray-400 block mb-1">Total Hours</span>
                                                        <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                                            {group.assignments.reduce((sum, a) => sum + a.hours, 0)} Hrs
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="space-y-4 pt-2">
                                                    {group.assignments.map((work) => (
                                                        <div key={work.id} className="relative pl-4 border-l-2 group/item transition-all" style={{ borderColor: work.type === 'Lecture' ? '#818cf8' : work.type === 'Tutorial' ? '#34d399' : '#fbbf24' }}>
                                                            <div className="flex justify-between items-start">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-3 mb-2">
                                                                        <span className="flex items-center text-[10px] uppercase font-bold tracking-widest text-gray-500">
                                                                            <div className={`w-2 h-2 rounded-full mr-2 ${work.type === 'Lecture' ? 'bg-blue-400' :
                                                                                work.type === 'Tutorial' ? 'bg-emerald-400' : 'bg-amber-400'
                                                                                }`}></div>
                                                                            {work.type}
                                                                        </span>
                                                                        <span className="flex items-center text-[10px] uppercase font-bold tracking-widest text-gray-400">
                                                                            <Clock size={12} className="mr-1" />
                                                                            {work.hours} Hr{work.hours > 1 ? 's' : ''}
                                                                        </span>
                                                                    </div>

                                                                    <div className="flex flex-wrap gap-1.5">
                                                                        {(work.displayReference || 'No groups assigned').split(',').map((g, idx) => (
                                                                            <span
                                                                                key={idx}
                                                                                className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-sm"
                                                                            >
                                                                                {g.trim()}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                <button
                                                                    onClick={() => handleDeleteWorkload(work.id)}
                                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover/item:opacity-100"
                                                                    title="Remove Assignment"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ));
                                })()}
                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 flex justify-end text-sm font-medium text-gray-600 dark:text-gray-300">
                                    Weekly Total: {workloads.reduce((sum, w) => sum + w.hours, 0)} Hrs
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
                            placeholder="e.g. Dr. Aminah"
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
                            placeholder="e.g. aminah"
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
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
                        <select
                            required
                            className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                            value={lecturerForm.role || 'lecturer'}
                            onChange={(e) => setLecturerForm({ ...lecturerForm, role: e.target.value })}
                        >
                            <option value="lecturer">Lecturer</option>
                            <option value="hod">Head of Department (HOD)</option>
                            <option value="hop">Head of Program (HOP)</option>
                        </select>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={() => setIsAddLecturerModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 transition-colors">Cancel</button>
                        <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-bold uppercase tracking-wider text-white bg-primary hover:opacity-90 rounded-xl shadow-sm shadow-indigo-200 dark:shadow-none transition-all disabled:opacity-50">
                            {loading ? 'Creating...' : 'Create Lecturer'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Edit Lecturer Modal */}
            <Modal isOpen={isEditLecturerModalOpen} onClose={() => setIsEditLecturerModalOpen(false)} title="Edit Lecturer Details">
                <form onSubmit={handleUpdateLecturer} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                        <input
                            type="text"
                            required
                            className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                            value={editLecturerForm.name}
                            onChange={(e) => setEditLecturerForm({ ...editLecturerForm, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                        <input
                            type="text"
                            disabled
                            className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm sm:text-sm bg-gray-100 dark:bg-slate-900 text-gray-500 cursor-not-allowed px-3 py-2 border transition-all"
                            value={editLecturerForm.username}
                        />
                        <p className="mt-1 text-[10px] text-gray-400 italic">Username cannot be changed.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
                        <select
                            required
                            className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                            value={editLecturerForm.role || 'lecturer'}
                            onChange={(e) => setEditLecturerForm({ ...editLecturerForm, role: e.target.value })}
                        >
                            <option value="lecturer">Lecturer</option>
                            <option value="hod">Head of Department (HOD)</option>
                            <option value="hop">Head of Program (HOP)</option>
                        </select>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={() => setIsEditLecturerModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 transition-colors">Cancel</button>
                        <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-bold uppercase tracking-wider text-white bg-primary hover:opacity-90 rounded-xl shadow-sm shadow-indigo-200 dark:shadow-none transition-all disabled:opacity-50">
                            {loading ? 'Updating...' : 'Save Changes'}
                        </button>
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

export default HodHopLecturers;
