import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabaseClient';
import PageHeader from '../components/common/PageHeader';
import LecturerReports from './LecturerReports';
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
import { Filter } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const Reports = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);

    // Tabs state
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'lecturer'

    // Lecturer Tab States
    const [lecturers, setLecturers] = useState([]);
    const [selectedLecturer, setSelectedLecturer] = useState('');

    // Data States
    const [enrollmentData, setEnrollmentData] = useState([]);
    const [attendanceData, setAttendanceData] = useState([]);
    const [gradeData, setGradeData] = useState([]);

    // Filters
    const [subjects, setSubjects] = useState([]);
    const [selectedSubjectForGrades, setSelectedSubjectForGrades] = useState('');

    useEffect(() => {
        if (user?.faculty_id) {
            fetchAllData();
            fetchLecturers();
        }
    }, [user?.faculty_id]);

    useEffect(() => {
        if (selectedSubjectForGrades) {
            fetchGradeDistribution();
        }
    }, [selectedSubjectForGrades]);

    const fetchAllData = async () => {
        setLoading(true);
        await Promise.all([
            fetchEnrollmentStats(),
            fetchAttendanceTrends(),
            fetchSubjects()
        ]);
        setLoading(false);
    };

    const fetchLecturers = async () => {
        const { data } = await supabase
            .from('lecturers')
            .select('id, name')
            .eq('faculty_id', user.faculty_id)
            .order('name');
        setLecturers(data || []);
        if (data && data.length > 0) {
            setSelectedLecturer(data[0].id);
        }
    };

    const fetchSubjects = async () => {
        const { data } = await supabase
            .from('subjects')
            .select('id, code, name')
            .eq('faculty_id', user.faculty_id);

        setSubjects(data || []);
        if (data && data.length > 0) {
            setSelectedSubjectForGrades(data[0].id);
        }
    };

    const fetchEnrollmentStats = async () => {
        try {
            // Get all enrollments and join with classes -> subjects
            const { data, error } = await supabase
                .from('enrollments')
                .select(`
                    class_id,
                    classes (
                        subject_id,
                        subjects (code)
                    )
                `);

            if (error) throw error;

            // Group by Subject Code
            const stats = {};
            data.forEach(e => {
                const code = e.classes?.subjects?.code;
                if (code) {
                    stats[code] = (stats[code] || 0) + 1;
                }
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
            // fetch last 10 sessions with their attendance records
            const { data: sessions, error } = await supabase
                .from('attendance_sessions')
                .select(`
                    id,
                    date,
                    subjects(code),
                    attendance_records(status)
                `)
                .eq('faculty_id', user.faculty_id)
                .order('date', { ascending: true })
                .limit(20);

            if (error) throw error;

            // Calculate attendance rate per session
            const trends = sessions.map(session => {
                const total = session.attendance_records.length;
                if (total === 0) return null;

                const present = session.attendance_records.filter(r => r.status === 'Present' || r.status === 'Late').length;
                const rate = (present / total) * 100;

                return {
                    date: `${new Date(session.date).toLocaleDateString()} (${session.subjects?.code})`,
                    rate: parseFloat(rate.toFixed(1))
                };
            }).filter(Boolean);

            setAttendanceData(trends);
        } catch (error) {
            console.error('Error fetching attendance trends:', error);
        }
    };

    const fetchGradeDistribution = async () => {
        if (!selectedSubjectForGrades) return;

        try {
            // Get all assessments for this subject
            const { data: assessments } = await supabase
                .from('assessments')
                .select('id')
                .eq('subject_id', selectedSubjectForGrades);

            const assessmentIds = assessments?.map(a => a.id) || [];

            if (assessmentIds.length === 0) {
                setGradeData([]);
                return;
            }

            // Get all grades for these assessments
            const { data: grades } = await supabase
                .from('grades')
                .select('marks_obtained, assessment_id, assessments(total_marks)')
                .in('assessment_id', assessmentIds);

            // Normalize to percentage and bucket
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
            }));

            setGradeData(chartData);

        } catch (error) {
            console.error('Error fetching grade distribution:', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <PageHeader title="Reports & Analytics" />

                {/* Tabs */}
                <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-lg mt-4 sm:mt-0">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === 'overview' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
                    >
                        Faculty Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('lecturer')}
                        className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === 'lecturer' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
                    >
                        Lecturer Reports
                    </button>
                </div>
            </div>

            {activeTab === 'overview' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Enrollment Chart */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Student Enrollment per Subject</h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={enrollmentData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                                        itemStyle={{ color: '#fff' }}
                                        cursor={{ fill: 'transparent' }}
                                    />
                                    <Bar dataKey="students" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Attendance Chart */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Attendance Trends</h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={attendanceData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} angle={-15} textAnchor="end" height={60} />
                                    <YAxis domain={[0, 100]} stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Grades Chart */}
                    <div className="col-span-1 lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 sm:mb-0">Grade Distribution</h3>

                            <div className="flex items-center space-x-2">
                                <Filter size={16} className="text-gray-400" />
                                <select
                                    value={selectedSubjectForGrades}
                                    onChange={(e) => setSelectedSubjectForGrades(e.target.value)}
                                    className="block w-48 rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-slate-700 dark:text-white px-3 py-1.5 border"
                                >
                                    {subjects.map(s => (
                                        <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="h-80 flex justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={gradeData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {gradeData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
                    <div className="flex items-center space-x-4 mb-6">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Lecturer:</label>
                        <select
                            value={selectedLecturer}
                            onChange={(e) => setSelectedLecturer(e.target.value)}
                            className="block w-64 rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-slate-700 dark:text-white px-3 py-2 border"
                        >
                            {lecturers.map(l => (
                                <option key={l.id} value={l.id}>{l.name}</option>
                            ))}
                        </select>
                    </div>

                    {selectedLecturer ? (
                        <div className="mt-4 pt-4">
                            <LecturerReports adminViewLecturerId={selectedLecturer} />
                        </div>
                    ) : (
                        <p className="text-gray-500 text-sm">Please select a lecturer to view their reports.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default Reports;
