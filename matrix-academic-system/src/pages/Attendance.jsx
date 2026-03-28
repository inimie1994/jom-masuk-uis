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
    FileSpreadsheet,
    Edit
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
    const [allGroupsData, setAllGroupsData] = useState([]); // Array of { group, students, dates, attendanceData }
    const [isGeneratingPrint, setIsGeneratingPrint] = useState(false);

    // Edit Session State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingColumn, setEditingColumn] = useState(null);
    const [editForm, setEditForm] = useState({ date: '', startTime: '', endTime: '' });

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

            if (['lecturer', 'hod', 'hop'].includes(user.role) && user.lecturer_id) {
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

            if (['lecturer', 'hod', 'hop'].includes(user.role) && user.lecturer_id) {
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
                .order('matric_no');

            if (error) throw error;
            setStudents(data || []);
        } catch (err) {
            console.error('Error fetching students:', err);
        }
    };

    // Helper: Generate dates for the month based on timetable days + existing sessions
    const generateDatesFromTimetable = (monthStr, timetableData, semesterSettings = {}, holidays = [], existingSessions = []) => {
        const [year, month] = monthStr.split('-').map(Number);
        const daysInMonth = new Date(year, month, 0).getDate();
        let dates = [];

        // Timetable map: { 'Monday': [entries], 'Tuesday': ... }
        const timetableMap = {};
        timetableData.forEach(entry => {
            if (!timetableMap[entry.day]) timetableMap[entry.day] = [];
            timetableMap[entry.day].push(entry);
        });

        // Holiday Map for O(1) lookup
        const holidayMap = {};
        holidays.forEach(h => {
            if (!h.date) return;
            const startStr = h.date.split('T')[0];
            const endStr = (h.end_date || h.date).split('T')[0];
            
            const [sY, sM, sD] = startStr.split('-').map(Number);
            const [eY, eM, eD] = endStr.split('-').map(Number);
            
            let current = new Date(Date.UTC(sY, sM - 1, sD));
            const end = new Date(Date.UTC(eY, eM - 1, eD));
            
            while (current <= end) {
                const dateStr = current.toISOString().split('T')[0];
                holidayMap[dateStr] = h.name;
                current.setUTCDate(current.getUTCDate() + 1);
            }
        });

        const normalizeDate = (dateStr) => {
            if (!dateStr) return null;
            const [y, m, d] = dateStr.split('-').map(Number);
            return new Date(y, m - 1, d);
        };

        const semesterStart = normalizeDate(semesterSettings.start);
        const semesterEnd = normalizeDate(semesterSettings.end);

        // 1. Generate Standard Timetable Dates
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dateObj = new Date(year, month - 1, d);

            // Filter by Semester Dates (if set)
            if (semesterStart && dateObj < semesterStart) continue;
            if (semesterEnd && dateObj > semesterEnd) continue;

            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

            if (timetableMap[dayName]) {
                const isHoliday = !!holidayMap[dateStr];
                const holidayName = holidayMap[dateStr];

                timetableMap[dayName].forEach(slot => {
                    // Check if there is an existing session that MATCHES this standard slot
                    const matchedSession = existingSessions.find(s =>
                        s.date === dateStr &&
                        s.start_time === slot.start_time
                    );

                    const isCancelled = matchedSession && matchedSession.class_type === 'CANCELLED';

                    // Calculate Week Number
                    let weekNum = null;
                    if (semesterStart) {
                        const diffTime = dateObj.getTime() - semesterStart.getTime();
                        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                        weekNum = Math.floor(diffDays / 7) + 1;
                    }

                    dates.push({
                        date: dateStr, // YYYY-MM-DD
                        dayName: dayName,
                        displayDate: `${d}/${month}`,
                        startTime: slot.start_time,
                        endTime: slot.end_time,
                        type: slot.class_type,
                        timetableId: slot.id,
                        isHoliday: isHoliday,
                        holidayName: holidayName,
                        sessionId: matchedSession ? matchedSession.id : null,
                        isVirtual: !matchedSession,
                        isCancelled: isCancelled,
                        weekNum: weekNum
                    });
                });
            }
        }

        // 2. Add Extra Sessions (Postponed/Rescheduled) that are NOT in standard timetable slots
        existingSessions.forEach(session => {
            // ... (rest of logic)
            // Check if this session is already accounted for in the generated dates
            const exists = dates.find(d =>
                d.date === session.date &&
                d.startTime === session.start_time
            );

            if (!exists) {
                // Convert date string to display format
                const [y, m, d] = session.date.split('-').map(Number);
                const dateObj = new Date(y, m - 1, d);
                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

                const isHoliday = !!holidayMap[session.date];
                const holidayName = holidayMap[session.date];

                // Calculate Week Number for extra session
                let weekNum = null;
                if (semesterStart) {
                    const diffTime = dateObj.getTime() - semesterStart.getTime();
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    weekNum = Math.floor(diffDays / 7) + 1;
                }

                dates.push({
                    date: session.date,
                    dayName: dayName,
                    displayDate: `${d}/${m}`,
                    startTime: session.start_time,
                    endTime: session.end_time,
                    type: session.class_type,
                    timetableId: null, // No direct timetable link strict
                    isHoliday: isHoliday,
                    holidayName: holidayName,
                    sessionId: session.id,
                    isExtra: true,
                    weekNum: weekNum
                });
            }
        });

        // 3. Filter out "Virtual" slots that have been moved? 
        // For simple implementation: We keep virtual slots. If they are "moved", the user should ideally see the old one empty and new one filled.
        // Or if we implemented a dedicated "moved" logic, we would hide the old one.
        // For now, let's keep all standard slots + any extra sessions found.

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
                    .select('name, date, end_date')
                    .eq('faculty_id', user.faculty_id);

                if (holidayData) holidays = holidayData;
            }

            // 2. Fetch Timetable for this Group + Subject
            let query = supabase
                .from('timetable')
                .select('*, lecturers(name)')
                .contains('group_names', [selectedGroup])
                .eq('subject_id', selectedSubject);

            if (['lecturer', 'hod', 'hop'].includes(user.role) && user.lecturer_id) {
                query = query.eq('lecturer_id', user.lecturer_id);
            }

            const { data: timetableData, error: timetableError } = await query;

            if (timetableError) throw timetableError;
            setTimetable(timetableData || []);

            // 3. Fetch Existing Sessions (to map to columns)
            // We need sessions that match our generated dates + group + subject
            const startOfMonth = `${selectedMonth}-01`;
            const endOfMonth = new Date(selectedMonth.split('-')[0], selectedMonth.split('-')[1], 0).toISOString().split('T')[0];

            const { data: sessions, error: sessionsError } = await supabase
                .from('attendance_sessions')
                .select('id, date, start_time, end_time, class_type')
                .contains('group_names', [selectedGroup])
                .eq('subject_id', selectedSubject)
                .gte('date', startOfMonth)
                .lte('date', endOfMonth);

            if (sessionsError) throw sessionsError;
            const validSessions = sessions || [];

            // 4. Generate Columns
            const columns = generateDatesFromTimetable(selectedMonth, timetableData || [], semesterSettings, holidays, validSessions);
            setDateColumns(columns);

            if (columns.length === 0) {
                setLoading(false);
                return;
            }

            // 5. Fetch Records for these sessions
            let records = [];
            if (validSessions.length > 0) {
                const sessionIds = validSessions.map(s => s.id);
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
                const session = validSessions.find(s => s.id === r.session_id);
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
                .contains('group_names', [selectedGroup])
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
        const presentCount = attendanceData[studentId]
            ? Object.values(attendanceData[studentId]).filter(s => s === 'Present').length
            : 0;
        const holidayCount = dateColumns.filter(col => col.isHoliday).length;
        return presentCount + holidayCount;
    };

    const handlePrint = async (mode = 'single') => {
        if (selectedGroup === 'ALL' && mode === 'single') {
            mode = 'all-groups';
        }

        setPrintMode(mode);
        setIsPrintModalOpen(false);

        if (mode === 'single') {
            setTimeout(() => window.print(), 100);
        } else if (mode === 'all') {
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
                    .select('name, date, end_date')
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
                            .contains('group_names', [selectedGroup])
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
        } else if (mode === 'all-groups') {
            setIsGeneratingPrint(true);
            try {
                // 1. Semester Dates & Holidays
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
                const { data: holidays } = await supabase
                    .from('holidays')
                    .select('name, date, end_date')
                    .eq('faculty_id', user.faculty_id);

                const semesterSettings = start && end ? { start: start.toISOString(), end: end.toISOString() } : {};

                // 2. Fetch all students in faculty to filter per group later
                const { data: allStudents } = await supabase
                    .from('students')
                    .select('id, name, matric_no, student_group')
                    .eq('faculty_id', user.faculty_id)
                    .in('student_group', groups);

                // 3. Process each group
                const groupsData = [];
                for (const groupName of groups) {
                    // Timetable for this specific group + subject
                    const { data: groupTimetable } = await supabase
                        .from('timetable')
                        .select('*, lecturers(name)')
                        .contains('group_names', [groupName])
                        .eq('subject_id', selectedSubject);

                    if (!groupTimetable || groupTimetable.length === 0) continue;

                    const dates = generateDatesFromTimetable(selectedMonth, groupTimetable, semesterSettings, holidays || []);
                    if (dates.length === 0) continue;

                    const groupStudents = allStudents?.filter(s => s.student_group === groupName) || [];
                    if (groupStudents.length === 0) continue;

                    // Attendance Sessions
                    const startOfMonth = `${selectedMonth}-01`;
                    const endOfMonth = new Date(selectedMonth.split('-')[0], selectedMonth.split('-')[1], 0).toISOString().split('T')[0];

                    const { data: sessions } = await supabase
                        .from('attendance_sessions')
                        .select('id, date, start_time')
                        .contains('group_names', [groupName])
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

                    groupsData.push({
                        group: groupName,
                        students: groupStudents,
                        dates: dates,
                        attendanceData: map,
                        lecturerName: groupTimetable[0]?.lecturers?.name || user.name
                    });
                }

                setAllGroupsData(groupsData);
                setTimeout(() => window.print(), 1000);

            } catch (err) {
                console.error("Error generating all groups report:", err);
                setError("Failed to generate all groups report.");
            } finally {
                setIsGeneratingPrint(false);
            }
        }
    };

    const handleClearAll = async () => {
        setLoading(true);
        try {
            // 1. Find relevant sessions (Across ALL months for this Subject + Group)
            const { data: sessions, error: sessionsError } = await supabase
                .from('attendance_sessions')
                .select('id')
                .contains('group_names', [selectedGroup])
                .eq('subject_id', selectedSubject);

            if (sessionsError) throw sessionsError;

            if (sessions.length > 0) {
                const sessionIds = sessions.map(s => s.id);

                // 2. Delete SESSIONS (Records will be deleted via CASCADE if configured, otherwise we should delete records first to be safe, but usually logic implies session deletion cleans up)
                // To be safe manually delete records first, then sessions
                const { error: deleteRecordsError } = await supabase
                    .from('attendance_records')
                    .delete()
                    .in('session_id', sessionIds);

                if (deleteRecordsError) throw deleteRecordsError;

                const { error: deleteSessionsError } = await supabase
                    .from('attendance_sessions')
                    .delete()
                    .in('id', sessionIds);

                if (deleteSessionsError) throw deleteSessionsError;

                setSuccessMessage("All attendance data cleared successfully.");
                fetchTimetableAndAttendance(); // Refresh
                setTimeout(() => setSuccessMessage(null), 3000);
            } else {
                setSuccessMessage("No data found to clear.");
                setTimeout(() => setSuccessMessage(null), 3000);
            }

        } catch (err) {
            console.error("Error clearing data:", err);
            setError("Failed to clear data.");
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAllOnDate = async (column) => {
        // Removed confirmation as per user request

        setLoading(true);
        try {
            // 1. Ensure Session Exists (Dry/extracted logic from toggleAttendance)
            let sessionId;
            const { data: sessionData } = await supabase
                .from('attendance_sessions')
                .select('id')
                .contains('group_names', [selectedGroup])
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
        // Removed confirmation as per user request

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

    const handleEditColumn = (col) => {
        setEditingColumn(col);
        setEditForm({
            date: col.date,
            startTime: col.startTime,
            endTime: col.endTime
        });
        setIsEditModalOpen(true);
    };

    const handleDeleteSession = async () => {
        if (!editingColumn) return;

        // Scenerio 1: Standard Slot (Cancel it)
        if (!editingColumn.sessionId) {
            setSaving(true);
            try {
                // Find timetable entry details
                const timetableEntry = timetable.find(t => t.id === editingColumn.timetableId);
                if (!timetableEntry) throw new Error("Source timetable entry not found");

                const { error: insertError } = await supabase
                    .from('attendance_sessions')
                    .insert([{
                        group_names: timetableEntry.group_names || [selectedGroup],
                        subject_id: selectedSubject,
                        date: editingColumn.date, // Cancel THIS date
                        start_time: editingColumn.startTime,
                        end_time: editingColumn.endTime,
                        class_type: 'CANCELLED', // Mark as cancelled
                        room: timetableEntry.room,
                        lecturer_id: timetableEntry.lecturer_id,
                        faculty_id: user.faculty_id
                    }]);

                if (insertError) throw insertError;

                setSuccessMessage("Class cancelled successfully.");
                setIsEditModalOpen(false);
                setEditingColumn(null);
                fetchTimetableAndAttendance();
            } catch (err) {
                console.error("Error cancelling session:", err);
                setError(err.message || "Failed to cancel session.");
            } finally {
                setSaving(false);
            }
            return;
        }

        // Scenario 2: Existing Session (Delete it)
        setSaving(true);
        try {
            const { error: deleteError } = await supabase
                .from('attendance_sessions')
                .delete()
                .eq('id', editingColumn.sessionId);

            if (deleteError) {
                console.error("Supabase Delete Error:", deleteError);
                throw deleteError;
            }

            setSuccessMessage("Session deleted successfully.");
            setIsEditModalOpen(false);
            setEditingColumn(null);
            fetchTimetableAndAttendance(); // Refresh grid
            setTimeout(() => setSuccessMessage(null), 3000);

        } catch (err) {
            console.error("Error deleting session:", err);
            setError(err.message || "Failed to delete session.");
        } finally {
            setSaving(false);
        }
    };

    const handleSaveSessionEdit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            // 1. Validate
            if (!editForm.date || !editForm.startTime || !editForm.endTime) {
                alert("Please fill in all fields");
                setSaving(false);
                return;
            }

            // 2. Data Preparation
            let sessionId = editingColumn.sessionId;
            const newDateStr = editForm.date;

            // ... (rest of the logic remains the same)

            // Logic:
            // If sessionId exists -> Update that row.
            // If sessionId is NULL -> It's a standard timetable slot. 
            //    If we "change" it, we are essentially creating an exception. 
            //    We should Create a new session row with the NEW date/time.
            //    BUT, what happens to the old virtual slot?
            //    The old virtual slot will still exist in "generateDatesFromTimetable" unless we exclude it?
            //    Our current logic says: "Check if there is an existing session that MATCHES this standard slot".
            //    If we create a session with a DIFFERENT date, it won't match. So the old virtual slot stays?
            //    This is tricky. "Moving" a class usually means the original shouldn't be valid anymore.
            //    However, without a "cancellation" record, the system thinks the timetable class still implies a slot.
            //    For now, let's assume "Edit" on a virtual slot just CREATES a new session (extra class) or "moves" it if we have cancellation logic.
            //    Given the requirement "postpone class", usually you'd want the old one gone.
            //    To make the old one gone, we'd need a "cancelled_sessions" table or similar.
            //    OR, we treat `attendance_sessions` as the source of truth for "exceptions". 
            //    If we want to "move" a standard slot, maybe we need to mark the old one as "Cancelled" (or just ignore).
            //    Let's handle the simplest case: Just allow creating/updating. The user can manually "Untick All" on the old date if they want to ignore it, or we leave it.
            //    Actually, if I just change the date of an EXISTING session, it moves.
            //    If I change the date of a VIRTUAL session, I am creating a NEW session. The old virtual one remains as a standard slot.
            //    If the user wants to "remove" the old slot, they technically can't delete a virtual slot without data structure changes.
            //    BUT, often "Postpone" means "Standard Class on Date X is cancelled, New Class on Date Y is created".

            //    Let's stick to: "Edit" -> Create/Update Session. 
            //    If it was virtual (sessionId=null), we Insert.
            //    If it was real (sessionId!=null), we Update.

            if (sessionId) {
                // Scenario A: Update Existing Session
                const { error: updateError } = await supabase
                    .from('attendance_sessions')
                    .update({
                        date: newDateStr,
                        start_time: editForm.startTime,
                        end_time: editForm.endTime
                    })
                    .eq('id', sessionId);

                if (updateError) throw updateError;
                setSuccessMessage("Session updated successfully.");

            } else {
                // Scenario B: Edit Standard Timetable Slot (Virtual -> Real)
                const timetableEntry = timetable.find(t => t.id === editingColumn.timetableId);
                if (!timetableEntry) throw new Error("Source timetable entry not found");

                // 1. Create the NEW session
                const { error: insertError } = await supabase
                    .from('attendance_sessions')
                    .insert([{
                        group_names: timetableEntry.group_names || [selectedGroup],
                        subject_id: selectedSubject,
                        date: newDateStr, // New Date
                        start_time: editForm.startTime, // New Time
                        end_time: editForm.endTime,
                        class_type: editingColumn.type,
                        room: timetableEntry.room,
                        lecturer_id: timetableEntry.lecturer_id,
                        faculty_id: user.faculty_id
                    }]);

                if (insertError) throw insertError;

                // 2. SMART MOVE: If the date changed, CANCEL the original standard slot
                if (newDateStr !== editingColumn.date) {
                    const { error: cancelError } = await supabase
                        .from('attendance_sessions')
                        .insert([{
                            group_names: timetableEntry.group_names || [selectedGroup],
                            subject_id: selectedSubject,
                            date: editingColumn.date, // ORIGINAL Date to cancel
                            start_time: editingColumn.startTime, // ORIGINAL Time
                            end_time: editingColumn.endTime,
                            class_type: 'CANCELLED',
                            room: timetableEntry.room,
                            lecturer_id: timetableEntry.lecturer_id,
                            faculty_id: user.faculty_id
                        }]);

                    if (cancelError) {
                        console.error("Warning: Failed to cancel original slot during move", cancelError);
                        // We don't block the main success, just log warning
                    }
                }

                setSuccessMessage("Session created successfully.");
            }

            setIsEditModalOpen(false);
            setEditingColumn(null);
            fetchTimetableAndAttendance(); // Refresh grid
            setTimeout(() => setSuccessMessage(null), 3000);

        } catch (err) {
            console.error("Error updating session detail:", err);
            setError(err.message || "Failed to update session.");
        } finally {
            setSaving(false);
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
                                <option value="ALL">ALL</option>
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
                                            <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-wider w-16 bg-slate-50 dark:bg-slate-950 border-r border-gray-200 dark:border-slate-800">#</th>
                                            <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-wider w-48 bg-slate-50 dark:bg-slate-950 border-r border-gray-200 dark:border-slate-800">Student Name</th>
                                            {dateColumns.map((col, idx) => (
                                                <th key={idx} className={`px-2 py-4 border-r border-gray-100 dark:border-slate-800 transition-all relative group min-w-[70px] ${col.isHoliday ? 'bg-red-50/30' : ''} ${col.isCancelled ? 'bg-gray-100 dark:bg-slate-800 opacity-60' : ''}`}>
                                                    <div className="flex flex-col items-center gap-1.5">
                                                        {col.isCancelled && (
                                                            <span className="text-[7px] font-bold text-gray-500 uppercase tracking-tighter">CANCELLED</span>
                                                        )}
                                                        {col.isHoliday && (
                                                            <span className="text-[7px] font-bold text-red-500 uppercase tracking-tighter" title={col.holidayName}>CUTI</span>
                                                        )}

                                                        {/* Date */}
                                                        <span className={`text-sm font-bold leading-none ${col.isHoliday ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                                                            {col.displayDate}
                                                        </span>

                                                        {/* Day */}
                                                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider leading-none">
                                                            {col.dayName.slice(0, 3)}
                                                        </span>

                                                        {/* Class Type Badge with Week Number */}
                                                        <div className="mt-0.5 flex items-center gap-1">
                                                            <span className={`
                                                                    w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold
                                                                    ${col.type === 'Lecture' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' :
                                                                    col.type === 'Tutorial' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' :
                                                                        'bg-purple-100 text-purple-600 dark:bg-purple-900/30'}
                                                                `}>
                                                                {col.type?.charAt(0) || 'C'}
                                                            </span>
                                                            {col.weekNum && (
                                                                <span className="bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded text-[8px] font-black border border-gray-200 dark:border-slate-700">
                                                                    W{col.weekNum}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Bulk Actions */}
                                                        {!col.isHoliday && !col.isCancelled && (
                                                            <div className="flex gap-2 items-center">
                                                                <button
                                                                    onClick={() => handleMarkAllOnDate(col)}
                                                                    className="text-gray-400 hover:text-green-500 transition-colors"
                                                                    title="Mark All Present"
                                                                >
                                                                    <Check size={14} strokeWidth={3} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleUntickAllOnDate(col)}
                                                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                                                    title="Clear All"
                                                                >
                                                                    <X size={14} strokeWidth={3} />
                                                                </button>
                                                            </div>
                                                        )}

                                                        {/* Edit Button */}
                                                        <button
                                                            onClick={() => handleEditColumn(col)}
                                                            className="text-gray-400 hover:text-primary transition-colors flex justify-center w-full"
                                                            title="Edit/Move session"
                                                        >
                                                            <Edit size={14} strokeWidth={2.5} />
                                                        </button>
                                                    </div>
                                                </th>
                                            ))}
                                            <th className="px-4 py-3 text-center font-bold text-gray-500 uppercase tracking-wider w-20 bg-slate-50 dark:bg-slate-950 border-l border-gray-200 dark:border-slate-800">
                                                Total
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                        {students.map((student, idx) => (
                                            <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-4 py-3 font-mono text-[10px] text-gray-400 bg-white dark:bg-slate-900 border-r border-gray-100 dark:border-slate-800">
                                                    {idx + 1}
                                                </td>
                                                <td className="px-4 py-3 bg-white dark:bg-slate-900 border-r border-gray-100 dark:border-slate-800 min-w-[180px]">
                                                    <div className="font-medium text-gray-900 dark:text-white text-xs truncate max-w-[140px]" title={student.name}>{student.name}</div>
                                                    <div className="text-[10px] text-gray-400 font-mono">{student.matric_no}</div>
                                                </td>
                                                {dateColumns.map((col, cIdx) => {
                                                    const key = `${col.date}_${col.startTime}`;
                                                    const isPresent = attendanceData[student.id]?.[key] === 'Present';
                                                    const isBlocked = col.isHoliday || col.isCancelled;

                                                    return (
                                                        <td key={cIdx} className={`px-2 py-3 text-center border-r border-gray-50 dark:border-slate-800/50 ${col.isHoliday ? 'bg-red-50/20 dark:bg-red-900/5' : ''} ${col.isCancelled ? 'bg-gray-50 dark:bg-slate-900/50' : ''}`}>
                                                            {col.isHoliday ? (
                                                                <div className="w-8 h-8 mx-auto flex items-center justify-center text-red-500/40 dark:text-red-400/30 font-bold text-[10px] select-none">
                                                                    CUTI
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => !isBlocked && toggleAttendance(student.id, col)}
                                                                    disabled={isBlocked}
                                                                    className={`
                                                                        w-8 h-8 rounded-xl flex items-center justify-center transition-all mx-auto
                                                                        ${isPresent
                                                                            ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-100'
                                                                            : 'bg-gray-100 dark:bg-slate-800 text-transparent hover:scale-105 hover:bg-gray-200 dark:hover:bg-slate-700'
                                                                        }
                                                                        ${isBlocked ? 'opacity-20 cursor-not-allowed scale-90' : ''}
                                                                    `}
                                                                >
                                                                    <Check size={16} strokeWidth={3} className={isPresent ? 'scale-100' : 'scale-0 transition-transform'} />
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
                                    (timetable.length > 0 && timetable[0].lecturers)
                                        ? (timetable[0].lecturers.name)
                                        : (['lecturer', 'hod', 'hop'].includes(user.role) ? user.name : "__________________________")
                                }
                                logoUrl={user?.faculty_logo}
                            />
                        ) : printMode === 'all' ? (
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
                                            ['lecturer', 'hod', 'hop'].includes(user.role)
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
                        ) : (
                            <div className="print:block hidden">
                                {allGroupsData.map((data, idx) => (
                                    <PrintableAttendanceSheet
                                        key={idx}
                                        month={selectedMonth}
                                        group={data.group}
                                        subject={subjects.find(s => s.id === selectedSubject)}
                                        students={data.students}
                                        dates={data.dates}
                                        attendanceData={data.attendanceData}
                                        lecturerName={data.lecturerName}
                                        logoUrl={user?.faculty_logo}
                                        className="print:break-after-page"
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )
            }
            {/* Edit Session Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-100 dark:border-slate-800">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Edit size={20} className="text-primary" />
                            Edit Session
                        </h3>

                        <form onSubmit={handleSaveSessionEdit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                                <input
                                    type="date"
                                    required
                                    value={editForm.date}
                                    onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                                    className="w-full rounded-xl border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:border-primary focus:ring-primary"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Time</label>
                                    <input
                                        type="time"
                                        required
                                        value={editForm.startTime}
                                        onChange={e => setEditForm({ ...editForm, startTime: e.target.value })}
                                        className="w-full rounded-xl border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:border-primary focus:ring-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Time</label>
                                    <input
                                        type="time"
                                        required
                                        value={editForm.endTime}
                                        onChange={e => setEditForm({ ...editForm, endTime: e.target.value })}
                                        className="w-full rounded-xl border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:border-primary focus:ring-primary"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-between items-center mt-6">
                                <button
                                    type="button"
                                    onClick={handleDeleteSession}
                                    disabled={saving}
                                    className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-xl transition-colors disabled:opacity-50"
                                    title={!editingColumn?.sessionId ? "Cancel this standard class for this date" : (editingColumn?.class_type === 'CANCELLED' ? "Restore this class" : "Delete this session")}
                                >
                                    {editingColumn?.class_type === 'CANCELLED' ? "Restore Class" : (!editingColumn?.sessionId ? "Cancel Class" : "Delete Session")}
                                </button>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditModalOpen(false)}
                                        className="px-4 py-2 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors font-medium text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="px-4 py-2 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors font-bold text-sm shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )
            }
        </>
    );
};

export default Attendance;
