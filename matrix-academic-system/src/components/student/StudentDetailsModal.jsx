import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Modal from '../common/Modal';
import { BookOpen, Calendar, Award, User, Clock, Percent, AlertCircle } from 'lucide-react';

const StudentDetailsModal = ({ isOpen, onClose, student }) => {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('summary');
    const [enrollments, setEnrollments] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [grades, setGrades] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && student) {
            fetchStudentData();
        } else {
            // Reset state when closed
            setEnrollments([]);
            setAttendance([]);
            setGrades([]);
            setActiveTab('summary');
        }
    }, [isOpen, student]);

    const fetchStudentData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Parallel fetching for speed
            const [enrollRes, attendRes, gradesRes] = await Promise.all([
                supabase
                    .from('enrollments')
                    .select('*, subjects(code, name, credit_hours)')
                    .eq('student_id', student.id),
                supabase
                    .from('attendance_records')
                    .select('*, attendance_sessions(id, date, type, subjects(code, name))')
                    .eq('student_id', student.id),
                supabase
                    .from('grades')
                    .select('*, assessments(title, total_marks, weightage, type, subjects(code, name))')
                    .eq('student_id', student.id)
            ]);

            if (enrollRes.error) throw enrollRes.error;
            if (attendRes.error) throw attendRes.error;
            if (gradesRes.error) throw gradesRes.error;

            setEnrollments(enrollRes.data || []);
            setAttendance(attendRes.data || []);
            setGrades(gradesRes.data || []);

        } catch (err) {
            console.error("Error fetching student details:", err);
            setError("Failed to load student data.");
        } finally {
            setLoading(false);
        }
    };

    // --- Calculations ---

    const calculateAttendanceStats = () => {
        if (!attendance.length) return { overall: 0, bySubject: {} };

        const total = attendance.length;
        const present = attendance.filter(r => r.status === 'present').length;
        const overall = Math.round((present / total) * 100);

        const bySubject = {};
        attendance.forEach(record => {
            const subjectName = record.attendance_sessions?.subjects?.code;
            if (!subjectName) return;

            if (!bySubject[subjectName]) {
                bySubject[subjectName] = { total: 0, present: 0 };
            }
            bySubject[subjectName].total++;
            if (record.status === 'present') {
                bySubject[subjectName].present++;
            }
        });

        return { overall, bySubject };
    };

    const calculateGradesBySubject = () => {
        const bySubject = {};
        grades.forEach(grade => {
            const subjectName = grade.assessments?.subjects?.code || 'Unknown';
            if (!bySubject[subjectName]) {
                bySubject[subjectName] = [];
            }
            bySubject[subjectName].push(grade);
        });
        return bySubject;
    };

    const stats = calculateAttendanceStats();
    const gradesBySubject = calculateGradesBySubject();

    // --- Render Helpers ---

    const renderSummary = () => (
        <div className="space-y-6">
            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-pastel-indigo p-4 rounded-2xl border border-indigo-100 dark:bg-indigo-900/10 dark:border-indigo-800/50">
                    <div className="flex items-center text-indigo-600 dark:text-indigo-400 mb-2">
                        <BookOpen size={18} className="mr-2" />
                        <span className="text-xs font-bold uppercase tracking-wider">Subjects</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{enrollments.length}</p>
                </div>
                <div className="bg-pastel-green p-4 rounded-2xl border border-green-100 dark:bg-green-900/10 dark:border-green-800/50">
                    <div className="flex items-center text-green-600 dark:text-green-400 mb-2">
                        <Clock size={18} className="mr-2" />
                        <span className="text-xs font-bold uppercase tracking-wider">Attendance</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.overall}%</p>
                </div>
                <div className="bg-pastel-purple p-4 rounded-2xl border border-purple-100 dark:bg-purple-900/10 dark:border-purple-800/50">
                    <div className="flex items-center text-purple-600 dark:text-purple-400 mb-2">
                        <Award size={18} className="mr-2" />
                        <span className="text-xs font-bold uppercase tracking-wider">Assessments</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{grades.length}</p>
                </div>
            </div>

            {/* Enrolled Subjects List */}
            <div>
                <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Enrolled Subjects</h4>
                {enrollments.length > 0 ? (
                    <div className="space-y-3">
                        {enrollments.map((enr) => (
                            <div key={enr.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900/50">
                                <div className="flex items-center">
                                    <div className="w-1.5 h-10 rounded-full bg-primary mr-3"></div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{enr.subjects?.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">{enr.subjects?.code}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center p-6 bg-gray-50 dark:bg-slate-800/50 rounded-lg text-gray-500 dark:text-gray-400 text-sm">
                        No subjects enrolled.
                    </div>
                )}
            </div>
        </div>
    );

    const renderAttendance = () => (
        <div className="space-y-6">
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-900 p-3 rounded-md border border-gray-200 dark:border-slate-700">
                <AlertCircle size={16} className="text-blue-500" />
                <span>Attendance is calculated based on marked sessions only.</span>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {Object.entries(stats.bySubject).map(([subCode, stat]) => {
                    const percentage = stat.total > 0 ? Math.round((stat.present / stat.total) * 100) : 0;
                    let color = 'bg-green-500';
                    if (percentage < 80) color = 'bg-red-500';
                    else if (percentage < 90) color = 'bg-yellow-500';

                    return (
                        <div key={subCode} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-medium text-gray-700 dark:text-gray-200">{subCode}</span>
                                <span className={`text-sm font-bold ${percentage < 80 ? 'text-red-500' : 'text-green-600'}`}>
                                    {percentage}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
                                <div className={`${color} h-2.5 rounded-full`} style={{ width: `${percentage}%` }}></div>
                            </div>
                            <div className="mt-2 text-xs text-gray-500 flex justify-between">
                                <span>Present: {stat.present}/{stat.total} sessions</span>
                            </div>
                        </div>
                    );
                })}
                {Object.keys(stats.bySubject).length === 0 && (
                    <div className="text-center p-8 bg-gray-50 dark:bg-slate-800/50 rounded-lg text-gray-500 dark:text-gray-400 text-sm">
                        No attendance records found.
                    </div>
                )}
            </div>
        </div>
    );

    const renderGrades = () => (
        <div className="space-y-6">
            {Object.keys(gradesBySubject).length > 0 ? (
                Object.entries(gradesBySubject).map(([subCode, subjectGrades]) => (
                    <div key={subCode} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
                        <div className="bg-gray-50 dark:bg-slate-900 px-4 py-3 border-b border-gray-200 dark:border-slate-700">
                            <h4 className="font-semibold text-gray-700 dark:text-gray-200">{subCode}</h4>
                        </div>
                        <ul className="divide-y divide-gray-200 dark:divide-slate-700">
                            {subjectGrades.map((grade) => (
                                <li key={grade.id} className="px-4 py-3 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{grade.assessments?.title}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {grade.assessments?.type} • Weightage: {grade.assessments?.weightage}%
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                            {grade.score} / {grade.assessments?.total_marks}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {Math.round((grade.score / grade.assessments?.total_marks) * 100)}%
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))
            ) : (
                <div className="text-center p-8 bg-gray-50 dark:bg-slate-800/50 rounded-lg text-gray-500 dark:text-gray-400 text-sm">
                    No grades recorded yet.
                </div>
            )}
        </div>
    );

    if (!student) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Student Profile: ${student.matric_no}`}
            size="lg"
        >
            <div className="flex flex-col h-[70vh]">
                {/* Profile Header */}
                <div className="flex items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg mb-4 border border-indigo-100 dark:border-indigo-800">
                    <div className="flex items-center">
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
                            <BookOpen className="text-indigo-600 dark:text-indigo-300" size={24} />
                        </div>
                        <div className="ml-4">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{student.name}</h3>
                            <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{student.matric_no} • {student.student_group}</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex bg-slate-50 dark:bg-slate-900 p-1 rounded-xl border border-gray-100 dark:border-slate-800 mb-4">
                    <button
                        onClick={() => setActiveTab('summary')}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'summary'
                            ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 dark:text-slate-400'
                            }`}
                    >
                        Summary
                    </button>
                    <button
                        onClick={() => setActiveTab('attendance')}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'attendance'
                            ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 dark:text-slate-400'
                            }`}
                    >
                        Attendance
                    </button>
                    <button
                        onClick={() => setActiveTab('grades')}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'grades'
                            ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 dark:text-slate-400'
                            }`}
                    >
                        Grades
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : error ? (
                        <div className="text-center text-red-500 py-8">{error}</div>
                    ) : (
                        <>
                            {activeTab === 'summary' && renderSummary()}
                            {activeTab === 'attendance' && renderAttendance()}
                            {activeTab === 'grades' && renderGrades()}
                        </>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default StudentDetailsModal;
