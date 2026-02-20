import { useState } from 'react';
import HodHopLecturers from './HodHopLecturers';
import HodHopSubjectManagement from './HodHopSubjectManagement';
import HodHopStudents from './HodHopStudents';
import { Users, BookOpen, GraduationCap } from 'lucide-react';

const HodHopTeam = () => {
    const [activeTab, setActiveTab] = useState('lecturers');

    return (
        <div className="space-y-6">
            <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('lecturers')}
                    className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'lecturers'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                >
                    <Users size={16} className="mr-2" />
                    Lecturers
                </button>
                <button
                    onClick={() => setActiveTab('subjects')}
                    className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'subjects'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                >
                    <BookOpen size={16} className="mr-2" />
                    Subjects
                </button>
                <button
                    onClick={() => setActiveTab('students')}
                    className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'students'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                >
                    <GraduationCap size={16} className="mr-2" />
                    Students
                </button>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeTab === 'lecturers' ? (
                    <HodHopLecturers />
                ) : activeTab === 'subjects' ? (
                    <HodHopSubjectManagement />
                ) : (
                    <HodHopStudents />
                )}
            </div>
        </div>
    );
};

export default HodHopTeam;
