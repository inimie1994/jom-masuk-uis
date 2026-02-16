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
    ArrowRight
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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.lecturer_id) {
            fetchDashboardData();
        }
    }, [user?.lecturer_id]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const lecturerId = user.lecturer_id;

            // 1. Get total classes
            const { count: classesCount } = await supabase
                .from('classes')
                .select('*', { count: 'exact', head: true })
                .eq('lecturer_id', lecturerId);

            // 2. Get total distinct subjects
            const { data: classSubjects } = await supabase
                .from('classes')
                .select('subject_id')
                .eq('lecturer_id', lecturerId);

            const uniqueSubjects = new Set(classSubjects?.map(c => c.subject_id));

            // 3. Get upcoming classes (sessions)
            // Retrieve sessions from attendance_sessions where lecturer is assigned to the class
            // But attendance_sessions links to subject, not class directly in my previous schema?
            // Let's check schema. attendance_sessions has subject_id.
            // Wait, attendance_sessions are creating for the semester.
            // We need to find which sessions belong to this lecturer.
            // Classes table links Subject + Lecturer.
            // So if I teach Subject A, all sessions for Subject A are "mine"?
            // Not necessarily if there are multiple lecturers for same subject (different sections).
            // My schema for attendance_sessions has `subject_id` and `class_type`, maybe `group_id`.
            // Let's look at `attendance_sessions` again.
            // It has `subject_id` and `student_group`.
            // I need to find classes where lecturer_id = me, and match subject_id and student_group.

            const today = new Date().toISOString().split('T')[0];

            // Detailed query: Find my classes first
            const { data: myClasses } = await supabase
                .from('classes')
                .select('subject_id, student_group, subjects(name, code)')
                .eq('lecturer_id', lecturerId);

            if (myClasses && myClasses.length > 0) {
                // Construct a filter for attendance_sessions
                // (subject_id, student_group) IN ...
                // Supabase doesn't support tuple IN directly easily.
                // We can fetch upcoming sessions and filter in JS for now (not efficient but works for MVP).

                const { data: sessions } = await supabase
                    .from('attendance_sessions')
                    .select('*, subjects(code, name)')
                    .gte('date', today)
                    .order('date', { ascending: true })
                    .order('start_time', { ascending: true })
                    .limit(20); // fetch some, then filter

                const mySessions = sessions?.filter(s => {
                    return myClasses.some(c => c.subject_id === s.subject_id && c.student_group === s.student_group);
                }).slice(0, 5) || [];

                setUpcomingClasses(mySessions);
            }

            setStats({
                classes: classesCount || 0,
                students: 0, // TODO: Count distinct students in enrollments for my classes
                subjects: uniqueSubjects.size
            });

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
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-white">-</h3>
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
                                            <span className="flex items-center"><MapPin size={14} className="mr-1" /> {session.student_group}</span>
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
        </div>
    );
};

export default LecturerDashboard;
