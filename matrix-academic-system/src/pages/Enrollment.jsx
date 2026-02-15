import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabaseClient';
import PageHeader from '../components/common/PageHeader';
import EmptyState from '../components/common/EmptyState';
import Modal from '../components/common/Modal';
import { UserPlus, Trash2, Users, ChevronRight, Layers, User } from 'lucide-react';

const Enrollment = () => {
    const { user } = useAuth();
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState(null);
    const [enrolledStudents, setEnrolledStudents] = useState([]);
    const [availableStudents, setAvailableStudents] = useState([]); // For the add modal
    const [availableGroups, setAvailableGroups] = useState([]); // For group mode
    const [loadingClasses, setLoadingClasses] = useState(true);
    const [loadingEnrollments, setLoadingEnrollments] = useState(false);

    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [enrollmentMode, setEnrollmentMode] = useState('single'); // 'single' or 'group'
    const [selectedStudentToAdd, setSelectedStudentToAdd] = useState('');
    const [selectedGroups, setSelectedGroups] = useState([]);

    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    useEffect(() => {
        if (user?.faculty_id) {
            fetchClasses();
            fetchAvailableStudents();
        }
    }, [user?.faculty_id]);

    useEffect(() => {
        if (selectedClass) {
            fetchEnrollments(selectedClass.id);
        } else {
            setEnrolledStudents([]);
        }
    }, [selectedClass]);

    const fetchClasses = async () => {
        try {
            setLoadingClasses(true);
            const { data, error } = await supabase
                .from('classes')
                .select(`
                    id,
                    section,
                    semester,
                    subjects (code, name)
                `)
                .eq('faculty_id', user.faculty_id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setClasses(data || []);
        } catch (err) {
            console.error('Error fetching classes:', err);
            setError('Failed to load classes.');
        } finally {
            setLoadingClasses(false);
        }
    };

    const fetchAvailableStudents = async () => {
        try {
            const { data, error } = await supabase
                .from('students')
                .select('id, name, matric_no, student_group')
                .eq('faculty_id', user.faculty_id)
                .order('name', { ascending: true });

            if (error) throw error;
            setAvailableStudents(data || []);

            // Extract unique groups
            const groups = [...new Set(data.map(s => s.student_group).filter(Boolean))].sort();
            setAvailableGroups(groups);
        } catch (err) {
            console.error('Error fetching students:', err);
        }
    };

    const fetchEnrollments = async (classId) => {
        try {
            setLoadingEnrollments(true);
            // Fetch enrollments and join with students table
            const { data, error } = await supabase
                .from('enrollments')
                .select(`
                    id,
                    enrolled_at,
                    students (id, name, matric_no, email)
                `)
                .eq('class_id', classId);

            if (error) throw error;
            setEnrolledStudents(data || []);
        } catch (err) {
            console.error('Error fetching enrollments:', err);
            setError('Failed to load enrolled students.');
        } finally {
            setLoadingEnrollments(false);
        }
    };

    const resetModal = () => {
        setIsModalOpen(false);
        setSelectedStudentToAdd('');
        setSelectedGroups([]);
        setEnrollmentMode('single');
        setError(null);
    };

    const handleEnroll = async (e) => {
        e.preventDefault();

        if (enrollmentMode === 'single') {
            await handleEnrollSingle();
        } else {
            await handleEnrollBatch();
        }
    };

    const handleEnrollSingle = async () => {
        if (!selectedClass || !selectedStudentToAdd) return;

        try {
            const { error } = await supabase
                .from('enrollments')
                .insert([
                    {
                        class_id: selectedClass.id,
                        student_id: selectedStudentToAdd
                    }
                ]);

            if (error) throw error;

            resetModal();
            setSuccess('Student enrolled successfully.');
            setTimeout(() => setSuccess(null), 3000);
            fetchEnrollments(selectedClass.id);
        } catch (err) {
            console.error('Error enrolling student:', err);
            if (err.code === '23505') {
                setError('Student is already enrolled in this class.');
            } else {
                setError('Failed to enroll student.');
            }
        }
    };

    const handleEnrollBatch = async () => {
        if (!selectedClass || selectedGroups.length === 0) return;

        try {
            setLoadingEnrollments(true); // Show local loading state

            // 1. Get all students in the selected groups
            const studentsInGroups = availableStudents.filter(s =>
                s.student_group && selectedGroups.includes(s.student_group)
            );

            if (studentsInGroups.length === 0) {
                setError('No students found in selected groups.');
                setLoadingEnrollments(false);
                return;
            }

            // 2. Filter out students already enrolled
            // We can do this client-side since we have detailed enrollment data
            const alreadyEnrolledIds = new Set(enrolledStudents.map(e => e.students?.id));
            const newStudents = studentsInGroups.filter(s => !alreadyEnrolledIds.has(s.id));

            if (newStudents.length === 0) {
                setError('All students in these groups are already enrolled.');
                setLoadingEnrollments(false);
                return;
            }

            // 3. Prepare inserts
            const enrollmentsToInsert = newStudents.map(s => ({
                class_id: selectedClass.id,
                student_id: s.id
            }));

            const { error } = await supabase
                .from('enrollments')
                .insert(enrollmentsToInsert);

            if (error) throw error;

            // Audit Log
            import('../utils/auditLogger').then(({ logAuditAction }) => {
                logAuditAction(user, 'ENROLLMENT_BATCH', {
                    class_code: selectedClass.subjects.code,
                    section: selectedClass.section,
                    student_count: newStudents.length,
                    groups: selectedGroups
                });
            });

            resetModal();
            setSuccess(`Successfully enrolled ${newStudents.length} students from ${selectedGroups.length} groups.`);
            setTimeout(() => setSuccess(null), 3000);
            fetchEnrollments(selectedClass.id);

        } catch (err) {
            console.error('Batch enrollment error:', err);
            setError('Failed to batch enroll students.');
            setLoadingEnrollments(false);
        }
    };

    const handleUnenrollStudent = async (enrollmentId) => {
        if (!window.confirm('Are you sure you want to remove this student from the class?')) return;

        try {
            const { error } = await supabase
                .from('enrollments')
                .delete()
                .eq('id', enrollmentId);

            if (error) throw error;
            setSuccess('Student removed from class.');
            setTimeout(() => setSuccess(null), 3000);
            fetchEnrollments(selectedClass.id);
        } catch (err) {
            console.error('Error removing student:', err);
            setError('Failed to remove student.');
        }
    };

    const toggleGroupSelection = (group) => {
        setSelectedGroups(prev =>
            prev.includes(group)
                ? prev.filter(g => g !== group)
                : [...prev, group]
        );
    };

    return (
        <div>
            <PageHeader title="Enrollment Management" />

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-md mb-4 text-sm flex justify-between items-center">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="text-sm underline">Dismiss</button>
                </div>
            )}

            {success && (
                <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-4 rounded-md mb-4 text-sm flex justify-between items-center">
                    <span>{success}</span>
                    <button onClick={() => setSuccess(null)} className="text-sm underline">Dismiss</button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[calc(100vh-12rem)]">
                {/* Left Column: Class Selection */}
                <div className="md:col-span-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
                        <h3 className="font-semibold text-gray-700 dark:text-gray-200">Select Class</h3>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2">
                        {loadingClasses ? (
                            <div className="flex justify-center p-4">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                            </div>
                        ) : classes.length > 0 ? (
                            <ul className="space-y-1">
                                {classes.map((cls) => (
                                    <li key={cls.id}>
                                        <button
                                            onClick={() => setSelectedClass(cls)}
                                            className={`w-full text-left px-4 py-3 rounded-md transition-colors flex items-center justify-between group ${selectedClass?.id === cls.id
                                                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500'
                                                : 'hover:bg-gray-50 dark:hover:bg-slate-700/50 text-gray-700 dark:text-gray-300'
                                                }`}
                                        >
                                            <div>
                                                <div className="font-medium">{cls.subjects?.code}</div>
                                                <div className="text-sm opacity-75">{cls.subjects?.name}</div>
                                                <div className="text-xs text-gray-400 mt-1">
                                                    Section {cls.section} • {cls.semester}
                                                </div>
                                            </div>
                                            <ChevronRight size={16} className={`opacity-0 group-hover:opacity-100 transition-opacity ${selectedClass?.id === cls.id ? 'opacity-100 text-indigo-600' : 'text-gray-400'}`} />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="p-4 text-center text-gray-500 text-sm">No classes found.</div>
                        )}
                    </div>
                </div>

                {/* Right Column: Enrolled Students */}
                <div className="md:col-span-8 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900">
                        <h3 className="font-semibold text-gray-700 dark:text-gray-200">
                            {selectedClass
                                ? `Enrolled Students: ${selectedClass.subjects?.code} (Section ${selectedClass.section})`
                                : 'Select a class to view enrollments'}
                        </h3>
                        {selectedClass && (
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                <UserPlus size={16} className="mr-1.5" />
                                Enroll Student
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {!selectedClass ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8">
                                <Users size={48} className="mb-4 opacity-20" />
                                <p>Select a class from the left to manage enrollments.</p>
                            </div>
                        ) : loadingEnrollments ? (
                            <div className="flex justify-center p-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                            </div>
                        ) : enrolledStudents.length > 0 ? (
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                                <thead className="bg-gray-50 dark:bg-slate-900">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Name</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Matric No</th>
                                        <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                                    {enrolledStudents.map((enrollment) => (
                                        <tr key={enrollment.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                                {enrollment.students?.name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">
                                                {enrollment.students?.matric_no}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => handleUnenrollStudent(enrollment.id)}
                                                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                                                    title="Remove Student"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-500 p-8">
                                <p>No students enrolled in this class yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={resetModal}
                title="Enroll Students"
            >
                <div>
                    {/* Mode Switcher */}
                    <div className="flex rounded-md shadow-sm mb-6 w-full">
                        <button
                            type="button"
                            onClick={() => setEnrollmentMode('single')}
                            className={`flex-1 py-2 text-sm font-medium border first:rounded-l-md last:rounded-r-md focus:z-10 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 ${enrollmentMode === 'single'
                                ? 'bg-indigo-50 border-indigo-500 text-indigo-700 z-10 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-500'
                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-600'
                                }`}
                        >
                            <span className="flex items-center justify-center">
                                <User size={16} className="mr-2" />
                                Individual
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setEnrollmentMode('group')}
                            className={`flex-1 py-2 text-sm font-medium border first:rounded-l-md last:rounded-r-md focus:z-10 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 ${enrollmentMode === 'group'
                                ? 'bg-indigo-50 border-indigo-500 text-indigo-700 z-10 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-500'
                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-600'
                                }`}
                        >
                            <span className="flex items-center justify-center">
                                <Layers size={16} className="mr-2" />
                                By Group
                            </span>
                        </button>
                    </div>

                    <form onSubmit={handleEnroll} className="space-y-4">
                        {enrollmentMode === 'single' ? (
                            <div>
                                <label htmlFor="student" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Select Student
                                </label>
                                <select
                                    id="student"
                                    required
                                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-slate-700 dark:text-white px-3 py-2 border"
                                    value={selectedStudentToAdd}
                                    onChange={(e) => setSelectedStudentToAdd(e.target.value)}
                                >
                                    <option value="">Choose a student...</option>
                                    {availableStudents.map((student) => (
                                        <option key={student.id} value={student.id}>
                                            {student.name} ({student.matric_no})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Select Groups to Enroll
                                </label>
                                {availableGroups.length > 0 ? (
                                    <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-slate-700 rounded-md p-2 space-y-2 bg-gray-50 dark:bg-slate-800">
                                        {availableGroups.map((group) => (
                                            <div key={group} className="flex items-center">
                                                <input
                                                    id={`group-${group}`}
                                                    name={`group-${group}`}
                                                    type="checkbox"
                                                    checked={selectedGroups.includes(group)}
                                                    onChange={() => toggleGroupSelection(group)}
                                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded dark:bg-slate-700 dark:border-slate-600"
                                                />
                                                <label htmlFor={`group-${group}`} className="ml-2 block text-sm text-gray-900 dark:text-gray-100 cursor-pointer select-none">
                                                    {group}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-sm text-gray-500 italic p-2 border border-gray-200 rounded-md bg-gray-50">
                                        No student groups found. Add groups to students first.
                                    </div>
                                )}
                                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                    Selected groups: {selectedGroups.join(', ') || 'None'}
                                </p>
                            </div>
                        )}

                        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-slate-700 mt-6">
                            <button
                                type="button"
                                onClick={resetModal}
                                className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                {enrollmentMode === 'single' ? 'Enroll Student' : 'Enroll Selected Groups'}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>
        </div>
    );
};

export default Enrollment;
