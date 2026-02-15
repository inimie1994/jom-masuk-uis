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
    'bg-blue-100 text-blue-800 border-blue-200',
    'bg-green-100 text-green-800 border-green-200',
    'bg-purple-100 text-purple-800 border-purple-200',
    'bg-orange-100 text-orange-800 border-orange-200',
    'bg-pink-100 text-pink-800 border-pink-200',
    'bg-indigo-100 text-indigo-800 border-indigo-200',
    'bg-teal-100 text-teal-800 border-teal-200',
    'bg-yellow-100 text-yellow-800 border-yellow-200',
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
    const [groups, setGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState('');
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
        room: ''
    });

    const [error, setError] = useState(null);

    useEffect(() => {
        if (user?.faculty_id) {
            fetchGroups();
            fetchSubjects();
            fetchLecturers();
        }
    }, [user?.faculty_id]);

    useEffect(() => {
        if (selectedGroup) {
            fetchTimetable();
        } else {
            setTimetable([]);
        }
    }, [selectedGroup]);

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
            if (uniqueGroups.length > 0 && !selectedGroup) {
                setSelectedGroup(uniqueGroups[0]);
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
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('timetable')
                .select(`
                    *,
                    subjects (id, code, name),
                    lecturers (name)
                `)
                .eq('faculty_id', user.faculty_id)
                .eq('group_name', selectedGroup);

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
                room: existingClass.room || ''
            });
            setIsModalOpen(true);
        } else {
            setEditingClass(null);
            setFormData({
                subject_id: '',
                lecturer_id: '',
                class_type: 'Lecture',
                day: day,
                start_time: `${hour.toString().padStart(2, '0')}:00`,
                end_time: `${(hour + 1).toString().padStart(2, '0')}:00`,
                room: ''
            });
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
            .select('id, group_name, lecturers(name), room, start_time, end_time')
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
            if (conflict.group_name === selectedGroup) {
                return `Group conflict: This group is already scheduled for another class in this time slot.`;
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

        try {
            // Check for overlaps
            const overlapMsg = await checkOverlap(formData, editingClass?.id);
            if (overlapMsg) {
                setError(overlapMsg);
                return;
            }

            const payload = {
                faculty_id: user.faculty_id,
                group_name: selectedGroup,
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
            } else {
                const { error } = await supabase
                    .from('timetable')
                    .insert([payload]);
                if (error) throw error;
            }

            setIsModalOpen(false);
            fetchTimetable();
        } catch (err) {
            console.error('Error saving class:', err);
            setError('Failed to save class schedule.');
        }
    };

    const handleDelete = async () => {
        if (!editingClass || !window.confirm('Are you sure?')) return;
        try {
            const { error } = await supabase.from('timetable').delete().eq('id', editingClass.id);
            if (error) throw error;
            setIsModalOpen(false);
            fetchTimetable();
        } catch (err) {
            console.error('Error deleting:', err);
            setError('Failed to delete class.');
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
                                <div className="text-[10px] font-medium truncate mt-0.5 opacity-90">
                                    {classStartingHere.subjects?.name}
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
                            className="border-r border-gray-100 dark:border-slate-700 h-24 hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors cursor-pointer"
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
                title="Timetable"
                actionLabel={selectedGroup ? "Add Class" : null}
                onAction={() => {
                    setEditingClass(null);
                    setFormData({ ...formData, day: 'Monday', start_time: '08:00', end_time: '09:00', class_type: 'Lecture' });
                    setIsModalOpen(true);
                }}
            />

            <div className="mb-6 flex items-center bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
                <Users className="text-gray-400 mr-2" size={20} />
                <span className="mr-4 text-sm font-medium text-gray-700 dark:text-gray-300">Student Group:</span>
                <select
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    className="block w-64 rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-slate-700 dark:text-white px-3 py-2 border"
                >
                    <option value="">Select a group...</option>
                    {groups.map(g => (
                        <option key={g} value={g}>{g}</option>
                    ))}
                </select>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-md mb-4 text-sm flex justify-between items-center">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="text-sm underline">Dismiss</button>
                </div>
            )}

            <div className="flex-1 overflow-auto bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 relative">
                {!selectedGroup ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                        <Calendar size={64} className="mb-4 opacity-20" />
                        <p>Select a student group to view timetable.</p>
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
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subject</label>
                            <select
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-slate-700 dark:text-white px-3 py-2 border"
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
                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-slate-700 dark:text-white px-3 py-2 border"
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
                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-slate-700 dark:text-white px-3 py-2 border"
                                value={formData.lecturer_id}
                                onChange={(e) => setFormData({ ...formData, lecturer_id: e.target.value })}
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
                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-slate-700 dark:text-white px-3 py-2 border"
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
                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-slate-700 dark:text-white px-3 py-2 border"
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
                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-slate-700 dark:text-white px-3 py-2 border"
                                value={formData.start_time}
                                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Time</label>
                            <input
                                type="time"
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-slate-700 dark:text-white px-3 py-2 border"
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
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                            >
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
