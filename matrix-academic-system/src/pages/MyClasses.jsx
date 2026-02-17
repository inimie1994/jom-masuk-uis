import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabaseClient';
import PageHeader from '../components/common/PageHeader';

const MyClasses = () => {
    const { user } = useAuth();
    const [timetable, setTimetable] = useState([]);
    const [loading, setLoading] = useState(true);

    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const TIME_SLOTS = Array.from({ length: 14 }, (_, i) => i + 8); // 8 AM to 9 PM

    useEffect(() => {
        if (user?.lecturer_id) {
            fetchMyTimetable();
        }
    }, [user?.lecturer_id]);

    const fetchMyTimetable = async () => {
        try {
            setLoading(true);
            // Fetch timetable entries where lecturer_id matches
            const { data, error } = await supabase
                .from('timetable')
                .select(`
                    *,
                    subjects (code, name),
                    rooms (name),
                    lecturers (name)
                `)
                .eq('lecturer_id', user.lecturer_id);

            if (error) throw error;
            setTimetable(data || []);
        } catch (error) {
            console.error('Error fetching timetable:', error);
        } finally {
            setLoading(false);
        }
    };

    const getSlotData = (day, hour) => {
        return timetable.find(t =>
            t.day === day &&
            t.start_time.startsWith(hour.toString().padStart(2, '0'))
        );
    };

    return (
        <div className="space-y-6">
            <PageHeader title="My Classes" />

            <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg overflow-x-auto border border-gray-200 dark:border-slate-700">
                <div className="min-w-[800px]">
                    <div className="grid grid-cols-8 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 sticky top-0">
                        <div className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center border-r border-gray-200 dark:border-slate-800">
                            Time
                        </div>
                        {DAYS.map(day => (
                            <div key={day} className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center border-r border-gray-200 dark:border-slate-800 last:border-r-0">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="divide-y divide-gray-200 dark:divide-slate-700">
                        {TIME_SLOTS.map(hour => (
                            <div key={hour} className="grid grid-cols-8">
                                <div className="p-3 text-xs text-gray-500 dark:text-gray-400 text-center border-r border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 flex items-center justify-center">
                                    {hour}:00
                                </div>
                                {DAYS.map(day => {
                                    const slot = getSlotData(day, hour);
                                    return (
                                        <div key={`${day}-${hour}`} className="p-1 min-h-[80px] border-r border-gray-200 dark:border-slate-800 relative group">
                                            {slot && (
                                                <div className="absolute inset-1 bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-100 dark:border-indigo-800 rounded p-2 overflow-hidden shadow-sm">
                                                    <div className="font-semibold text-xs text-indigo-700 dark:text-indigo-300 truncate">
                                                        {slot.subjects?.code}
                                                    </div>
                                                    <div className="text-xs text-gray-600 dark:text-gray-400 truncate" title={slot.subjects?.name}>
                                                        {slot.subjects?.name}
                                                    </div>
                                                    <div className="text-[10px] text-gray-500 dark:text-gray-500 mt-1 flex justify-between">
                                                        <span>{slot.rooms?.name}</span>
                                                        <span className="font-medium bg-white dark:bg-slate-800 px-1 rounded">{slot.group_name}</span>
                                                    </div>
                                                    {slot.class_type && (
                                                        <div className="absolute top-1 right-1">
                                                            <span className={`text-[9px] px-1 rounded-sm uppercase font-bold
                                                                ${slot.class_type === 'Lecture' ? 'bg-blue-200 text-blue-800' :
                                                                    slot.class_type === 'Tutorial' ? 'bg-green-200 text-green-800' :
                                                                        'bg-yellow-200 text-yellow-800'}`}>
                                                                {slot.class_type.substring(0, 3)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MyClasses;
