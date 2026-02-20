import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { Eye, ChevronDown, GraduationCap } from 'lucide-react';
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

    // Derived Department ID and Code from HOD/HOP user
    const [departmentId, setDepartmentId] = useState(user?.department_id || null);
    const [resolvedDeptCode, setResolvedDeptCode] = useState(user?.department_code || user?.department || null);
    const [resolvedProgramCode, setResolvedProgramCode] = useState(user?.program_code || null);
    const [isCheckingDept, setIsCheckingDept] = useState(!user?.department_id);

    useEffect(() => {
        const resolveDepartment = async () => {
            if (user?.department_id && user?.program_code) {
                setDepartmentId(user.department_id);
                setResolvedProgramCode(user.program_code);
                // If we don't have a code but have ID, fetch it
                if (!resolvedDeptCode) {
                    const { data: deptData } = await supabase
                        .from('departments')
                        .select('code')
                        .eq('id', user.department_id)
                        .single();
                    if (deptData) setResolvedDeptCode(deptData.code);
                }
                setIsCheckingDept(false);
                return;
            }

            if (user?.lecturer_id) {
                try {
                    const { data } = await supabase
                        .from('lecturers')
                        .select('department_id, program_code, departments(code)')
                        .eq('id', user.lecturer_id)
                        .single();

                    if (data) {
                        setDepartmentId(data.department_id);
                        setResolvedDeptCode(data.departments?.code);
                        setResolvedProgramCode(data.program_code);
                    }
                } catch (err) {
                    console.error('Error resolving department/program:', err);
                }
            }
            setIsCheckingDept(false);
        };

        resolveDepartment();
    }, [user]);

    // Update fetch call to depend on resolved codes as well
    useEffect(() => {
        if (!isCheckingDept && (user?.role === 'hod' || user?.role === 'hop')) {
            fetchStudents();
        }
    }, [user, departmentId, resolvedDeptCode, resolvedProgramCode, isCheckingDept]);

    const fetchStudents = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('students')
                .select('*')
                .eq('faculty_id', user.faculty_id)
                .order('matric_no', { ascending: true });

            let programCodes = [];

            if (user.role === 'hod' && resolvedDeptCode) {
                // HOD: Get programs for department
                programCodes = DEPARTMENT_PROGRAM_MAP[resolvedDeptCode] || [];
                console.log('HOD resolved resolvedDeptCode:', resolvedDeptCode, 'Mapped programs:', programCodes);
            } else if (user.role === 'hop' && resolvedProgramCode) {
                // HOP: Get specific program
                programCodes = [resolvedProgramCode];
                console.log('HOP resolved resolvedProgramCode:', resolvedProgramCode);
            } else {
                console.warn('HOD/HOP role detected but missing codes:', { role: user.role, resolvedDeptCode, resolvedProgramCode });
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

    // Helper to group students by Program then by Student Group
    const getGroupedStudents = () => {
        const programGroups = {};

        students.forEach(student => {
            // Logic to extract program code
            let programCode = 'Unknown';
            if (student.student_group) {
                const parts = student.student_group.split(' ');
                if (parts.length > 0 && PROGRAMS[parts[0]]) {
                    programCode = parts[0];
                }
            } else if (student.matric_no) {
                for (const key of Object.keys(PROGRAMS)) {
                    if (student.matric_no.includes(key)) {
                        programCode = key;
                        break;
                    }
                }
            }

            if (!programGroups[programCode]) {
                programGroups[programCode] = {
                    code: programCode,
                    name: PROGRAMS[programCode] || 'Other Program',
                    groups: {}
                };
            }

            const groupName = student.student_group || 'Ungrouped';
            if (!programGroups[programCode].groups[groupName]) {
                programGroups[programCode].groups[groupName] = [];
            }
            programGroups[programCode].groups[groupName].push(student);
        });

        // Convert to sorted array
        return Object.values(programGroups).sort((a, b) => a.code.localeCompare(b.code)).map(program => ({
            ...program,
            groups: Object.entries(program.groups).sort((a, b) => {
                if (a[0] === 'Ungrouped') return 1;
                if (b[0] === 'Ungrouped') return -1;
                return a[0].localeCompare(b[0]);
            }).map(([groupName, students]) => ({ groupName, students }))
        }));
    };

    return (
        <div>
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : students.length > 0 ? (
                <div className="space-y-8">
                    {getGroupedStudents().map((program) => (
                        <div key={program.code} className="space-y-4">
                            <div className="flex items-center px-2 py-1">
                                <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 mr-3">
                                    <GraduationCap size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                        {program.code}
                                    </h2>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                        {program.name}
                                    </p>
                                </div>
                            </div>

                            <div className="grid gap-4">
                                {program.groups.map((group) => {
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
                        </div>
                    ))}
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
