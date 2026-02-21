import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabaseClient';
import PageHeader from '../components/common/PageHeader';
import { Search, LayoutGrid, List, ChevronDown, ChevronRight, Eye, Layers } from 'lucide-react';
import StudentDetailsModal from '../components/student/StudentDetailsModal';

const MyStudents = () => {
    const { user } = useAuth();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('group'); // 'group' or 'all'
    const [expandedGroups, setExpandedGroups] = useState(new Set());
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

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
                .select('id, subject_id, group_names, subjects(code, name)')
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
                const groups = Array.isArray(t.group_names) ? t.group_names : [t.group_names];
                groups.forEach(groupName => {
                    if (groupName && t.subject_id) {
                        if (!activeGroupsMap.has(groupName)) {
                            activeGroupsMap.set(groupName, new Set());
                        }
                        activeGroupsMap.get(groupName).add(t.subject_id);
                        subjectInfoMap.set(t.subject_id, t.subjects);
                    }
                });
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
                .order('matric_no');

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
        const key = student.group;
        if (!acc[key]) acc[key] = new Map();

        if (!acc[key].has(student.matric_no)) {
            acc[key].set(student.matric_no, {
                ...student,
                all_subjects: new Set([student.subject_code])
            });
        } else {
            acc[key].get(student.matric_no).all_subjects.add(student.subject_code);
        }
        return acc;
    }, {});

    // Convert map to array for rendering group elements
    Object.keys(groupedStudents).forEach(key => {
        groupedStudents[key] = Array.from(groupedStudents[key].values()).sort((a, b) => a.matric_no.localeCompare(b.matric_no));
    });

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
    ).sort((a, b) => a.matric_no.localeCompare(b.matric_no));

    const StudentTable = ({ data, showGroup = false }) => (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-950">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider">Name</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider">Matric No</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider">Subjects</th>
                        {showGroup && <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider">Group</th>}
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider w-20">View</th>
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-50 dark:divide-slate-800">
                    {data.map((student, idx) => (
                        <tr key={student.id || idx} className="hover:bg-pastel-indigo dark:hover:bg-indigo-900/10 transition-colors group">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{student.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400 font-mono italic tracking-tighter">{student.matric_no}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-wrap gap-1">
                                    {Array.from(student.all_subjects || []).map(sub => (
                                        <span key={sub} className="px-2 inline-flex text-[10px] leading-4 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                            {sub}
                                        </span>
                                    ))}
                                </div>
                            </td>
                            {showGroup && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">{student.group}</td>}
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                <button
                                    onClick={() => {
                                        setSelectedStudent(student);
                                        setIsDetailsOpen(true);
                                    }}
                                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors p-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 shadow-sm border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900"
                                    title="View Profile"
                                >
                                    <Eye size={18} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

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

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : filteredStudents.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700 p-12 text-center text-gray-500 italic">
                    No students found.
                </div>
            ) : viewMode === 'all' ? (
                <div className="bg-white dark:bg-slate-900 shadow-sm rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-800 mb-6">
                    <StudentTable data={allUniqueStudents} showGroup={true} />
                </div>
            ) : (
                <div className="space-y-4">
                    {Object.entries(groupedStudents).map(([groupKey, studentsInGroup]) => {
                        const isExpanded = expandedGroups.has(groupKey);
                        return (
                            <div key={groupKey} className="bg-white dark:bg-slate-900 shadow-sm rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-800 transition-all">
                                <button
                                    onClick={() => toggleGroup(groupKey)}
                                    className="w-full text-left px-5 py-4 focus:outline-none hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between"
                                >
                                    <div className="flex items-center">
                                        <div className={`p-2 rounded-lg mr-3 transition-colors ${isExpanded ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                            <Layers size={18} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white flex items-center">
                                                {groupKey}
                                                <span className="ml-2 sm:ml-3 text-[9px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-1.5 sm:px-2.5 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap">
                                                    {studentsInGroup.length} Students
                                                </span>
                                            </h3>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                            <ChevronDown size={20} className="text-gray-400" />
                                        </div>
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="border-t border-gray-50 dark:border-slate-800 animate-in fade-in slide-in-from-top-1 duration-200">
                                        <StudentTable data={studentsInGroup} />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <StudentDetailsModal
                isOpen={isDetailsOpen}
                onClose={() => setIsDetailsOpen(false)}
                student={selectedStudent}
            />
        </div>
    );
};

export default MyStudents;
