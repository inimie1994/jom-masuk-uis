import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { Eye, ChevronDown } from 'lucide-react';
import StudentDetailsModal from '../student/StudentDetailsModal';
import { PROGRAMS, DEPARTMENT_PROGRAM_MAP } from '../../utils/programUtils';
import EmptyState from '../common/EmptyState';
import { Users } from 'lucide-react';

const HodHopStudents = () => {
    const { user } = useAuth();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [error, setError] = useState(null);

    // Group Expansion State
    const [expandedGroups, setExpandedGroups] = useState([]);

    const toggleGroup = (groupName) => {
        setExpandedGroups(prev =>
            prev.includes(groupName)
                ? prev.filter(g => g !== groupName)
                : [...prev, groupName]
        );
    };


    useEffect(() => {
        if (user?.role === 'hod' || user?.role === 'hop') {
            fetchStudents();
        }
    }, [user]);

    const fetchStudents = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('students')
                .select('*')
                .eq('faculty_id', user.faculty_id)
                .order('matric_no', { ascending: true });

            let programCodes = [];

            if (user.role === 'hod' && user.department_code) {
                // HOD: Get programs for department
                programCodes = DEPARTMENT_PROGRAM_MAP[user.department_code] || [];
            } else if (user.role === 'hop' && user.program_code) {
                // HOP: Get specific program
                programCodes = [user.program_code];
            } else {
                setLoading(false);
                return;
            }

            const { data, error } = await query;

            if (error) throw error;

            // Client-side filtering for programs since we store full group string (e.g. "FA01 2A")
            // and we want to match startsWith or specific logic.
            // Or if we have a program_code column in students, we could use that. 
            // Assuming we derive from student_group for now as per `Students.jsx`.

            const filteredStudents = (data || []).filter(student => {
                // Logic from Students.jsx to extract program code
                let code = 'Unknown';
                if (student.student_group) {
                    const parts = student.student_group.split(' ');
                    if (parts.length > 0 && PROGRAMS[parts[0]]) {
                        code = parts[0];
                    }
                } else if (student.matric_no) {
                    for (const key of Object.keys(PROGRAMS)) {
                        if (student.matric_no.includes(key)) {
                            code = key;
                            break;
                        }
                    }
                }
                return programCodes.includes(code);
            });

            setStudents(filteredStudents);
        } catch (err) {
            console.error('Error fetching students:', err);
            setError('Failed to load students.');
        } finally {
            setLoading(false);
        }
    };

    // Helper to group students by Program (or Group if strictly one program?)
    // Let's group by Student Group for better organization within the program view
    const getGroupedStudents = () => {
        const grouped = {};
        students.forEach(student => {
            const group = student.student_group || 'Ungrouped';
            if (!grouped[group]) {
                grouped[group] = [];
            }
            grouped[group].push(student);
        });

        const sortedKeys = Object.keys(grouped).sort((a, b) => {
            if (a === 'Ungrouped') return 1;
            if (b === 'Ungrouped') return -1;
            return a.localeCompare(b);
        });

        return sortedKeys.map(key => ({
            groupName: key,
            students: grouped[key]
        }));
    };

    return (
        <div>
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : students.length > 0 ? (
                <div className="space-y-4">
                    {getGroupedStudents().map((group) => {
                        const isExpanded = expandedGroups.includes(group.groupName);
                        return (
                            <div key={group.groupName} className="bg-white dark:bg-slate-900 shadow-sm rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-800 transition-all">
                                <button
                                    onClick={() => toggleGroup(group.groupName)}
                                    className="w-full text-left px-5 py-4 focus:outline-none hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between"
                                >
                                    <div className="flex items-center">
                                        <div className="p-2 rounded-lg mr-3 bg-slate-100 dark:bg-slate-800 text-slate-500">
                                            <Users size={18} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white flex items-center">
                                                {group.groupName}
                                                <span className="ml-2 sm:ml-3 text-[9px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-1.5 sm:px-2.5 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap">
                                                    {group.students.length} Students
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
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-800">
                                                <thead className="bg-slate-50 dark:bg-slate-950">
                                                    <tr>
                                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider w-16">#</th>
                                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider">Matric No</th>
                                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider">Name</th>
                                                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider w-20">View</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-50 dark:divide-slate-800">
                                                    {group.students.map((student, index) => (
                                                        <tr key={student.id} className="hover:bg-pastel-indigo dark:hover:bg-indigo-900/10 transition-colors">
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 dark:text-slate-500 font-medium">
                                                                {index + 1}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400 font-mono italic tracking-tighter">{student.matric_no}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{student.name}</td>
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
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <EmptyState
                    icon={Users}
                    message="No students found for your department/program."
                />
            )}

            {selectedStudent && (
                <StudentDetailsModal
                    isOpen={isDetailsOpen}
                    onClose={() => setIsDetailsOpen(false)}
                    student={selectedStudent}
                />
            )}
        </div>
    );
};

export default HodHopStudents;
