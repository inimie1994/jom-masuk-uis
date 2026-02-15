import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabaseClient';
import PageHeader from '../components/common/PageHeader';
import EmptyState from '../components/common/EmptyState';
import Modal from '../components/common/Modal';
import { Plus, Trash2, Users, Download, Upload, LayoutList, Layers } from 'lucide-react';
import * as XLSX from 'xlsx';

const Students = () => {
    const { user } = useAuth();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ name: '', matric_no: '', email: '', student_group: '' });
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const fileInputRef = useRef(null);

    // New state for view mode: 'all' or 'group'
    const [viewMode, setViewMode] = useState('all');

    useEffect(() => {
        if (user?.faculty_id) {
            fetchStudents();
        }
    }, [user?.faculty_id]);

    const fetchStudents = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('students')
                .select('*')
                .eq('faculty_id', user.faculty_id)
                .order('name', { ascending: true });

            if (error) throw error;
            setStudents(data || []);
        } catch (err) {
            console.error('Error fetching students:', err);
            setError('Failed to load students.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateStudent = async (e) => {
        e.preventDefault();
        if (!user?.faculty_id) return;

        try {
            const { error } = await supabase
                .from('students')
                .insert([
                    {
                        ...formData,
                        faculty_id: user.faculty_id
                    }
                ]);

            if (error) throw error;

            setIsModalOpen(false);
            setFormData({ name: '', matric_no: '', email: '', student_group: '' });
            setSuccess('Student added successfully.');
            setTimeout(() => setSuccess(null), 3000);
            fetchStudents();
        } catch (err) {
            console.error('Error creating student:', err);
            if (err.code === '23505') {
                setError('Student with this Matric No already exists.');
            } else {
                setError('Failed to create student.');
            }
        }
    };

    const handleDeleteStudent = async (id) => {
        if (!window.confirm('Are you sure you want to delete this student? This action cannot be undone.')) return;

        try {
            const { error } = await supabase
                .from('students')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setSuccess('Student deleted successfully.');
            setTimeout(() => setSuccess(null), 3000);
            fetchStudents();
        } catch (err) {
            console.error('Error deleting student:', err);
            setError('Failed to delete student.');
        }
    };

    // Excel Functions
    const downloadTemplate = () => {
        const templateData = [
            { Name: 'John Doe', 'Matric No': 'A23CS001', 'Student Group': '1SEC-1', Email: 'john@example.com' },
            { Name: 'Jane Smith', 'Matric No': 'A23CS002', 'Student Group': '1SEC-1', Email: 'jane@example.com' }
        ];

        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Students');
        XLSX.writeFile(wb, 'Student_List_Template.xlsx');
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);
            processBatchUpload(data);
        };
        reader.readAsBinaryString(file);

        // Reset file input
        e.target.value = null;
    };

    const processBatchUpload = async (data) => {
        if (!data || data.length === 0) {
            setError('Excel file is empty.');
            return;
        }

        const studentsToInsert = data.map(row => ({
            name: row['Name'],
            matric_no: row['Matric No'],
            student_group: row['Student Group'],
            email: row['Email'],
            faculty_id: user.faculty_id
        })).filter(s => s.name && s.matric_no); // Basic validation

        if (studentsToInsert.length === 0) {
            setError('No valid student records found in file. Ensure columns match the template.');
            return;
        }

        try {
            setLoading(true);
            const { error } = await supabase
                .from('students')
                .insert(studentsToInsert);

            if (error) throw error;

            setSuccess(`Successfully uploaded ${studentsToInsert.length} students.`);
            setTimeout(() => setSuccess(null), 3000);
            fetchStudents();
        } catch (err) {
            console.error('Bulk upload error:', err);
            if (err.code === '23505') {
                setError('Upload failed: Duplicate Matric No found in file or database.');
            } else {
                setError('Failed to upload students. Please check the file format.');
            }
        } finally {
            setLoading(false);
        }
    };

    // Helper to group students
    const getGroupedStudents = () => {
        const grouped = {};
        students.forEach(student => {
            const group = student.student_group || 'Ungrouped';
            if (!grouped[group]) {
                grouped[group] = [];
            }
            grouped[group].push(student);
        });

        // Sort groups alphabetically, but put 'Ungrouped' last
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

    const TableView = ({ data }) => (
        <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700 mb-6">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                    <thead className="bg-gray-50 dark:bg-slate-900">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Name</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Matric No</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Group</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Email</th>
                            <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                        {data.map((student) => (
                            <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{student.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">{student.matric_no}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">{student.student_group || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">{student.email || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                        onClick={() => handleDeleteStudent(student.id)}
                                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                                        title="Delete Student"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <PageHeader
                    title="Students"
                />
                <div className="flex flex-wrap gap-2 items-center">
                    {/* View Toggle */}
                    <div className="bg-gray-100 dark:bg-slate-700 p-1 rounded-lg flex mr-2">
                        <button
                            onClick={() => setViewMode('all')}
                            className={`flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'all'
                                    ? 'bg-white dark:bg-slate-600 shadow text-gray-900 dark:text-white'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            <LayoutList size={16} className="mr-2" />
                            All
                        </button>
                        <button
                            onClick={() => setViewMode('group')}
                            className={`flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'group'
                                    ? 'bg-white dark:bg-slate-600 shadow text-gray-900 dark:text-white'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            <Layers size={16} className="mr-2" />
                            Groups
                        </button>
                    </div>

                    <button
                        onClick={downloadTemplate}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-slate-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        <Download size={16} className="mr-2" />
                        Template
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-slate-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        <Upload size={16} className="mr-2" />
                        Upload
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".xlsx, .xls"
                        className="hidden"
                    />
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        <Plus size={20} className="mr-2" />
                        Add Student
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-md mb-4 text-sm flex justify-between items-center">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="text-sm underline">Dismiss</button>
                </div>
            )}

            {success && (
                <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-4 rounded-md mb-4 text-sm flex justify-between items-center">
                    <span>{success}</span>
                    <button onClick={() => setSuccess(null)} className="text-sm underline">Dismiss</button>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            ) : students.length > 0 ? (
                <>
                    {viewMode === 'all' ? (
                        <TableView data={students} />
                    ) : (
                        <div className="space-y-6">
                            {getGroupedStudents().map((group) => (
                                <div key={group.groupName}>
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2 ml-1 flex items-center">
                                        <Layers size={18} className="mr-2 text-indigo-500" />
                                        {group.groupName}
                                        <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                                            {group.students.length}
                                        </span>
                                    </h3>
                                    <TableView data={group.students} />
                                </div>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <EmptyState
                    icon={Users}
                    message="No students found. Add your first student to get started."
                    actionLabel="Add Student"
                    onAction={() => setIsModalOpen(true)}
                />
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Add New Student"
            >
                <form onSubmit={handleCreateStudent} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Full Name
                        </label>
                        <input
                            type="text"
                            id="name"
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-slate-700 dark:text-white px-3 py-2 border"
                            placeholder="John Doe"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label htmlFor="matric_no" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Matric No
                        </label>
                        <input
                            type="text"
                            id="matric_no"
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-slate-700 dark:text-white px-3 py-2 border"
                            placeholder="e.g. A23CS001"
                            value={formData.matric_no}
                            onChange={(e) => setFormData({ ...formData, matric_no: e.target.value })}
                        />
                    </div>
                    <div>
                        <label htmlFor="student_group" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Student Group (Optional)
                        </label>
                        <input
                            type="text"
                            id="student_group"
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-slate-700 dark:text-white px-3 py-2 border"
                            placeholder="e.g. 1SEC-1"
                            value={formData.student_group}
                            onChange={(e) => setFormData({ ...formData, student_group: e.target.value })}
                        />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Email (Optional)
                        </label>
                        <input
                            type="email"
                            id="email"
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-slate-700 dark:text-white px-3 py-2 border"
                            placeholder="john@example.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div className="flex justify-end space-x-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Create Student
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Students;
