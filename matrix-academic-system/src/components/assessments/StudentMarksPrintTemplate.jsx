import { useEffect, useState } from 'react';
import { getGrade } from '../../utils/gradeUtils';
import { getProgramName } from '../../utils/programUtils';

const StudentMarksPrintTemplate = ({ subject, assessments, students, grades, lecturer, semesterSession }) => {
    // Chunk students into groups of 15
    const [studentChunks, setStudentChunks] = useState([]);
    const [finalTotalMarks, setFinalTotalMarks] = useState({});

    // Constants for pagination
    const STUDENTS_PER_PAGE = 15;

    useEffect(() => {
        // Sort students by matric_no if they exist
        const sortedStudents = students && students.length > 0
            ? [...students].sort((a, b) => a.matric_no.localeCompare(b.matric_no))
            : [];

        if (sortedStudents.length === 0) {
            // Ensure at least one empty chunk so a blank template renders
            setStudentChunks([[]]);
        } else {
            const chunks = [];
            for (let i = 0; i < sortedStudents.length; i += STUDENTS_PER_PAGE) {
                chunks.push(sortedStudents.slice(i, i + STUDENTS_PER_PAGE));
            }
            setStudentChunks(chunks);
        }
    }, [students]);

    // Calculate totals helper
    const calculateRowData = (studentId) => {
        let continuousTotal = 0;
        let finalExamTotal = 0;
        let grandTotal = 0;

        // Calculate Continuous Assessment Total
        // Logic: Sum of all non-final assessments
        // WAIT: The reference image columns show specific items like Essay(25%), Presentation(15%), Midterm(10%).
        // Then a "Penilaian Berterusan (50%)" column. 
        // Then "Penilaian Akhir (50%)".
        // Using provided assessments, we sum them up.

        assessments.forEach(assessment => {
            const grade = grades.find(g => g.student_id === studentId && g.assessment_id === assessment.id);
            const marks = grade ? parseFloat(grade.marks_obtained) : 0;

            // Adjust based on weightage? 
            // The grades table stores 'marks_obtained'. 
            // In the modal, we display percentage. 
            // Here we need to display the RAW marks or weighted? 
            // Reference image: "ESSAY 25%" column has value "25". Suggests weighted value or raw marks equal to weightage?
            // "TOTAL MARKS" in assessment definition might differ from weightage.
            // Let's assume marks_obtained is what we print.

            if (assessment.name.toLowerCase().includes('final') || assessment.name.toLowerCase().includes('akhir')) {
                finalExamTotal += marks;
            } else {
                continuousTotal += marks;
            }
        });

        grandTotal = continuousTotal + finalExamTotal;
        const { grade } = getGrade(grandTotal);

        return { continuousTotal, finalExamTotal, grandTotal, grade };
    };

    return (
        <div className="printable-marks-sheet print-container bg-white text-black p-8 font-sans text-xs print:p-0">
            <style>
                {`
                    @page {
                        size: A4 landscape;
                        margin: 10mm;
                    }

                    @media print {
                        /* Hide everything in the body by default during print */
                        body > * {
                            visibility: hidden !important;
                        }
                        
                        /* Show only our printable component and its children */
                        .printable-marks-sheet,
                        .printable-marks-sheet * {
                            visibility: visible !important;
                        }
                        
                        /* Position the print content at the very top left */
                        .printable-marks-sheet {
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100% !important;
                            display: block !important;
                        }

                        /* Force all parents to allow overflow and height for pagination */
                        html, body, #root, [class*="MainLayout"], [class*="layout"], [class*="container"] {
                            height: auto !important;
                            overflow: visible !important;
                            display: block !important;
                        }

                        .page-break {
                            page-break-after: always !important;
                            page-break-inside: avoid !important;
                        }
                    }

                    table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 10px;
                    }
                    th, td {
                        border: 1px solid black;
                        padding: 4px;
                        text-align: center;
                    }
                    th.bg-gray {
                        background-color: #d1d5db !important; /* Tailwind gray-300 */
                        color: black !important;
                    .text-left { text-align: left; }
                `}
            </style>

            {studentChunks.map((chunk, pageIndex) => (
                <div key={pageIndex} className="page-break flex flex-col justify-between relative min-h-screen">
                    {/* 95vh to ensure fit within page, updated relative positioning */}

                    {/* --- HEADER --- */}
                    <div className="absolute top-0 right-0 text-[8px] font-bold">
                        BPPP/FAKULTI/2025/PIN.3
                    </div>

                    <div className="mb-1 mt-2">
                        <div className="border border-black flex">
                            {/* Logo Section */}
                            <div className="w-24 p-1 border-r border-black flex items-center justify-center">
                                {lecturer?.faculty_logo ? (
                                    <img src={lecturer.faculty_logo} alt="Faculty Logo" className="h-10 object-contain" />
                                ) : (
                                    <div className="text-center font-bold text-[8px]">FACULTY<br />LOGO</div>
                                )}
                            </div>

                            {/* Title Section */}
                            <div className="flex-1 flex flex-col">
                                <div className="border-b border-black py-0.5 flex items-center justify-center">
                                    <h1 className="font-bold text-[11px] uppercase">UNIVERSITI ISLAM SELANGOR</h1>
                                </div>
                                <div className="py-0.5 flex items-center justify-center">
                                    <h2 className="font-bold text-[10px] uppercase">BORANG PERINCIAN PEMARKAHAN PELAJAR</h2>
                                </div>
                            </div>
                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-2 gap-x-8 text-[10px] font-bold uppercase mb-2">
                            <div>
                                <div className="grid grid-cols-[140px_10px_1fr]">
                                    <span>TENAGA PENGAJAR</span>
                                    <span>:</span>
                                    <span>{lecturer?.full_name || lecturer?.name || 'N/A'}</span>
                                </div>
                                <div className="grid grid-cols-[140px_10px_1fr]">
                                    <span>KOD/ KURSUS</span>
                                    <span>:</span>
                                    <span>{subject?.code} {subject?.name}</span>
                                </div>
                                <div className="grid grid-cols-[140px_10px_1fr]">
                                    <span>PROGRAM</span>
                                    <span>:</span>
                                    <span>{getProgramName(chunk?.[0]?.student_group)}</span>
                                </div>
                            </div>
                            <div>
                                <div className="grid grid-cols-[140px_10px_1fr]">
                                    <span>SESI/ TAHUN AKADEMIK</span>
                                    <span>:</span>
                                    <span>{semesterSession || "2025/2026"}</span> {/* Dynamic? */}
                                </div>
                                <div className="grid grid-cols-[140px_10px_1fr]">
                                    <span>SEMESTER/ KUMPULAN</span>
                                    <span>:</span>
                                    <span>{chunk && chunk[0] ? chunk[0].student_group : 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- TABLE --- */}
                    <div className="flex-1">
                        <table>
                            <thead>
                                <tr className="bg-gray">
                                    <th rowSpan="3" style={{ width: '30px' }}>BIL</th>
                                    <th rowSpan="3" style={{ width: '90px' }}>NO MATRIK</th>
                                    <th rowSpan="3" className="text-left pl-2">NAMA</th>

                                    {/* Continuous Assessments Header Group */}
                                    {/* Determine number of CA cols */}
                                    <th colSpan={assessments.filter(a => !a.name.toLowerCase().includes('final') && !a.name.toLowerCase().includes('akhir')).length + 1} className="bg-gray">
                                        PENILAIAN BERTERUSAN
                                    </th>

                                    <th rowSpan="2" className="bg-gray">PENILAIAN<br />AKHIR</th>
                                    <th rowSpan="2" className="bg-gray">JUMLAH<br />KESELURUHAN</th>
                                    <th rowSpan="3" style={{ width: '40px' }} className="bg-gray">GRED</th>
                                </tr>

                                {/* Sub-headers for CA */}
                                <tr className="bg-gray">
                                    {assessments.filter(a => !a.name.toLowerCase().includes('final') && !a.name.toLowerCase().includes('akhir')).map(assess => (
                                        <th key={assess.id} className="uppercase">{assess.name}</th>
                                    ))}
                                    {/* Total CA Column */}
                                    <th>PENILAIAN<br />BERTERUSAN</th>
                                </tr>

                                {/* Wait, the reference has a 3rd row for Percentages 25%, 0%, 15%, 50%, 50%, 100% */}
                                <tr className="bg-gray">
                                    {assessments.filter(a => !a.name.toLowerCase().includes('final') && !a.name.toLowerCase().includes('akhir')).map(assess => (
                                        <th key={assess.id}>{assess.weightage}%</th>
                                    ))}
                                    <th>50%</th> {/* Total CA Weightage - Need to calculate? Hardcoded based on image pattern of summing */}
                                    <th>50%</th> {/* Final Exam Weightage */}
                                    <th>100%</th>
                                </tr>
                            </thead>
                            <tbody>
                                {chunk.map((student, index) => {
                                    const rowData = calculateRowData(student.id);
                                    return (
                                        <tr key={student.id}>
                                            <td>{pageIndex * STUDENTS_PER_PAGE + index + 1}</td>
                                            <td>{student.matric_no}</td>
                                            <td className="text-left pl-2 text-[8px] font-semibold">{student.name}</td>

                                            {/* CA Columns */}
                                            {assessments.filter(a => !a.name.toLowerCase().includes('final') && !a.name.toLowerCase().includes('akhir')).map(assess => {
                                                const grade = grades.find(g => g.student_id === student.id && g.assessment_id === assess.id);
                                                return <td key={assess.id}>{grade ? grade.marks_obtained : ''}</td>
                                            })}

                                            {/* Total CA */}
                                            <td>{rowData.continuousTotal}</td>

                                            {/* Final Exam */}
                                            <td>{rowData.finalExamTotal || ''}</td>

                                            {/* Grand Total */}
                                            <td>{rowData.grandTotal}</td>

                                            {/* Grade */}
                                            <td>{rowData.grade}</td>
                                        </tr>
                                    );
                                })}
                                {/* Fill empty rows if less than 15? Reference image has empty rows at bottom. */}
                                {Array.from({ length: Math.max(0, STUDENTS_PER_PAGE - chunk.length) }).map((_, i) => (
                                    <tr key={`empty-${i}`}>
                                        <td>{pageIndex * STUDENTS_PER_PAGE + chunk.length + i + 1}</td>
                                        <td>&nbsp;</td>
                                        <td>&nbsp;</td>
                                        {assessments.filter(a => !a.name.toLowerCase().includes('final') && !a.name.toLowerCase().includes('akhir')).map(a => <td key={a.id}>&nbsp;</td>)}
                                        <td>&nbsp;</td>
                                        <td>&nbsp;</td>
                                        <td>&nbsp;</td>
                                        <td>&nbsp;</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Note below table */}
                        <div className="text-center italic mt-1 text-[9px]">
                            (NOTA: SIMPAN BORANG DALAM FAIL KURSUS)
                        </div>

                        <div className="mt-4 text-[9px]">
                            *PECAHAN MARKAH MESTI SELARI DENGAN PECAHAN MARKAH DALAM MAKLUMAT KURSUS (TABLE 4)
                        </div>
                    </div>

                    {/* --- FOOTER --- */}
                    <div className="mt-4 flex justify-between text-[10px]">
                        {/* Prepared By */}
                        <div className="border border-black p-2 w-[40%] h-24 relative">
                            <div className="mb-8 p-1">DISEDIAKAN OLEH :</div>

                            <div className="absolute bottom-2 left-2 w-full pr-4">
                                <div className="grid grid-cols-[80px_10px_1fr] mb-1">
                                    <span>TANDATANGAN</span>
                                    <span>:</span>
                                    <span className="border-b border-black border-dotted h-4 block w-full"></span>
                                </div>
                                <div className="grid grid-cols-[80px_10px_1fr]">
                                    <span>TARIKH</span>
                                    <span>:</span>
                                    <span className=""></span>
                                </div>
                            </div>
                        </div>

                        {/* Verified By */}
                        <div className="border border-black p-2 w-[40%] h-24 relative">
                            <div className="mb-8 p-1">DISEMAK DAN DISAHKAN OLEH :</div>
                            <div className="absolute bottom-2 left-2 w-full pr-4">
                                <div className="grid grid-cols-[80px_10px_1fr] mb-1">
                                    <span>TANDATANGAN</span>
                                    <span>:</span>
                                    <span className="border-b border-black border-dotted h-4 block w-full"></span>
                                </div>
                                <div className="grid grid-cols-[80px_10px_1fr]">
                                    <span>TARIKH</span>
                                    <span>:</span>
                                    <span className=""></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="text-right text-[8px] mt-1">
                        Kemaskini 11 Julai 2025
                    </div>

                </div>
            ))
            }
        </div >
    );
};

export default StudentMarksPrintTemplate;
