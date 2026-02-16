import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabaseClient';
import PageHeader from '../components/common/PageHeader';
import {
    Calendar,
    Clock,
    MapPin,
    User,
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

const LecturerTimetable = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [timetable, setTimetable] = useState([]);
    const [subjects, setSubjects] = useState([]);

    useEffect(() => {
        if (user?.lecturer_id) {
            fetchData();
        }
    }, [user?.lecturer_id]);

    const fetchData = async () => {
        try {
            setLoading(true);

            // 1. Fetch Subjects for coloring
            const { data: subjectsData, error: subjectsError } = await supabase
                .from('subjects')
                .select('id, code, name')
                .order('code');

            if (subjectsError) throw subjectsError;
            setSubjects(subjectsData || []);

            // 2. Fetch Timetable for this lecturer
            const { data: timetableData, error: timetableError } = await supabase
                .from('timetable')
                .select(`
                    *,
                    subjects (id, code, name)
                `)
                .eq('lecturer_id', user.lecturer_id);

            if (timetableError) throw timetableError;
            setTimetable(timetableData || []);

        } catch (err) {
            console.error('Error fetching timetable data:', err);
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
                    >
                        <div className={`h-full w-full rounded-md border p-2 shadow-sm transition-transform hover:scale-[1.02] flex flex-col justify-between overflow-hidden ${getSubjectColor(classStartingHere.subject_id, subjects)}`}>
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
                                    {classStartingHere.group_name}
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
            } else {
                // Check if this slot is occupied by a class starting earlier
                const occupiedBy = timetable.find(t =>
                    t.day === day && t.start_time < startTimeStr && t.end_time > startTimeStr
                );

                if (occupiedBy) {
                    p++;
                } else {
                    cells.push(
                        <div
                            key={`${day}-${currentHour}`}
                            className="border-r border-gray-100 dark:border-slate-700 h-24 hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors"
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
            />

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
        </div>
    );
};

export default LecturerTimetable;
