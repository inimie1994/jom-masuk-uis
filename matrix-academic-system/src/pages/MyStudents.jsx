import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabaseClient';
import PageHeader from '../components/common/PageHeader';
import { Search, LayoutGrid, List, ChevronDown, ChevronRight } from 'lucide-react';

const MyStudents = () => {
    const { user } = useAuth();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('group'); // 'group' or 'all'
    const [expandedGroups, setExpandedGroups] = useState(new Set());

    const toggleGroup = (groupKey) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupKey)) {
                next.delete(groupKey);
            } else {
                next.add(groupKey);
            }
            return next;
        });
    };

    useEffect(() => {
        if (user?.lecturer_id) {
            fetchMyStudents();
        }
    }, [user?.lecturer_id]);

    const fetchMyStudents = async () => {
        try {
            setLoading(true);
            let currentLecturerId = user.lecturer_id;

            // Fallback: fetch lecturer_id if missing from context but user exists
            if (!currentLecturerId && user?.id) {
                const { data: userData } = await supabase
                    .from('users')
                    .select('lecturer_id')
                    .eq('id', user.id)
                    .single();

                if (userData?.lecturer_id) {
                    currentLecturerId = userData.lecturer_id;
                }
            }

            if (!currentLecturerId) {
                console.log('No lecturer ID found for user');
                setStudents([]);
                return;
            }

            // 1. Get my timetable to identify assignment
            // We now rely on timetable as the source of truth for "active classes" 
            const { data: timetableData, error: timetableError } = await supabase
                .from('timetable')
                .select('id, subject_id, group_name, subjects(code, name)')
                .eq('lecturer_id', currentLecturerId);

            if (timetableError) throw timetableError;

            if (!timetableData || timetableData.length === 0) {
                setStudents([]);
                return;
            }

            const subjectInfoMap = new Map(); // subject_id -> { code, name }
            const activeGroupsMap = new Map(); // group_name -> Set(subject_id)

            // Process timetable to get unique group-subject combinations
            timetableData.forEach(t => {
                if (t.group_name && t.subject_id) {
                    if (!activeGroupsMap.has(t.group_name)) {
                        activeGroupsMap.set(t.group_name, new Set());
                    }
                    activeGroupsMap.get(t.group_name).add(t.subject_id);
                    subjectInfoMap.set(t.subject_id, t.subjects);
                }
            });

            if (activeGroupsMap.size === 0) {
                setStudents([]);
                return;
            }

            // 2. Fetch students based on groups
            // We need to fetch students who are in these groups.
            // Ideally, we find students where student_group IN (my_groups)
            const myGroups = Array.from(activeGroupsMap.keys());

            const { data: studentsData, error: studentsError } = await supabase
                .from('students')
                .select('id, name, matric_no, email, student_group')
                .in('student_group', myGroups)
                .order('name');

            if (studentsError) throw studentsError;

            if (!studentsData || studentsData.length === 0) {
                setStudents([]);
                return;
            }

            // 3. Map students to the specific subjects I teach them
            // A student in group FA01 should show up for every subject I teach to FA01.
            const studentMap = new Map();

            studentsData.forEach(student => {
                const group = student.student_group;
                const subjectIds = activeGroupsMap.get(group);

                if (subjectIds) {
                    subjectIds.forEach(subjectId => {
                        const uniqueKey = `${student.id}-${subjectId}`;
                        const subjectInfo = subjectInfoMap.get(subjectId);

                        studentMap.set(uniqueKey, {
                            id: student.id,
                            name: student.name,
                            matric_no: student.matric_no,
                            email: student.email,
                            subject_code: subjectInfo?.code || 'N/A',
                            subject_name: subjectInfo?.name || 'Unknown',
                            group: group
                        });
                    });
                }
            });

            setStudents(Array.from(studentMap.values()));

        } catch (error) {
            console.error('Error fetching students details:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
        } finally {
            setLoading(false);
        }
    };

    const filteredStudents = students.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.matric_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.subject_code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Grouping for 'Group View'
    const groupedStudents = filteredStudents.reduce((acc, student) => {
        const key = `${student.subject_code} - ${student.group}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(student);
        return acc;
    }, {});

    // Unique students for 'All View'
    const allUniqueStudents = Array.from(
        filteredStudents.reduce((acc, student) => {
            if (!acc.has(student.matric_no)) {
                acc.set(student.matric_no, {
                    ...student,
                    all_subjects: new Set([student.subject_code])
                });
            } else {
                acc.get(student.matric_no).all_subjects.add(student.subject_code);
            }
            return acc;
        }, new Map()).values()
    ).sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className="space-y-6">
            <PageHeader title="My Students" />

            <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
                <div className="flex items-center flex-1 w-full bg-white dark:bg-slate-800 px-4 py-2.5 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 transition-all focus-within:ring-2 focus-within:ring-indigo-500/20">
                    <Search className="text-gray-400 mr-2" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name, matric no, or subject code..."
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-gray-900 dark:text-white placeholder-gray-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center bg-gray-100 dark:bg-slate-900 p-1 rounded-xl border border-gray-200 dark:border-slate-700">
                    <button
                        onClick={() => setViewMode('group')}
                        className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'group'
                            ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                    >
                        <LayoutGrid size={16} className="mr-2" />
                        By Group
                    </button>
                    <button
                        onClick={() => setViewMode('all')}
                        className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'all'
                            ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                    >
                        <List size={16} className="mr-2" />
                        All Students
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                    <thead className="bg-gray-50 dark:bg-slate-900">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Matric No</th>
                            {viewMode === 'group' ? (
                                <>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Subject</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Group</th>
                                </>
                            ) : (
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Subjects</th>
                            )}
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                        {loading ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-4 text-center text-gray-500 italic">Loading students...</td>
                            </tr>
                        ) : filteredStudents.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-4 text-center text-gray-500 italic">No students found.</td>
                            </tr>
                        ) : viewMode === 'group' ? (
                            Object.entries(groupedStudents).map(([groupKey, studentsInGroup]) => {
                                const isExpanded = expandedGroups.has(groupKey);
                                return (
                                    <div key={groupKey} className="contents">
                                        <tr
                                            className="bg-slate-50 dark:bg-slate-900/50 cursor-pointer hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-colors"
                                            onClick={() => toggleGroup(groupKey)}
                                        >
                                            <td colSpan="5" className="px-6 py-2.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider bg-indigo-50/30 dark:bg-indigo-900/10">
                                                <div className="flex items-center">
                                                    {isExpanded ? <ChevronDown size={14} className="mr-2" /> : <ChevronRight size={14} className="mr-2" />}
                                                    {groupKey} ({studentsInGroup.length} Students)
                                                </div>
                                            </td>
                                        </tr>
                                        {isExpanded && studentsInGroup.map((student, idx) => (
                                            <tr key={`${groupKey}-${idx}`} className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors animate-in fade-in slide-in-from-top-1 duration-200">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">{student.name}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{student.matric_no}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                        {student.subject_code}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{student.group}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{student.email}</td>
                                            </tr>
                                        ))}
                                    </div>
                                );
                            })
                        ) : (
                            allUniqueStudents.map((student, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">{student.name}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{student.matric_no}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-wrap gap-1">
                                            {Array.from(student.all_subjects).map(sub => (
                                                <span key={sub} className="px-2 inline-flex text-[10px] leading-4 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                    {sub}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{student.email}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MyStudents;
