import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import PageHeader from '../common/PageHeader';
import Modal from '../common/Modal';
import { Plus, Trash2, BookOpen, ChevronRight, FileText, Download, Upload, X } from 'lucide-react';
import * as XLSX from 'xlsx';

const HodHopSubjectManagement = () => {
    const { user } = useAuth();
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSubject, setSelectedSubject] = useState(null);

    // Filter States
    const [searchQuery, setSearchQuery] = useState('');

    // Modal States
    const [isAddSubjectModalOpen, setIsAddSubjectModalOpen] = useState(false);
    const [isEditSubjectModalOpen, setIsEditSubjectModalOpen] = useState(false);
    const [isSyllabusModalOpen, setIsSyllabusModalOpen] = useState(false);

    // Form States
    const [subjectForm, setSubjectForm] = useState({
        code: '',
        name: '',
        credits: 3,
        // Department is auto-filled
    });

    const [editSubjectForm, setEditSubjectForm] = useState({
        id: '',
        code: '',
        name: '',
        credits: 3,
        // Department is fixed
    });

    // Syllabus State
    const [syllabus, setSyllabus] = useState([]);
    const [loadingSyllabus, setLoadingSyllabus] = useState(false);
    const [newTopic, setNewTopic] = useState('');

    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Derived Department ID from HOD/HOP user
    const [departmentId, setDepartmentId] = useState(user?.department_id || null);
    const [isCheckingDept, setIsCheckingDept] = useState(!user?.department_id);

    const departmentCode = user?.department_code || user?.department; // Fallback

    useEffect(() => {
        const resolveDepartment = async () => {
            if (user?.department_id) {
                setDepartmentId(user.department_id);
                setIsCheckingDept(false);
                return;
            }

            if (user?.lecturer_id) {
                try {
                    const { data } = await supabase
                        .from('lecturers')
                        .select('department_id')
                        .eq('id', user.lecturer_id)
                        .single();

                    if (data) {
                        setDepartmentId(data.department_id);
                    }
                } catch (err) {
                    console.error('Error resolving department:', err);
                }
            }
            setIsCheckingDept(false);
        };

        resolveDepartment();
    }, [user]);

    useEffect(() => {
        if (!isCheckingDept) {
            if (departmentId) {
                fetchSubjects();
            } else {
                setLoading(false);
            }
        }
    }, [departmentId, isCheckingDept]);

    const fetchSubjects = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('subjects')
                .select('*, departments(code, name)')
                .eq('faculty_id', user?.faculty_id)
                .eq('department_id', departmentId) // FILTER BY DEPARTMENT
                .order('code', { ascending: true });

            if (error) throw error;
            setSubjects(data || []);
        } catch (err) {
            console.error('Error fetching subjects:', err);
            setError('Failed to load subjects.');
        } finally {
            setLoading(false);
        }
    };

    const fetchSyllabus = async (subjectId) => {
        try {
            setLoadingSyllabus(true);
            const { data, error } = await supabase
                .from('syllabus')
                .select('*')
                .eq('subject_id', subjectId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setSyllabus(data || []);
        } catch (err) {
            console.error('Error fetching syllabus:', err);
        } finally {
            setLoadingSyllabus(false);
        }
    };

    const handleCreateSubject = async (e) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!subjectForm.code.trim() || !subjectForm.name.trim()) {
            setError('Code and Name are required.');
            return;
        }

        try {
            setLoading(true);

            // Check for duplicate code within the faculty (or global if preferred, usually faculty scoped)
            const { data: existing } = await supabase
                .from('subjects')
                .select('id')
                .eq('code', subjectForm.code.toUpperCase())
                .eq('faculty_id', user.faculty_id)
                .single();

            if (existing) {
                throw new Error('Subject code already exists in this faculty.');
            }

            const { data, error } = await supabase
                .from('subjects')
                .insert([{
                    code: subjectForm.code.toUpperCase(),
                    name: subjectForm.name,
                    credits: parseInt(subjectForm.credits),
                    faculty_id: user.faculty_id,
                    department_id: departmentId // AUTO-ASSIGN
                }])
                .select();

            if (error) throw error;

            setSuccess('Subject created successfully.');
            setTimeout(() => setSuccess(null), 3000);

            setIsAddSubjectModalOpen(false);
            setSubjectForm({ code: '', name: '', credits: 3 });
            fetchSubjects();
        } catch (err) {
            console.error('Error creating subject:', err);
            setError(err.message || 'Failed to create subject.');
        } finally {
            setLoading(false);
        }
    };

    const handleEditSubject = (subject) => {
        setEditSubjectForm({
            id: subject.id,
            code: subject.code,
            name: subject.name,
            credits: subject.credits
        });
        setIsEditSubjectModalOpen(true);
    };

    const handleUpdateSubject = async (e) => {
        e.preventDefault();
        setError(null);

        try {
            setLoading(true);
            const { error } = await supabase
                .from('subjects')
                .update({
                    code: editSubjectForm.code.toUpperCase(),
                    name: editSubjectForm.name,
                    credits: parseInt(editSubjectForm.credits)
                })
                .eq('id', editSubjectForm.id);

            if (error) throw error;

            setSuccess('Subject updated successfully.');
            setTimeout(() => setSuccess(null), 3000);

            setIsEditSubjectModalOpen(false);
            fetchSubjects();
        } catch (err) {
            console.error('Error updating subject:', err);
            setError(err.message || 'Failed to update subject.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSubject = async (id) => {
        if (!window.confirm('Are you sure? This will delete all syllabus and workload data associated with this subject.')) return;

        try {
            setLoading(true);
            const { error } = await supabase
                .from('subjects')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setSuccess('Subject deleted successfully.');
            setTimeout(() => setSuccess(null), 3000);

            if (selectedSubject?.id === id) setSelectedSubject(null);
            fetchSubjects();
        } catch (err) {
            console.error('Error deleting subject:', err);
            setError('Failed to delete subject. It might be linked to other records.');
        } finally {
            setLoading(false);
        }
    };

    // Syllabus Handlers
    const handleOpenSyllabus = (subject) => {
        setSelectedSubject(subject);
        fetchSyllabus(subject.id);
        setIsSyllabusModalOpen(true);
    };

    const handleAddTopic = async (e) => {
        e.preventDefault();
        if (!newTopic.trim()) return;

        try {
            const { data, error } = await supabase
                .from('syllabus')
                .insert([{
                    subject_id: selectedSubject.id,
                    topic: newTopic
                    // week_number left auto or null for now, simple list
                }])
                .select();

            if (error) throw error;

            setSyllabus([...syllabus, data[0]]);
            setNewTopic('');
        } catch (err) {
            console.error('Error adding topic:', err);
            setError('Failed to add topic.');
        }
    };

    const handleDeleteTopic = async (id) => {
        try {
            const { error } = await supabase
                .from('syllabus')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setSyllabus(syllabus.filter(s => s.id !== id));
        } catch (err) {
            console.error('Error deleting topic:', err);
        }
    };

    // Excel Handlers
    const handleDownloadTemplate = () => {
        const worksheet = XLSX.utils.json_to_sheet([
            { Topic: 'Introduction to Course' },
            { Topic: 'Chapter 1: Basics' },
            { Topic: 'Chapter 2: Advanced Concepts' }
        ]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Syllabus");
        XLSX.writeFile(workbook, "Syllabus_Template.xlsx");
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);

            if (data.length > 0 && selectedSubject) {
                try {
                    setLoadingSyllabus(true);
                    const syllabusData = data.map(item => ({
                        subject_id: selectedSubject.id,
                        topic: item.Topic || item.topic || 'Untitled Topic'
                    }));

                    const { error } = await supabase
                        .from('syllabus')
                        .insert(syllabusData);

                    if (error) throw error;
                    fetchSyllabus(selectedSubject.id);
                    setSuccess(`Imported ${syllabusData.length} topics.`);
                } catch (err) {
                    console.error("Import error:", err);
                    setError("Failed to import syllabus.");
                } finally {
                    setLoadingSyllabus(false);
                }
            }
        };
        reader.readAsBinaryString(file);
    };

    const filteredSubjects = subjects.filter(subject =>
        subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        subject.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div>
            <PageHeader
                title={`${departmentCode || 'Department'} Subjects`}
                actionLabel="Add Subject"
                onAction={() => setIsAddSubjectModalOpen(true)}
            />

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-md mb-4 text-sm flex justify-between items-center animate-in">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="text-sm underline">Dismiss</button>
                </div>
            )}

            {success && (
                <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-4 rounded-md mb-4 text-sm flex justify-between items-center animate-in">
                    <span>{success}</span>
                    <button onClick={() => setSuccess(null)} className="text-sm underline">Dismiss</button>
                </div>
            )}

            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Search subjects..."
                    className="w-full md:w-96 px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : filteredSubjects.length > 0 ? (
                    filteredSubjects.map((subject) => (
                        <div key={subject.id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 hover:shadow-md transition-all relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-2 h-full bg-pastel-purple group-hover:bg-primary transition-colors"></div>

                            <div className="flex justify-between items-start mb-4 pl-2">
                                <div className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-black uppercase tracking-widest px-2 py-1 rounded">
                                    {subject.code}
                                </div>
                                <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleEditSubject(subject)}
                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                        <Pencil size={16} />
                                        {/* Lucide icon needs to be imported if used */}
                                        <span className="sr-only">Edit</span>
                                    </button>
                                    <button
                                        onClick={() => handleDeleteSubject(subject.id)}
                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16} />
                                        <span className="sr-only">Delete</span>
                                    </button>
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 pl-2 line-clamp-2 h-14">
                                {subject.name}
                            </h3>

                            <div className="pl-2 mt-4 flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    {subject.credits} Credits
                                </span>
                                <button
                                    onClick={() => handleOpenSyllabus(subject)}
                                    className="flex items-center text-xs font-bold text-primary hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors uppercase tracking-wider"
                                >
                                    <BookOpen size={14} className="mr-1.5" />
                                    Syllabus
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full flex flex-col items-center justify-center py-16 text-gray-400">
                        <BookOpen size={48} className="mb-4 opacity-20" />
                        <p>No subjects found.</p>
                    </div>
                )}
            </div>

            {/* Add Subject Modal */}
            <Modal isOpen={isAddSubjectModalOpen} onClose={() => setIsAddSubjectModalOpen(false)} title="Add New Subject">
                <form onSubmit={handleCreateSubject} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subject Code</label>
                        <input
                            type="text"
                            required
                            className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all uppercase"
                            value={subjectForm.code}
                            onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value.toUpperCase() })}
                            placeholder="e.g. CS101"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subject Name</label>
                        <input
                            type="text"
                            required
                            className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                            value={subjectForm.name}
                            onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                            placeholder="e.g. Introduction to Programming"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Credits</label>
                        <input
                            type="number"
                            required
                            min="1"
                            max="10"
                            className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                            value={subjectForm.credits}
                            onChange={(e) => setSubjectForm({ ...subjectForm, credits: e.target.value })}
                        />
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={() => setIsAddSubjectModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 transition-colors">Cancel</button>
                        <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-bold uppercase tracking-wider text-white bg-primary hover:opacity-90 rounded-xl shadow-sm shadow-indigo-200 dark:shadow-none transition-all disabled:opacity-50">
                            {loading ? 'Creating...' : 'Create Subject'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Edit Subject Modal */}
            <Modal isOpen={isEditSubjectModalOpen} onClose={() => setIsEditSubjectModalOpen(false)} title="Edit Subject">
                <form onSubmit={handleUpdateSubject} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subject Code</label>
                        <input
                            type="text"
                            required
                            className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all uppercase"
                            value={editSubjectForm.code}
                            onChange={(e) => setEditSubjectForm({ ...editSubjectForm, code: e.target.value.toUpperCase() })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subject Name</label>
                        <input
                            type="text"
                            required
                            className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                            value={editSubjectForm.name}
                            onChange={(e) => setEditSubjectForm({ ...editSubjectForm, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Credits</label>
                        <input
                            type="number"
                            required
                            min="1"
                            max="10"
                            className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                            value={editSubjectForm.credits}
                            onChange={(e) => setEditSubjectForm({ ...editSubjectForm, credits: e.target.value })}
                        />
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={() => setIsEditSubjectModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 transition-colors">Cancel</button>
                        <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-bold uppercase tracking-wider text-white bg-primary hover:opacity-90 rounded-xl shadow-sm shadow-indigo-200 dark:shadow-none transition-all disabled:opacity-50">
                            {loading ? 'Updating...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Syllabus Modal */}
            <Modal isOpen={isSyllabusModalOpen} onClose={() => setIsSyllabusModalOpen(false)} title={`Syllabus: ${selectedSubject?.code}`}>
                <div className="space-y-6">
                    {/* Bulk Actions */}
                    <div className="flex justify-end space-x-2">
                        <button
                            onClick={handleDownloadTemplate}
                            className="flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors border border-gray-200"
                        >
                            <Download size={14} className="mr-1.5" />
                            Template
                        </button>
                        <label className="flex items-center px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100 cursor-pointer">
                            <Upload size={14} className="mr-1.5" />
                            Import
                            <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
                        </label>
                    </div>

                    {/* Add Topic Form */}
                    <form onSubmit={handleAddTopic} className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Add new topic..."
                            className="flex-1 rounded-xl border-gray-200 dark:border-slate-700 shadow-sm sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border"
                            value={newTopic}
                            onChange={(e) => setNewTopic(e.target.value)}
                        />
                        <button
                            type="submit"
                            className="px-4 py-2 bg-primary text-white rounded-xl shadow-sm hover:opacity-90 font-bold uppercase text-xs tracking-wider"
                        >
                            Add
                        </button>
                    </form>

                    {/* Syllabus List */}
                    <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-xl p-2 bg-slate-50 dark:bg-slate-900 border-gray-100 dark:border-slate-800">
                        {loadingSyllabus ? (
                            <div className="flex justify-center p-4">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                            </div>
                        ) : syllabus.length > 0 ? (
                            syllabus.map((item, index) => (
                                <div key={item.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700">
                                    <div className="flex items-center gap-3">
                                        <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-indigo-50 dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-full">
                                            {index + 1}
                                        </span>
                                        <span className="text-sm text-gray-700 dark:text-gray-300">{item.topic}</span>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteTopic(item.id)}
                                        className="text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-400 text-sm py-8">No topics added yet.</p>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
};

// Simple Pencil Icon if not imported
const Pencil = ({ size = 24, className = "" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
);

export default HodHopSubjectManagement;
