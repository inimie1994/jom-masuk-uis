import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabaseClient';
import PageHeader from '../components/common/PageHeader';
import {
    Users,
    BookOpen,
    Calendar,
    Clock,
    MapPin,
    ArrowRight,
    ClipboardList,
    GraduationCap,
    AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

const LecturerDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        classes: 0,
        marketingStudents: 0, // placeholder name
        subjects: 0
    });
    const [workloads, setWorkloads] = useState([]);
    const [upcomingClasses, setUpcomingClasses] = useState([]);
    const [myClasses, setMyClasses] = useState([]);
    const [mySubjects, setMySubjects] = useState([]);
    const [recentAssessments, setRecentAssessments] = useState([]);
    const [pendingAttendance, setPendingAttendance] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.lecturer_id) {
            fetchDashboardData();
        } else if (user) {
            // If user is loaded but no lecturer_id, stop loading to show access restricted
            setLoading(false);
        }
    }, [user?.lecturer_id, user]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const lecturerId = user.lecturer_id;
            const now = new Date();
            const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

            // 1. Fetch Timetable (Source of Truth for Active Classes)
            const { data: timetableData, error: timetableError } = await supabase
                .from('timetable')
                .select('id, subject_id, group_names, subjects(name, code)')
                .eq('lecturer_id', lecturerId);

            if (timetableError) throw timetableError;

            const timetableItems = timetableData || [];

            // Derive unique subject IDs and Groups
            const subjectMap = new Map();
            const groupMap = new Map(); // group_name -> Set(subject_id)

            timetableItems.forEach(t => {
                if (t.subjects) subjectMap.set(t.subject_id, t.subjects);
                const groups = Array.isArray(t.group_names) ? t.group_names : [t.group_names];
                groups.forEach(groupName => {
                    if (groupName) {
                        if (!groupMap.has(groupName)) {
                            groupMap.set(groupName, new Set());
                        }
                        groupMap.get(groupName).add(t.subject_id);
                    }
                });
            });

            const uniqueSubjectIds = Array.from(subjectMap.keys());
            const uniqueGroups = Array.from(groupMap.keys());

            setMyClasses(timetableItems.map(t => ({
                ...t,
                type: 'timetable',
                section: Array.isArray(t.group_names) ? t.group_names.join(', ') : t.group_names
            })));
            setMySubjects(Array.from(subjectMap.values()));

            // 2. Total Students
            // Fetch students who are in the groups I teach
            let totalStudentsCount = 0;
            if (uniqueGroups.length > 0) {
                // We need to count unique students in these groups
                // Optimally: Get count of students where student_group IN uniqueGroups
                // But we only want to count them if they are taking a subject I teach? 
                // "Total Students" usually implies total enrollment count.
                // Let's stick to the logic: Count students in my groups.

                const { count } = await supabase
                    .from('students')
                    .select('*', { count: 'exact', head: true })
                    .in('student_group', uniqueGroups);

                totalStudentsCount = count || 0;
            }

            // 3. Active/Upcoming Assessments
            let assessmentsData = [];
            if (uniqueSubjectIds.length > 0) {
                const { data } = await supabase
                    .from('assessments')
                    .select('*, subjects(code, name)')
                    .in('subject_id', uniqueSubjectIds)
                    .gte('date', today)
                    .order('date', { ascending: true })
                    .limit(5);
                assessmentsData = data || [];
            }
            setRecentAssessments(assessmentsData);

            // 4. Update Stats
            setStats({
                classes: timetableItems.length, // Number of slots/classes
                students: totalStudentsCount,
                subjects: subjectMap.size
            });

            // 5. Upcoming Sessions (Attendance)
            const { data: upcoming } = await supabase
                .from('attendance_sessions')
                .select('*, subjects(code, name)')
                .eq('lecturer_id', lecturerId)
                .gte('date', today)
                .order('date', { ascending: true })
                .order('start_time', { ascending: true })
                .limit(5);

            setUpcomingClasses(upcoming || []);

            // 6. Pending Attendance
            // Logic: Find past sessions for my groups/subjects that have NO records
            // To do this efficiently, we can query attendance_sessions where 
            // lecturer_id = me AND date < today AND NOT EXISTS (records)
            // Supabase doesn't support NOT EXISTS easily in JS client without RPC or manual filter.
            // We'll keep the existing fetch-then-filter approach but restrict it to my groups if needed.
            // Actually, querying by lecturer_id is safe enough.

            const { data: pastSessions } = await supabase
                .from('attendance_sessions')
                .select('id, date, start_time, group_names, subjects(code, name), attendance_records(id)')
                .eq('lecturer_id', lecturerId)
                .lt('date', today)
                .order('date', { ascending: false })
                .limit(20); // slightly higher limit to find pending ones

            const pending = pastSessions?.filter(s => !s.attendance_records || s.attendance_records.length === 0).slice(0, 10) || [];
            setPendingAttendance(pending);

            // 7. Workload
            // We can re-use timetable data if we want, or fetch workload table if it tracks official hours distinct from timetable.
            // Assuming 'workload' table is the official source for "Hours/Week".
            const { data: wData } = await supabase
                .from('workload')
                .select('*, subjects(code, name)')
                .eq('lecturer_id', lecturerId);
            setWorkloads(wData || []);

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <span className="ml-3 text-gray-500 font-medium">Loading your dashboard...</span>
            </div>
        );
    }

    if (!user?.lecturer_id) {
        return <div className="p-8 text-center text-gray-500 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700">Access Restricted. Not a registered lecturer.</div>;
    }

    return (
        <div className="space-y-6">
            <header className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome back, {user.email}</h1>
                <p className="text-gray-500 dark:text-gray-400">Here's what's happening today.</p>
            </header>

            {pendingAttendance.length > 0 && (
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/30 rounded-lg p-4 mb-6">
                    <div className="flex items-start">
                        <AlertCircle className="text-orange-600 dark:text-orange-400 mt-0.5 mr-3" size={20} />
                        <div className="flex-1">
                            <h3 className="text-sm font-bold text-orange-800 dark:text-orange-300">Action Required: Pending Attendance</h3>
                            <p className="text-sm text-orange-700 dark:text-orange-400 mt-1 mb-2">
                                You have {pendingAttendance.length} past sessions that need attendance marking.
                            </p>
                            <div className="space-y-1">
                                {pendingAttendance.map(session => (
                                    <Link
                                        key={session.id}
                                        to={`/attendance?session=${session.id}`}
                                        className="block text-xs font-medium text-orange-900 dark:text-orange-200 hover:underline"
                                    >
                                        • {new Date(session.date).toLocaleDateString()} - {session.subjects?.code || 'Unknown'} ({Array.isArray(session.group_names) ? session.group_names.join(', ') : (session.group_names || 'No Group')})
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
                            <BookOpen size={24} />
                        </div>
                        <span className="text-sm font-medium text-gray-500 dark:text-slate-400">Subjects</span>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{stats.subjects}</h3>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400">
                            <Calendar size={24} />
                        </div>
                        <span className="text-sm font-medium text-gray-500 dark:text-slate-400">Active Classes</span>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{stats.classes}</h3>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
                            <Users size={24} />
                        </div>
                        <span className="text-sm font-medium text-gray-500 dark:text-slate-400">Total Students</span>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{stats.students}</h3>
                    <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">across all sections</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
                <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upcoming Sessions</h2>
                    <Link to="/attendance" className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center">
                        View All <ArrowRight size={16} className="ml-1" />
                    </Link>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-slate-700">
                    <div className="space-y-4">
                        {upcomingClasses.length === 0 ? (
                            <div className="text-center py-4 text-gray-500 italic">No upcoming sessions.</div>
                        ) : (
                            upcomingClasses.map(session => (
                                <div key={session.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900/40 rounded-xl border border-gray-100 dark:border-slate-700">
                                    <div className="flex items-center">
                                        <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl flex flex-col items-center justify-center border border-gray-100 dark:border-slate-600 mr-4 shadow-sm">
                                            <span className="text-[10px] font-bold uppercase text-gray-400">{new Date(session.date).toLocaleString('default', { month: 'short' })}</span>
                                            <span className="text-lg font-bold text-gray-900 dark:text-white leading-none">{new Date(session.date).getDate()}</span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white">
                                                {session.subjects?.name || `Subject (ID: ${session.subject_id?.substring(0, 5)})`}
                                            </h4>
                                            <div className="flex items-center mt-1 space-x-3">
                                                <span className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                                    <Clock size={12} className="mr-1" /> {session.start_time.substring(0, 5)} - {session.end_time.substring(0, 5)}
                                                </span>
                                                <span className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                                    <MapPin size={12} className="mr-1" /> {session.location || 'Classroom'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <Link
                                        to={`/attendance?session=${session.id}`}
                                        className="px-4 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-lg text-xs font-bold hover:bg-slate-900 transition-colors"
                                    >
                                        Mark Attendance
                                    </Link>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* My Subjects Widget */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
                    <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">My Classes</h2>
                        <Link to="/subjects" className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center">
                            View All <ArrowRight size={16} className="ml-1" />
                        </Link>
                    </div>
                    <div className="p-6">
                        {mySubjects.length === 0 ? (
                            <div className="text-center text-gray-500 dark:text-gray-400">
                                No subjects assigned.
                            </div>
                        ) : (
                            <ul className="space-y-3">
                                {mySubjects.map((subject, idx) => (
                                    <li key={idx} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-slate-900/40 rounded-lg border border-gray-100 dark:border-slate-700">
                                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
                                            <BookOpen size={18} />
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-900 dark:text-white">{subject.code}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">{subject.name}</div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* My Classes Widget */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
                    <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">My Classes</h2>
                        <Link to="/lecturer-timetable" className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center">
                            View Timetable <ArrowRight size={16} className="ml-1" />
                        </Link>
                    </div>
                    <div className="p-6">
                        {myClasses.length === 0 ? (
                            <div className="text-center text-gray-500 dark:text-gray-400">
                                No classes assigned yet.
                            </div>
                        ) : (
                            <ul className="space-y-3">
                                {myClasses.map((cls, idx) => (
                                    <li key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900/40 rounded-lg border border-gray-100 dark:border-slate-700">
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400">
                                                <GraduationCap size={18} />
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-white">{cls.subjects?.code}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">{cls.subjects?.name}</div>
                                            </div>
                                        </div>
                                        {cls.section && (
                                            <span className="px-2 py-1 text-xs font-semibold bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded text-gray-600 dark:text-gray-300">
                                                {cls.section}
                                            </span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* My Workload Widget */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
                    <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">My Workload</h2>
                        <span className="text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 px-2 py-1 rounded-full">
                            {workloads.reduce((acc, curr) => acc + curr.hours, 0)} Hours/Week
                        </span>
                    </div>
                    <div className="p-6">
                        {workloads.length === 0 ? (
                            <div className="text-center text-gray-500 dark:text-gray-400">
                                No workload assigned.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {workloads.map((work) => (
                                    <div key={work.id} className="flex items-start p-3 bg-gray-50 dark:bg-slate-900/40 rounded-lg border border-gray-100 dark:border-slate-700">
                                        <div className={`p-2 rounded-lg mr-3 ${work.type === 'Lecture' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' :
                                            work.type === 'Tutorial' ? 'bg-green-100 text-green-600 dark:bg-green-900/30' :
                                                'bg-orange-100 text-orange-600 dark:bg-orange-900/30'
                                            }`}>
                                            <Clock size={18} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between">
                                                <h4 className="font-semibold text-sm text-gray-900 dark:text-white">{work.subjects?.code}</h4>
                                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{work.hours}h</span>
                                            </div>
                                            <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">{work.subjects?.name}</p>
                                            <div className="flex items-center mt-2 text-xs text-gray-500 dark:text-gray-400 space-x-3">
                                                <span className="flex items-center font-medium">
                                                    {work.type}
                                                </span>
                                                {work.student_group && (
                                                    <span className="flex items-center px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-600">
                                                        <Users size={10} className="mr-1" />
                                                        {work.student_group}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Active Assessments Widget */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
                    <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Active Assessments</h2>
                        <Link to="/assessments" className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center">
                            Manage <ArrowRight size={16} className="ml-1" />
                        </Link>
                    </div>
                    <div className="p-6">
                        {recentAssessments.length === 0 ? (
                            <div className="text-center text-gray-500 dark:text-gray-400">
                                No active assessments.
                            </div>
                        ) : (
                            <ul className="space-y-3">
                                {recentAssessments.map((assessment) => (
                                    <li key={assessment.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900/40 rounded-lg border border-gray-100 dark:border-slate-700">
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full text-orange-600 dark:text-orange-400">
                                                <ClipboardList size={18} />
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-white">{assessment.name || assessment.title}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">{assessment.subjects?.code}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs font-bold text-gray-900 dark:text-white">
                                                {assessment.date ? new Date(assessment.date).toLocaleDateString() : 'No Date'}
                                            </div>
                                            <div className="text-[10px] text-gray-500 dark:text-gray-400">Due Date</div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div >
    );
};

export default LecturerDashboard;
