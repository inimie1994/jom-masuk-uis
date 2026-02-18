import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabaseClient';
import PageHeader from '../components/common/PageHeader';
import PrintableAttendanceSheet from '../components/attendance/PrintableAttendanceSheet';
import * as XLSX from 'xlsx';
import {
    Calendar,
    Users,
    BookOpen,
    Save,
    Check,
    X,
    Printer,
    FileSpreadsheet
} from 'lucide-react';

const Attendance = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    // Filter States
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [selectedGroup, setSelectedGroup] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');

    // Data States
    const [groups, setGroups] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [timetable, setTimetable] = useState([]);
    const [students, setStudents] = useState([]);

    // The main grid data: { studentId: { dateKey: status } }
    const [attendanceData, setAttendanceData] = useState({});

    // Generated columns based on timetable + month
    const [dateColumns, setDateColumns] = useState([]);

    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [saving, setSaving] = useState(false);

    // Print State
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [printMode, setPrintMode] = useState('single'); // 'single' | 'all'
    const [allMonthsData, setAllMonthsData] = useState([]); // Array of { month, dates, attendanceData }
    const [isGeneratingPrint, setIsGeneratingPrint] = useState(false);

    // Initial Fetch: Subjects
    useEffect(() => {
        if (user?.faculty_id) {
            fetchSubjects();
        }
    }, [user?.faculty_id]);

    // When Subject changes, fetch Groups
    useEffect(() => {
        if (selectedSubject) {
            fetchGroups(selectedSubject);
            setSelectedGroup(''); // Reset group when subject changes
            setStudents([]);
            setAttendanceData({});
        } else {
            setGroups([]);
        }
    }, [selectedSubject]);

    // When Group changes, fetch Students
    useEffect(() => {
        if (selectedGroup) {
            fetchStudents();
        } else {
            setStudents([]);
        }
    }, [selectedGroup]);

    // When Subject, Group or Month changes, fetch Timetable & Attendance Data
    useEffect(() => {
        if (selectedGroup && selectedSubject && selectedMonth) {
            fetchTimetableAndAttendance();
        }
    }, [selectedGroup, selectedSubject, selectedMonth]);

    const fetchGroups = async (subjectId) => {
        try {
            // Find groups that take this subject from the timetable
            let query = supabase
                .from('timetable')
                .select('group_names')
                .eq('subject_id', subjectId);

            if (user.role === 'lecturer' && user.lecturer_id) {
                query = query.eq('lecturer_id', user.lecturer_id);
            }

            const { data, error } = await query;
            if (error) throw error;

            const allGroups = [...new Set(data?.flatMap(t => t.group_names || []).filter(Boolean))].sort();
            setGroups(allGroups);
        } catch (err) {
            console.error('Error fetching groups:', err);
        }
    };

    const fetchSubjects = async () => {
        try {
            let query;

            if (user.role === 'lecturer' && user.lecturer_id) {
                // For lecturers, only show subjects they teach
                query = supabase
                    .from('timetable')
                    .select('subject_id, subjects(id, code, name)')
                    .eq('lecturer_id', user.lecturer_id);

                const { data, error } = await query;
                if (error) throw error;

                // Deduplicate
                const uniqueSubjects = [];
                const seen = new Set();
                data.forEach(item => {
                    if (item.subjects && !seen.has(item.subject_id)) {
                        seen.add(item.subject_id);
                        uniqueSubjects.push(item.subjects);
                    }
                });
                setSubjects(uniqueSubjects.sort((a, b) => a.code.localeCompare(b.code)));
            } else {
                // For admins, show all subjects in faculty
                const { data, error } = await supabase
                    .from('subjects')
                    .select('id, code, name')
                    .eq('faculty_id', user.faculty_id)
                    .order('code');

                if (error) throw error;
                setSubjects(data || []);
            }
        } catch (err) {
            console.error('Error fetching subjects:', err);
        }
    };

    const fetchStudents = async () => {
        try {
            const { data, error } = await supabase
                .from('students')
                .select('id, name, matric_no')
                .eq('faculty_id', user.faculty_id)
                .eq('student_group', selectedGroup)
                .order('name');

            if (error) throw error;
            setStudents(data || []);
        } catch (err) {
            console.error('Error fetching students:', err);
        }
    };

    // Helper: Generate dates for the month based on timetable days
    const generateDatesFromTimetable = (monthStr, timetableData, semesterSettings = {}, holidays = []) => {
        const [year, month] = monthStr.split('-').map(Number);
        const daysInMonth = new Date(year, month, 0).getDate();
        const dates = [];

        // Timetable map: { 'Monday': [entries], 'Tuesday': ... }
        const timetableMap = {};
        timetableData.forEach(entry => {
            if (!timetableMap[entry.day]) timetableMap[entry.day] = [];
            timetableMap[entry.day].push(entry);
        });

        // Holiday Map for O(1) lookup
        const holidayMap = {};
        holidays.forEach(h => {
            holidayMap[h.date] = h.name;
        });

        const normalizeDate = (dateStr) => {
            if (!dateStr) return null;
            const [y, m, d] = dateStr.split('-').map(Number);
            return new Date(y, m - 1, d);
        };

        const semesterStart = normalizeDate(semesterSettings.start);
        const semesterEnd = normalizeDate(semesterSettings.end);

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dateObj = new Date(year, month - 1, d);

            // 1. Filter by Semester Dates (if set)
            if (semesterStart && dateObj < semesterStart) continue;
            if (semesterEnd && dateObj > semesterEnd) continue;

            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

            if (timetableMap[dayName]) {
                const isHoliday = !!holidayMap[dateStr];
                const holidayName = holidayMap[dateStr];

                timetableMap[dayName].forEach(slot => {
                    dates.push({
                        date: dateStr, // YYYY-MM-DD
                        dayName: dayName,
                        displayDate: `${d}/${month}`,
                        startTime: slot.start_time,
                        endTime: slot.end_time,
                        type: slot.class_type,
                        timetableId: slot.id,
                        isHoliday: isHoliday,
                        holidayName: holidayName
                    });
                });
            }
        }
        return dates.sort((a, b) => new Date(a.date) - new Date(b.date) || a.startTime.localeCompare(b.startTime));
    };

    const fetchTimetableAndAttendance = async () => {
        setLoading(true);
        setError(null);
        try {
            // 1. Fetch Semester Settings & Holidays
            let semesterSettings = {};
            let holidays = [];

            if (user?.faculty_id) {
                const { data: facultyData } = await supabase
                    .from('faculties')
                    .select('semester_start_date, semester_end_date')
                    .eq('id', user.faculty_id)
                    .single();

                if (facultyData) {
                    semesterSettings = {
                        start: facultyData.semester_start_date,
                        end: facultyData.semester_end_date
                    };
                }

                const { data: holidayData } = await supabase
                    .from('holidays')
                    .select('name, date')
                    .eq('faculty_id', user.faculty_id);

                if (holidayData) holidays = holidayData;
            }

            // 2. Fetch Timetable for this Group + Subject
            const { data: timetableData, error: timetableError } = await supabase
                .from('timetable')
                .select('*, lecturers(name)')
                .filter('group_names', 'cs', `{${selectedGroup}}`)
                .eq('subject_id', selectedSubject);

            if (timetableError) throw timetableError;
            setTimetable(timetableData || []);

            // 3. Generate Columns
            const columns = generateDatesFromTimetable(selectedMonth, timetableData || [], semesterSettings, holidays);
            setDateColumns(columns);

            if (columns.length === 0) {
                setLoading(false);
                return;
            }

            // 3. Fetch Existing Sessions (to map to columns)
            // We need sessions that match our generated dates + group + subject
            const startOfMonth = `${selectedMonth}-01`;
            const endOfMonth = new Date(selectedMonth.split('-')[0], selectedMonth.split('-')[1], 0).toISOString().split('T')[0];

            const { data: sessions, error: sessionsError } = await supabase
                .from('attendance_sessions')
                .select('id, date, start_time')
                .filter('group_names', 'cs', `{${selectedGroup}}`)
                .eq('subject_id', selectedSubject)
                .gte('date', startOfMonth)
                .lte('date', endOfMonth);

            if (sessionsError) throw sessionsError;

            // 4. Fetch Records for these sessions
            let records = [];
            if (sessions.length > 0) {
                const sessionIds = sessions.map(s => s.id);
                const { data: recordsData, error: recordsError } = await supabase
                    .from('attendance_records')
                    .select('session_id, student_id, status')
                    .in('session_id', sessionIds);

                if (recordsError) throw recordsError;
                records = recordsData || [];
            }

            // 5. Build Attendance Map
            // Structure: { studentId: { 'YYYY-MM-DD_HH:MM:SS': 'Present' } }
            // New structure to handle multiple slots per day: use composite key
            // Key: `${date}_${startTime}`

            const map = {};

            // Pre-fill map with sessions data
            records.forEach(r => {
                const session = sessions.find(s => s.id === r.session_id);
                if (session) {
                    const key = `${session.date}_${session.start_time}`;
                    if (!map[r.student_id]) map[r.student_id] = {};
                    map[r.student_id][key] = r.status;
                }
            });

            setAttendanceData(map);

        } catch (err) {
            console.error('Error loading data:', err);
            setError('Failed to load attendance data.');
        } finally {
            setLoading(false);
        }
    };

    const toggleAttendance = async (studentId, column) => {
        // Optimistic Update
        const key = `${column.date}_${column.startTime}`;
        const currentStatus = attendanceData[studentId]?.[key];
        const newStatus = currentStatus === 'Present' ? null : 'Present'; // Toggle logic

        const newMap = { ...attendanceData };
        if (!newMap[studentId]) newMap[studentId] = {};

        if (newStatus) {
            newMap[studentId][key] = newStatus;
        } else {
            delete newMap[studentId][key];
        }
        setAttendanceData(newMap);

        // Backend Sync
        // 1. Ensure Session Exists
        try {
            // Check lookup/cache for session ID first? 
            // For now, let's try to fetch or create safely.
            // Using a specialized RPC would be best, but we can do it client-side.

            // Find existing session in our local state? No, assume we need to verify.
            // Actually, we fetched 'sessions' earlier but didn't store mapping.
            // Let's do a quick lookup query.

            const { data: sessionData, error: sessionFindError } = await supabase
                .from('attendance_sessions')
                .select('id')
                .filter('group_names', 'cs', `{${selectedGroup}}`)
                .eq('subject_id', selectedSubject)
                .eq('date', column.date)
                .eq('start_time', column.startTime)
                .single();

            let sessionId;

            if (sessionData) {
                sessionId = sessionData.id;
            } else {
                // Determine lecturer ID from timetable entry
                const timetableEntry = timetable.find(t => t.id === column.timetableId);

                // Create Session
                const { data: newSession, error: createError } = await supabase
                    .from('attendance_sessions')
                    .insert([{
                        group_names: timetableEntry?.group_names || [selectedGroup],
                        subject_id: selectedSubject,
                        date: column.date,
                        start_time: column.startTime,
                        end_time: column.endTime,
                        class_type: column.type,
                        room: timetableEntry?.room,
                        lecturer_id: timetableEntry?.lecturer_id,
                        faculty_id: user.faculty_id
                    }])
                    .select()
                    .single();

                if (createError) throw createError;
                sessionId = newSession.id;
            }

            // 2. Upsert Record
            if (newStatus) {
                const { error: upsertError } = await supabase
                    .from('attendance_records')
                    .upsert({
                        session_id: sessionId,
                        student_id: studentId,
                        status: 'Present'
                    }, { onConflict: 'session_id,student_id' });
                if (upsertError) throw upsertError;
            } else {
                // Delete record
                const { error: deleteError } = await supabase
                    .from('attendance_records')
                    .delete()
                    .eq('session_id', sessionId)
                    .eq('student_id', studentId);
                if (deleteError) throw deleteError;
            }

        } catch (err) {
            console.error('Error saving attendance:', err);
            // Revert on error
            setAttendanceData(prev => {
                const reverted = { ...prev };
                if (currentStatus) {
                    reverted[studentId][key] = currentStatus;
                } else {
                    delete reverted[studentId][key];
                }
                return reverted;
            });
            setError('Failed to save change. Please try again.');
        }
    };

    // Calculate total presence for a student
    const calculateTotal = (studentId) => {
        if (!attendanceData[studentId]) return 0;
        return Object.values(attendanceData[studentId]).filter(s => s === 'Present').length;
    };

    const handlePrint = async (mode = 'single') => {
        setPrintMode(mode);
        setIsPrintModalOpen(false);

        if (mode === 'single') {
            setTimeout(() => window.print(), 100);
        } else {
            // Generate data for all months
            setIsGeneratingPrint(true);
            try {
                // 1. Determine Date Range (Semester)
                let start, end;
                if (user?.faculty_id) {
                    const { data: facultyData } = await supabase
                        .from('faculties')
                        .select('semester_start_date, semester_end_date')
                        .eq('id', user.faculty_id)
                        .single();

                    if (facultyData) {
                        start = new Date(facultyData.semester_start_date);
                        end = new Date(facultyData.semester_end_date);
                    }
                }

                if (!start || !end) {
                    // Fallback to current year if no semester settings
                    const year = new Date().getFullYear();
                    start = new Date(year, 0, 1);
                    end = new Date(year, 11, 31);
                }

                // 2. Refresh Holidays
                const { data: holidays } = await supabase
                    .from('holidays')
                    .select('name, date')
                    .eq('faculty_id', user.faculty_id);

                // 3. Iterate Months
                const monthsData = [];
                let current = new Date(start);
                // Adjust to first day of month
                current.setDate(1);

                while (current <= end) {
                    const monthStr = current.toISOString().slice(0, 7);

                    // Generate Dates
                    const dates = generateDatesFromTimetable(monthStr, timetable, { start: start.toISOString(), end: end.toISOString() }, holidays || []);

                    if (dates.length > 0) {
                        // Fetch Attendance Data for this month
                        const startOfMonth = `${monthStr}-01`;
                        const endOfMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).toISOString().split('T')[0];

                        const { data: sessions } = await supabase
                            .from('attendance_sessions')
                            .select('id, date, start_time')
                            .filter('group_names', 'cs', `{${selectedGroup}}`)
                            .eq('subject_id', selectedSubject)
                            .gte('date', startOfMonth)
                            .lte('date', endOfMonth);

                        const map = {};
                        if (sessions && sessions.length > 0) {
                            const sessionIds = sessions.map(s => s.id);
                            const { data: records } = await supabase
                                .from('attendance_records')
                                .select('session_id, student_id, status')
                                .in('session_id', sessionIds);

                            records?.forEach(r => {
                                const session = sessions.find(s => s.id === r.session_id);
                                if (session) {
                                    const key = `${session.date}_${session.start_time}`;
                                    if (!map[r.student_id]) map[r.student_id] = {};
                                    map[r.student_id][key] = r.status;
                                }
                            });
                        }

                        monthsData.push({
                            month: monthStr,
                            dates: dates,
                            attendanceData: map
                        });
                    }

                    // Next Month
                    current.setMonth(current.getMonth() + 1);
                }

                setAllMonthsData(monthsData);
                setTimeout(() => window.print(), 500);

            } catch (err) {
                console.error("Error generating print report:", err);
                setError("Failed to generate print report.");
            } finally {
                setIsGeneratingPrint(false);
            }
        }
    };

    const handleClearAll = async () => {
        if (!window.confirm("Are you sure you want to clear ALL attendance records for this month? This action cannot be undone.")) return;

        setLoading(true);
        try {
            const startOfMonth = `${selectedMonth}-01`;
            const endOfMonth = new Date(selectedMonth.split('-')[0], selectedMonth.split('-')[1], 0).toISOString().split('T')[0];

            // 1. Find relevant sessions
            const { data: sessions, error: sessionsError } = await supabase
                .from('attendance_sessions')
                .select('id')
                .filter('group_names', 'cs', `{${selectedGroup}}`)
                .eq('subject_id', selectedSubject)
                .gte('date', startOfMonth)
                .lte('date', endOfMonth);

            if (sessionsError) throw sessionsError;

            if (sessions.length > 0) {
                const sessionIds = sessions.map(s => s.id);

                // 2. Delete records
                const { error: deleteError } = await supabase
                    .from('attendance_records')
                    .delete()
                    .in('session_id', sessionIds);

                if (deleteError) throw deleteError;

                setSuccessMessage("Attendance records cleared successfully.");
                fetchTimetableAndAttendance(); // Refresh
                setTimeout(() => setSuccessMessage(null), 3000);
            } else {
                setSuccessMessage("No records found to clear.");
                setTimeout(() => setSuccessMessage(null), 3000);
            }

        } catch (err) {
            console.error("Error clearing records:", err);
            setError("Failed to clear records.");
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAllOnDate = async (column) => {
        if (!window.confirm(`Mark all students as Present for ${column.displayDate} (${column.startTime})?`)) return;

        setLoading(true);
        try {
            // 1. Ensure Session Exists (Dry/extracted logic from toggleAttendance)
            let sessionId;
            const { data: sessionData } = await supabase
                .from('attendance_sessions')
                .select('id')
                .filter('group_names', 'cs', `{${selectedGroup}}`)
                .eq('subject_id', selectedSubject)
                .eq('date', column.date)
                .eq('start_time', column.startTime)
                .single();

            if (sessionData) {
                sessionId = sessionData.id;
            } else {
                const timetableEntry = timetable.find(t => t.id === column.timetableId);
                const { data: newSession, error: createError } = await supabase
                    .from('attendance_sessions')
                    .insert([{
                        group_names: timetableEntry?.group_names || [selectedGroup],
                        subject_id: selectedSubject,
                        date: column.date,
                        start_time: column.startTime,
                        end_time: column.endTime,
                        class_type: column.type,
                        room: timetableEntry?.room,
                        lecturer_id: timetableEntry?.lecturer_id,
                        faculty_id: user.faculty_id
                    }])
                    .select()
                    .single();

                if (createError) throw createError;
                sessionId = newSession.id;
            }

            // 2. Bulk Upsert Records
            const upsertData = students.map(student => ({
                session_id: sessionId,
                student_id: student.id,
                status: 'Present'
            }));

            const { error: upsertError } = await supabase
                .from('attendance_records')
                .upsert(upsertData, { onConflict: 'session_id,student_id' });

            if (upsertError) throw upsertError;

            // 3. Update Local State
            const key = `${column.date}_${column.startTime}`;
            setAttendanceData(prev => {
                const next = { ...prev };
                students.forEach(student => {
                    if (!next[student.id]) next[student.id] = {};
                    next[student.id][key] = 'Present';
                });
                return next;
            });

            setSuccessMessage(`All students marked as Present for ${column.displayDate}.`);
            setTimeout(() => setSuccessMessage(null), 3000);

        } catch (err) {
            console.error("Error marking all students:", err);
            setError("Failed to mark all students.");
        } finally {
            setLoading(false);
        }
    };

    const handleUntickAllOnDate = async (column) => {
        if (!window.confirm(`Clear ALL attendance records for ${column.displayDate} (${column.startTime})?`)) return;

        setLoading(true);
        try {
            // 1. Find Session ID
            const { data: sessionData } = await supabase
                .from('attendance_sessions')
                .select('id')
                .filter('group_names', 'cs', `{${selectedGroup}}`)
                .eq('subject_id', selectedSubject)
                .eq('date', column.date)
                .eq('start_time', column.startTime)
                .single();

            if (sessionData) {
                // 2. Delete all records for this session
                const { error: deleteError } = await supabase
                    .from('attendance_records')
                    .delete()
                    .eq('session_id', sessionData.id);

                if (deleteError) throw deleteError;

                // 3. Update Local State
                const key = `${column.date}_${column.startTime}`;
                setAttendanceData(prev => {
                    const next = { ...prev };
                    Object.keys(next).forEach(studentId => {
                        if (next[studentId]) {
                            delete next[studentId][key];
                        }
                    });
                    return next;
                });

                setSuccessMessage(`Attendance records cleared for ${column.displayDate}.`);
                setTimeout(() => setSuccessMessage(null), 3000);
            }
        } catch (err) {
            console.error("Error clearing attendance records:", err);
            setError("Failed to clear attendance records.");
        } finally {
            setLoading(false);
        }
    };

    const handleExportExcel = () => {
        if (students.length === 0 || dateColumns.length === 0) return;

        // Build Rows
        const rows = students.map((student, idx) => {
            const row = {
                'No': idx + 1,
                'Matric No': student.matric_no,
                'Name': student.name,
            };

            dateColumns.forEach(col => {
                const key = `${col.date}_${col.startTime}`;
                const isPresent = attendanceData[student.id]?.[key] === 'Present';
                row[col.displayDate] = isPresent ? '1' : '0';
            });

            row['Total'] = calculateTotal(student.id);
            return row;
        });

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
        XLSX.writeFile(workbook, `Attendance_${selectedGroup}_${selectedMonth}.xlsx`);
    };

    return (
        <>
            <div className="space-y-6 print:hidden">
                <PageHeader
                    title="Attendance Management"
                />

                {/* Controls */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-pastel border border-gray-100 dark:border-slate-800 flex flex-wrap gap-6 items-end justify-between">
                    <div className="flex flex-wrap gap-6 items-end">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Month</label>
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border w-48 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Subject</label>
                            <select
                                value={selectedSubject}
                                onChange={(e) => setSelectedSubject(e.target.value)}
                                className="rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border w-64 transition-all"
                            >
                                <option value="">Select Subject...</option>
                                {subjects.map(s => (
                                    <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Group</label>
                            <select
                                value={selectedGroup}
                                onChange={(e) => setSelectedGroup(e.target.value)}
                                disabled={!selectedSubject}
                                className="rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border w-64 transition-all disabled:opacity-50"
                            >
                                <option value="">Select Group...</option>
                                {groups.map(g => (
                                    <option key={g} value={g}>{g}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Export Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={handleExportExcel}
                            disabled={!selectedGroup || !selectedSubject}
                            className="px-4 py-2 border border-green-200 dark:border-green-800 rounded-xl text-xs font-bold uppercase tracking-widest text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all flex items-center disabled:opacity-50"
                        >
                            <FileSpreadsheet size={16} className="mr-2" />
                            Excel
                        </button>

                        <div className="relative">
                            <button
                                onClick={() => setIsPrintModalOpen(!isPrintModalOpen)}
                                disabled={!selectedGroup || !selectedSubject || isGeneratingPrint}
                                className="px-4 py-2 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-bold uppercase tracking-widest text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all flex items-center disabled:opacity-50"
                            >
                                <Printer size={16} className="mr-2" />
                                {isGeneratingPrint ? 'Generating...' : 'Print'}
                            </button>

                            {isPrintModalOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 z-50 overflow-hidden">
                                    <button
                                        onClick={() => handlePrint('single')}
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors border-b border-gray-100 dark:border-slate-700"
                                    >
                                        Current Month
                                    </button>
                                    <button
                                        onClick={() => handlePrint('all')}
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                                    >
                                        All Months (Semester)
                                    </button>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleClearAll}
                            disabled={!selectedGroup || !selectedSubject}
                            className="px-4 py-2 border border-red-200 dark:border-red-800 rounded-xl text-xs font-bold uppercase tracking-widest text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center disabled:opacity-50"
                        >
                            Clear All
                        </button>
                    </div>
                </div>

                {successMessage && (
                    <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-4 rounded-xl border border-green-100 dark:border-green-800/30 text-sm">
                        {successMessage}
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl border border-red-100 dark:border-red-800/30 text-sm">
                        {error}
                    </div>
                )}

                {/* Grid */}
                {selectedGroup && selectedSubject ? (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-pastel border border-gray-100 dark:border-slate-800 overflow-hidden">
                        <div className="overflow-x-auto">
                            {loading ? (
                                <div className="p-12 text-center text-gray-400">Loading attendance data...</div>
                            ) : dateColumns.length === 0 ? (
                                <div className="p-12 text-center text-gray-400">
                                    <Calendar className="mx-auto h-12 w-12 opacity-20 mb-3" />
                                    <p>No classes found in the timetable for this month.</p>
                                </div>
                            ) : (
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800">
                                            <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-wider w-16 sticky left-0 bg-slate-50 dark:bg-slate-950 z-10 border-r border-gray-200 dark:border-slate-800">#</th>
                                            <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-wider w-48 sticky left-16 bg-slate-50 dark:bg-slate-950 z-10 border-r border-gray-200 dark:border-slate-800">Student Name</th>
                                            {dateColumns.map((col, idx) => (
                                                <th key={idx} className={`px-2 py-3 text-center min-w-[50px] border-r border-gray-100 dark:border-slate-800/50 ${col.isHoliday ? 'bg-red-50 dark:bg-red-900/20' : ''}`}>
                                                    <div className="flex flex-col items-center" title={col.holidayName}>
                                                        <span className={`text-xs font-bold ${col.isHoliday ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>{col.displayDate}</span>
                                                        <span className="text-[9px] text-gray-400 uppercase tracking-wider">{col.dayName.slice(0, 3)}</span>
                                                        {col.isHoliday ? (
                                                            <span className="text-[8px] px-1 rounded mt-0.5 bg-red-100 text-red-700 font-bold max-w-[40px] truncate">{col.holidayName}</span>
                                                        ) : (
                                                            <span className={`text-[8px] px-1 rounded mt-0.5 ${col.type === 'Lecture' ? 'bg-blue-100 text-blue-700' :
                                                                col.type === 'Tutorial' ? 'bg-green-100 text-green-700' :
                                                                    'bg-orange-100 text-orange-700'
                                                                }`}>{col.type?.slice(0, 1)}</span>
                                                        )}
                                                        {!col.isHoliday && (
                                                            <div className="flex gap-1 mt-1 justify-center">
                                                                <button
                                                                    onClick={() => handleMarkAllOnDate(col)}
                                                                    title="Mark all present"
                                                                    className="p-1 rounded-md text-gray-400 hover:text-primary hover:bg-primary/10 transition-all"
                                                                >
                                                                    <Check size={12} strokeWidth={3} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleUntickAllOnDate(col)}
                                                                    title="Untick all"
                                                                    className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                                                                >
                                                                    <X size={12} strokeWidth={3} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </th>
                                            ))}
                                            {/* Total Column sticky right */}
                                            <th className="px-4 py-3 text-center font-bold text-gray-500 uppercase tracking-wider w-24 sticky right-0 bg-slate-50 dark:bg-slate-950 z-10 border-l border-gray-200 dark:border-slate-800 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                                                Total
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                        {students.map((student, idx) => (
                                            <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-4 py-3 font-mono text-xs text-gray-400 sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-gray-100 dark:border-slate-800">
                                                    {idx + 1}
                                                </td>
                                                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white sticky left-16 bg-white dark:bg-slate-900 z-10 border-r border-gray-100 dark:border-slate-800">
                                                    <div>{student.name}</div>
                                                    <div className="text-[10px] text-gray-400">{student.matric_no}</div>
                                                </td>
                                                {dateColumns.map((col, cIdx) => {
                                                    const key = `${col.date}_${col.startTime}`;
                                                    const isPresent = attendanceData[student.id]?.[key] === 'Present';

                                                    return (

                                                        <td key={cIdx} className={`px-2 py-3 text-center border-r border-gray-50 dark:border-slate-800/50 ${col.isHoliday ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                                                            {col.isHoliday ? (
                                                                <div className="w-6 h-6 mx-auto flex items-center justify-center text-red-200 dark:text-red-900/40">
                                                                    <span className="block w-1.5 h-1.5 rounded-full bg-current"></span>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => toggleAttendance(student.id, col)}
                                                                    className={`
                                                                    w-6 h-6 rounded-md flex items-center justify-center transition-all mx-auto
                                                                    ${isPresent
                                                                            ? 'bg-primary text-white shadow-sm'
                                                                            : 'bg-gray-100 dark:bg-slate-800 text-transparent hover:bg-gray-200 dark:hover:bg-slate-700'
                                                                        }
                                                                `}
                                                                >
                                                                    <Check size={14} className={isPresent ? 'opacity-100' : 'opacity-0'} />
                                                                </button>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                                <td className="px-4 py-3 font-bold text-center text-primary dark:text-indigo-400 sticky right-0 bg-white dark:bg-slate-900 z-10 border-l border-gray-100 dark:border-slate-800 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                                                    {calculateTotal(student.id)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800 text-gray-400">
                        <Users size={48} className="mb-4 opacity-10" />
                        <p>Select a Group and Subject to view attendance.</p>
                    </div>
                )}
            </div >

            {/* Printable Component (Hidden unless printing) */}
            {
                selectedGroup && selectedSubject && (
                    <>
                        {printMode === 'single' ? (
                            <PrintableAttendanceSheet
                                month={selectedMonth}
                                group={selectedGroup}
                                subject={subjects.find(s => s.id === selectedSubject)}
                                students={students}
                                dates={dateColumns}
                                attendanceData={attendanceData}
                                lecturerName={
                                    user.role === 'lecturer'
                                        ? user.name
                                        : (timetable.length > 0 && timetable[0].lecturers
                                            ? timetable[0].lecturers.name
                                            : "__________________________")
                                }
                                logoUrl={user?.faculty_logo}
                            />
                        ) : (
                            <div className="print:block hidden">
                                {allMonthsData.map((data, idx) => (
                                    <PrintableAttendanceSheet
                                        key={idx}
                                        month={data.month}
                                        group={selectedGroup}
                                        subject={subjects.find(s => s.id === selectedSubject)}
                                        students={students}
                                        dates={data.dates}
                                        attendanceData={data.attendanceData}
                                        lecturerName={
                                            user.role === 'lecturer'
                                                ? user.name
                                                : (timetable.length > 0 && timetable[0].lecturers
                                                    ? timetable[0].lecturers.name
                                                    : "__________________________")
                                        }
                                        logoUrl={user?.faculty_logo}
                                        className="print:break-after-page"
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )
            }
        </>
    );
};

export default Attendance;
