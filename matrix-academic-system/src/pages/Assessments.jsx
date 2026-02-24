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
    Save,
    Printer,
    ArrowLeft,
    Download,
    Upload,
    MoreVertical
} from 'lucide-react';
import StudentMarksPrintTemplate from '../components/assessments/StudentMarksPrintTemplate';
import PrintableCLOReport from '../components/assessments/PrintableCLOReport';
import { getProgramName } from '../utils/programUtils';
import * as XLSX from 'xlsx';

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
        date: '',
        clo: 'CLO 1'
    });

    // Grading Mode State
    const [gradingAssessment, setGradingAssessment] = useState(null);
    const [students, setStudents] = useState([]);
    const [grades, setGrades] = useState({}); // { student_id: marks }
    const [gradingLoading, setGradingLoading] = useState(false);


    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // Print State
    const [isPrinting, setIsPrinting] = useState(false);
    const [printData, setPrintData] = useState({ students: [], grades: [] });

    // Action Menu State (Mobile)
    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);

    // CLO Report Print State
    const [isPrintingCLO, setIsPrintingCLO] = useState(false);
    const [cloPrintData, setCloPrintData] = useState({ students: [], grades: [], lecturer: null, groups: '' });

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

            // If lecturer/HOD/HOP, only show subjects they teach
            const isStaff = ['lecturer', 'hod', 'hop'].includes(user.role);
            if (isStaff && user.lecturer_id) {
                // Find subjects linked to this lecturer via timetable
                // We now prioritize timetable as the source of truth
                const { data: timetableData, error: timetableError } = await supabase
                    .from('timetable')
                    .select('subject_id')
                    .eq('lecturer_id', user.lecturer_id);

                if (timetableError) throw timetableError;

                const subjectIds = new Set(
                    (timetableData || []).map(t => t.subject_id).filter(Boolean)
                );

                if (subjectIds.size > 0) {
                    query = query.in('id', Array.from(subjectIds));
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
                date: assessment.date || '',
                clo: assessment.clo || 'CLO 1'
            });
        } else {
            setEditingAssessment(null);
            setFormData({
                subject_id: selectedSubject,
                name: '',
                description: '',
                total_marks: 100,
                weightage: 0,
                date: '',
                clo: 'CLO 1'
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
                ...formData,
                total_marks: parseFloat(formData.total_marks),
                weightage: parseFloat(formData.weightage)
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
            setError(`Failed to save assessment: ${err.message || 'Check your permissions.'}`);
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

    const handlePrint = async () => {
        if (!selectedSubject) return;
        setLoading(true);
        try {
            // 1. Get Student List
            let uniqueStudents = [];
            let classIds = [];

            if (['lecturer', 'hod', 'hop'].includes(user.role) && user.lecturer_id) {
                // For lecturers, find groups from timetable
                const { data: timetableData, error: timetableError } = await supabase
                    .from('timetable')
                    .select('group_names')
                    .eq('lecturer_id', user.lecturer_id)
                    .eq('subject_id', selectedSubject);

                if (timetableError) throw timetableError;

                const myGroups = [...new Set(timetableData?.flatMap(t => t.group_names || []).filter(Boolean))];

                if (myGroups.length > 0) {
                    const { data: studentData, error: studentError } = await supabase
                        .from('students')
                        .select('id, name, matric_no, student_group')
                        .in('student_group', myGroups)
                        .eq('faculty_id', user.faculty_id);

                    if (studentError) throw studentError;
                    uniqueStudents = (studentData || []).sort((a, b) => a.matric_no.localeCompare(b.matric_no));
                }
            } else {
                // For admins, use classes -> enrollments
                const { data: classesData, error: classesError } = await supabase
                    .from('classes')
                    .select('id')
                    .eq('subject_id', selectedSubject);

                if (classesError) throw classesError;
                classIds = classesData.map(c => c.id);

                if (classIds.length > 0) {
                    const { data: enrollmentsData, error: enrollmentsError } = await supabase
                        .from('enrollments')
                        .select(`
                            student_id,
                            students (id, name, matric_no, student_group)
                        `)
                        .in('class_id', classIds);

                    if (enrollmentsError) throw enrollmentsError;

                    const uniqueStudentsMap = new Map();
                    enrollmentsData.forEach(e => {
                        if (e.students) uniqueStudentsMap.set(e.students.id, e.students);
                    });
                    uniqueStudents = Array.from(uniqueStudentsMap.values()).sort((a, b) => a.matric_no.localeCompare(b.matric_no));
                }
            }

            // 2. Fetch Lecturer Name specifically for this subject
            let currentLecturer = user;
            const { data: timetableLecturers, error: lecturerError } = await supabase
                .from('timetable')
                .select(`
                    lecturer_id,
                    lecturers (id, name, full_name)
                `)
                .eq('subject_id', selectedSubject)
                .limit(1);

            if (!lecturerError && timetableLecturers?.length > 0 && timetableLecturers[0].lecturers) {
                currentLecturer = {
                    ...user,
                    ...timetableLecturers[0].lecturers
                };
            }

            // 3. Get All Grades for this subject (all assessments)
            // fetch grades where assessment_id is in current 'assessments' list
            const assessmentIds = assessments.map(a => a.id);
            let allGrades = [];

            if (assessmentIds.length > 0) {
                const { data: gradesData, error: gradesError } = await supabase
                    .from('grades')
                    .select('*')
                    .in('assessment_id', assessmentIds);

                if (gradesError) throw gradesError;
                allGrades = gradesData;
            }

            console.log("Print Data prepared:", {
                classIds,
                studentCount: uniqueStudents.length,
                gradeCount: allGrades.length,
                lecturerFound: !!timetableLecturers?.[0]
            });

            if (uniqueStudents.length === 0) {
                alert("No students enrolled in this subject's classes.");
                setLoading(false);
                return;
            }

            setPrintData({
                students: uniqueStudents,
                grades: allGrades,
                lecturer: currentLecturer
            });
            setIsPrinting(true);

        } catch (err) {
            console.error("Error preparing print data:", err);
            setError("Failed to prepare print data.");
        } finally {
            setLoading(false);
        }
    };

    const handlePrintCLO = async () => {
        if (!selectedSubject) return;
        setLoading(true);
        try {
            let uniqueStudents = [];
            let groupLabel = '';

            if (['lecturer', 'hod', 'hop'].includes(user.role) && user.lecturer_id) {
                const { data: timetableData, error: timetableError } = await supabase
                    .from('timetable')
                    .select('group_names')
                    .eq('lecturer_id', user.lecturer_id)
                    .eq('subject_id', selectedSubject);
                if (timetableError) throw timetableError;
                const myGroups = [...new Set(timetableData?.flatMap(t => t.group_names || []).filter(Boolean))];
                groupLabel = myGroups.join(', ');
                if (myGroups.length > 0) {
                    const { data: studentData, error: studentError } = await supabase
                        .from('students')
                        .select('id, name, matric_no, student_group')
                        .in('student_group', myGroups)
                        .eq('faculty_id', user.faculty_id);
                    if (studentError) throw studentError;
                    uniqueStudents = (studentData || []).sort((a, b) => a.matric_no.localeCompare(b.matric_no));
                }
            } else {
                const { data: classesData } = await supabase.from('classes').select('id').eq('subject_id', selectedSubject);
                const classIds = (classesData || []).map(c => c.id);
                if (classIds.length > 0) {
                    const { data: enrollmentsData } = await supabase
                        .from('enrollments')
                        .select('student_id, students (id, name, matric_no, student_group)')
                        .in('class_id', classIds);
                    const map = new Map();
                    (enrollmentsData || []).forEach(e => { if (e.students) map.set(e.students.id, e.students); });
                    uniqueStudents = Array.from(map.values()).sort((a, b) => a.matric_no.localeCompare(b.matric_no));
                    const groups = [...new Set(uniqueStudents.map(s => s.student_group).filter(Boolean))];
                    groupLabel = groups.join(', ');
                }
            }

            // Fetch lecturer name - Prioritize assigned lecturer for the subject
            let currentLecturer = user;
            const { data: timetableLecturers } = await supabase
                .from('timetable')
                .select('lecturer_id, lecturers (id, name, full_name)')
                .eq('subject_id', selectedSubject)
                .limit(1);

            if (timetableLecturers?.[0]?.lecturers) {
                currentLecturer = { ...user, ...timetableLecturers[0].lecturers };
            } else {
                // Fallback to workload table if timetable is empty
                const { data: workloadLecturers } = await supabase
                    .from('workload')
                    .select('lecturer_id, lecturers (id, name, full_name)')
                    .eq('subject_id', selectedSubject)
                    .limit(1);

                if (workloadLecturers?.[0]?.lecturers) {
                    currentLecturer = { ...user, ...workloadLecturers[0].lecturers };
                } else if (!['lecturer', 'hod', 'hop'].includes(user.role)) {
                    // For pure admins or others, if no lecturer assigned, show fallback
                    currentLecturer = { ...user, name: '-', full_name: '-' };
                }
            }

            // Fetch all grades for this subject's assessments
            const assessmentIds = assessments.map(a => a.id);
            let allGrades = [];
            if (assessmentIds.length > 0) {
                const { data: gradesData, error: gradesError } = await supabase
                    .from('grades')
                    .select('*')
                    .in('assessment_id', assessmentIds);
                if (gradesError) throw gradesError;
                allGrades = gradesData || [];
            }

            if (uniqueStudents.length === 0) {
                alert('No students found for this subject.');
                return;
            }

            // Derive program from students or user
            let resolvedProgram = '';
            if (uniqueStudents.length > 0) {
                const firstStudentGroup = uniqueStudents[0].student_group;
                if (firstStudentGroup) {
                    const code = firstStudentGroup.split(' ')[0];
                    const { PROGRAMS } = await import('../utils/programUtils');
                    const name = PROGRAMS[code];
                    resolvedProgram = name ? `${code} - ${name}` : firstStudentGroup;
                }
            }
            if (!resolvedProgram) {
                resolvedProgram = user?.department || user?.department_code || '';
            }

            setCloPrintData({
                students: uniqueStudents,
                grades: allGrades,
                lecturer: currentLecturer,
                groups: groupLabel,
                program: resolvedProgram
            });
            setIsPrintingCLO(true);
        } catch (err) {
            console.error('Error preparing CLO report data:', err);
            setError('Failed to prepare CLO report data.');
        } finally {
            setLoading(false);
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
            let uniqueStudents = [];
            let classIds = [];

            if (['lecturer', 'hod', 'hop'].includes(user.role) && user.lecturer_id) {
                // Find groups from timetable
                const { data: timetableData, error: timetableError } = await supabase
                    .from('timetable')
                    .select('group_names')
                    .eq('lecturer_id', user.lecturer_id)
                    .eq('subject_id', selectedSubject);

                if (timetableError) throw timetableError;

                const myGroups = [...new Set(timetableData?.flatMap(t => t.group_names || []).filter(Boolean))];

                if (myGroups.length > 0) {
                    const { data: studentData, error: studentError } = await supabase
                        .from('students')
                        .select('id, name, matric_no, student_group')
                        .in('student_group', myGroups)
                        .eq('faculty_id', user.faculty_id);

                    if (studentError) throw studentError;
                    uniqueStudents = (studentData || []).sort((a, b) => a.matric_no.localeCompare(b.matric_no));
                }
            } else {
                // Admin logic: get students via classes
                const { data: classesData, error: classesError } = await supabase
                    .from('classes')
                    .select('id')
                    .eq('subject_id', selectedSubject);

                if (classesError) throw classesError;
                classIds = classesData.map(c => c.id);

                if (classIds.length > 0) {
                    const { data: enrollmentsData, error: enrollmentsError } = await supabase
                        .from('enrollments')
                        .select(`
                            student_id,
                            students (id, name, matric_no, student_group)
                        `)
                        .in('class_id', classIds);

                    if (enrollmentsError) throw enrollmentsError;

                    const uniqueStudentsMap = new Map();
                    enrollmentsData.forEach(e => {
                        if (e.students) uniqueStudentsMap.set(e.students.id, e.students);
                    });
                    uniqueStudents = Array.from(uniqueStudentsMap.values()).sort((a, b) => a.matric_no.localeCompare(b.matric_no));
                }
            }

            if (uniqueStudents.length === 0) {
                setError("No students found for this subject/lecturer.");
                setGradingLoading(false);
                return;
            }

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


    // --- Excel Functions ---
    const handleDownloadTemplate = async () => {
        if (!selectedSubject) return;
        setLoading(true);
        try {
            // 1. Get Students
            let uniqueStudents = [];
            let classIds = [];
            // Reuse logic from handlePrint/startGrading to get students
            if (['lecturer', 'hod', 'hop'].includes(user.role) && user.lecturer_id) {
                const { data: timetableData } = await supabase
                    .from('timetable')
                    .select('group_names')
                    .eq('lecturer_id', user.lecturer_id)
                    .eq('subject_id', selectedSubject);
                const myGroups = [...new Set(timetableData?.flatMap(t => t.group_names || []).filter(Boolean))];
                if (myGroups.length > 0) {
                    const { data: studentData } = await supabase
                        .from('students')
                        .select('id, name, matric_no, student_group')
                        .in('student_group', myGroups)
                        .eq('faculty_id', user.faculty_id);
                    uniqueStudents = (studentData || []).sort((a, b) => a.matric_no.localeCompare(b.matric_no));
                }
            } else {
                const { data: classesData } = await supabase.from('classes').select('id').eq('subject_id', selectedSubject);
                classIds = classesData?.map(c => c.id) || [];
                if (classIds.length > 0) {
                    const { data: enrollmentsData } = await supabase
                        .from('enrollments')
                        .select(`student_id, students (id, name, matric_no, student_group)`)
                        .in('class_id', classIds);
                    const uniqueStudentsMap = new Map();
                    enrollmentsData?.forEach(e => { if (e.students) uniqueStudentsMap.set(e.students.id, e.students); });
                    uniqueStudents = Array.from(uniqueStudentsMap.values()).sort((a, b) => a.matric_no.localeCompare(b.matric_no));
                }
            }

            if (uniqueStudents.length === 0) {
                alert("No students found.");
                setLoading(false);
                return;
            }

            // 2. Prepare Data for Excel
            // Headers: No, Name, Matric No, Group, [Assessment Names...]
            const assessmentHeaders = assessments.map(a => a.name);
            const headers = ['No', 'Student Name', 'Matric No', 'Student Group', ...assessmentHeaders];

            // 3. Prepare Rows
            // Fetch existing grades first to pre-fill?
            // "add 'download excel template'... basically you download a file with a table list of student names... and assessments"
            // It implies a template to key in data. Pre-filling current grades is helpful.
            const assessmentIds = assessments.map(a => a.id);
            let existingGrades = [];
            if (assessmentIds.length > 0) {
                const { data: gradesData } = await supabase.from('grades').select('*').in('assessment_id', assessmentIds);
                existingGrades = gradesData || [];
            }

            const rows = uniqueStudents.map((student, index) => {
                const row = {
                    'No': index + 1,
                    'Student Name': student.name,
                    'Matric No': student.matric_no,
                    'Student Group': student.student_group
                };

                assessments.forEach(assessment => {
                    const grade = existingGrades.find(g => g.student_id === student.id && g.assessment_id === assessment.id);
                    row[assessment.name] = grade ? grade.marks_obtained : '';
                });

                return row;
            });

            // 4. Create Workbook
            const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });

            // Auto-width for columns
            const colWidths = headers.map(h => ({ wch: h.length + 5 })); // items not available here easily, naive width
            // Adjust specific columns
            colWidths[1] = { wch: 40 }; // Name
            colWidths[2] = { wch: 15 }; // Matric
            worksheet['!cols'] = colWidths;

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Marks");

            // 5. Download
            const subjectCode = subjects.find(s => s.id === selectedSubject)?.code || 'Subject';
            XLSX.writeFile(workbook, `${subjectCode}_Grades_Template.xlsx`);

        } catch (err) {
            console.error("Error downloading template:", err);
            setError("Failed to download template.");
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            if (jsonData.length === 0) {
                alert("File appears to be empty.");
                setLoading(false);
                return;
            }

            // Map student matric no to ID for easier lookup
            // We need to fetch students first to get their IDs based on Matric No
            // Assuming current 'assessments' state is up to date valid columns

            // 1. Get all students to map Matric No -> ID
            // Using same fetch logic as download to ensure we match correctly
            // Or just fetch ALL students in faculty to be safe? 
            // Better to stick to subject scope for safety.
            let uniqueStudents = [];
            // Re-fetch students (simplified duplicate logic for now due to scope)
            // ... (Copying student fetch logic or extracting it would be better pattern, but executing inline for now)
            if (['lecturer', 'hod', 'hop'].includes(user.role) && user.lecturer_id) {
                const { data: timetableData } = await supabase
                    .from('timetable')
                    .select('group_names')
                    .eq('lecturer_id', user.lecturer_id)
                    .eq('subject_id', selectedSubject);
                const myGroups = [...new Set(timetableData?.flatMap(t => t.group_names || []).filter(Boolean))];
                if (myGroups.length > 0) {
                    const { data: studentData } = await supabase
                        .from('students')
                        .select('id, matric_no')
                        .in('student_group', myGroups)
                        .eq('faculty_id', user.faculty_id);
                    uniqueStudents = studentData || [];
                }
            } else {
                const { data: classesData } = await supabase.from('classes').select('id').eq('subject_id', selectedSubject);
                const classIds = classesData?.map(c => c.id) || [];
                if (classIds.length > 0) {
                    const { data: enrollmentsData } = await supabase
                        .from('enrollments')
                        .select(`student_id, students (id, matric_no)`)
                        .in('class_id', classIds);
                    enrollmentsData?.forEach(e => { if (e.students) uniqueStudents.push(e.students); });
                }
            }

            const studentMap = {}; // Matric -> ID
            uniqueStudents.forEach(s => studentMap[s.matric_no] = s.id);

            // 2. Process Rows
            let updateCount = 0;
            const upsertData = [];

            jsonData.forEach(row => {
                const matricNo = row['Matric No'];
                if (!matricNo) return;

                const studentId = studentMap[matricNo];
                if (!studentId) return; // Student not found in this subject scope

                // Check each assessment column
                assessments.forEach(assessment => {
                    const marks = row[assessment.name];
                    // Only update if marks are present (0 is valid)
                    if (marks !== undefined && marks !== '' && marks !== null) {
                        upsertData.push({
                            faculty_id: user.faculty_id,
                            assessment_id: assessment.id,
                            student_id: studentId,
                            marks_obtained: parseFloat(marks)
                        });
                    }
                });
            });

            if (upsertData.length > 0) {
                const { error } = await supabase
                    .from('grades')
                    .upsert(upsertData, { onConflict: 'assessment_id, student_id' });

                if (error) throw error;
                updateCount = upsertData.length;

                // Audit Log
                import('../utils/auditLogger').then(({ logAuditAction }) => {
                    logAuditAction(user, 'GRADE_BULK_UPLOAD', {
                        subject_id: selectedSubject,
                        records_updated: updateCount
                    });
                });

                setSuccessMessage(`Successfully uploaded marks for ${upsertData.length} records.`);
                setTimeout(() => setSuccessMessage(null), 5000);
                // Refresh
                fetchAssessments(); // Will trigger re-fetch of grades if we were viewing them, but strictly we aren't viewing grades directly on main page
            } else {
                setSuccessMessage("No valid marks change detected.");
            }

        } catch (err) {
            console.error("Error uploading file:", err);
            setError("Failed to process Excel file. Please check format.");
        } finally {
            setLoading(false);
            e.target.value = null; // Reset input
        }
    };


    if (isPrintingCLO) {
        const subjectObj = subjects.find(s => s.id === selectedSubject);
        return (
            <div className="bg-white min-h-screen">
                <div className="bg-gray-100 p-4 flex justify-between items-center print:hidden sticky top-0 z-50">
                    <button
                        onClick={() => setIsPrintingCLO(false)}
                        className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50 text-sm font-bold uppercase"
                    >
                        <ArrowLeft size={16} className="mr-2" /> Back
                    </button>
                    <div className="font-bold text-lg">CLO Report Preview — {subjectObj?.code}</div>
                    <button
                        onClick={() => window.print()}
                        className="flex items-center px-4 py-2 bg-primary text-white rounded shadow-sm hover:bg-primary/90 text-sm font-bold uppercase"
                    >
                        <Printer size={16} className="mr-2" /> Print
                    </button>
                </div>
                <PrintableCLOReport
                    subject={subjectObj}
                    assessments={assessments}
                    students={cloPrintData.students}
                    grades={cloPrintData.grades}
                    lecturer={cloPrintData.lecturer}
                    semesterSession={user?.semester_name || ''}
                    semester={cloPrintData.groups}
                    program={cloPrintData.program || user?.department || ''}
                    facultyName={user?.faculty_name || 'UNIVERSITI ISLAM SELANGOR'}
                    facultyLogo={user?.faculty_logo}
                />
            </div>
        );
    }

    if (isPrinting) {
        return (
            <div className="bg-white min-h-screen">
                <div className="bg-gray-100 p-4 flex justify-between items-center print:hidden sticky top-0 z-50">
                    <button
                        onClick={() => setIsPrinting(false)}
                        className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50 text-sm font-bold uppercase"
                    >
                        <ArrowLeft size={16} className="mr-2" /> Back
                    </button>
                    <div className="font-bold text-lg">Print Preview</div>
                    <button
                        onClick={() => window.print()}
                        className="flex items-center px-4 py-2 bg-primary text-white rounded shadow-sm hover:bg-primary/90 text-sm font-bold uppercase"
                    >
                        <Printer size={16} className="mr-2" /> Print
                    </button>
                </div>
                <StudentMarksPrintTemplate
                    subject={subjects.find(s => s.id === selectedSubject)}
                    assessments={assessments}
                    students={printData.students}
                    grades={printData.grades}
                    lecturer={printData.lecturer}
                    semesterSession={user?.semester_name}
                />
            </div>
        );
    }

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

            {selectedSubject && (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex gap-2">
                        {['CLO 1', 'CLO 2', 'CLO 3'].map(clo => {
                            const totalWeightage = assessments
                                .filter(a => a.clo === clo)
                                .reduce((sum, a) => sum + (parseFloat(a.weightage) || 0), 0);

                            return (
                                <div key={clo} className="px-3 py-1.5 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{clo}:</span>
                                    <span className={`text-xs font-bold ${totalWeightage > 0 ? 'text-primary' : 'text-gray-500'}`}>
                                        {totalWeightage}%
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="relative">
                        {/* Mobile Toggle Button */}
                        <button
                            onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
                            className="md:hidden flex items-center p-2 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
                        >
                            <MoreVertical size={20} />
                        </button>

                        {/* Action Buttons Container */}
                        <div className={`
                            absolute right-0 top-full mt-2 p-2 bg-white dark:bg-slate-800 md:bg-transparent border border-gray-100 dark:border-slate-700 md:border-none rounded-xl shadow-xl md:shadow-none z-50 flex-col gap-2 min-w-[160px]
                            ${isActionMenuOpen ? 'flex' : 'hidden'}
                            md:relative md:top-auto md:right-auto md:mt-0 md:p-0 md:flex md:flex-row md:items-center md:min-w-0
                        `}>
                            <input
                                type="file"
                                accept=".xlsx, .xls"
                                onChange={handleFileUpload}
                                className="hidden"
                                id="upload-excel"
                            />
                            <button
                                onClick={() => { handleDownloadTemplate(); setIsActionMenuOpen(false); }}
                                disabled={loading}
                                className="flex w-full md:w-auto items-center px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all text-xs font-bold uppercase tracking-widest disabled:opacity-50"
                            >
                                <Download size={16} className="mr-2" />
                                Template
                            </button>
                            <label
                                htmlFor="upload-excel"
                                className={`flex w-full md:w-auto items-center px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/30 transition-all text-xs font-bold uppercase tracking-widest cursor-pointer ${loading ? 'opacity-50 pointer-events-none' : ''}`}
                                onClick={() => setIsActionMenuOpen(false)}
                            >
                                <Upload size={16} className="mr-2" />
                                Upload
                            </label>
                            <button
                                onClick={() => { handlePrint(); setIsActionMenuOpen(false); }}
                                disabled={loading}
                                className="flex w-full md:w-auto items-center px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-600 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-all text-xs font-bold uppercase tracking-widest disabled:opacity-50"
                            >
                                <Printer size={16} className="mr-2" />
                                Print Marks
                            </button>
                            <button
                                onClick={() => { handlePrintCLO(); setIsActionMenuOpen(false); }}
                                disabled={loading}
                                className="flex w-full md:w-auto items-center px-4 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-all text-xs font-bold uppercase tracking-widest disabled:opacity-50"
                            >
                                <FileText size={16} className="mr-2" />
                                CLO Report
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">{assessment.name}</h3>
                                        <div className="flex gap-2 mt-1">
                                            <span className="bg-pastel-indigo text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-widest">
                                                {assessment.weightage}%
                                            </span>
                                            {assessment.clo && (
                                                <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-widest">
                                                    {assessment.clo}
                                                </span>
                                            )}
                                        </div>
                                    </div>
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
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">CLO (Course Learning Outcome)</label>
                        <select
                            required
                            className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 shadow-sm focus:border-primary focus:ring-primary sm:text-sm dark:bg-slate-800 dark:text-white px-3 py-2 border transition-all"
                            value={formData.clo}
                            onChange={(e) => setFormData({ ...formData, clo: e.target.value })}
                        >
                            <option value="CLO 1">CLO 1</option>
                            <option value="CLO 2">CLO 2</option>
                            <option value="CLO 3">CLO 3</option>
                        </select>
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
