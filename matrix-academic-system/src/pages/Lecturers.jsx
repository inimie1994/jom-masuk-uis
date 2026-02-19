import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabaseClient';
import PageHeader from '../components/common/PageHeader';
import Modal from '../components/common/Modal';
import PrintableWorkloadSheet from '../components/workload/PrintableWorkloadSheet';
import { Plus, Trash2, Clock, BookOpen, ChevronRight, Briefcase, Eye, Key, Mail, Lock, User, Printer, Pencil } from 'lucide-react';
import { PROGRAMS } from '../utils/programUtils';

const Lecturers = () => {
    const { user } = useAuth();
    const [lecturers, setLecturers] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLecturer, setSelectedLecturer] = useState(null);
    const [workloads, setWorkloads] = useState([]);
    const [loadingWorkload, setLoadingWorkload] = useState(false);
    const [departments, setDepartments] = useState([]);

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
        department_id: '',
        role: 'lecturer',
        program_code: ''
    });

    const [editLecturerForm, setEditLecturerForm] = useState({
        id: '',
        name: '',
        username: '',
        department_id: '',
        role: 'lecturer',
        program_code: ''
    });

    const [workloadForm, setWorkloadForm] = useState({
        subject_id: '',
        type: 'Lecture',
        hours: 1,
        student_group: ''
    });

    const [error, setError] = useState(null);
    const [credentialsView, setCredentialsView] = useState(null);

    useEffect(() => {
        if (user?.faculty_id) {
            fetchLecturers();
            fetchSubjects();
            fetchDepartments();
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
                .select('*, departments(code, name)')
                .eq('faculty_id', user?.faculty_id)
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
                .order('code', { ascending: true });

            if (error) throw error;
            setSubjects(data || []);
        } catch (err) {
            console.error('Error fetching subjects:', err);
        }
    };

    const fetchDepartments = async () => {
        try {
            const { data, error } = await supabase
                .from('departments')
                .select('id, code, name')
                .eq('faculty_id', user?.faculty_id)
                .order('name', { ascending: true });

            if (error) throw error;
            setDepartments(data || []);
        } catch (err) {
            console.error('Error fetching departments:', err);
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
            // This bypasses email verification and rate limits
            const { data, error: functionError } = await supabase.functions.invoke('create-lecturer', {
                body: {
                    name: lecturerForm.name,
                    username: lecturerForm.username,
                    password: lecturerForm.password,
                    faculty_id: user?.faculty_id,
                    department_id: lecturerForm.department_id
                }
            });

            if (functionError) throw functionError;
            if (data?.error) throw new Error(data.error);

            // POST-CREATION UPDATE:
            // The edge function only creates the basic user/lecturer.
            // We need to now apply the Role and (if HOP) Program Code.
            if (lecturerForm.role && lecturerForm.role !== 'lecturer') {
                const newUsername = lecturerForm.username;

                // 1. Find the newly created lecturer to get their ID (and link to user)
                const { data: newLecturer, error: fetchError } = await supabase
                    .from('lecturers')
                    .select('id, faculty_id') // We can't select user_id directly if it's not FK-linked explicitly enough or RLS blocks? 
                    // Actually, let's assume username is unique enough or we just trust the timing.
                    .eq('username', newUsername)
                    .single();

                if (newLecturer) {
                    // Update Lecturers Table
                    await supabase
                        .from('lecturers')
                        .update({
                            role: lecturerForm.role,
                            program_code: lecturerForm.role === 'hop' ? lecturerForm.program_code : null
                        })
                        .eq('id', newLecturer.id);

                    // Update Users Table (Need to find the user linked to this lecturer)
                    // Since we don't have user_id on lecturer table easily accessible or modifiable here maybe?
                    // Actually 20240215_add_user_roles.sql added `lecturer_id` to users table.

                    // So we update user where lecturer_id = newLecturer.id
                    await supabase
                        .from('users')
                        .update({ role: lecturerForm.role })
                        .eq('lecturer_id', newLecturer.id);
                }
            }

            setIsAddLecturerModalOpen(false);
            setLecturerForm({ name: '', username: '', password: '', department_id: '', role: 'lecturer', program_code: '' });
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
            department_id: lecturer.department_id || '',
            role: lecturer.role || 'lecturer',
            program_code: lecturer.program_code || ''
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
                    department_id: editLecturerForm.department_id,
                    role: editLecturerForm.role,
                    program_code: editLecturerForm.role === 'hop' ? editLecturerForm.program_code : null
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

            // Update classes table to link lecturer if class exists for this subject + section
            if (workloadForm.student_group) {
                await supabase
                    .from('classes')
                    .update({ lecturer_id: selectedLecturer.id })
                    .eq('subject_id', workloadForm.subject_id)
                    .eq('section', workloadForm.student_group)
                    .eq('faculty_id', user?.faculty_id);
            }

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

    const [success, setSuccess] = useState(null);

    // Printing State
    const [printingLecturer, setPrintingLecturer] = useState(null);
    const [printTimetableData, setPrintTimetableData] = useState([]);
    const [printStudentCounts, setPrintStudentCounts] = useState({});
    const [isPrinting, setIsPrinting] = useState(false);

    const handlePrintWorkload = async (lecturer) => {
        try {
            setIsPrinting(true);
            setPrintingLecturer(lecturer);

            // 1. Fetch Timetable for this lecturer
            const { data: timetableData, error: timetableError } = await supabase
                .from('timetable')
                .select(`
                    *,
                    subjects (id, code, name),
                    lecturers (name)
                `)
                .eq('lecturer_id', lecturer.id)
                .order('day'); // Basic ordering, will sort more in component

            if (timetableError) throw timetableError;

            // 2. Extract all unique groups involved
            const allGroups = new Set();
            (timetableData || []).forEach(item => {
                if (Array.isArray(item.group_names)) {
                    item.group_names.forEach(g => allGroups.add(g));
                } else if (item.group_names) {
                    allGroups.add(item.group_names);
                }
            });
            const uniqueGroups = Array.from(allGroups);

            // 3. Fetch student counts for these groups
            // We need to count students where student_group is in uniqueGroups
            const counts = {};
            if (uniqueGroups.length > 0) {
                const { data: studentsData, error: studentsError } = await supabase
                    .from('students')
                    .select('student_group')
                    .in('student_group', uniqueGroups)
                    .eq('faculty_id', user?.faculty_id);

                if (studentsError) throw studentsError;

                // Aggregate counts
                studentsData.forEach(s => {
                    if (s.student_group) {
                        counts[s.student_group] = (counts[s.student_group] || 0) + 1;
                    }
                });
            }

            setPrintTimetableData(timetableData || []);
            setPrintStudentCounts(counts);

            // Wait a moment for state to update and render before printing
            setTimeout(() => {
                window.print();
                setIsPrinting(false);
                setPrintingLecturer(null); // Optional: clear after print to hide it, or keep it. 
                // If we hide it immediately, print preview might lose content in some browsers.
                // Better to keep it or use a separate "onAfterPrint" listener, but simple timeout often works.
                // For now, let's NOT clear it immediately inside timeout to be safe, 
                // or clear it after a longer delay.
            }, 500);

        } catch (err) {
            console.error("Error preparing print:", err);
            setError("Failed to generate print data.");
            setIsPrinting(false);
            setPrintingLecturer(null);
        }
    };

    // Clear print data when window print dialog closes (optional, but hard to detect reliably across browsers)
    // For now, we rely on the component being hidden via CSS print media query except when printing.
    // But we conditionally render it only when `printingLecturer` is set to avoid overhead.


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
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    {lecturer.departments?.code && (
                                                        <span className="text-[10px] font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded uppercase">
                                                            {lecturer.departments.code}
                                                        </span>
                                                    )}
                                                    {lecturer.email && <span className="text-xs text-gray-400 truncate max-w-[150px]">{lecturer.email}</span>}
                                                </div>
                                            </div>
                                            <ChevronRight size={16} className={`opacity-0 group-hover:opacity-100 transition-opacity ${selectedLecturer?.id === lecturer.id ? 'opacity-100 text-indigo-600' : 'text-gray-400'}`} />
                                        </button>
                                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEditLecturer(lecturer)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Edit Lecturer Details"
                                            >
                                                <Pencil size={18} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedLecturer(lecturer);
                                                    setIsWorkloadModalOpen(true);
                                                }}
                                                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                title="Manage Workload"
                                            >
                                                <Briefcase size={18} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setCredentialsView(lecturer);
                                                    setIsViewCredentialsModalOpen(true);
                                                }}
                                                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                title="View Credentials"
                                            >
                                                <Key size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteLecturer(lecturer.id)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete Lecturer"
                                            >
                                                <Trash2 size={18} />
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
                        <h3 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                            {selectedLecturer ? (
                                <>
                                    Workload: {selectedLecturer.name}
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${selectedLecturer.role === 'hod' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800' :
                                        selectedLecturer.role === 'hop' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800' :
                                            'bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-600'
                                        }`}>
                                        {selectedLecturer.role === 'hod' ? 'Head of Department' :
                                            selectedLecturer.role === 'hop' ? `Head of Program (${selectedLecturer.program_code || ''})` :
                                                'Lecturer'}
                                    </span>
                                </>
                            ) : 'Select a lecturer to manage workload'}
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
                                    <div key={work.id} className="relative bg-white dark:bg-slate-900/40 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm hover:shadow-pastel transition-all group overflow-hidden">
                                        {/* Background accent */}
                                        <div className={`absolute top-0 left-0 w-1.5 h-full ${work.type === 'Lecture' ? 'bg-indigo-400' :
                                            work.type === 'Tutorial' ? 'bg-emerald-400' : 'bg-amber-400'
                                            }`}></div>

                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                                    <span className="text-xs font-black tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded uppercase">
                                                        {work.subjects?.code}
                                                    </span>
                                                    <div className="flex items-center space-x-3 text-[10px] uppercase font-bold tracking-widest text-gray-400">
                                                        <span className="flex items-center">
                                                            <div className={`w-2 h-2 rounded-full mr-2 ${work.type === 'Lecture' ? 'bg-blue-400' :
                                                                work.type === 'Tutorial' ? 'bg-emerald-400' : 'bg-amber-400'
                                                                }`}></div>
                                                            {work.type}
                                                        </span>
                                                        <span className="flex items-center">
                                                            <Clock size={12} className="mr-1" />
                                                            {work.hours} Hr{work.hours > 1 ? 's' : ''}
                                                        </span>
                                                    </div>
                                                </div>

                                                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                                                    {work.subjects?.name}
                                                </h4>

                                                {/* Groups Section */}
                                                <div className="flex flex-col gap-1.5">
                                                    <span className="text-[10px] uppercase font-black tracking-widest text-gray-400">Assigned Groups</span>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {(work.displayReference || 'No groups assigned').split(',').map((group, idx) => (
                                                            <span
                                                                key={idx}
                                                                className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-sm"
                                                            >
                                                                {group.trim()}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex sm:flex-col items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleDeleteWorkload(work.id)}
                                                    className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all border border-transparent hover:border-red-100 dark:hover:border-red-900/30"
                                                    title="Remove Assignment"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
                            <select
                                required
                                className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                                value={lecturerForm.role || 'lecturer'}
                                onChange={(e) => setLecturerForm({ ...lecturerForm, role: e.target.value, program_code: e.target.value === 'hop' ? lecturerForm.program_code : '' })}
                            >
                                <option value="lecturer">Lecturer</option>
                                <option value="hod">Head of Department (HOD)</option>
                                <option value="hop">Head of Program (HOP)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Department</label>
                            <select
                                required
                                className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                                value={lecturerForm.department_id}
                                onChange={(e) => setLecturerForm({ ...lecturerForm, department_id: e.target.value })}
                            >
                                <option value="">Select Department...</option>
                                {departments.map(dept => (
                                    <option key={dept.id} value={dept.id}>{dept.code} - {dept.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* HOP Program Selection */}
                    {lecturerForm.role === 'hop' && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Program</label>
                            <select
                                required
                                className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                                value={lecturerForm.program_code}
                                onChange={(e) => setLecturerForm({ ...lecturerForm, program_code: e.target.value })}
                            >
                                <option value="">Select Program...</option>
                                {Object.entries(PROGRAMS).map(([code, name]) => (
                                    <option key={code} value={code}>{code} - {name}</option>
                                ))}
                            </select>
                            <p className="mt-1 text-[10px] text-gray-500">Required for Head of Program role.</p>
                        </div>
                    )}

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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
                            <select
                                required
                                className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                                value={editLecturerForm.role || 'lecturer'}
                                onChange={(e) => setEditLecturerForm({ ...editLecturerForm, role: e.target.value, program_code: e.target.value === 'hop' ? editLecturerForm.program_code : '' })}
                            >
                                <option value="lecturer">Lecturer</option>
                                <option value="hod">Head of Department (HOD)</option>
                                <option value="hop">Head of Program (HOP)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Department</label>
                            <select
                                required
                                className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                                value={editLecturerForm.department_id}
                                onChange={(e) => setEditLecturerForm({ ...editLecturerForm, department_id: e.target.value })}
                            >
                                <option value="">Select Department...</option>
                                {departments.map(dept => (
                                    <option key={dept.id} value={dept.id}>{dept.code} - {dept.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* HOP Program Selection */}
                    {editLecturerForm.role === 'hop' && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Program</label>
                            <select
                                required
                                className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                                value={editLecturerForm.program_code}
                                onChange={(e) => setEditLecturerForm({ ...editLecturerForm, program_code: e.target.value })}
                            >
                                <option value="">Select Program...</option>
                                {Object.entries(PROGRAMS).map(([code, name]) => (
                                    <option key={code} value={code}>{code} - {name}</option>
                                ))}
                            </select>
                            <p className="mt-1 text-[10px] text-gray-500">Required for Head of Program role.</p>
                        </div>
                    )}

                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={() => setIsEditLecturerModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 transition-colors">Cancel</button>
                        <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-bold uppercase tracking-wider text-white bg-primary hover:opacity-90 rounded-xl shadow-sm shadow-indigo-200 dark:shadow-none transition-all disabled:opacity-50">
                            {loading ? 'Updating...' : 'Save Changes'}
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
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Student Group / Section</label>
                        <input
                            type="text"
                            className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                            value={workloadForm.student_group}
                            onChange={(e) => setWorkloadForm({ ...workloadForm, student_group: e.target.value })}
                            placeholder="e.g. Section 01, Group A"
                            required
                        />
                        <p className="mt-1 text-[10px] text-gray-500">Required: Links to Classes for Dashboard</p>
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
