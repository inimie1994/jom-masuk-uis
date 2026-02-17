import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabaseClient';
import PageHeader from '../components/common/PageHeader';
import EmptyState from '../components/common/EmptyState';
import Modal from '../components/common/Modal';
import { Plus, Trash2, Users, Download, Upload, LayoutList, Layers, Eye, ChevronRight, ChevronDown } from 'lucide-react';
import StudentDetailsModal from '../components/student/StudentDetailsModal';
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
    const [viewMode, setViewMode] = useState('group');

    // Student Details Modal State
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    // Group Expansion State
    const [expandedGroups, setExpandedGroups] = useState([]);

    // Multi-select State
    const [selectedStudents, setSelectedStudents] = useState([]);

    // Group Delete Modal State
    const [isGroupDeleteModalOpen, setIsGroupDeleteModalOpen] = useState(false);
    const [groupToDelete, setGroupToDelete] = useState(null);
    const [isDeletingGroup, setIsDeletingGroup] = useState(false);

    const toggleGroup = (groupName) => {
        setExpandedGroups(prev =>
            prev.includes(groupName)
                ? prev.filter(g => g !== groupName)
                : [...prev, groupName]
        );
    };

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

            // Clear from selection if it was selected
            setSelectedStudents(prev => prev.filter(sid => sid !== id));

            fetchStudents();
        } catch (err) {
            console.error('Error deleting student:', err);
            setError('Failed to delete student.');
        }
    };

    const handleBulkDelete = async () => {
        if (selectedStudents.length === 0) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedStudents.length} selected students? This action cannot be undone.`)) return;

        try {
            setLoading(true);
            const { error } = await supabase
                .from('students')
                .delete()
                .in('id', selectedStudents);

            if (error) throw error;

            setSuccess(`Successfully deleted ${selectedStudents.length} students.`);
            setTimeout(() => setSuccess(null), 3000);
            setSelectedStudents([]);
            fetchStudents();
        } catch (err) {
            console.error('Bulk delete error:', err);
            setError('Failed to delete selected students.');
        } finally {
            setLoading(false);
        }
    };

    const handleGroupDeleteOnly = async () => {
        if (!groupToDelete) return;

        try {
            setIsDeletingGroup(true);
            const { error } = await supabase
                .from('students')
                .update({ student_group: null })
                .eq('student_group', groupToDelete.groupName)
                .eq('faculty_id', user.faculty_id);

            if (error) throw error;

            setSuccess(`Group "${groupToDelete.groupName}" removed. Students are now ungrouped.`);
            setTimeout(() => setSuccess(null), 3000);
            setIsGroupDeleteModalOpen(false);
            setGroupToDelete(null);
            fetchStudents();
        } catch (err) {
            console.error('Group delete (only) error:', err);
            setError('Failed to remove group.');
        } finally {
            setIsDeletingGroup(false);
        }
    };

    const handleGroupDeleteFull = async () => {
        if (!groupToDelete) return;
        if (!window.confirm(`CRITICAL: This will permanently delete ALL ${groupToDelete.students.length} students in "${groupToDelete.groupName}". Are you absolutely sure?`)) return;

        try {
            setIsDeletingGroup(true);
            const { error } = await supabase
                .from('students')
                .delete()
                .eq('student_group', groupToDelete.groupName)
                .eq('faculty_id', user.faculty_id);

            if (error) throw error;

            setSuccess(`Group "${groupToDelete.groupName}" and all its students have been deleted.`);
            setTimeout(() => setSuccess(null), 3000);
            setIsGroupDeleteModalOpen(false);
            setGroupToDelete(null);

            // Clear any deleted students from selection
            const deletedIds = groupToDelete.students.map(s => s.id);
            setSelectedStudents(prev => prev.filter(id => !deletedIds.includes(id)));

            fetchStudents();
        } catch (err) {
            console.error('Group delete (full) error:', err);
            setError('Failed to delete group and students.');
        } finally {
            setIsDeletingGroup(false);
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

    const TableView = ({ data }) => {
        const isAllSelected = data.length > 0 && data.every(s => selectedStudents.includes(s.id));
        const isSomeSelected = data.some(s => selectedStudents.includes(s.id)) && !isAllSelected;

        const toggleSelectAll = () => {
            if (isAllSelected) {
                setSelectedStudents(prev => prev.filter(id => !data.some(s => s.id === id)));
            } else {
                const newIds = data.map(s => s.id).filter(id => !selectedStudents.includes(id));
                setSelectedStudents(prev => [...prev, ...newIds]);
            }
        };

        const toggleSelectStudent = (id) => {
            setSelectedStudents(prev =>
                prev.includes(id)
                    ? prev.filter(sid => sid !== id)
                    : [...prev, id]
            );
        };

        return (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-800">
                    <thead className="bg-slate-50 dark:bg-slate-950">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider w-16">#</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider">Matric No</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider">Name</th>
                            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider w-20">View</th>
                            <th scope="col" className="px-6 py-3 text-right">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                                    checked={isAllSelected}
                                    ref={input => {
                                        if (input) input.indeterminate = isSomeSelected;
                                    }}
                                    onChange={toggleSelectAll}
                                />
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-50 dark:divide-slate-800">
                        {data.map((student, index) => (
                            <tr key={student.id} className={`hover:bg-pastel-indigo dark:hover:bg-indigo-900/10 transition-colors group ${selectedStudents.includes(student.id) ? 'bg-indigo-50/50 dark:bg-indigo-900/5' : ''}`}>
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
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                                        checked={selectedStudents.includes(student.id)}
                                        onChange={() => toggleSelectStudent(student.id)}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <PageHeader
                    title="Students"
                />
                <div className="flex flex-wrap gap-2 items-center">
                    {/* View Toggle */}
                    <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex mr-1 sm:mr-2">
                        <button
                            onClick={() => setViewMode('all')}
                            className={`flex items-center px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-sm font-medium rounded-lg transition-all ${viewMode === 'all'
                                ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-white'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            <LayoutList size={14} className="mr-1 sm:mr-2" />
                            All
                        </button>
                        <button
                            onClick={() => setViewMode('group')}
                            className={`flex items-center px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-sm font-medium rounded-lg transition-all ${viewMode === 'group'
                                ? 'bg-white dark:bg-slate-600 shadow text-gray-900 dark:text-white'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            <Layers size={14} className="mr-1 sm:mr-2" />
                            Groups
                        </button>
                    </div>

                    <button
                        onClick={downloadTemplate}
                        className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-2 border border-gray-200 dark:border-slate-700 shadow-sm text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-xl text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                    >
                        <Download size={14} className="mr-1 sm:mr-2" />
                        Template
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-2 border border-gray-200 dark:border-slate-700 shadow-sm text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-xl text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                    >
                        <Upload size={14} className="mr-1 sm:mr-2" />
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
                        className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 border border-transparent rounded-xl shadow-pastel text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white bg-primary hover:opacity-90 transition-all"
                    >
                        <Plus size={16} className="mr-1 sm:mr-2" />
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
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : students.length > 0 ? (
                <>
                    {viewMode === 'all' ? (
                        <div className="bg-white dark:bg-slate-900 shadow-sm rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-800 mb-6">
                            <TableView data={students} />
                        </div>
                    ) : (
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
                                                <div className={`p-2 rounded-lg mr-3 transition-colors ${isExpanded ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                                    <Layers size={18} />
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
                                                {group.groupName !== 'Ungrouped' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setGroupToDelete(group);
                                                            setIsGroupDeleteModalOpen(true);
                                                        }}
                                                        className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                        title="Delete Group"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                                <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                                    <ChevronDown size={20} className="text-gray-400" />
                                                </div>
                                            </div>
                                        </button>

                                        {isExpanded && (
                                            <div className="border-t border-gray-50 dark:border-slate-800 animate-in fade-in slide-in-from-top-1 duration-200">
                                                <TableView data={group.students} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
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
                            className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
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
                            className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
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
                            className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
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
                            className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                            placeholder="john@example.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div className="flex justify-end space-x-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-6 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold uppercase tracking-widest text-gray-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-bold"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all"
                        >
                            Create Student
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={isGroupDeleteModalOpen}
                onClose={() => setIsGroupDeleteModalOpen(false)}
                title={`Delete Group: ${groupToDelete?.groupName}`}
            >
                <div className="space-y-6 py-2">
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-xl flex items-start">
                        <Trash2 className="text-amber-600 dark:text-amber-400 mr-3 shrink-0" size={24} />
                        <div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                How would you like to delete the group <strong>{groupToDelete?.groupName}</strong>?
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                This group contains {groupToDelete?.students.length} students.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <button
                            onClick={handleGroupDeleteOnly}
                            disabled={isDeletingGroup}
                            className="w-full text-left p-4 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group"
                        >
                            <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Delete Group Only</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Students will remain in the system but become <strong>Ungrouped</strong>.</p>
                        </button>

                        <button
                            onClick={handleGroupDeleteFull}
                            disabled={isDeletingGroup}
                            className="w-full text-left p-4 rounded-xl border border-red-100 dark:border-red-900/30 hover:border-red-300 dark:hover:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all group"
                        >
                            <h4 className="font-bold text-red-600 dark:text-red-400">Include Students</h4>
                            <p className="text-sm text-red-500/70 dark:text-red-400/70">Permanently delete the group <strong>AND</strong> all {groupToDelete?.students.length} students.</p>
                        </button>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            disabled={isDeletingGroup}
                            onClick={() => setIsGroupDeleteModalOpen(false)}
                            className="px-6 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold uppercase tracking-widest text-gray-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Bulk Actions Bar */}
            {selectedStudents.length > 0 && (
                <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 duration-300">
                    <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-6 border border-slate-700 dark:border-gray-200">
                        <div className="flex items-center space-x-2 border-r border-slate-700 dark:border-gray-200 pr-6">
                            <span className="bg-indigo-600 dark:bg-indigo-100 text-white dark:text-indigo-600 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                                {selectedStudents.length}
                            </span>
                            <span className="text-sm font-medium">Students Selected</span>
                        </div>

                        <div className="flex items-center space-x-4">
                            <button
                                onClick={handleBulkDelete}
                                className="flex items-center text-sm font-bold text-red-400 dark:text-red-600 hover:text-red-300 dark:hover:text-red-500 transition-colors uppercase tracking-wider"
                            >
                                <Trash2 size={16} className="mr-2" />
                                Delete Selected
                            </button>
                            <button
                                onClick={() => setSelectedStudents([])}
                                className="text-sm font-medium text-slate-400 dark:text-slate-500 hover:text-white dark:hover:text-slate-900 transition-colors"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
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

export default Students;
