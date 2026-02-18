import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabaseClient';
import PageHeader from '../components/common/PageHeader';
import PrintableWorkloadSheet from '../components/workload/PrintableWorkloadSheet';
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
import { Filter, UserCheck, BookOpen, Calendar, Activity, Printer, FileText } from 'lucide-react';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const LecturerReports = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);

    // Print State
    const [printMode, setPrintMode] = useState(null); // 'subject' or 'workload'
    const [workloadTimetable, setWorkloadTimetable] = useState([]);
    const [workloadStudentCounts, setWorkloadStudentCounts] = useState({});
    const [lecturerDetails, setLecturerDetails] = useState(null);


    // Data States
    const [enrollmentData, setEnrollmentData] = useState([]);
    const [attendanceData, setAttendanceData] = useState([]);
    const [gradeData, setGradeData] = useState([]);

    // Report Data States
    const [syllabusData, setSyllabusData] = useState([]);
    const [allSessions, setAllSessions] = useState([]);
    const [semesterDetails, setSemesterDetails] = useState(null);
    const [totalStudents, setTotalStudents] = useState(0);

    // Filters
    const [subjects, setSubjects] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState('');

    useEffect(() => {
        if (user?.lecturer_id) {
            fetchLecturerSubjects();
            fetchSemesterDetails();
        }
    }, [user?.lecturer_id]);

    useEffect(() => {
        if (selectedSubject) {
            fetchSubjectData();
            fetchReportData();
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

    const fetchSemesterDetails = async () => {
        try {
            if (!user?.faculty_id) return;
            const { data, error } = await supabase
                .from('faculties')
                .select('semester_start_date, semester_end_date')
                .eq('id', user.faculty_id)
                .single();

            if (error) throw error;
            setSemesterDetails(data);
        } catch (error) {
            console.error('Error fetching semester details:', error);
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

    const [holidayData, setHolidayData] = useState([]);
    const [lecturerName, setLecturerName] = useState('');
    const [timetableRules, setTimetableRules] = useState([]);

    // New function to fetch data specific for the Print Report
    const fetchReportData = async () => {
        try {
            // 1. Fetch Syllabus
            const { data: syllabus } = await supabase
                .from('syllabus')
                .select('*')
                .eq('subject_id', selectedSubject)
                .order('week_number', { ascending: true });

            setSyllabusData(syllabus || []);

            // 2. Fetch All Sessions (for the entire semester)
            const { data: sessions } = await supabase
                .from('attendance_sessions')
                .select('*')
                .eq('lecturer_id', user.lecturer_id)
                .eq('subject_id', selectedSubject)
                .order('date', { ascending: true })
                .order('start_time', { ascending: true });

            setAllSessions(sessions || []);

            // 3. Fetch Holidays
            const { data: holidays } = await supabase
                .from('holidays')
                .select('*')
                .eq('faculty_id', user.faculty_id);

            setHolidayData(holidays || []);

            // 4. Fetch Lecturer Name
            const { data: lectData } = await supabase
                .from('lecturers')
                .select('name')
                .eq('id', user.lecturer_id)
                .single();

            if (lectData) setLecturerName(lectData.name);

            // 5. Fetch Timetable Rules
            const { data: tTable } = await supabase
                .from('timetable')
                .select('*')
                .eq('lecturer_id', user.lecturer_id)
                .eq('subject_id', selectedSubject);

            setTimetableRules(tTable || []);

        } catch (error) {
            console.error('Error fetching report data:', error);
        }
    };

    const handlePrintWorkload = async () => {
        try {
            // 1. Fetch current lecturer details (if not already fetched or full details needed)
            const { data: lecturerData, error: lecturerError } = await supabase
                .from('lecturers')
                .select('*, departments(code, name)')
                .eq('id', user.lecturer_id)
                .single();

            if (lecturerError) throw lecturerError;
            setLecturerDetails(lecturerData);

            // 2. Fetch Timetable for this lecturer
            const { data: timetableData, error: timetableError } = await supabase
                .from('timetable')
                .select(`
                    *,
                    subjects (id, code, name),
                    lecturers (name)
                `)
                .eq('lecturer_id', user.lecturer_id)
                .order('day'); // Basic ordering, will sort more in component

            if (timetableError) throw timetableError;

            // 3. Extract all unique groups involved
            const allGroups = new Set();
            (timetableData || []).forEach(item => {
                if (Array.isArray(item.group_names)) {
                    item.group_names.forEach(g => allGroups.add(g));
                } else if (item.group_names) {
                    allGroups.add(item.group_names);
                }
            });
            const uniqueGroups = Array.from(allGroups);

            // 4. Fetch student counts for these groups
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

            setWorkloadTimetable(timetableData || []);
            setWorkloadStudentCounts(counts);
            setPrintMode('workload');

            // Wait a moment for state to update and render before printing
            setTimeout(() => {
                window.print();
                setTimeout(() => setPrintMode(null), 1000);
            }, 500);

        } catch (err) {
            console.error("Error preparing workload print:", err);
        }
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
                setTotalStudents(0);
                return;
            }

            const { data, error } = await supabase
                .from('students')
                .select('student_group')
                .in('student_group', myGroups);

            if (error) throw error;

            setTotalStudents(data.length);

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

    // --- Helper Component for Printing ---
    const PrintableReport = () => {
        if (!selectedSubject) return null;

        const subject = subjects.find(s => s.id === selectedSubject);
        const weeks = Array.from({ length: 14 }, (_, i) => i + 1);

        const getWeekDateRange = (weekNum) => {
            if (!semesterDetails?.semester_start_date) return { start: '-', end: '-' };
            const start = new Date(semesterDetails.semester_start_date);
            start.setDate(start.getDate() + (weekNum - 1) * 7);
            const end = new Date(start);
            end.setDate(end.getDate() + 6);
            return `${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric' })} - ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric' })}`;
        };

        const getSessionForWeek = (weekNum, type) => {
            if (!semesterDetails?.semester_start_date) return null;
            const weekStart = new Date(semesterDetails.semester_start_date);
            weekStart.setDate(weekStart.getDate() + (weekNum - 1) * 7); // Start of week
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6); // End of week

            // 1. Try to find actual attendance session
            const session = allSessions.find(s => {
                const d = new Date(s.date);
                return d >= weekStart && d <= weekEnd &&
                    (s.class_type === type || (!s.class_type && type === 'Lecture'));
            });

            if (session) {
                const d = new Date(session.date);
                const dateStr = `${d.getDate()}/${d.getMonth() + 1}`;

                const isHoliday = holidayData.some(h => {
                    const hDate = new Date(h.date);
                    const sDate = new Date(session.date);
                    return hDate.toISOString().split('T')[0] === sDate.toISOString().split('T')[0];
                });

                const timeStr = isHoliday ? '[CUTI]' : `${session.start_time?.slice(0, 5) || ''}-${session.end_time?.slice(0, 5) || ''}`;
                return { date: dateStr, time: timeStr, isHoliday, fullDate: session.date };
            }

            // 2. Fallback: If no session, check if a class was scheduled on a holiday
            const rule = timetableRules.find(r => r.class_type === type || (type === 'Lecture' && !r.class_type));
            if (rule) {
                const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const targetDayIndex = DAYS.indexOf(rule.day_of_week);

                if (targetDayIndex !== -1) {
                    // Calculate the date for that day in this specific week
                    const startDayIndex = weekStart.getDay();
                    const diff = (targetDayIndex - startDayIndex + 7) % 7;
                    const originalDate = new Date(weekStart);
                    originalDate.setDate(originalDate.getDate() + diff);

                    // Check if this calculated date is a holiday (using localized YYYY-MM-DD for consistency)
                    const dateStrKey = originalDate.toLocaleDateString('en-CA'); // en-CA gives YYYY-MM-DD
                    const isHoliday = holidayData.some(h => {
                        const hDateStr = new Date(h.date).toLocaleDateString('en-CA');
                        return hDateStr === dateStrKey;
                    });

                    if (isHoliday) {
                        return {
                            date: `${originalDate.getDate()}/${originalDate.getMonth() + 1}`,
                            time: '[CUTI]',
                            isHoliday: true,
                            fullDate: originalDate.toISOString()
                        };
                    }
                }
            }

            return null;
        };

        return (
            <div className="printable-pdp-form hidden print:block font-serif text-black p-4">
                <style>{`
                    @media print {
                        /* Hide everything in the body by default during print */
                        body > * {
                            visibility: hidden !important;
                        }
                        
                        /* Show only our printable component and its children */
                        .printable-pdp-form,
                        .printable-pdp-form * {
                            visibility: visible !important;
                        }
                        
                        /* Position the print content at the very top left */
                        .printable-pdp-form {
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100% !important;
                            display: block !important;
                        }

                        /* Force all parents to allow overflow and height for pagination */
                        html, body, #root, [class*="MainLayout"], [class*="layout"], [class*="container"] {
                            height: auto !important;
                            overflow: visible !important;
                            display: block !important;
                        }

                        thead { display: table-header-group; }
                        tfoot { display: table-footer-group; }
                        tr { page-break-inside: avoid; }
                        .page-break-inside-avoid { page-break-inside: avoid; break-inside: avoid; }
                    }
                `}</style>

                {/* Document Code at top right */}
                <div className="text-right text-[10px] mb-1">
                    BPRPDP/FAKULTI/2025/PIN.3
                </div>

                {/* Header Box */}
                <div className="border border-black mb-4 page-break-inside-avoid">
                    <div className="flex">
                        <div className="w-40 p-1.5 border-r border-black flex items-center justify-center">
                            {user?.faculty_logo ? (
                                <img src={user.faculty_logo} alt="Logo" className="h-14 object-contain" />
                            ) : (
                                <span className="text-[10px] font-bold">LOGO FAKULTI</span>
                            )}
                        </div>
                        <div className="flex-1 text-center p-1.5 flex flex-col justify-center leading-tight">
                            <h1 className="font-bold text-xs uppercase">UNIVERSITI ISLAM SELANGOR</h1>
                            <h2 className="font-bold text-[10px] mt-1">
                                BORANG PEMANTAUAN<br />
                                RANCANGAN AKTIVITI PENGAJARAN DAN PEMBELAJARAN (PdP) FAKULTI
                            </h2>
                        </div>
                    </div>
                </div>

                {/* Info Table */}
                <div className="border border-black text-xs mb-4 page-break-inside-avoid">
                    <div className="flex border-b border-black">
                        <div className="w-48 p-1 font-bold border-r border-black bg-gray-100 uppercase">NAMA TENAGA PENGAJAR</div>
                        <div className="p-1 uppercase flex-1">{lecturerName || user?.email}</div>
                    </div>
                    <div className="flex border-b border-black">
                        <div className="w-48 p-1 font-bold border-r border-black bg-gray-100">KOD KURSUS</div>
                        <div className="p-1 flex-1 border-r border-black">{subject?.code}</div>
                        <div className="w-32 p-1 font-bold border-r border-black bg-gray-100">NAMA KURSUS</div>
                        <div className="p-1 flex-1 uppercase">{subject?.name}</div>
                    </div>
                    <div className="flex">
                        <div className="w-48 p-1 font-bold border-r border-black bg-gray-100">SESI PENGAJIAN</div>
                        <div className="p-1 flex-1 border-r border-black">
                            {/* Placeholder or calculated session */}
                            2025/2026
                        </div>
                        <div className="w-32 p-1 font-bold border-r border-black bg-gray-100">JUMLAH PELAJAR</div>
                        <div className="p-1 flex-1">{totalStudents}</div>
                    </div>
                </div>

                {/* Main Table */}
                <table className="w-full border-collapse border border-black text-[10px]">
                    <thead>
                        <tr className="bg-amber-100">
                            <th className="border border-black p-1 w-12" rowSpan={2}>MINGGU</th>
                            <th className="border border-black p-1" colSpan={2}>KULIAH</th>
                            <th className="border border-black p-1" colSpan={2}>TUTORIAL</th>
                            <th className="border border-black p-1 w-1/3" rowSpan={2}>TOPIK</th>
                            <th className="border border-black p-1 w-24" rowSpan={2}>AKTIVITI PEMBELAJARAN/<br />PENTAKSIRAN</th>
                            <th className="border border-black p-1 w-24" rowSpan={2}>MEDIUM<br />PEMBELAJARAN</th>
                            <th className="border border-black p-1 w-32" rowSpan={2}>REFLEKSI PdP</th>
                            <th className="border border-black p-1 w-16" rowSpan={2}>CATATAN/<br />STATUS</th>
                        </tr>
                        <tr className="bg-amber-100">
                            <th className="border border-black p-1 w-14">TARIKH</th>
                            <th className="border border-black p-1 w-14">MASA</th>
                            <th className="border border-black p-1 w-14">TARIKH</th>
                            <th className="border border-black p-1 w-14">MASA</th>
                        </tr>
                    </thead>
                    <tbody>
                        {weeks.map(week => {
                            const lecture = getSessionForWeek(week, 'Lecture');
                            const tutorial = getSessionForWeek(week, 'Tutorial');
                            const topic = syllabusData.find(s => s.week_number === week);

                            return (
                                <tr key={week} className="text-center">
                                    <td className="border border-black p-1 font-bold">M{week}</td>

                                    <td className="border border-black p-1">{lecture?.date || '-'}</td>
                                    <td className="border border-black p-1">{lecture?.time || '-'}</td>

                                    <td className="border border-black p-1">{tutorial?.date || '-'}</td>
                                    <td className="border border-black p-1">{tutorial?.time || '-'}</td>

                                    <td className="border border-black p-1 text-left uppercase">
                                        {topic?.topic || ''}
                                    </td>

                                    <td className="border border-black p-1">Kuliah / Tutorial</td>
                                    <td className="border border-black p-1 underline">Bersemuka</td>
                                    <td className="border border-black p-1 text-left">
                                        {lecture?.isHoliday || tutorial?.isHoliday ? 'CUTI AM' : (lecture || tutorial ? 'Pelajar memahami tajuk' : '')}
                                    </td>
                                    <td className="border border-black p-1">
                                        {(lecture?.fullDate && new Date(lecture.fullDate) < new Date()) || (tutorial?.fullDate && new Date(tutorial.fullDate) < new Date()) ? 'Selesai' : ''}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* Signature Section */}
                <div className="mt-8 border border-black text-xs page-break-inside-avoid">
                    <div className="flex bg-gray-200 border-b border-black font-bold">
                        <div className="flex-1 p-1 border-r border-black text-center">DISEDIAKAN OLEH:</div>
                        <div className="flex-1 p-1 border-r border-black text-center">DISEMAK OLEH:</div>
                        <div className="flex-1 p-1 text-center">DISAHKAN OLEH:</div>
                    </div>
                    <div className="flex bg-white h-24">
                        <div className="flex-1 border-r border-black"></div>
                        <div className="flex-1 border-r border-black"></div>
                        <div className="flex-1"></div>
                    </div>
                    <div className="flex bg-white">
                        <div className="flex-1 border-r border-black p-1">
                            <div>Tenaga Pengajar: {user?.name || user?.email}</div>
                            <div className="mt-4">Tarikh :</div>
                        </div>
                        <div className="flex-1 border-r border-black p-1">
                            <div>Ketua Program:</div>
                            <div className="mt-4">Tarikh :</div>
                        </div>
                        <div className="flex-1 p-1">
                            <div>Ketua Jabatan:</div>
                            <div className="mt-4">Tarikh :</div>
                        </div>
                    </div>
                </div>
            </div>
        );
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
            <div className="print:hidden">
                <PageHeader title="Subject Performance Reports" />
            </div>

            {/* Report Selection Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 transition-all print:hidden">
                {/* Card 1: Workload Report (General) */}
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 flex items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl text-green-600 dark:text-green-400">
                            <FileText size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white leading-tight">Workload Report</h3>
                            <p className="text-sm text-gray-500 dark:text-slate-400">Print your overall teaching workload sheet</p>
                        </div>
                    </div>
                    <button
                        onClick={handlePrintWorkload}
                        className="flex items-center justify-center px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 whitespace-nowrap"
                        title="Print Workload"
                    >
                        <Printer size={18} className="mr-2" />
                        Print Workload
                    </button>
                </div>

                {/* Card 2: Subject Report (Specific) */}
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 flex items-center justify-between gap-4">
                    <div className="flex items-center space-x-4 flex-1">
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-600 dark:text-indigo-400">
                            <BookOpen size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 dark:text-white leading-tight">Subject Report</h3>
                            <select
                                value={selectedSubject}
                                onChange={(e) => setSelectedSubject(e.target.value)}
                                className="mt-1 block w-full rounded-lg border-gray-100 dark:border-slate-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs font-medium dark:bg-slate-900 dark:text-white px-2 py-1.5 border transition-all hover:border-indigo-300 outline-none"
                            >
                                {subjects.map(s => (
                                    <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setPrintMode('subject');
                            setTimeout(() => {
                                window.print();
                                setTimeout(() => setPrintMode(null), 1000);
                            }, 500);
                        }}
                        className="flex items-center justify-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 whitespace-nowrap"
                        title="Print Class Report"
                    >
                        <Printer size={18} className="mr-2" />
                        Print Report
                    </button>
                </div>
            </div>

            {/* Printable Components - Render based on mode */}
            {printMode === 'workload' && (
                <PrintableWorkloadSheet
                    lecturer={lecturerDetails}
                    timetable={workloadTimetable}
                    studentCounts={workloadStudentCounts}
                />
            )}

            {printMode === 'subject' && (
                <PrintableReport />
            )}

            {/* Normal Chart Views - Hidden in Print */}
            <div className="print:hidden">
                {subjects.length === 0 ? (
                    <div className="bg-white dark:bg-slate-800 p-16 rounded-3xl text-center shadow-sm border border-gray-100 dark:border-slate-800">
                        {/* Empty State */}
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
        </div>
    );
};

export default LecturerReports;
