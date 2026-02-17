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

            // 1. Get my classes (to derive subjects and class IDs)
            const { data: myClassesData } = await supabase
                .from('classes')
                .select('id, subject_id, section, semester, subjects(name, code)')
                .eq('lecturer_id', lecturerId);

            const myClasses = myClassesData || [];
            if (myClasses.length > 0) {
                setMyClasses(myClasses);

                // Derive unique subjects
                const uniqueSubjects = [];
                const seenSubjectIds = new Set();
                myClasses.forEach(cls => {
                    if (!seenSubjectIds.has(cls.subject_id) && cls.subjects) {
                        seenSubjectIds.add(cls.subject_id);
                        uniqueSubjects.push({
                            id: cls.subject_id,
                            code: cls.subjects.code,
                            name: cls.subjects.name
                        });
                    }
                });
                setMySubjects(uniqueSubjects);
            }

            const myClassIds = myClasses.map(c => c.id);
            const mySubjectIds = [...new Set(myClasses.map(c => c.subject_id))];

            // 2. Total Students (Count enrollments in my classes)
            let totalStudentsCount = 0;
            if (myClassIds.length > 0) {
                const { count } = await supabase
                    .from('enrollments')
                    .select('*', { count: 'exact', head: true })
                    .in('class_id', myClassIds);
                totalStudentsCount = count || 0;
            }

            // 3. Active/Upcoming Assessments
            // Fetch assessments for my subjects due on or after today
            let assessmentsData = [];
            if (mySubjectIds.length > 0) {
                const { data } = await supabase
                    .from('assessments')
                    .select('*, subjects(code, name)')
                    .in('subject_id', mySubjectIds)
                    .gte('date', today)
                    .order('date', { ascending: true })
                    .limit(5);
                assessmentsData = data || [];
            }
            setRecentAssessments(assessmentsData);

            // 4. Update Stats
            setStats({
                classes: myClasses.length,
                students: totalStudentsCount,
                subjects: mySubjectIds.length
            });

            // 5. Upcoming Sessions (Today onwards)
            // Fetch sessions for me
            const { data: upcoming } = await supabase
                .from('attendance_sessions')
                .select('*, subjects(code, name)')
                .eq('lecturer_id', lecturerId)
                .gte('date', today)
                .order('date', { ascending: true })
                .order('start_time', { ascending: true })
                .limit(5);

            setUpcomingClasses(upcoming || []);

            // 6. Pending Attendance (Past sessions with no records)
            // Fetch past 10 sessions and check if they have records
            // Note: This is an approximation. Ideally, backend should flag 'status'.
            // for now, we verify if attendance_records exist.
            const { data: pastSessions } = await supabase
                .from('attendance_sessions')
                .select('id, date, start_time, group_name, subjects(code, name), attendance_records(id)')
                .eq('lecturer_id', lecturerId)
                .lt('date', today)
                .order('date', { ascending: false })
                .limit(10);

            // Filter those with 0 records
            const pending = pastSessions?.filter(s => !s.attendance_records || s.attendance_records.length === 0) || [];
            // We can store this in a new state variable
            setPendingAttendance(pending);

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
                                        • {new Date(session.date).toLocaleDateString()} - {session.subjects?.code} ({session.group_name})
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
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Subjects</span>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{stats.subjects}</h3>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400">
                            <Calendar size={24} />
                        </div>
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Classes</span>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{stats.classes}</h3>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
                            <Users size={24} />
                        </div>
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Students</span>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{stats.students}</h3>
                    <p className="text-xs text-gray-500 mt-1">across all sections</p>
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
                    {upcomingClasses.length === 0 ? (
                        <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                            No upcoming classes scheduled soon.
                        </div>
                    ) : (
                        upcomingClasses.map((session) => (
                            <div key={session.id} className="p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors">
                                <div className="flex items-center space-x-4">
                                    <div className="p-3 bg-gray-100 dark:bg-slate-700 rounded-lg text-center min-w-[60px]">
                                        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">{new Date(session.date).toLocaleDateString('en-US', { month: 'short' })}</div>
                                        <div className="text-xl font-bold text-gray-900 dark:text-white">{new Date(session.date).getDate()}</div>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{session.subjects?.code} - {session.subjects?.name}</h4>
                                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1 space-x-4">
                                            <span className="flex items-center"><Clock size={14} className="mr-1" /> {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}</span>
                                            <span className="flex items-center"><MapPin size={14} className="mr-1" /> {session.group_name}</span>
                                        </div>
                                    </div>
                                </div>
                                <Link
                                    to={`/attendance?session=${session.id}`}
                                    className="px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-600"
                                >
                                    Mark Attendance
                                </Link>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* My Subjects Widget */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
                    <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">My Subjects</h2>
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
                                    <li key={idx} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-slate-750 rounded-lg border border-gray-100 dark:border-slate-700">
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
                                    <li key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-750 rounded-lg border border-gray-100 dark:border-slate-700">
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
                                    <li key={assessment.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-750 rounded-lg border border-gray-100 dark:border-slate-700">
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
        </div>
    );
};

export default LecturerDashboard;
