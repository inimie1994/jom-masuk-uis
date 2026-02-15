import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabaseClient';
import PageHeader from '../components/common/PageHeader';
import Modal from '../components/common/Modal';
import {
    FileText,
    Plus,
    Trash2,
    Edit2,
    CheckCircle,
    BarChart2,
    Save
} from 'lucide-react';

const Assessments = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [assessments, setAssessments] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAssessment, setEditingAssessment] = useState(null);
    const [formData, setFormData] = useState({
        subject_id: '',
        name: '',
        description: '',
        total_marks: 100,
        weightage: 0,
        date: ''
    });

    // Grading Mode State
    const [gradingAssessment, setGradingAssessment] = useState(null);
    const [students, setStudents] = useState([]);
    const [grades, setGrades] = useState({}); // { student_id: marks }
    const [gradingLoading, setGradingLoading] = useState(false);


    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    useEffect(() => {
        if (user?.faculty_id) {
            fetchSubjects();
        }
    }, [user?.faculty_id]);

    useEffect(() => {
        if (selectedSubject) {
            fetchAssessments();
        } else {
            setAssessments([]);
        }
    }, [selectedSubject]);

    const fetchSubjects = async () => {
        try {
            let query = supabase
                .from('subjects')
                .select('id, code, name')
                .eq('faculty_id', user.faculty_id)
                .order('code');

            // If lecturer, only show subjects they teach
            if (user.role === 'lecturer' && user.lecturer_id) {
                // Find subjects linked to this lecturer via classes
                const { data: myClasses } = await supabase
                    .from('classes')
                    .select('subject_id')
                    .eq('lecturer_id', user.lecturer_id);

                const subjectIds = myClasses?.map(c => c.subject_id) || [];

                if (subjectIds.length > 0) {
                    query = query.in('id', subjectIds);
                } else {
                    setSubjects([]);
                    return;
                }
            }

            const { data, error } = await query;
            if (error) throw error;
            setSubjects(data || []);
            if (data.length > 0 && !selectedSubject) {
                setSelectedSubject(data[0].id);
            }
        } catch (err) {
            console.error('Error fetching subjects:', err);
        }
    };

    const fetchAssessments = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('assessments')
                .select('*')
                .eq('faculty_id', user.faculty_id)
                .eq('subject_id', selectedSubject)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAssessments(data || []);
        } catch (err) {
            console.error('Error fetching assessments:', err);
            setError('Failed to load assessments.');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (assessment = null) => {
        if (assessment) {
            setEditingAssessment(assessment);
            setFormData({
                subject_id: assessment.subject_id,
                name: assessment.name,
                description: assessment.description || '',
                total_marks: assessment.total_marks,
                weightage: assessment.weightage,
                date: assessment.date || ''
            });
        } else {
            setEditingAssessment(null);
            setFormData({
                subject_id: selectedSubject,
                name: '',
                description: '',
                total_marks: 100,
                weightage: 0,
                date: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            const payload = {
                faculty_id: user.faculty_id,
                ...formData
            };

            if (editingAssessment) {
                const { error } = await supabase
                    .from('assessments')
                    .update(payload)
                    .eq('id', editingAssessment.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('assessments')
                    .insert([payload]);
                if (error) throw error;
            }

            setIsModalOpen(false);
            setSuccessMessage(editingAssessment ? 'Assessment updated.' : 'Assessment created.');
            fetchAssessments();
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            console.error('Error saving assessment:', err);
            setError('Failed to save assessment.');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure? This will also delete all grades associated with this assessment.')) return;
        try {
            const { error } = await supabase.from('assessments').delete().eq('id', id);
            if (error) throw error;
            fetchAssessments();
        } catch (err) {
            console.error('Error deleting:', err);
            setError('Failed to delete assessment.');
        }
    };

    // --- Grading Logic ---

    const startGrading = async (assessment) => {
        setGradingAssessment(assessment);
        setGradingLoading(true);
        setStudents([]);
        setGrades({});
        setError(null);

        try {
            // 1. Get students enrolled in this subject
            // We find students via classes for this subject.
            // Assumption: we want ALL students taking this subject.
            // Complex join: students -> enrollments -> classes -> subject
            // Or simpler: find classes for subject, get enrollments.

            // Let's first look if we can get unique students from enrollments for classes of this subject.
            const { data: classesData, error: classesError } = await supabase
                .from('classes')
                .select('id')
                .eq('subject_id', selectedSubject);

            if (classesError) throw classesError;

            const classIds = classesData.map(c => c.id);

            if (classIds.length === 0) {
                setError("No classes found for this subject. Cannot determine students.");
                setGradingLoading(false);
                return;
            }

            const { data: enrollmentsData, error: enrollmentsError } = await supabase
                .from('enrollments')
                .select(`
                    student_id,
                    students (id, name, matric_no, student_group)
                `)
                .in('class_id', classIds)
                .order('student_id'); // We'll sort by name later

            if (enrollmentsError) throw enrollmentsError;

            // Deduplicate students (if enrolled in multiple sections? unlikely but safe)
            const uniqueStudentsMap = new Map();
            enrollmentsData.forEach(e => {
                if (e.students) uniqueStudentsMap.set(e.students.id, e.students);
            });
            const uniqueStudents = Array.from(uniqueStudentsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
            setStudents(uniqueStudents);

            // 2. Get existing grades
            const { data: gradesData, error: gradesError } = await supabase
                .from('grades')
                .select('student_id, marks_obtained')
                .eq('assessment_id', assessment.id);

            if (gradesError) throw gradesError;

            const gradesMap = {};
            gradesData.forEach(g => {
                gradesMap[g.student_id] = g.marks_obtained;
            });
            setGrades(gradesMap);

        } catch (err) {
            console.error('Error fetching grading data:', err);
            setError('Failed to load students for grading.');
        } finally {
            setGradingLoading(false);
        }
    };

    const handleGradeChange = (studentId, value) => {
        setGrades(prev => ({
            ...prev,
            [studentId]: value
        }));
    };

    const saveGrades = async () => {
        // Create upsert payload
        const upsertData = Object.entries(grades).map(([studentId, marks]) => {
            // Skip empty strings if user cleared input, but allow 0
            if (marks === '' || marks === null || marks === undefined) return null;
            return {
                faculty_id: user.faculty_id,
                assessment_id: gradingAssessment.id,
                student_id: studentId,
                marks_obtained: parseFloat(marks)
            };
        }).filter(Boolean);

        if (upsertData.length === 0) return;

        try {
            // For upserting, we need unique constraint on (assessment_id, student_id)
            const { error } = await supabase
                .from('grades')
                .upsert(upsertData, { onConflict: 'assessment_id, student_id' });

            if (error) throw error;

            // Audit Log
            import('../utils/auditLogger').then(({ logAuditAction }) => {
                logAuditAction(user, 'GRADE_UPDATE', {
                    assessment: gradingAssessment.name,
                    student_count: upsertData.length,
                    subject_id: gradingAssessment.subject_id
                });
            });

            setSuccessMessage("Grades saved successfully.");
            setTimeout(() => setSuccessMessage(null), 3000);
            setGradingAssessment(null); // Return to list view
        } catch (err) {
            console.error('Error saving grades:', err);
            setError('Failed to save grades.');
        }
    };


    if (gradingAssessment) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Grading: {gradingAssessment.name}</h1>
                        <p className="text-sm text-gray-500">{gradingAssessment.total_marks} Marks • {gradingAssessment.weightage}% Weightage</p>
                    </div>
                    <div className="space-x-3">
                        <button
                            onClick={() => setGradingAssessment(null)}
                            className="px-6 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold uppercase tracking-widest text-gray-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={saveGrades}
                            className="px-6 py-2 bg-primary hover:opacity-90 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-pastel flex items-center"
                        >
                            <Save size={16} className="mr-2" /> Save Grades
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/10 text-red-500 dark:text-red-400 p-4 rounded-xl mb-4 text-sm border border-red-100 dark:border-red-900/30 font-bold">
                        {error}
                    </div>
                )}

                <div className="bg-white dark:bg-slate-900 shadow-pastel rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-800">
                    <table className="min-w-full divide-y divide-gray-50 dark:divide-slate-800">
                        <thead className="bg-slate-50 dark:bg-slate-950">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Student</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Matric No</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Group</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Marks (/{gradingAssessment.total_marks})</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-50 dark:divide-slate-800">
                            {students.map(student => (
                                <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">{student.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{student.matric_no}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-medium">{student.student_group}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        <input
                                            type="number"
                                            min="0"
                                            max={gradingAssessment.total_marks}
                                            step="0.01"
                                            value={grades[student.id] || ''}
                                            onChange={(e) => handleGradeChange(student.id, e.target.value)}
                                            className="w-24 rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                                        />
                                    </td>
                                </tr>
                            ))}
                            {students.length === 0 && !gradingLoading && (
                                <tr>
                                    <td colSpan="4" className="px-6 py-4 text-center text-gray-500 italic">No students found enrolled in this subject.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Assessments"
                actionLabel={selectedSubject ? "Create Assessment" : null}
                onAction={() => handleOpenModal()}
            />

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-pastel border border-gray-100 dark:border-slate-800 flex items-center space-x-4">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Select Subject:</span>
                <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="block w-64 rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                >
                    <option value="">Select a subject...</option>
                    {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                    ))}
                </select>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/10 text-red-500 dark:text-red-400 p-4 rounded-xl mb-4 text-sm border border-red-100 dark:border-red-900/30 flex justify-between items-center transition-all">
                    <span className="font-bold">{error}</span>
                    <button onClick={() => setError(null)} className="text-[10px] font-bold uppercase tracking-widest hover:underline">Dismiss</button>
                </div>
            )}
            {successMessage && (
                <div className="bg-green-50 dark:bg-green-900/10 text-green-500 dark:text-green-400 p-4 rounded-xl mb-4 text-sm border border-green-100 dark:border-green-900/30 flex justify-between items-center transition-all">
                    <span className="font-bold">{successMessage}</span>
                    <button onClick={() => setSuccessMessage(null)} className="text-[10px] font-bold uppercase tracking-widest hover:underline">Dismiss</button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {!selectedSubject ? (
                    <div className="col-span-full py-24 text-center text-gray-400 flex flex-col items-center">
                        <FileText size={48} className="mb-4 opacity-10" />
                        <p className="italic uppercase tracking-widest text-xs font-bold">Select a subject to view assessments.</p>
                    </div>
                ) : assessments.length === 0 ? (
                    <div className="col-span-full py-24 text-center text-gray-400 flex flex-col items-center">
                        <p className="italic mb-4">No assessments created for this subject yet.</p>
                        <button
                            onClick={() => handleOpenModal()}
                            className="text-primary font-bold uppercase tracking-widest text-xs border-b border-primary/30 hover:border-primary transition-all pb-1"
                        >
                            Create one now
                        </button>
                    </div>
                ) : (
                    assessments.map(assessment => (
                        <div key={assessment.id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-pastel border border-gray-100 dark:border-slate-800 p-6 flex flex-col justify-between hover:shadow-pastel-lg transition-all group">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">{assessment.name}</h3>
                                    <span className="bg-pastel-indigo text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 text-[10px] px-2 py-1 rounded-lg font-bold uppercase tracking-widest">
                                        {assessment.weightage}%
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 line-clamp-2 italic leading-relaxed">{assessment.description || 'No description provided.'}</p>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest text-gray-400">
                                        <span>Total Marks</span>
                                        <span className="text-gray-700 dark:text-gray-200">{assessment.total_marks}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest text-gray-400">
                                        <span>Assessment Date</span>
                                        <span className="text-gray-700 dark:text-gray-200">{assessment.date || 'To be announced'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-8 pt-4 border-t border-gray-50 dark:border-slate-800 flex justify-between items-center">
                                <button
                                    onClick={() => startGrading(assessment)}
                                    className="text-primary hover:opacity-80 text-[10px] font-bold uppercase tracking-widest flex items-center transition-all"
                                >
                                    <CheckCircle size={14} className="mr-1.5" /> Enter Grades
                                </button>
                                <div className="flex space-x-1">
                                    <button
                                        onClick={() => handleOpenModal(assessment)}
                                        className="p-2 text-gray-300 hover:text-blue-400 transition-all rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(assessment.id)}
                                        className="p-2 text-gray-300 hover:text-red-400 transition-all rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingAssessment ? "Edit Assessment" : "New Assessment"}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Assessment Name</label>
                        <input
                            type="text"
                            required
                            className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. Midterm Exam"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Description</label>
                        <textarea
                            className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows="3"
                            placeholder="Briefly describe the assessment..."
                        ></textarea>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Total Marks</label>
                            <input
                                type="number"
                                required
                                min="0"
                                className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                                value={formData.total_marks}
                                onChange={(e) => setFormData({ ...formData, total_marks: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Weightage (%)</label>
                            <input
                                type="number"
                                required
                                min="0"
                                max="100"
                                className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                                value={formData.weightage}
                                onChange={(e) => setFormData({ ...formData, weightage: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Date (Optional)</label>
                        <input
                            type="date"
                            className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        />
                    </div>
                    <div className="flex justify-end pt-6 border-t border-gray-50 dark:border-slate-800 mt-6">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="mr-3 px-6 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold uppercase tracking-widest text-gray-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-bold"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 border border-transparent rounded-xl shadow-pastel text-xs font-bold uppercase tracking-widest text-white bg-primary hover:opacity-90 transition-all"
                        >
                            {editingAssessment ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Assessments;
