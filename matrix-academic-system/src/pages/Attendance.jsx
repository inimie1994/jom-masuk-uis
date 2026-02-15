import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabaseClient';
import PageHeader from '../components/common/PageHeader';
import Modal from '../components/common/Modal';
import {
    Calendar,
    Clock,
    MapPin,
    User,
    CheckCircle,
    XCircle,
    AlertCircle,
    Filter,
    Download
} from 'lucide-react';

const Attendance = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [sessions, setSessions] = useState([]);

    // Filters
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedGroup, setSelectedGroup] = useState('');
    const [groups, setGroups] = useState([]);

    // Generate Modal State
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
    const [semesterStart, setSemesterStart] = useState('');
    const [semesterEnd, setSemesterEnd] = useState('');
    const [generateLoading, setGenerateLoading] = useState(false);

    // Mark Attendance Modal State
    const [isMarkModalOpen, setIsMarkModalOpen] = useState(false);
    const [currentSession, setCurrentSession] = useState(null);
    const [students, setStudents] = useState([]);
    const [attendanceStatus, setAttendanceStatus] = useState({}); // { student_id: 'Present' | 'Absent' ... }
    const [markingLoading, setMarkingLoading] = useState(false);

    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    useEffect(() => {
        if (user?.faculty_id) {
            fetchGroups();
        }
    }, [user?.faculty_id]);

    useEffect(() => {
        if (user?.faculty_id) {
            fetchSessions();
        }
    }, [user?.faculty_id, selectedDate, selectedGroup]);

    const fetchGroups = async () => {
        try {
            // Include class details to filtering by lecturer
            let query = supabase
                .from('students')
                .select('student_group')
                .eq('faculty_id', user.faculty_id)
                .not('student_group', 'is', null);

            // If lecturer, only show groups they teach
            // This is tricky because students table doesn't link to lecturers directly.
            // We should find groups from 'classes' table where lecturer_id matches.

            if (user.role === 'lecturer' && user.lecturer_id) {
                const { data: myClasses } = await supabase
                    .from('classes')
                    .select('student_group')
                    .eq('lecturer_id', user.lecturer_id);

                const myGroups = [...new Set(myClasses?.map(c => c.student_group))];

                if (myGroups.length > 0) {
                    query = query.in('student_group', myGroups);
                } else {
                    setGroups([]);
                    return;
                }
            }

            const { data, error } = await query;

            if (error) throw error;
            const uniqueGroups = [...new Set(data.map(item => item.student_group))].sort();
            setGroups(uniqueGroups);
        } catch (err) {
            console.error('Error fetching groups:', err);
        }
    };

    const fetchSessions = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('attendance_sessions')
                .select(`
                    *,
                    subjects (code, name),
                    lecturers (name)
                `)
                .eq('faculty_id', user.faculty_id)
                .eq('date', selectedDate)
                .order('start_time');

            if (selectedGroup) {
                query = query.eq('group_name', selectedGroup);
            }

            // If lecturer, might want to only show their sessions?
            // Currently sessions are generated for everyone.
            // But a lecturer should probably primarily see their own classes.
            if (user.role === 'lecturer' && user.lecturer_id) {
                // Filter by sessions that match my classes (subject + group)
                // This is hard to do purely in one query without complex joins/RPC if not linked directly
                // We can fetch all and filter in JS, OR
                // Use the fact that I can fetch my classes first.

                // Ideally attendance_sessions should have a lecturer_id column if assigned explicitly?
                // No, it's derived from the class.

                // Let's filter in JS for now for simplicity as we did in Dashboard
                const { data: myClasses } = await supabase
                    .from('classes')
                    .select('subject_id, student_group')
                    .eq('lecturer_id', user.lecturer_id);

                const { data: allSessions, error } = await query;
                if (error) throw error;

                const mySessions = allSessions.filter(s =>
                    myClasses.some(c => c.subject_id === s.subject_id && c.student_group === s.group_name)
                );
                setSessions(mySessions);
                return;
            }

            const { data, error } = await query;
            if (error) throw error;
            setSessions(data || []);
        } catch (err) {
            console.error('Error fetching sessions:', err);
            setError('Failed to load attendance sessions.');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateSessions = async (e) => {
        e.preventDefault();
        setGenerateLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const { error } = await supabase.rpc('generate_attendance_sessions', {
                inp_faculty_id: user.faculty_id,
                start_date: semesterStart,
                end_date: semesterEnd
            });

            if (error) throw error;

            setSuccessMessage('Attendance sessions generated successfully!');
            setIsGenerateModalOpen(false);
            fetchSessions(); // Refresh list
        } catch (err) {
            console.error('Error generating sessions:', err);
            setError(err.message || 'Failed to generate sessions.');
        } finally {
            setGenerateLoading(false);
        }
    };

    const openMarkModal = async (session) => {
        setCurrentSession(session);
        setStudents([]);
        setAttendanceStatus({});
        setIsMarkModalOpen(true);
        setMarkingLoading(true);

        try {
            // 1. Fetch students in this group
            const { data: studentsData, error: studentsError } = await supabase
                .from('students')
                .select('id, name, matric_no')
                .eq('faculty_id', user.faculty_id)
                .eq('student_group', session.group_name)
                .order('name');

            if (studentsError) throw studentsError;

            // 2. Fetch existing attendance records for this session
            const { data: records, error: recordsError } = await supabase
                .from('attendance_records')
                .select('student_id, status')
                .eq('session_id', session.id);

            if (recordsError) throw recordsError;

            // Map existing status to state
            const statusMap = {};
            // Initialize all students as 'Present' by default if no record exists? 
            // Or maybe unselected. Let's default to 'Present' for easier marking.
            studentsData.forEach(s => {
                const existing = records.find(r => r.student_id === s.id);
                statusMap[s.id] = existing ? existing.status : 'Present';
            });

            setStudents(studentsData);
            setAttendanceStatus(statusMap);

        } catch (err) {
            console.error('Error fetching students/records:', err);
            setError('Failed to load student list.');
        } finally {
            setMarkingLoading(false);
        }
    };

    const handleStatusChange = (studentId, status) => {
        setAttendanceStatus(prev => ({
            ...prev,
            [studentId]: status
        }));
    };

    const saveAttendance = async () => {
        setMarkingLoading(true);
        try {
            const upsertData = students.map(student => ({
                session_id: currentSession.id,
                student_id: student.id,
                status: attendanceStatus[student.id],
                // We need to handle conflict on unique constraint (session_id, student_id)
            }));

            // Supabase upsert
            const { error } = await supabase
                .from('attendance_records')
                .upsert(upsertData, { onConflict: 'session_id, student_id' });

            if (error) throw error;

            setSuccessMessage('Attendance saved successfully.');
            setIsMarkModalOpen(false);
        } catch (err) {
            console.error('Error saving attendance:', err);
            setError('Failed to save attendance records.');
        } finally {
            setMarkingLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Present': return 'bg-green-100 text-green-800';
            case 'Absent': return 'bg-red-100 text-red-800';
            case 'Late': return 'bg-yellow-100 text-yellow-800';
            case 'Excused': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Attendance Management"
                actionLabel="Generate Schedule"
                onAction={() => setIsGenerateModalOpen(true)}
            />

            {/* Filters */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-pastel border border-gray-100 dark:border-slate-800 flex flex-wrap gap-4 items-center">
                <div className="flex items-center space-x-2">
                    <Calendar size={20} className="text-gray-400" />
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                    />
                </div>
                <div className="flex items-center space-x-2">
                    <Filter size={20} className="text-gray-400" />
                    <select
                        value={selectedGroup}
                        onChange={(e) => setSelectedGroup(e.target.value)}
                        className="rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border w-48 transition-all"
                    >
                        <option value="">All Groups</option>
                        {groups.map(g => (
                            <option key={g} value={g}>{g}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Alerts */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/10 text-red-500 dark:text-red-400 p-4 rounded-xl mb-4 text-sm flex justify-between items-center border border-red-100 dark:border-red-900/30">
                    <span className="font-semibold">{error}</span>
                    <button onClick={() => setError(null)} className="text-xs font-bold uppercase tracking-widest hover:underline">Dismiss</button>
                </div>
            )}
            {successMessage && (
                <div className="bg-green-50 dark:bg-green-900/10 text-green-500 dark:text-green-400 p-4 rounded-xl mb-4 text-sm flex justify-between items-center border border-green-100 dark:border-green-900/30">
                    <span className="font-semibold">{successMessage}</span>
                    <button onClick={() => setSuccessMessage(null)} className="text-xs font-bold uppercase tracking-widest hover:underline">Dismiss</button>
                </div>
            )}

            {/* Sessions List */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-pastel border border-gray-100 dark:border-slate-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-50 dark:border-slate-800 font-bold text-gray-700 dark:text-gray-200 uppercase tracking-widest text-xs bg-slate-50/50 dark:bg-slate-950/50">
                    Sessions for {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>

                {loading ? (
                    <div className="p-8 text-center text-gray-400 italic">Loading sessions...</div>
                ) : sessions.length === 0 ? (
                    <div className="p-12 text-center text-gray-400 flex flex-col items-center">
                        <Calendar size={48} className="mb-4 opacity-10" />
                        <p className="italic">No sessions found for this date.</p>
                        <p className="text-xs mt-2 uppercase tracking-widest font-bold">Try changing the date or generating a schedule.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50 dark:divide-slate-800">
                        {sessions.map(session => (
                            <div key={session.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center group">
                                <div className="space-y-1 mb-4 sm:mb-0">
                                    <div className="flex items-center space-x-2">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                                            {session.subjects?.code} - {session.subjects?.name}
                                        </h3>
                                        <span className={`px-2 py-0.5 rounded-lg text-[10px] uppercase tracking-widest font-bold bg-pastel-indigo text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300`}>
                                            {session.class_type || 'Class'}
                                        </span>
                                    </div>
                                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 space-x-4">
                                        <span className="flex items-center"><Clock size={14} className="mr-1 opacity-70" /> {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}</span>
                                        <span className="flex items-center"><MapPin size={14} className="mr-1 opacity-70" /> {session.room || 'No Room'}</span>
                                        <span className="flex items-center"><User size={14} className="mr-1 opacity-70" /> {session.lecturers?.name || 'No Lecturer'}</span>
                                        <span className="flex items-center font-bold text-primary dark:text-indigo-300 uppercase tracking-wider">Group: {session.group_name}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => openMarkModal(session)}
                                    className="px-6 py-2 bg-primary hover:opacity-90 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-sm"
                                >
                                    Mark Attendance
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Generate Schedule Modal */}
            <Modal
                isOpen={isGenerateModalOpen}
                onClose={() => setIsGenerateModalOpen(false)}
                title="Generate Semester Schedule"
            >
                <form onSubmit={handleGenerateSessions} className="space-y-4">
                    <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl text-sm text-amber-700 dark:text-amber-300 mb-4 flex items-start border border-amber-100 dark:border-amber-900/30 shadow-sm">
                        <AlertCircle size={18} className="mt-0.5 mr-3 flex-shrink-0 opacity-80" />
                        <p className="font-medium leading-relaxed">This will generate attendance sessions for all classes in the timetable within the selected date range. Existing sessions will not be duplicated.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Semester Start Date</label>
                        <input
                            type="date"
                            required
                            className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                            value={semesterStart}
                            onChange={(e) => setSemesterStart(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Semester End Date</label>
                        <input
                            type="date"
                            required
                            className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                            value={semesterEnd}
                            onChange={(e) => setSemesterEnd(e.target.value)}
                        />
                    </div>

                    <div className="flex justify-end pt-6 border-t border-gray-50 dark:border-slate-800 mt-6">
                        <button
                            type="button"
                            onClick={() => setIsGenerateModalOpen(false)}
                            className="mr-3 px-6 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold uppercase tracking-widest text-gray-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={generateLoading}
                            className="px-6 py-2 border border-transparent rounded-xl shadow-sm text-xs font-bold uppercase tracking-widest text-white bg-primary hover:opacity-90 disabled:opacity-50 transition-all"
                        >
                            {generateLoading ? 'Generating...' : 'Generate Schedule'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Mark Attendance Modal */}
            <Modal
                isOpen={isMarkModalOpen}
                onClose={() => setIsMarkModalOpen(false)}
                title={currentSession ? `Mark Attendance: ${currentSession.subjects?.code} (${currentSession.group_name})` : 'Mark Attendance'}
            >
                <div>
                    {markingLoading && !students.length ? (
                        <div className="p-8 text-center text-gray-400 italic">Loading student list...</div>
                    ) : (
                        <>
                            <div className="mb-6 flex justify-between items-center">
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{students.length} Students</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newStatus = {};
                                        students.forEach(s => newStatus[s.id] = 'Present');
                                        setAttendanceStatus(newStatus);
                                    }}
                                    className="text-[10px] font-bold uppercase tracking-widest text-primary hover:opacity-80 transition-all flex items-center"
                                >
                                    <CheckCircle size={14} className="mr-1" />
                                    Mark All Present
                                </button>
                            </div>

                            <div className="max-h-[50vh] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                                {students.map(student => (
                                    <div key={student.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 transition-all hover:shadow-sm">
                                        <div className="mb-3 sm:mb-0">
                                            <p className="font-bold text-gray-900 dark:text-white text-sm">{student.name}</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{student.matric_no}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {['Present', 'Absent', 'Late', 'Excused'].map(status => (
                                                <button
                                                    key={status}
                                                    type="button"
                                                    onClick={() => handleStatusChange(student.id, status)}
                                                    className={`
                                                        px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all border
                                                        ${attendanceStatus[student.id] === status
                                                            ? `${getStatusColor(status)} border-transparent shadow-sm scale-105`
                                                            : 'bg-white dark:bg-slate-800 text-gray-400 border-gray-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                                                        }
                                                    `}
                                                >
                                                    {status}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end pt-6 mt-6 border-t border-gray-50 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setIsMarkModalOpen(false)}
                                    className="mr-3 px-6 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold uppercase tracking-widest text-gray-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={saveAttendance}
                                    disabled={markingLoading}
                                    className="px-6 py-2 border border-transparent rounded-xl shadow-pastel text-xs font-bold uppercase tracking-widest text-white bg-primary hover:opacity-90 disabled:opacity-50 transition-all"
                                >
                                    {markingLoading ? 'Saving...' : 'Save Attendance'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default Attendance;
