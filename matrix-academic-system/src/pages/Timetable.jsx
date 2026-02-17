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
    BookOpen,
    Plus,
    Trash2,
    Users
} from 'lucide-react';

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

const Timetable = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    // Filter State
    const [viewMode, setViewMode] = useState('group'); // 'group', 'subject', 'lecturer'
    const [selectedFilterId, setSelectedFilterId] = useState('');

    const [groups, setGroups] = useState([]);
    const [timetable, setTimetable] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [lecturers, setLecturers] = useState([]);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        subject_id: '',
        lecturer_id: '',
        class_type: 'Lecture',
        day: 'Monday',
        start_time: '08:00',
        end_time: '09:00',
        room: '',
        group_name: '' // Added group_name to form data
    });

    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    useEffect(() => {
        if (user?.faculty_id) {
            fetchGroups();
            fetchSubjects();
            fetchLecturers();
        }
    }, [user?.faculty_id]);

    useEffect(() => {
        if (selectedFilterId) {
            fetchTimetable();
        } else {
            setTimetable([]);
        }
    }, [selectedFilterId, viewMode]);

    // Reset selection when view mode changes
    useEffect(() => {
        setSelectedFilterId('');
    }, [viewMode]);

    const fetchGroups = async () => {
        try {
            const { data, error } = await supabase
                .from('students')
                .select('student_group')
                .eq('faculty_id', user.faculty_id)
                .not('student_group', 'is', null);

            if (error) throw error;
            const uniqueGroups = [...new Set(data.map(item => item.student_group))].sort();
            setGroups(uniqueGroups);

            // Set initial state if in group mode and groups exist
            if (viewMode === 'group' && uniqueGroups.length > 0 && !selectedFilterId) {
                setSelectedFilterId(uniqueGroups[0]);
            }
        } catch (err) {
            console.error('Error fetching groups:', err);
        }
    };

    const fetchSubjects = async () => {
        try {
            const { data, error } = await supabase
                .from('subjects')
                .select('id, code, name')
                .eq('faculty_id', user.faculty_id)
                .order('code');
            if (error) throw error;
            setSubjects(data || []);
        } catch (err) {
            console.error('Error fetching subjects:', err);
        }
    };

    const fetchLecturers = async () => {
        try {
            const { data, error } = await supabase
                .from('lecturers')
                .select('id, name')
                .eq('faculty_id', user.faculty_id)
                .order('name');
            if (error) throw error;
            setLecturers(data || []);
        } catch (err) {
            console.error('Error fetching lecturers:', err);
        }
    };

    const fetchTimetable = async () => {
        if (!selectedFilterId) return;

        try {
            setLoading(true);
            let query = supabase
                .from('timetable')
                .select(`
                    *,
                    subjects (id, code, name),
                    lecturers (name)
                `)
                .eq('faculty_id', user.faculty_id);

            // Apply filter based on view mode
            if (viewMode === 'group') {
                query = query.eq('group_name', selectedFilterId);
            } else if (viewMode === 'subject') {
                query = query.eq('subject_id', selectedFilterId);
            } else if (viewMode === 'lecturer') {
                query = query.eq('lecturer_id', selectedFilterId);
            }

            const { data, error } = await query;

            if (error) throw error;
            setTimetable(data || []);
        } catch (err) {
            console.error('Error fetching timetable:', err);
            setError('Failed to load timetable.');
        } finally {
            setLoading(false);
        }
    };

    const handleSlotClick = (day, hour) => {
        const timeStr = `${hour.toString().padStart(2, '0')}:00:00`;
        // Check if there is already a class at this slot
        const existingClass = timetable.find(t =>
            t.day === day &&
            t.start_time <= timeStr &&
            t.end_time > timeStr
        );

        if (existingClass) {
            setEditingClass(existingClass);
            setFormData({
                subject_id: existingClass.subject_id,
                lecturer_id: existingClass.lecturer_id || '',
                class_type: existingClass.class_type || 'Lecture',
                day: existingClass.day,
                start_time: existingClass.start_time.slice(0, 5),
                end_time: existingClass.end_time.slice(0, 5),
                room: existingClass.room || '',
                group_name: existingClass.group_name
            });
            setIsModalOpen(true);
        } else {
            setEditingClass(null);

            // Pre-fill based on current filter context
            const initialData = {
                subject_id: viewMode === 'subject' ? selectedFilterId : '',
                lecturer_id: viewMode === 'lecturer' ? selectedFilterId : '',
                class_type: 'Lecture',
                day: day,
                start_time: `${hour.toString().padStart(2, '0')}:00`,
                end_time: `${(hour + 1).toString().padStart(2, '0')}:00`,
                room: '',
                group_name: viewMode === 'group' ? selectedFilterId : ''
            };

            setFormData(initialData);
            setIsModalOpen(true);
        }
    };

    const checkOverlap = async (data, excludeId = null) => {
        // Validation for overlap:
        // 1. Group conflict
        // 2. Lecturer conflict
        // 3. Room conflict

        let query = supabase
            .from('timetable')
            .select('id, group_name, lecturers(name), room, start_time, end_time, lecturer_id')
            .eq('faculty_id', user.faculty_id)
            .eq('day', data.day)
            .lt('start_time', data.end_time)
            .gt('end_time', data.start_time);

        if (excludeId) {
            query = query.neq('id', excludeId);
        }

        const { data: conflicts, error: conflictError } = await query;
        if (conflictError) throw conflictError;

        for (const conflict of conflicts) {
            if (conflict.group_name === data.group_name) {
                return `Group conflict: Group ${data.group_name} is already scheduled for another class in this time slot.`;
            }
            if (data.lecturer_id && conflict.lecturer_id === data.lecturer_id) {
                return `Lecturer conflict: This lecturer is already teaching another class in this time slot.`;
            }
            if (data.room && conflict.room === data.room) {
                return `Room conflict: This room is already occupied in this time slot.`;
            }
        }
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        // Basic check
        if (formData.start_time >= formData.end_time) {
            setError("End time must be after start time.");
            return;
        }

        if (!formData.group_name) {
            setError("Student group is required.");
            return;
        }

        try {
            // Check for overlaps
            const overlapMsg = await checkOverlap(formData, editingClass?.id);
            if (overlapMsg) {
                setError(overlapMsg);
                return;
            }

            const payload = {
                faculty_id: user.faculty_id,
                group_name: formData.group_name,
                subject_id: formData.subject_id,
                lecturer_id: formData.lecturer_id || null,
                class_type: formData.class_type,
                day: formData.day,
                start_time: formData.start_time,
                end_time: formData.end_time,
                room: formData.room
            };

            if (editingClass) {
                const { error } = await supabase
                    .from('timetable')
                    .update(payload)
                    .eq('id', editingClass.id);
                if (error) throw error;
                setSuccess('Class updated successfully.');
            } else {
                const { error } = await supabase
                    .from('timetable')
                    .insert([payload]);
                if (error) throw error;
                setSuccess('Class scheduled successfully.');
            }

            setTimeout(() => setSuccess(null), 3000);
            setIsModalOpen(false);
            setEditingClass(null);
            await fetchTimetable();
        } catch (err) {
            console.error('Error saving class:', err);
            setError(err.message || 'Failed to save class schedule.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!editingClass || !window.confirm('Are you sure you want to delete this class?')) return;

        try {
            setLoading(true);
            const { error: deleteError } = await supabase
                .from('timetable')
                .delete()
                .eq('id', editingClass.id);

            if (deleteError) throw deleteError;

            setSuccess('Class deleted successfully.');
            setTimeout(() => setSuccess(null), 3000);

            setIsModalOpen(false);
            setEditingClass(null);

            // Re-fetch timetable to update the grid
            await fetchTimetable();
        } catch (err) {
            console.error('Error deleting class:', err);
            setError(err.message || 'Failed to delete class.');
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

            if (classStartingHere) {
                const startH = parseInt(classStartingHere.start_time.split(':')[0]);
                const endH = parseInt(classStartingHere.end_time.split(':')[0]);
                let duration = endH - startH;
                if (duration < 1) duration = 1;

                cells.push(
                    <div
                        key={`${day}-${currentHour}`}
                        className={`p-1 col-span-${duration} relative group`}
                        style={{ gridColumn: `span ${duration} / span ${duration}` }}
                        onClick={() => handleSlotClick(day, currentHour)}
                    >
                        <div className={`h-full w-full rounded-md border p-2 shadow-sm cursor-pointer transition-transform hover:scale-[1.02] flex flex-col justify-between overflow-hidden ${getSubjectColor(classStartingHere.subject_id, subjects)}`}>
                            <div>
                                <div className="font-bold text-xs truncate uppercase tracking-tight">
                                    {classStartingHere.subjects?.code} ({classStartingHere.class_type || 'Lec'})
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[10px] font-medium truncate opacity-90">
                                        {classStartingHere.subjects?.name}
                                    </span>
                                    {viewMode !== 'group' && (
                                        <span className="shrink-0 px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 text-[9px] font-bold tracking-wider uppercase">
                                            {classStartingHere.group_name}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="mt-1 space-y-0.5">
                                {classStartingHere.lecturers?.name && (
                                    <div className="flex items-center text-[10px] opacity-80 truncate">
                                        <User size={10} className="mr-1" />
                                        {classStartingHere.lecturers.name}
                                    </div>
                                )}
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
            } else {
                // Check if this slot is occupied by a class starting earlier
                const occupiedBy = timetable.find(t =>
                    t.day === day && t.start_time < startTimeStr && t.end_time > startTimeStr
                );

                if (occupiedBy) {
                    // This hour part belongs to an already rendered merged slot.
                    // We don't render anything here as the main cell spans over this column.
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

    return (
        <div className="h-full flex flex-col">
            <PageHeader
                title="Timetable Management"
                actionLabel={selectedFilterId ? "Add Class" : null}
                onAction={() => {
                    setEditingClass(null);
                    setFormData({
                        subject_id: viewMode === 'subject' ? selectedFilterId : '',
                        lecturer_id: viewMode === 'lecturer' ? selectedFilterId : '',
                        class_type: 'Lecture',
                        day: 'Monday',
                        start_time: '08:00',
                        end_time: '09:00',
                        room: '',
                        group_name: viewMode === 'group' ? selectedFilterId : ''
                    });
                    setIsModalOpen(true);
                }}
            />

            <div className="mb-6 bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50">
                <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-6">

                    {/* View Mode Selector */}
                    <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                        {[
                            { id: 'group', label: 'By Group', icon: Users },
                            { id: 'subject', label: 'By Subject', icon: BookOpen },
                            { id: 'lecturer', label: 'By Lecturer', icon: User }
                        ].map(mode => (
                            <button
                                key={mode.id}
                                onClick={() => setViewMode(mode.id)}
                                className={`flex items-center justify-center px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-normal text-center h-full ${viewMode === mode.id
                                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                    }`}
                            >
                                <mode.icon size={16} className="mr-2 shrink-0" />
                                <span className="leading-tight">{mode.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Filter Dropdown */}
                    <div className="flex-1">
                        <select
                            value={selectedFilterId}
                            onChange={(e) => setSelectedFilterId(e.target.value)}
                            className="block w-full max-w-md rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-900 dark:text-white px-4 py-2.5 border transition-all"
                        >
                            <option value="">
                                {viewMode === 'group' ? 'Select Group...' :
                                    viewMode === 'subject' ? 'Select Subject...' :
                                        'Select Lecturer...'}
                            </option>

                            {viewMode === 'group' && groups.map(g => (
                                <option key={g} value={g}>{g}</option>
                            ))}

                            {viewMode === 'subject' && subjects.map(s => (
                                <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                            ))}

                            {viewMode === 'lecturer' && lecturers.map(l => (
                                <option key={l.id} value={l.id}>{l.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-md mb-4 text-sm flex justify-between items-center animate-in mb-4">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="text-sm underline">Dismiss</button>
                </div>
            )}

            {success && (
                <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-4 rounded-md mb-4 text-sm flex justify-between items-center animate-in mb-4">
                    <span>{success}</span>
                    <button onClick={() => setSuccess(null)} className="text-sm underline">Dismiss</button>
                </div>
            )}

            <div className="flex-1 overflow-auto bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 relative">
                {!selectedFilterId ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                        <Calendar size={64} className="mb-4 opacity-20" />
                        <p>Select a {viewMode} to view timetable.</p>
                    </div>
                ) : (
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
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingClass ? "Edit Class" : "Schedule Class"}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Group Name Field - Always visible but pre-filled if in group mode */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Student Group</label>
                        <div className="mt-1 flex rounded-md shadow-sm">
                            <input
                                type="text"
                                required
                                className="block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                                value={formData.group_name}
                                onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
                                placeholder="e.g FA01"
                                list="group-suggestions"
                            />
                            <datalist id="group-suggestions">
                                {groups.map(g => <option key={g} value={g} />)}
                            </datalist>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subject</label>
                            <select
                                required
                                className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                                value={formData.subject_id}
                                onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                                disabled={viewMode === 'subject' && !editingClass} // Optional: lock if filtered by subject
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
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Lecturer</label>
                            <select
                                className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                                value={formData.lecturer_id}
                                onChange={(e) => setFormData({ ...formData, lecturer_id: e.target.value })}
                                disabled={viewMode === 'lecturer' && !editingClass} // Optional: lock if filtered by lecturer
                            >
                                <option value="">Select Lecturer (Optional)...</option>
                                {lecturers.map(l => (
                                    <option key={l.id} value={l.id}>{l.name}</option>
                                ))}
                            </select>
                        </div>
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
                                <Trash2 size={16} className="mr-1" /> Delete Class
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

export default Timetable;
