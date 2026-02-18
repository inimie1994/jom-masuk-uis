import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabaseClient';
import PageHeader from '../components/common/PageHeader';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { Filter, UserCheck, BookOpen, Calendar, Activity } from 'lucide-react';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const LecturerReports = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);

    // Data States
    const [enrollmentData, setEnrollmentData] = useState([]);
    const [attendanceData, setAttendanceData] = useState([]);
    const [gradeData, setGradeData] = useState([]);

    // Filters
    const [subjects, setSubjects] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState('');

    useEffect(() => {
        if (user?.lecturer_id) {
            fetchLecturerSubjects();
        }
    }, [user?.lecturer_id]);

    useEffect(() => {
        if (selectedSubject) {
            fetchSubjectData();
        }
    }, [selectedSubject]);

    const fetchLecturerSubjects = async () => {
        try {
            setLoading(true);
            // Get subjects from workload
            const { data, error } = await supabase
                .from('workload')
                .select(`
                    subject_id,
                    subjects (id, code, name)
                `)
                .eq('lecturer_id', user.lecturer_id);

            if (error) throw error;

            // Unique subjects
            const uniqueSubjects = [];
            const seen = new Set();
            data?.forEach(item => {
                if (item.subjects && !seen.has(item.subjects.id)) {
                    seen.add(item.subjects.id);
                    uniqueSubjects.push(item.subjects);
                }
            });

            setSubjects(uniqueSubjects);
            if (uniqueSubjects.length > 0) {
                setSelectedSubject(uniqueSubjects[0].id);
            } else {
                setLoading(false);
            }
        } catch (error) {
            console.error('Error fetching lecturer subjects:', error);
            setLoading(false);
        }
    };

    const fetchSubjectData = async () => {
        setLoading(true);
        await Promise.all([
            fetchEnrollmentStats(),
            fetchAttendanceTrends(),
            fetchGradeDistribution()
        ]);
        setLoading(false);
    };

    const fetchEnrollmentStats = async () => {
        try {
            // Get groups taught by the lecturer for this subject from timetable
            const { data: timetableData } = await supabase
                .from('timetable')
                .select('group_names')
                .eq('lecturer_id', user.lecturer_id)
                .eq('subject_id', selectedSubject);

            const myGroups = [...new Set(timetableData?.flatMap(t => Array.isArray(t.group_names) ? t.group_names : [t.group_names]))].filter(Boolean);

            if (myGroups.length === 0) {
                setEnrollmentData([]);
                return;
            }

            const { data, error } = await supabase
                .from('students')
                .select('student_group')
                .in('student_group', myGroups);

            if (error) throw error;

            const stats = {};
            data.forEach(s => {
                const group = s.student_group;
                stats[group] = (stats[group] || 0) + 1;
            });

            const chartData = Object.keys(stats).map(key => ({
                name: key,
                students: stats[key]
            }));

            setEnrollmentData(chartData);
        } catch (error) {
            console.error('Error fetching enrollment stats:', error);
        }
    };

    const fetchAttendanceTrends = async () => {
        try {
            const { data: sessions, error } = await supabase
                .from('attendance_sessions')
                .select(`
                    id,
                    date,
                    attendance_records(status)
                `)
                .eq('lecturer_id', user.lecturer_id)
                .eq('subject_id', selectedSubject)
                .order('date', { ascending: true })
                .limit(20);

            if (error) throw error;

            const trends = sessions.map(session => {
                const total = session.attendance_records?.length || 0;
                if (total === 0) return null;

                const present = session.attendance_records.filter(r => r.status === 'Present' || r.status === 'Late').length;
                const rate = (present / total) * 100;

                return {
                    date: new Date(session.date).toLocaleDateString(),
                    rate: parseFloat(rate.toFixed(1))
                };
            }).filter(Boolean);

            setAttendanceData(trends);
        } catch (error) {
            console.error('Error fetching attendance trends:', error);
        }
    };

    const fetchGradeDistribution = async () => {
        try {
            // 1. Get groups I teach
            const { data: timetableData } = await supabase
                .from('timetable')
                .select('group_names')
                .eq('lecturer_id', user.lecturer_id)
                .eq('subject_id', selectedSubject);

            const myGroups = [...new Set(timetableData?.flatMap(t => Array.isArray(t.group_names) ? t.group_names : [t.group_names]))].filter(Boolean);

            if (myGroups.length === 0) {
                setGradeData([]);
                return;
            }

            // 2. Get students in these groups
            const { data: myStudents } = await supabase
                .from('students')
                .select('id')
                .in('student_group', myGroups);

            const studentIds = myStudents?.map(s => s.id) || [];

            if (studentIds.length === 0) {
                setGradeData([]);
                return;
            }

            // 3. Get assessments for this subject
            const { data: assessments } = await supabase
                .from('assessments')
                .select('id')
                .eq('subject_id', selectedSubject);

            const assessmentIds = assessments?.map(a => a.id) || [];

            if (assessmentIds.length === 0) {
                setGradeData([]);
                return;
            }

            // 4. Get grades for my students in these assessments
            const { data: grades } = await supabase
                .from('grades')
                .select('marks_obtained, assessments(total_marks)')
                .in('assessment_id', assessmentIds)
                .in('student_id', studentIds);

            const buckets = { 'A (80%+)': 0, 'B (60-79%)': 0, 'C (50-59%)': 0, 'D (40-49%)': 0, 'F (<40%)': 0 };

            grades?.forEach(g => {
                const total = g.assessments?.total_marks || 100;
                const percentage = (g.marks_obtained / total) * 100;

                if (percentage >= 80) buckets['A (80%+)']++;
                else if (percentage >= 60) buckets['B (60-79%)']++;
                else if (percentage >= 50) buckets['C (50-59%)']++;
                else if (percentage >= 40) buckets['D (40-49%)']++;
                else buckets['F (<40%)']++;
            });

            const chartData = Object.keys(buckets).map(key => ({
                name: key,
                value: buckets[key]
            })).filter(d => d.value > 0);

            setGradeData(chartData);
        } catch (error) {
            console.error('Error fetching grade distribution:', error);
        }
    };

    if (loading && subjects.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <span className="ml-3 text-gray-500 font-medium tracking-wide">Analysing performance data...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <PageHeader title="Subject Performance Reports" />

            {/* Subject Selector */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
                <div className="flex items-center space-x-4">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-600 dark:text-indigo-400">
                        <BookOpen size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white leading-tight">Select Subject</h3>
                        <p className="text-sm text-gray-500 dark:text-slate-400">Viewing analytics for class segments you manage</p>
                    </div>
                </div>

                <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="block w-full sm:w-72 rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm font-medium dark:bg-slate-900 dark:text-white px-4 py-2.5 border transition-all hover:border-indigo-300 outline-none"
                >
                    {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                    ))}
                </select>
            </div>

            {subjects.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 p-16 rounded-3xl text-center shadow-sm border border-gray-100 dark:border-slate-800">
                    <div className="max-w-xs mx-auto">
                        <Calendar size={64} className="mx-auto text-gray-200 dark:text-slate-700 mb-6" />
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Assignments Detected</h3>
                        <p className="text-gray-500 dark:text-slate-400">Reports will be available once subjects are assigned to your workload.</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Enrollment per Group */}
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 hover:shadow-pastel transition-all">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-8 flex items-center">
                            <UserCheck size={20} className="mr-3 text-indigo-500" />
                            Enrollment Breakdown
                        </h3>
                        <div className="h-72">
                            {enrollmentData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={enrollmentData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '16px', color: '#fff', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                            itemStyle={{ color: '#bae6fd' }}
                                            cursor={{ fill: 'rgba(79, 70, 229, 0.03)' }}
                                        />
                                        <Bar dataKey="students" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={48} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-400 italic text-sm bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800">No enrollment data available</div>
                            )}
                        </div>
                    </div>

                    {/* Attendance Trends */}
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 hover:shadow-pastel transition-all">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-8 flex items-center">
                            <Activity size={20} className="mr-3 text-emerald-500" />
                            Attendance Tracking
                        </h3>
                        <div className="h-72">
                            {attendanceData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={attendanceData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} angle={-15} textAnchor="end" height={60} />
                                        <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} unit="%" />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '16px', color: '#fff', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                            itemStyle={{ color: '#a7f3d0' }}
                                        />
                                        <Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={5} dot={{ fill: '#10b981', r: 5, strokeWidth: 3, stroke: '#fff' }} activeDot={{ r: 8, strokeWidth: 0 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-400 italic text-sm bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800">No attendance history found</div>
                            )}
                        </div>
                    </div>

                    {/* Grade Distribution */}
                    <div className="col-span-1 lg:col-span-2 bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 hover:shadow-pastel transition-all">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-10 flex items-center">
                            <PieChart size={20} className="mr-3 text-purple-500" />
                            Academic Performance Distribution
                        </h3>
                        <div className="h-96">
                            {gradeData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={gradeData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={80}
                                            outerRadius={140}
                                            paddingAngle={8}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {gradeData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={12} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '16px', color: '#fff', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                            itemStyle={{ color: '#e9d5ff' }}
                                        />
                                        <Legend
                                            verticalAlign="bottom"
                                            height={36}
                                            iconType="circle"
                                            formatter={(value) => <span className="text-sm font-medium text-gray-600 dark:text-slate-400 ml-1">{value}</span>}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-400 italic text-sm bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800">Assessment data not yet published</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LecturerReports;
