import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabaseClient';
import PageHeader from '../components/common/PageHeader';
import EmptyState from '../components/common/EmptyState';
import Modal from '../components/common/Modal';
import { Plus, Trash2, BookOpen, Edit, FileSpreadsheet, Download, Upload, X } from 'lucide-react';
import * as XLSX from 'xlsx';

const Subjects = () => {
    const { user } = useAuth();
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ code: '', name: '', credits: 3, department_id: '' });
    const [error, setError] = useState(null);

    // Edit State
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingSubjectId, setEditingSubjectId] = useState(null);

    // Syllabus State
    const [isSyllabusModalOpen, setIsSyllabusModalOpen] = useState(false);
    const [selectedSubjectForSyllabus, setSelectedSubjectForSyllabus] = useState(null);
    const [syllabus, setSyllabus] = useState([]);
    const [loadingSyllabus, setLoadingSyllabus] = useState(false);
    const [syllabusFormData, setSyllabusFormData] = useState({ week_number: '', topic: '', learning_outcomes: '' });
    const [departments, setDepartments] = useState([]);

    useEffect(() => {
        if (user?.faculty_id || user?.lecturer_id) {
            fetchSubjects();
            if (user?.faculty_id) fetchDepartments();
        }
    }, [user?.faculty_id, user?.lecturer_id]);

    const fetchSubjects = async () => {
        try {
            setLoading(true);
            const isAdmin = user?.role === 'admin';

            if (isAdmin && user?.faculty_id) {
                const { data, error } = await supabase
                    .from('subjects')
                    .select('*, departments(code, name)')
                    .eq('faculty_id', user.faculty_id)
                    .order('code', { ascending: true });

                if (error) throw error;
                setSubjects(data || []);
            } else if (user?.lecturer_id) {
                // Fetch timetable entries assigned to this lecturer
                const { data, error } = await supabase
                    .from('timetable')
                    .select('group_names, class_type, subjects(id, code, name, credits)')
                    .eq('lecturer_id', user.lecturer_id);

                if (error) throw error;

                // Group by subject and then by class_type
                const subjectGroups = (data || []).reduce((acc, item) => {
                    const sub = item.subjects;
                    if (!sub) return acc;

                    if (!acc[sub.id]) {
                        acc[sub.id] = {
                            id: sub.id,
                            code: sub.code,
                            name: sub.name,
                            credits: sub.credits,
                            classTypes: {}
                        };
                    }

                    const typeKey = item.class_type || 'Other';
                    if (!acc[sub.id].classTypes[typeKey]) {
                        acc[sub.id].classTypes[typeKey] = new Set();
                    }

                    if (Array.isArray(item.group_names)) {
                        item.group_names.forEach(g => acc[sub.id].classTypes[typeKey].add(g));
                    } else if (item.group_names) {
                        acc[sub.id].classTypes[typeKey].add(item.group_names);
                    }

                    return acc;
                }, {});

                // Format for rendering
                const formattedSubjects = Object.values(subjectGroups).map(s => ({
                    ...s,
                    classTypes: Object.entries(s.classTypes)
                        .map(([type, groups]) => ({
                            type,
                            groups: Array.from(groups).sort()
                        }))
                        // Ensure 'Lecture' comes before others if possible
                        .sort((a, b) => {
                            if (a.type.toLowerCase() === 'lecture') return -1;
                            if (b.type.toLowerCase() === 'lecture') return 1;
                            return a.type.localeCompare(b.type);
                        })
                })).sort((a, b) => a.code.localeCompare(b.code));

                setSubjects(formattedSubjects);
            }
        } catch (err) {
            console.error('Error fetching subjects:', err);
            setError('Failed to load classes.');
        } finally {
            setLoading(false);
        }
    };

    const fetchDepartments = async () => {
        try {
            const { data, error } = await supabase
                .from('departments')
                .select('id, code, name')
                .eq('faculty_id', user?.faculty_id)
                .order('name', { ascending: true });

            if (error) throw error;
            setDepartments(data || []);
        } catch (err) {
            console.error('Error fetching departments:', err);
        }
    };

    const handleCreateSubject = async (e) => {
        e.preventDefault();
        if (!user?.faculty_id) return;

        try {
            if (isEditMode && editingSubjectId) {
                // Update existing subject
                const { error } = await supabase
                    .from('subjects')
                    .update({ ...formData })
                    .eq('id', editingSubjectId);

                if (error) throw error;
            } else {
                // Create new subject
                const { error } = await supabase
                    .from('subjects')
                    .insert([
                        {
                            ...formData,
                            faculty_id: user.faculty_id
                        }
                    ]);

                if (error) throw error;
            }

            setIsModalOpen(false);
            setFormData({ code: '', name: '', credits: 3, department_id: '' });
            setIsEditMode(false);
            setEditingSubjectId(null);
            fetchSubjects();
        } catch (err) {
            console.error('Error saving subject:', err);
            setError('Failed to save subject. Ensure code is unique.');
        }
    };

    const handleEditSubject = (subject) => {
        setFormData({ code: subject.code, name: subject.name, credits: subject.credits, department_id: subject.department_id || '' });
        setEditingSubjectId(subject.id);
        setIsEditMode(true);
        setIsModalOpen(true);
    };

    const handleDeleteSubject = async (id) => {
        if (!window.confirm('Are you sure you want to delete this subject? This action cannot be undone.')) return;

        try {
            const { error } = await supabase
                .from('subjects')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchSubjects();
        } catch (err) {
            console.error('Error deleting subject:', err);
            setError('Failed to delete subject.');
        }
    };

    // Syllabus Helpers
    const fetchSyllabus = async (subjectId) => {
        if (!subjectId || typeof subjectId !== 'string') {
            console.warn('fetchSyllabus: Invalid subjectId', subjectId);
            setSyllabus([]);
            return;
        }
        try {
            setLoadingSyllabus(true);
            const { data, error } = await supabase
                .from('syllabus')
                .select('*')
                .eq('subject_id', subjectId)
                .order('week_number', { ascending: true });

            if (error) throw error;
            setSyllabus(data || []);
        } catch (err) {
            console.error('Error fetching syllabus:', err);
        } finally {
            setLoadingSyllabus(false);
        }
    };

    const handleOpenSyllabus = (subject) => {
        setSelectedSubjectForSyllabus(subject);
        setIsSyllabusModalOpen(true);
        fetchSyllabus(subject.id);
    };

    const handleAddTopic = async (e) => {
        e.preventDefault();
        if (!selectedSubjectForSyllabus) return;

        try {
            const { error } = await supabase
                .from('syllabus')
                .insert([
                    {
                        ...syllabusFormData,
                        subject_id: selectedSubjectForSyllabus.id,
                        week_number: parseInt(syllabusFormData.week_number)
                    }
                ]);

            if (error) throw error;

            setSyllabusFormData({ week_number: '', topic: '', learning_outcomes: '' });
            fetchSyllabus(selectedSubjectForSyllabus.id);
        } catch (err) {
            console.error('Error adding topic:', err);
            alert('Failed to add topic. Ensure week number is unique for this subject.');
        }
    };

    const handleDeleteTopic = async (id) => {
        if (!window.confirm('Delete this topic?')) return;
        try {
            const { error } = await supabase.from('syllabus').delete().eq('id', id);
            if (error) throw error;
            fetchSyllabus(selectedSubjectForSyllabus.id);
        } catch (err) {
            console.error('Error deleting topic:', err);
        }
    };

    const handleDownloadTemplate = () => {
        const ws = XLSX.utils.json_to_sheet([
            { week_number: 1, topic: 'Introduction', learning_outcomes: 'Understand basics' },
            { week_number: 2, topic: 'Advanced Concepts', learning_outcomes: 'Deep dive' }
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Syllabus");
        XLSX.writeFile(wb, "Syllabus_Template.xlsx");
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const dataBuffer = evt.target.result;
                const wb = XLSX.read(dataBuffer, { type: 'array' });
                const wsName = wb.SheetNames[0];
                const ws = wb.Sheets[wsName];
                const jsonData = XLSX.utils.sheet_to_json(ws);

                if (!jsonData || jsonData.length === 0) {
                    alert('No data found in Excel.');
                    return;
                }

                // Validation and Transformation
                const formattedData = jsonData.map(row => {
                    const weekNum = row.week_number || row['Week'] || row['week'] || 0;
                    return {
                        subject_id: selectedSubjectForSyllabus.id,
                        week_number: parseInt(weekNum),
                        topic: row.topic || row['Topic'] || '',
                        learning_outcomes: row.learning_outcomes || row['Learning Outcomes'] || row['learning_outcomes'] || ''
                    };
                }).filter(row => row.week_number > 0 && row.topic);

                if (formattedData.length === 0) {
                    alert('No valid rows found in Excel. Ensure "week_number" (or "Week") and "topic" (or "Topic") columns exist.');
                    return;
                }

                // Batch insert with Upsert
                const { error } = await supabase.from('syllabus').upsert(formattedData, { onConflict: 'subject_id, week_number' });
                if (error) throw error;

                alert(`Successfully imported ${formattedData.length} topics.`);
                fetchSyllabus(selectedSubjectForSyllabus.id);
                // Clear input
                e.target.value = '';
            } catch (err) {
                console.error('Error importing Excel:', err);
                alert(`Failed to import Excel: ${err.message || 'Unknown error'}`);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <div>
            <PageHeader
                title={['lecturer', 'hod', 'hop'].includes(user?.role) ? "My Classes" : "Subjects"}
                description={['lecturer', 'hod', 'hop'].includes(user?.role) ? "List of classes assigned to you for this semester." : null}
                actionLabel={user?.role === 'admin' ? "Add Subject" : null}
                onAction={user?.role === 'admin' ? (() => setIsModalOpen(true)) : null}
            />

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-md mb-4 text-sm">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : subjects.length > 0 ? (
                ['lecturer', 'hod', 'hop'].includes(user?.role) ? (
                    <div className="space-y-4">
                        {subjects.map((subject, idx) => (
                            <div key={idx} className="bg-white dark:bg-slate-900 shadow-sm rounded-2xl border border-gray-100 dark:border-slate-800 p-6 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                            <span className="text-indigo-600 dark:text-indigo-400">{idx + 1}.</span> {subject.code} - {subject.name}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{subject.credits} Credits</p>
                                    </div>
                                    <button
                                        onClick={() => handleOpenSyllabus(subject)}
                                        className="inline-flex items-center px-4 py-2 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition-all hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                                    >
                                        <BookOpen size={16} className="mr-2" />
                                        VIEW SYLLABUS
                                    </button>
                                </div>
                                <div className="pl-6 space-y-3">
                                    {subject.classTypes.map((ct, ctIdx) => (
                                        <div key={ctIdx} className="flex items-start text-sm">
                                            <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 mr-3 shrink-0"></div>
                                            <div>
                                                <span className="font-bold text-gray-700 dark:text-slate-200 capitalize mr-2">{ct.type.toLowerCase()}</span>
                                                <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                                                    [{ct.groups.join(', ')}]
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-12">
                        {Object.entries(
                            subjects.reduce((acc, s) => {
                                const dept = s.departments?.code || 'Other';
                                if (!acc[dept]) acc[dept] = [];
                                acc[dept].push(s);
                                return acc;
                            }, {})
                        ).sort((a, b) => a[0].localeCompare(b[0])).map(([deptCode, deptSubjects]) => (
                            <div key={deptCode} className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter flex items-center gap-3">
                                        <div className="w-2 h-8 bg-primary rounded-full"></div>
                                        {deptCode}
                                        <span className="text-gray-400 font-medium text-sm ml-2">({deptSubjects.length} subjects)</span>
                                    </h2>
                                    <div className="h-px bg-gray-100 dark:border-slate-800 flex-1"></div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {deptSubjects.map((subject) => (
                                        <div
                                            key={subject.id}
                                            className="group bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
                                        >
                                            {/* Accent background blur */}
                                            <div className="absolute -right-8 -top-8 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors"></div>

                                            <div className="flex justify-between items-start mb-4">
                                                <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-indigo-100 dark:border-indigo-900/30">
                                                    {subject.code}
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleEditSubject(subject)}
                                                        className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all"
                                                        title="Edit Subject"
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenSyllabus(subject)}
                                                        className="p-2 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all"
                                                        title="Manage Syllabus"
                                                    >
                                                        <BookOpen size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteSubject(subject.id)}
                                                        className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                                                        title="Delete Subject"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>

                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-primary transition-colors">
                                                {subject.name}
                                            </h3>

                                            <div className="flex items-center gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest mt-6 pt-4 border-t border-gray-50 dark:border-slate-800">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-slate-700"></div>
                                                    {subject.credits} Credits
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary/40"></div>
                                                    {deptCode}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )
            ) : (
                <EmptyState
                    icon={BookOpen}
                    message={user?.role === 'admin' ? "No subjects found. Add your first subject to get started." : "You are not currently assigned to any subjects. Check your timetable."}
                    actionLabel={user?.role === 'admin' ? "Add Subject" : null}
                    onAction={user?.role === 'admin' ? (() => {
                        setIsEditMode(false);
                        setFormData({ code: '', name: '', credits: 3, department_id: '' });
                        setIsModalOpen(true);
                    }) : null}
                />
            )}

            {/* Create/Edit Subject Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={isEditMode ? 'Edit Subject' : 'Add New Subject'}
            >
                <form onSubmit={handleCreateSubject} className="space-y-4">
                    <div>
                        <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Subject Code
                        </label>
                        <input
                            type="text"
                            id="code"
                            required
                            className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                            placeholder="e.g. CS101"
                            value={formData.code}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        />
                    </div>
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Subject Name
                        </label>
                        <input
                            type="text"
                            id="name"
                            required
                            className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                            placeholder="e.g. Intro to Computer Science"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label htmlFor="credits" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Credits
                        </label>
                        <input
                            type="number"
                            id="credits"
                            required
                            min="0"
                            className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                            value={formData.credits}
                            onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) })}
                        />
                    </div>
                    <div>
                        <label htmlFor="department" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Department
                        </label>
                        <select
                            id="department"
                            required
                            className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                            value={formData.department_id}
                            onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                        >
                            <option value="">Select Department...</option>
                            {departments.map(dept => (
                                <option key={dept.id} value={dept.id}>{dept.code} - {dept.name}</option>
                            ))}
                        </select>
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
                            className="px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-bold uppercase tracking-wider text-white bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all"
                        >
                            {isEditMode ? 'Update Subject' : 'Create Subject'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Syllabus Modal */}
            {isSyllabusModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto w-full h-full bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <BookOpen size={20} className="text-primary" />
                                Syllabus: {selectedSubjectForSyllabus?.code} - {selectedSubjectForSyllabus?.name}
                            </h3>
                            <button
                                onClick={() => setIsSyllabusModalOpen(false)}
                                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto flex-1 space-y-6">

                            {/* Actions: Download/Upload */}
                            <div className="flex flex-wrap gap-4 justify-end border-b border-gray-100 dark:border-slate-800 pb-6">
                                <button
                                    onClick={handleDownloadTemplate}
                                    className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-slate-700 shadow-sm text-sm font-medium rounded-xl text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
                                >
                                    <Download size={16} className="mr-2" />
                                    Download Template
                                </button>
                                <label className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-xl text-white bg-teal-600 hover:bg-teal-700 cursor-pointer transition">
                                    <Upload size={16} className="mr-2" />
                                    Import from Excel
                                    <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
                                </label>
                            </div>

                            {/* Add Topic Form */}
                            <form onSubmit={handleAddTopic} className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-slate-700 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-slate-400 mb-1">Week</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        placeholder="#"
                                        className="w-full rounded-lg border-gray-200 dark:border-slate-700 dark:bg-slate-900 text-sm px-3 py-2"
                                        value={syllabusFormData.week_number}
                                        onChange={e => setSyllabusFormData({ ...syllabusFormData, week_number: e.target.value })}
                                    />
                                </div>
                                <div className="md:col-span-4">
                                    <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-slate-400 mb-1">Topic</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Topic Title"
                                        className="w-full rounded-lg border-gray-200 dark:border-slate-700 dark:bg-slate-900 text-sm px-3 py-2"
                                        value={syllabusFormData.topic}
                                        onChange={e => setSyllabusFormData({ ...syllabusFormData, topic: e.target.value })}
                                    />
                                </div>
                                <div className="md:col-span-4">
                                    <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-slate-400 mb-1">Outcomes</label>
                                    <input
                                        type="text"
                                        placeholder="Learning Outcomes"
                                        className="w-full rounded-lg border-gray-200 dark:border-slate-700 dark:bg-slate-900 text-sm px-3 py-2"
                                        value={syllabusFormData.learning_outcomes}
                                        onChange={e => setSyllabusFormData({ ...syllabusFormData, learning_outcomes: e.target.value })}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <button
                                        type="submit"
                                        className="w-full px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-md hover:bg-primary/90 transition"
                                    >
                                        <Plus size={16} className="inline mr-1" /> Add
                                    </button>
                                </div>
                            </form>

                            {/* Syllabus List */}
                            {loadingSyllabus ? (
                                <div className="flex justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                </div>
                            ) : syllabus.length > 0 ? (
                                <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
                                        <thead className="bg-slate-50 dark:bg-slate-950">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Week</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Topic</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Learning Outcomes</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800">
                                            {syllabus.map((item) => (
                                                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
                                                        Week {item.week_number}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300">
                                                        {item.topic}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                        {item.learning_outcomes || '-'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                                        <button
                                                            onClick={() => handleDeleteTopic(item.id)}
                                                            className="text-red-600 hover:text-red-900 dark:text-red-400 transition"
                                                            title="Delete Topic"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-gray-400 dark:text-slate-500">
                                    <FileSpreadsheet size={48} className="mx-auto mb-3 opacity-20" />
                                    <p>No syllabus topics added yet.</p>
                                    <p className="text-xs mt-1">Add a topic manually or import from Excel.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Subjects;
