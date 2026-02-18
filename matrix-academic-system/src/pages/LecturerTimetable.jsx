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
    Users,
    Trash2,
    Plus,
    Printer
} from 'lucide-react';
import PrintableTimetableSheet from '../components/timetable/PrintableTimetableSheet';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const START_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

// Simple color palette for subjects
const COLORS = [
    'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-800',
    'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-green-200 dark:border-green-800',
    'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-200 dark:border-purple-800',
    'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/40 dark:text-orange-200 dark:border-orange-800',
    'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/40 dark:text-pink-200 dark:border-pink-800',
    'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-200 dark:border-indigo-800',
    'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/40 dark:text-teal-200 dark:border-teal-800',
    'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-200 dark:border-yellow-800',
];

const getSubjectColor = (subjectId, allSubjects) => {
    if (!subjectId) return 'bg-gray-50 border-gray-100';
    const index = allSubjects.findIndex(s => s.id === subjectId);
    if (index === -1) return 'bg-gray-100 text-gray-800 border-gray-200';
    return COLORS[index % COLORS.length];
};

const LecturerTimetable = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [timetable, setTimetable] = useState([]);
    const [activities, setActivities] = useState([]); // New state for activities
    const [subjects, setSubjects] = useState([]);
    const [groups, setGroups] = useState([]); // Available groups for selection
    const [lecturerDetails, setLecturerDetails] = useState(null);
    const [isPrinting, setIsPrinting] = useState(false);

    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState(null);
    const [formData, setFormData] = useState({
        // Common fields
        type: 'Class', // 'Class' or 'Activity'
        day: 'Monday',
        start_time: '08:00',
        end_time: '09:00',

        // Class specific
        subject_id: '',
        class_type: 'Lecture',
        room: '',
        group_names: [],

        // Activity specific
        activity_type: 'Research', // 'Research', 'Consultation', 'Meeting', 'Other'
        activity_name: '',
        description: ''
    });

    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    useEffect(() => {
        if (user?.lecturer_id) {
            fetchData();
        }
    }, [user?.lecturer_id]);

    const fetchData = async () => {
        try {
            setLoading(true);

            // 1. Fetch Subjects for coloring and selection
            const { data: subjectsData, error: subjectsError } = await supabase
                .from('subjects')
                .select('id, code, name')
                .order('code');

            if (subjectsError) throw subjectsError;
            setSubjects(subjectsData || []);

            // 2. Fetch Groups for selection
            const { data: groupsData, error: groupsError } = await supabase
                .from('students')
                .select('student_group')
                .eq('faculty_id', user?.faculty_id)
                .not('student_group', 'is', null);

            if (groupsError) throw groupsError;
            const uniqueGroups = [...new Set(groupsData.map(item => item.student_group))].sort();
            setGroups(uniqueGroups);

            // 3. Fetch Timetable for this lecturer
            await fetchTimetable();

        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchTimetable = async () => {
        // Fetch Classes
        const { data: timetableData, error: timetableError } = await supabase
            .from('timetable')
            .select(`
                *,
                subjects (id, code, name)
            `)
            .eq('lecturer_id', user.lecturer_id);

        if (timetableError) throw timetableError;
        setTimetable(timetableData || []);

        // Fetch Activities
        const { data: activitiesData, error: activitiesError } = await supabase
            .from('lecturer_activities')
            .select('*')
            .eq('lecturer_id', user.lecturer_id);

        if (activitiesError) throw activitiesError;
        setActivities(activitiesData || []);

        // Fetch Lecturer Details for Print
        const { data: lecturerData } = await supabase
            .from('lecturers')
            .select(`
                *,
                departments (
                    code,
                    name,
                    faculties (
                        name
                    )
                )
            `)
            .eq('id', user.lecturer_id)
            .single();
        setLecturerDetails(lecturerData);
    };

    const handlePrintTimetable = () => {
        setIsPrinting(true);
        setTimeout(() => {
            window.print();
            setTimeout(() => setIsPrinting(false), 1000);
        }, 500);
    };

    const handleSlotClick = (day, hour) => {
        const timeStr = `${hour.toString().padStart(2, '0')}:00:00`;

        // Check if there is already a CLASS at this slot
        const existingClass = timetable.find(t =>
            t.day === day &&
            t.start_time <= timeStr &&
            t.end_time > timeStr
        );

        // Check if there is already an ACTIVITY at this slot
        const existingActivity = activities.find(a =>
            a.day === day &&
            a.start_time <= timeStr &&
            a.end_time > timeStr
        );

        if (existingClass) {
            setEditingClass({ ...existingClass, type: 'Class' });
            setFormData({
                type: 'Class',
                subject_id: existingClass.subject_id,
                class_type: existingClass.class_type || 'Lecture',
                day: existingClass.day,
                start_time: existingClass.start_time.slice(0, 5),
                end_time: existingClass.end_time.slice(0, 5),
                room: existingClass.room || '',
                group_names: Array.isArray(existingClass.group_names) ? existingClass.group_names : (existingClass.group_names ? [existingClass.group_names] : []),
                activity_type: 'Research',
                activity_name: '',
                description: ''
            });
            setIsModalOpen(true);
        } else if (existingActivity) {
            setEditingClass({ ...existingActivity, type: 'Activity' });
            setFormData({
                type: 'Activity',
                subject_id: '',
                class_type: 'Lecture',
                day: existingActivity.day,
                start_time: existingActivity.start_time.slice(0, 5),
                end_time: existingActivity.end_time.slice(0, 5),
                room: '',
                group_names: [],
                activity_type: existingActivity.activity_type,
                activity_name: existingActivity.activity_name,
                description: existingActivity.description || ''
            });
            setIsModalOpen(true);
        } else {
            setEditingClass(null);
            setFormData({
                type: 'Class',
                subject_id: '',
                class_type: 'Lecture',
                day: day,
                start_time: `${hour.toString().padStart(2, '0')}:00`,
                end_time: `${(hour + 1).toString().padStart(2, '0')}:00`,
                room: '',
                group_names: [],
                activity_type: 'Research',
                activity_name: '',
                description: ''
            });
            setIsModalOpen(true);
        }
    };

    const checkOverlap = async (data, excludeId = null) => {
        let query = supabase
            .from('timetable')
            .select('id, group_names, room, start_time, end_time, lecturer_id')
            .eq('faculty_id', user?.faculty_id)
            .eq('day', data.day)
            .lt('start_time', data.end_time)
            .gt('end_time', data.start_time);

        if (excludeId) {
            query = query.neq('id', excludeId);
        }

        const { data: conflicts, error: conflictError } = await query;
        if (conflictError) throw conflictError;

        for (const conflict of conflicts) {
            // Check own conflict (Lecturer conflict)
            if (conflict.lecturer_id === user.lecturer_id) {
                return `You already have another class in this time slot.`;
            }

            // Check Group conflict
            const groupConflict = data.group_names.some(g => conflict.group_names?.includes(g));
            if (groupConflict) {
                return `Group conflict: One or more groups are already scheduled for another class in this time slot.`;
            }
            // Check Room conflict
            if (data.room && conflict.room === data.room) {
                return `Room conflict: This room is already occupied in this time slot.`;
            }
        }
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Basic check
        if (formData.start_time >= formData.end_time) {
            setError("End time must be after start time.");
            setLoading(false);
            return;
        }

        try {
            if (formData.type === 'Class') {
                if (formData.group_names.length === 0) {
                    throw new Error("Please select at least one student group.");
                }

                // Check for overlaps (Classes only for now, logic can be extended)
                const overlapMsg = await checkOverlap(formData, editingClass?.id);
                if (overlapMsg) {
                    throw new Error(overlapMsg);
                }

                const payload = {
                    day: formData.day,
                    start_time: formData.start_time,
                    end_time: formData.end_time,
                    room: formData.room,
                    group_names: formData.group_names,
                    subject_id: formData.subject_id,
                    class_type: formData.class_type,
                    lecturer_id: user.lecturer_id,
                    faculty_id: user?.faculty_id
                };

                let res;
                if (editingClass) {
                    res = await supabase
                        .from('timetable')
                        .update(payload)
                        .eq('id', editingClass.id);
                } else {
                    res = await supabase
                        .from('timetable')
                        .insert([payload]);
                }
                if (res.error) throw res.error;

            } else {
                // Handle Activity
                const payload = {
                    day: formData.day,
                    start_time: formData.start_time,
                    end_time: formData.end_time,
                    activity_type: formData.activity_type,
                    description: formData.description,
                    lecturer_id: user.lecturer_id
                };

                let res;
                if (editingClass) {
                    res = await supabase
                        .from('lecturer_activities')
                        .update(payload)
                        .eq('id', editingClass.id);
                } else {
                    res = await supabase
                        .from('lecturer_activities')
                        .insert([payload]);
                }
                if (res.error) throw res.error;
            }

            setSuccess('Schedule updated successfully!');
            setTimeout(() => setSuccess(null), 3000);
            setIsModalOpen(false);
            setEditingClass(null);
            await fetchTimetable();
        } catch (err) {
            console.error('Error saving schedule:', err);
            setError(err.message || 'Failed to save schedule.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!editingClass || !window.confirm('Are you sure you want to delete this item?')) return;

        try {
            setLoading(true);
            const table = editingClass.type === 'Activity' ? 'lecturer_activities' : 'timetable';

            const { error: deleteError } = await supabase
                .from(table)
                .delete()
                .eq('id', editingClass.id);

            if (deleteError) throw deleteError;

            setSuccess('Item deleted successfully.');
            setTimeout(() => setSuccess(null), 3000);

            setIsModalOpen(false);
            setEditingClass(null);

            await fetchTimetable();
        } catch (err) {
            console.error('Error deleting item:', err);
            setError(err.message || 'Failed to delete item.');
        } finally {
            setLoading(false);
        }
    };

    const renderDayRow = (day) => {
        const cells = [];
        let p = 0;

        while (p < START_HOURS.length) {
            const currentHour = START_HOURS[p];
            const startTimeStr = `${currentHour.toString().padStart(2, '0')}:00:00`;

            const classStartingHere = timetable.find(t =>
                t.day === day && t.start_time === startTimeStr
            );

            const activityStartingHere = activities.find(a =>
                a.day === day && a.start_time === startTimeStr
            );

            if (classStartingHere) {
                const startH = parseInt(classStartingHere.start_time.split(':')[0]);
                const endH = parseInt(classStartingHere.end_time.split(':')[0]);
                let duration = endH - startH;
                if (duration < 1) duration = 1;

                cells.push(
                    <div
                        key={`class-${day}-${currentHour}`}
                        className={`p-1 col-span-${duration} relative group`}
                        style={{ gridColumn: `span ${duration} / span ${duration}` }}
                        onClick={() => handleSlotClick(day, currentHour)}
                    >
                        <div className={`cursor-pointer h-full w-full rounded-md border p-2 shadow-sm transition-transform hover:scale-[1.02] flex flex-col justify-between overflow-hidden ${getSubjectColor(classStartingHere.subject_id, subjects)}`}>
                            <div>
                                <div className="font-bold text-xs truncate uppercase tracking-tight">
                                    {classStartingHere.subjects?.code} ({classStartingHere.class_type || 'Lec'})
                                </div>
                                <div className="text-[10px] font-medium truncate mt-0.5 opacity-90">
                                    {classStartingHere.subjects?.name}
                                </div>
                            </div>
                            <div className="mt-1 space-y-0.5">
                                <div className="flex items-center text-[10px] opacity-80">
                                    <Users size={10} className="mr-1" />
                                    <span className="truncate">{Array.isArray(classStartingHere.group_names) ? classStartingHere.group_names.join(', ') : (classStartingHere.group_names || classStartingHere.group_name)}</span>
                                </div>
                                <div className="flex items-center text-[10px] opacity-80">
                                    <MapPin size={10} className="mr-1" />
                                    {classStartingHere.room || 'No Room'}
                                </div>
                                <div className="flex items-center text-[10px] opacity-80">
                                    <Clock size={10} className="mr-1" />
                                    {classStartingHere.start_time.slice(0, 5)} - {classStartingHere.end_time.slice(0, 5)}
                                </div>
                            </div>
                        </div>
                    </div>
                );
                p += duration;
            } else if (activityStartingHere) {
                const startH = parseInt(activityStartingHere.start_time.split(':')[0]);
                const endH = parseInt(activityStartingHere.end_time.split(':')[0]);
                let duration = endH - startH;
                if (duration < 1) duration = 1;

                cells.push(
                    <div
                        key={`activity-${day}-${currentHour}`}
                        className={`p-1 col-span-${duration} relative group`}
                        style={{ gridColumn: `span ${duration} / span ${duration}` }}
                        onClick={() => handleSlotClick(day, currentHour)}
                    >
                        <div className="cursor-pointer h-full w-full rounded-md border p-2 shadow-sm transition-transform hover:scale-[1.02] flex flex-col justify-between overflow-hidden bg-orange-100 text-orange-900 border-orange-200 dark:bg-orange-900/40 dark:text-orange-100 dark:border-orange-800">
                            <div>
                                <div className="font-bold text-xs truncate uppercase tracking-tight">
                                    {activityStartingHere.activity_type}
                                </div>
                                <div className="text-[10px] font-medium truncate mt-0.5 opacity-90">
                                    Activity
                                </div>
                            </div>
                            <div className="mt-1 space-y-0.5">
                                <div className="flex items-center text-[10px] opacity-80">
                                    <Clock size={10} className="mr-1" />
                                    {activityStartingHere.start_time.slice(0, 5)} - {activityStartingHere.end_time.slice(0, 5)}
                                </div>
                            </div>
                        </div>
                    </div>
                );
                p += duration;
            } else {
                // Check if this slot is occupied by a class starting earlier
                const occupiedBy = timetable.find(t =>
                    t.day === day && t.start_time < startTimeStr && t.end_time > startTimeStr
                ) || activities.find(a =>
                    a.day === day && a.start_time < startTimeStr && a.end_time > startTimeStr
                );

                if (occupiedBy) {
                    p++;
                } else {
                    cells.push(
                        <div
                            key={`${day}-${currentHour}`}
                            className="border-r border-gray-100 dark:border-slate-700 h-24 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                            onClick={() => handleSlotClick(day, currentHour)}
                        ></div>
                    );
                    p++;
                }
            }
        }
        return cells;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <PageHeader
                title="My Timetable"
                actionLabel="Add Class"
                onAction={() => {
                    setEditingClass(null);
                    setFormData({
                        type: 'Class',
                        subject_id: '',
                        class_type: 'Lecture',
                        day: 'Monday',
                        start_time: '08:00',
                        end_time: '09:00',
                        room: '',
                        group_names: [],
                        activity_type: '(PPP)',
                        description: ''
                    });
                    setIsModalOpen(true);
                }}
            >

                <button
                    onClick={handlePrintTimetable}
                    className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-sm mr-2"
                >
                    <Printer className="w-4 h-4 mr-2" />
                    Print Timetable
                </button>
                <button
                    onClick={() => {
                        setEditingClass(null);
                        setFormData({
                            type: 'Activity',
                            subject_id: '',
                            class_type: 'Lecture',
                            day: 'Monday',
                            start_time: '08:00',
                            end_time: '09:00',
                            room: '',
                            group_names: [],
                            activity_type: '(PPP)',
                            description: ''
                        });
                        setIsModalOpen(true);
                    }}
                    className="flex items-center justify-center px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-all shadow-sm"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Other Task
                </button>
            </PageHeader>

            {isPrinting && (
                <PrintableTimetableSheet
                    lecturer={lecturerDetails}
                    timetable={timetable}
                    activities={activities}
                />
            )}

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-md mb-4 text-sm flex justify-between items-center animate-in mt-4">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="text-sm underline">Dismiss</button>
                </div>
            )}

            {success && (
                <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-4 rounded-md mb-4 text-sm flex justify-between items-center animate-in mt-4">
                    <span>{success}</span>
                    <button onClick={() => setSuccess(null)} className="text-sm underline">Dismiss</button>
                </div>
            )}

            <div className="flex-1 overflow-auto bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 relative mt-6">
                <div className="min-w-[1000px] p-4">
                    <div className="grid grid-cols-[100px_repeat(10,1fr)] mb-2 border-b border-gray-200 dark:border-slate-700 pb-2">
                        <div className="font-bold text-gray-400 text-xs uppercase tracking-wider text-center pt-2">Day / Time</div>
                        {START_HOURS.map(hour => (
                            <div key={hour} className="text-center font-semibold text-gray-600 dark:text-gray-300 text-sm py-2">
                                {hour.toString().padStart(2, '0')}:00
                            </div>
                        ))}
                    </div>

                    <div className="divide-y divide-gray-100 dark:divide-slate-700">
                        {DAYS.map(day => (
                            <div key={day} className="grid grid-cols-[100px_1fr] min-h-[6rem]">
                                <div className="flex flex-col justify-center items-center font-bold text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-slate-900 text-sm border-r border-gray-200 dark:border-slate-700 p-2 text-center uppercase tracking-tighter">
                                    {day.slice(0, 3)}
                                </div>
                                <div className="grid grid-cols-10">
                                    {renderDayRow(day)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingClass ? "Edit Class" : "Schedule Class"}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Type Selector */}
                    <div className="flex space-x-4 mb-4">
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="radio"
                                name="type"
                                value="Class"
                                checked={formData.type === 'Class'}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                className="mr-2 text-primary focus:ring-primary"
                            />
                            <span className="font-medium text-gray-700 dark:text-gray-200">Class (PdP)</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="radio"
                                name="type"
                                value="Activity"
                                checked={formData.type === 'Activity'}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                className="mr-2 text-orange-500 focus:ring-orange-500"
                            />
                            <span className="font-medium text-gray-700 dark:text-gray-200">Other Activity</span>
                        </label>
                    </div>

                    {formData.type === 'Class' ? (
                        <>
                            {/* Class Form Fields */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Student Groups (Select Multiple)</label>
                                <div className="mt-1 p-3 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                                    {groups.map(group => (
                                        <label key={group} className="flex items-center space-x-2 p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded transition-colors cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-primary focus:ring-primary dark:bg-slate-800"
                                                checked={formData.group_names.includes(group)}
                                                onChange={(e) => {
                                                    const newGroups = e.target.checked
                                                        ? [...formData.group_names, group]
                                                        : formData.group_names.filter(g => g !== group);
                                                    setFormData({ ...formData, group_names: newGroups });
                                                }}
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">{group}</span>
                                        </label>
                                    ))}
                                    {groups.length === 0 && (
                                        <div className="col-span-full text-center text-xs text-gray-500 py-4">No groups found.</div>
                                    )}
                                </div>
                                {formData.group_names.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {formData.group_names.map(g => (
                                            <span key={g} className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold rounded-full border border-indigo-200 dark:border-indigo-800/50">
                                                {g}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subject</label>
                                    <select
                                        required
                                        className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                                        value={formData.subject_id}
                                        onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                                    >
                                        <option value="">Select Subject...</option>
                                        {subjects.map(s => (
                                            <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Room</label>
                                    <input
                                        type="text"
                                        className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                                        value={formData.room}
                                        onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                                        placeholder="e.g. DK 1"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Class Type</label>
                                    <select
                                        required
                                        className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                                        value={formData.class_type}
                                        onChange={(e) => setFormData({ ...formData, class_type: e.target.value })}
                                    >
                                        <option value="Lecture">Lecture</option>
                                        <option value="Tutorial">Tutorial</option>
                                        <option value="Lab">Lab</option>
                                    </select>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Activity Form Fields */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Activity Type</label>
                                    <select
                                        required
                                        className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                                        value={formData.activity_type}
                                        onChange={(e) => setFormData({ ...formData, activity_type: e.target.value })}
                                    >
                                        <option value="(PPP)">(PPP)</option>
                                        <option value="Konsultasi">Konsultasi</option>
                                        <option value="Mentoring">Mentoring</option>
                                        <option value="**">**</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description (Optional)</label>
                                <textarea
                                    className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows="2"
                                />
                            </div>
                        </>
                    )}

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Day</label>
                            <select
                                required
                                className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                                value={formData.day}
                                onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                            >
                                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Time</label>
                            <input
                                type="time"
                                required
                                className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                                value={formData.start_time}
                                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Time</label>
                            <input
                                type="time"
                                required
                                className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                                value={formData.end_time}
                                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-slate-700 mt-4">
                        {editingClass ? (
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="flex items-center text-red-600 hover:text-red-700 text-sm font-medium"
                            >
                                <Trash2 size={16} className="mr-1" /> Delete Item
                            </button>
                        ) : (
                            <div></div>
                        )}
                        <div className="flex space-x-3">
                            <button
                                type="button"
                                disabled={loading}
                                onClick={() => setIsModalOpen(false)}
                                className="px-6 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold uppercase tracking-widest text-gray-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-bold disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-2 border border-transparent rounded-xl shadow-pastel text-xs font-bold uppercase tracking-widest text-white bg-primary hover:opacity-90 transition-all disabled:opacity-50 flex items-center"
                            >
                                {loading && <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>}
                                {editingClass ? 'Update Class' : 'Schedule Class'}
                            </button>
                        </div>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default LecturerTimetable;
