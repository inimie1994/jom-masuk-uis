import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabaseClient';
import PageHeader from '../components/common/PageHeader';
import { Search } from 'lucide-react';

const MyStudents = () => {
    const { user } = useAuth();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (user?.lecturer_id) {
            fetchMyStudents();
        }
    }, [user?.lecturer_id]);

    const fetchMyStudents = async () => {
        try {
            setLoading(true);

            // 1. Get my classes
            const { data: myClasses, error: classesError } = await supabase
                .from('classes')
                .select('id, subject_id, student_group, subjects(code, name)')
                .eq('lecturer_id', user.lecturer_id);

            if (classesError) throw classesError;

            const classIds = myClasses.map(c => c.id);

            if (classIds.length === 0) {
                setStudents([]);
                return;
            }

            // 2. Get enrollments for these classes
            const { data: enrollments, error: enrollmentsError } = await supabase
                .from('enrollments')
                .select(`
                    student_id,
                    class_id,
                    students (id, name, matric_no, email, phone)
                `)
                .in('class_id', classIds);

            if (enrollmentsError) throw enrollmentsError;

            // 3. Map back to a flat structure
            const studentMap = new Map();

            enrollments.forEach(e => {
                if (!e.students) return;

                // Find the class details
                const classInfo = myClasses.find(c => c.id === e.class_id);
                const uniqueKey = `${e.student_id}-${classInfo.subject_id}`; // Unique per student per subject

                studentMap.set(uniqueKey, {
                    id: e.students.id,
                    name: e.students.name,
                    matric_no: e.students.matric_no,
                    email: e.students.email,
                    phone: e.students.phone,
                    subject_code: classInfo.subjects.code,
                    subject_name: classInfo.subjects.name,
                    group: classInfo.student_group
                });
            });

            setStudents(Array.from(studentMap.values()));

        } catch (error) {
            console.error('Error fetching students:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredStudents = students.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.matric_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.subject_code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <PageHeader title="My Students" />

            <div className="flex items-center space-x-4 bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
                <Search className="text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Search by name, matric no, or subject code..."
                    className="flex-1 bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white placeholder-gray-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                    <thead className="bg-gray-50 dark:bg-slate-900">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Matric No</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Subject</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Group</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                        {loading ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-4 text-center text-gray-500">Loading students...</td>
                            </tr>
                        ) : filteredStudents.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-4 text-center text-gray-500">No students found.</td>
                            </tr>
                        ) : (
                            filteredStudents.map((student, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">{student.name}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {student.matric_no}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                            {student.subject_code}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {student.group}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {student.email}
                                    </td>
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
