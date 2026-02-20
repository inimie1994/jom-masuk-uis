import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabaseClient';
import {
    Users,
    BookOpen,
    Calendar,
    Clock,
    MapPin,
    ArrowRight,
    ClipboardList,
    AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

import HodHopStudents from '../components/dashboard/HodHopStudents';
import HodHopSubjects from '../components/dashboard/HodHopSubjects';
import HodHopTeam from '../components/dashboard/HodHopTeam';

const LecturerDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        classes: 0,
        students: 0,
        subjects: 0
    });
    const [upcomingClasses, setUpcomingClasses] = useState([]);
    const [recentAssessments, setRecentAssessments] = useState([]);
    const [pendingAttendance, setPendingAttendance] = useState([]);
    const [loading, setLoading] = useState(true);

    // Tab State for HOD/HOP
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        if (user?.lecturer_id) {
            fetchDashboardData();
        } else if (user) {
            setLoading(false);
        }
    }, [user?.lecturer_id, user]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const lecturerId = user.lecturer_id;
            const now = new Date();
            const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

            // 1. Fetch Timetable for Stats
            const { data: timetableData } = await supabase
                .from('timetable')
                .select('id, subject_id, group_names')
                .eq('lecturer_id', lecturerId);

            const timetableItems = timetableData || [];
            const subjectIds = [...new Set(timetableItems.map(t => t.subject_id))];
            const groupNames = [...new Set(timetableItems.flatMap(t => Array.isArray(t.group_names) ? t.group_names : [t.group_names]))].filter(Boolean);

            // 2. Total Students Count
            let studentCount = 0;
            if (groupNames.length > 0) {
                const { count } = await supabase
                    .from('students')
                    .select('*', { count: 'exact', head: true })
                    .in('student_group', groupNames);
                studentCount = count || 0;
            }

            setStats({
                classes: timetableItems.length,
                students: studentCount,
                subjects: subjectIds.length
            });

            // 3. Upcoming Sessions
            const { data: upcoming } = await supabase
                .from('attendance_sessions')
                .select('*, subjects(code, name)')
                .eq('lecturer_id', lecturerId)
                .gte('date', today)
                .order('date', { ascending: true })
                .order('start_time', { ascending: true })
                .limit(5);
            setUpcomingClasses(upcoming || []);

            // 4. Pending Attendance
            const { data: pastSessions } = await supabase
                .from('attendance_sessions')
                .select('id, date, start_time, group_names, subjects(code, name), attendance_records(id)')
                .eq('lecturer_id', lecturerId)
                .lt('date', today)
                .order('date', { ascending: false })
                .limit(20);

            const pending = pastSessions?.filter(s => !s.attendance_records || s.attendance_records.length === 0).slice(0, 10) || [];
            setPendingAttendance(pending);

            // 5. Active Assessments
            if (subjectIds.length > 0) {
                const { data: assessments } = await supabase
                    .from('assessments')
                    .select('*, subjects(code, name)')
                    .in('subject_id', subjectIds)
                    .gte('date', today)
                    .order('date', { ascending: true })
                    .limit(5);
                setRecentAssessments(assessments || []);
            }

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

    const isHodOrHop = user?.role === 'hod' || user?.role === 'hop';
    const roleLabel = user?.role === 'hod' ? 'Head of Department' : user?.role === 'hop' ? 'Head of Program' : 'Lecturer';
    const departmentLabel = user?.role === 'hod' && user?.department ? ` - ${user.department}` : '';

    return (
        <div className="space-y-6">
            <header className="mb-8">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome back, {user.name || user.email}</h1>
                        <p className="text-gray-500 dark:text-gray-400">
                            {roleLabel}{departmentLabel} Dashboard • {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                </div>
            </header>

            {isHodOrHop && (
                <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl mb-6 w-fit overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'overview'
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                            }`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('students')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'students'
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                            }`}
                    >
                        My Students
                    </button>
                    <button
                        onClick={() => setActiveTab('subjects')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'subjects'
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                            }`}
                    >
                        My Subjects
                    </button>
                </div>
            )}

            {activeTab === 'overview' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                        <div className="p-6 divide-y divide-gray-200 dark:divide-slate-700">
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

                    <div className="grid grid-cols-1 gap-6">
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
                </div>
            )}

            {activeTab === 'students' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <HodHopStudents />
                </div>
            )}

            {activeTab === 'subjects' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <HodHopSubjects />
                </div>
            )}
        </div>
    );
};

export default LecturerDashboard;
