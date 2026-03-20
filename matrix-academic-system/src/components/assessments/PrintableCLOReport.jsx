import { Fragment } from 'react';

/**
 * PrintableCLOReport.jsx
 * CLO (Course Learning Outcome) Accumulation Report
 * "ANALISA PENCAPAIAN SETIAP CLO & PLO PELAJAR"
 */

const CLO_COLORS = {
    'CLO 1': { header: '#4472C4', light: '#BDD7EE', plo: '(PLO 1)' },
    'CLO 2': { header: '#70AD47', light: '#E2EFDA', plo: '(PLO 4)' },
    'CLO 3': { header: '#FFC000', light: '#FFF2CC', plo: '(PLO 11)' },
};

const PASS_THRESHOLD = 40;

const PrintableCLOReport = ({
    subject,
    assessments = [],
    students = [],
    grades = [],
    lecturer,
    semesterSession = '',
    semester = '',
    program = '',
    facultyName = 'UNIVERSITI ISLAM SELANGOR',
    facultyLogo = '', // Logo path
}) => {
    const sortedStudents = [...students].sort((a, b) =>
        (a.matric_no || '').localeCompare(b.matric_no || '')
    );

    const isFinalExam = (a) =>
        a.name.toLowerCase().includes('final') ||
        a.name.toLowerCase().includes('peperiksaan') ||
        a.name.toLowerCase().includes('akhir') ||
        (a.description || '').toLowerCase().includes('final');

    const continuousAssessments = assessments.filter(a => !isFinalExam(a));
    const finalAssessments = assessments.filter(a => isFinalExam(a));

    const cloOrder = ['CLO 1', 'CLO 2', 'CLO 3'];
    const activeCLOs = cloOrder.filter(clo => continuousAssessments.some(a => a.clo === clo));
    const finalCLOs = cloOrder.filter(clo => finalAssessments.some(a => a.clo === clo));
    const allActiveCLOs = cloOrder.filter(clo => assessments.some(a => a.clo === clo));

    const assessmentsByCLO = {};
    activeCLOs.forEach(clo => {
        assessmentsByCLO[clo] = continuousAssessments.filter(a => a.clo === clo);
    });

    const getMarks = (studentId, assessmentId) => {
        const grade = grades.find(g => g.student_id === studentId && g.assessment_id === assessmentId);
        return grade ? parseFloat(grade.marks_obtained) || 0 : 0;
    };

    const getCLOMarks = (studentId, clo) =>
        continuousAssessments.filter(a => a.clo === clo).reduce((sum, a) => sum + getMarks(studentId, a.id), 0);

    const getCLOWeightage = (clo) =>
        continuousAssessments.filter(a => a.clo === clo).reduce((sum, a) => sum + parseFloat(a.weightage || 0), 0);

    const getFinalCLOMarks = (studentId, clo) =>
        finalAssessments.filter(a => a.clo === clo).reduce((sum, a) => sum + getMarks(studentId, a.id), 0);

    const getFinalCLOWeightage = (clo) =>
        finalAssessments.filter(a => a.clo === clo).reduce((sum, a) => sum + parseFloat(a.weightage || 0), 0);

    const getGrandTotal = (studentId) => {
        const contTotal = continuousAssessments.reduce((sum, a) => sum + getMarks(studentId, a.id), 0);
        const finalTotal = finalAssessments.reduce((sum, a) => sum + getMarks(studentId, a.id), 0);
        return contTotal + finalTotal;
    };

    const getCLOPercent = (studentId, clo) => {
        const cloAssessments = assessments.filter(a => a.clo === clo);
        const totalPossible = cloAssessments.reduce((s, a) => s + parseFloat(a.total_marks || 0), 0);
        if (!totalPossible) return 0;
        const obtained = cloAssessments.reduce((s, a) => s + getMarks(studentId, a.id), 0);
        return (obtained / totalPossible) * 100;
    };

    const getCLOWeightedScore = (studentId, clo) => {
        let weightedSum = 0;
        assessments.filter(a => a.clo === clo).forEach(a => {
            const raw = getMarks(studentId, a.id);
            const tm = parseFloat(a.total_marks || 1);
            const wt = parseFloat(a.weightage || 0);
            weightedSum += (raw / tm) * wt;
        });
        return weightedSum;
    };

    const getCLOMaxWeightage = (clo) =>
        assessments.filter(a => a.clo === clo).reduce((s, a) => s + parseFloat(a.weightage || 0), 0);

    const cloPassCounts = {};
    const cloAchievements = {};
    allActiveCLOs.forEach(clo => {
        cloPassCounts[clo] = sortedStudents.filter(s => getCLOPercent(s.id, clo) >= PASS_THRESHOLD).length;
        cloAchievements[clo] = sortedStudents.length > 0
            ? ((cloPassCounts[clo] / sortedStudents.length) * 100).toFixed(1)
            : '0.0';
    });

    const grandAvgAchievement = allActiveCLOs.length > 0
        ? (allActiveCLOs.reduce((s, clo) => s + parseFloat(cloAchievements[clo] || 0), 0) / allActiveCLOs.length).toFixed(2)
        : '0.00';

    const lecturerName = lecturer?.name || '-';
    const subjectCode = subject?.code || '-';
    const subjectName = subject?.name || '-';

    // colspan for footer label cells (BIL + MATRIK + NAMA + cont assessments + cont CLO subtotals + final assessments + final CLO subtotals + JUMLAH)
    const labelColSpan = 3 + continuousAssessments.length + activeCLOs.length + finalAssessments.length + finalCLOs.length + 1;

    return (
        <div className="printable-clo-report bg-white text-black font-sans text-[8pt] print-container">
            <style>{`
                @page { size: A4 landscape; margin: 8mm 10mm; }
                @media print {
                    body > * { visibility: hidden !important; }
                    .printable-clo-report, .printable-clo-report * { visibility: visible !important; }
                    .printable-clo-report { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; }
                    html, body, #root { height: auto !important; overflow: visible !important; }
                }
                .printable-clo-report table { border-collapse: collapse; width: 100%; font-size: 7pt; }
                .printable-clo-report table td, .printable-clo-report table th { border: 0.5pt solid #333; padding: 2px 3px; vertical-align: middle; }
                .printable-clo-report .no-border td { border: none; }
            `}</style>

            {/* HEADER */}
            <div className="mb-2">
                <div className="border border-black flex items-stretch">
                    {/* Logo Section */}
                    <div className="w-20 p-1 border-r border-black flex items-center justify-center">
                        {facultyLogo ? (
                            <img src={facultyLogo} alt="Logo" className="h-10 object-contain" />
                        ) : (
                            <div className="text-center font-bold text-[6pt]">LOGO</div>
                        )}
                    </div>

                    {/* Title Section */}
                    <div className="flex-1 flex flex-col justify-center py-1">
                        <div style={{ fontSize: '9pt', fontWeight: 'bold', textAlign: 'center' }}>
                            {facultyName.toUpperCase()}
                        </div>
                        <div style={{ fontSize: '8pt', fontWeight: 'bold', textAlign: 'center' }}>
                            ANALISA PENCAPAIAN SETIAP CLO &amp; PLO PELAJAR
                        </div>
                    </div>
                </div>
            </div>

            {/* Meta Info Rows */}
            <div className="mb-2" style={{ fontSize: '7.5pt' }}>
                <div className="flex justify-between leading-tight">
                    <div className="flex">
                        <span className="font-bold w-36">TENAGA PENGAJAR</span>
                        <span className="font-bold">: {lecturerName.toUpperCase()}</span>
                    </div>
                    <div className="flex min-w-[320px]">
                        <span className="font-bold">SESI / TAHUN AKADEMIK : </span>
                        <span>{semesterSession.toUpperCase()}</span>
                    </div>
                </div>
                <div className="flex justify-between leading-tight">
                    <div className="flex">
                        <span className="font-bold w-36">KOD / KURSUS</span>
                        <span className="font-bold">: {subjectCode.toUpperCase()} - {subjectName.toUpperCase()}</span>
                    </div>
                    <div className="flex min-w-[320px]">
                        <span className="font-bold">SEMESTER / KUMPULAN : </span>
                        <span>{semester.toUpperCase()}</span>
                    </div>
                </div>
                <div className="flex justify-between leading-tight">
                    <div className="flex">
                        <span className="font-bold w-36">PROGRAM</span>
                        <span>: {program.toUpperCase()}</span>
                    </div>
                    <div className="flex min-w-[320px]">
                        <span className="font-bold">JUMLAH PELAJAR : </span>
                        <span className="font-bold">{sortedStudents.length} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; orang</span>
                    </div>
                </div>
            </div>

            {/* MAIN TABLE */}
            <table>
                <thead>
                    {/* Row 1: section-level headers */}
                    <tr>
                        <th rowSpan={3} style={{ width: '22px', backgroundColor: '#D9D9D9', textAlign: 'center' }}>BIL</th>
                        <th rowSpan={3} style={{ width: '65px', backgroundColor: '#D9D9D9', textAlign: 'center' }}>NO MATRIK</th>
                        <th rowSpan={3} style={{ minWidth: '120px', backgroundColor: '#D9D9D9', textAlign: 'center' }}>NAMA</th>

                        {activeCLOs.length > 0 && (
                            <th colSpan={continuousAssessments.length + activeCLOs.length}
                                style={{ backgroundColor: '#BDD7EE', textAlign: 'center', fontWeight: 'bold' }}>
                                PENILAIAN BERTERUSAN
                            </th>
                        )}

                        {finalAssessments.length > 0 && (
                            <th colSpan={finalAssessments.length + finalCLOs.length}
                                style={{ backgroundColor: '#BDD7EE', textAlign: 'center', fontWeight: 'bold' }}>
                                PENILAIAN AKHIR
                            </th>
                        )}

                        <th rowSpan={3} style={{ width: '40px', backgroundColor: '#D9D9D9', textAlign: 'center', fontWeight: 'bold', wordBreak: 'break-word' }}>
                            JUMLAH KESELURUHAN
                        </th>

                        {allActiveCLOs.map(clo => (
                            <th key={`ch-${clo}`} colSpan={2}
                                style={{ backgroundColor: CLO_COLORS[clo]?.header || '#888', color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
                                {clo} {CLO_COLORS[clo]?.plo || ''}
                            </th>
                        ))}
                    </tr>

                    {/* Row 2: assessment names + CLO sub-labels */}
                    <tr>
                        {activeCLOs.map(clo => (
                            <Fragment key={`r2clo-${clo}`}>
                                {assessmentsByCLO[clo].map(a => (
                                    <th key={`ah-${a.id}`} style={{ backgroundColor: '#BDD7EE', textAlign: 'center', maxWidth: '50px', wordBreak: 'break-word' }}>
                                        {a.name}
                                    </th>
                                ))}
                                <th style={{ backgroundColor: CLO_COLORS[clo]?.header || '#888', color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
                                    {clo}
                                </th>
                            </Fragment>
                        ))}

                        {finalAssessments.map(a => (
                            <th key={`fah-${a.id}`} style={{ backgroundColor: '#BDD7EE', textAlign: 'center', maxWidth: '50px', wordBreak: 'break-word' }}>
                                {a.name}
                            </th>
                        ))}
                        {finalCLOs.map(clo => (
                            <th key={`fclos-${clo}`} style={{ backgroundColor: CLO_COLORS[clo]?.header || '#888', color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
                                {clo}
                            </th>
                        ))}

                        {allActiveCLOs.map(clo => (
                            <Fragment key={`r2ach-${clo}`}>
                                <th style={{ backgroundColor: CLO_COLORS[clo]?.header || '#888', color: 'white', textAlign: 'center', fontSize: '6pt' }}>
                                    {getCLOMaxWeightage(clo)}%
                                </th>
                                <th style={{ backgroundColor: CLO_COLORS[clo]?.header || '#888', color: 'white', textAlign: 'center', fontSize: '6pt' }}>
                                    100%
                                </th>
                            </Fragment>
                        ))}
                    </tr>

                    {/* Row 3: weightage row */}
                    <tr>
                        {activeCLOs.map(clo => (
                            <Fragment key={`r3clo-${clo}`}>
                                {assessmentsByCLO[clo].map(a => (
                                    <th key={`aw-${a.id}`} style={{ backgroundColor: '#BDD7EE', textAlign: 'center', fontSize: '6pt' }}>
                                        {a.weightage}%
                                    </th>
                                ))}
                                <th style={{ backgroundColor: CLO_COLORS[clo]?.light, textAlign: 'center', fontSize: '6pt' }}>
                                    {getCLOWeightage(clo)}%
                                </th>
                            </Fragment>
                        ))}

                        {finalAssessments.map(a => (
                            <th key={`faw-${a.id}`} style={{ backgroundColor: '#BDD7EE', textAlign: 'center', fontSize: '6pt' }}>
                                {a.weightage}%
                            </th>
                        ))}
                        {finalCLOs.map(clo => (
                            <th key={`fclw-${clo}`} style={{ backgroundColor: CLO_COLORS[clo]?.light, textAlign: 'center', fontSize: '6pt' }}>
                                {getFinalCLOWeightage(clo)}%
                            </th>
                        ))}

                        {allActiveCLOs.map(clo => (
                            <Fragment key={`r3ach-${clo}`}>
                                <th style={{ backgroundColor: CLO_COLORS[clo]?.header || '#888', textAlign: 'center' }}></th>
                                <th style={{ backgroundColor: CLO_COLORS[clo]?.header || '#888', textAlign: 'center' }}></th>
                            </Fragment>
                        ))}
                    </tr>
                </thead>

                <tbody>
                    {sortedStudents.map((student, idx) => (
                        <tr key={student.id} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#F9F9F9' }}>
                            <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                            <td style={{ textAlign: 'center' }}>{student.matric_no}</td>
                            <td style={{ paddingLeft: '3px' }}>{student.name}</td>

                            {activeCLOs.map(clo => (
                                <Fragment key={`sbclo-${student.id}-${clo}`}>
                                    {assessmentsByCLO[clo].map(a => (
                                        <td key={`sm-${student.id}-${a.id}`} style={{ textAlign: 'center' }}>
                                            {getMarks(student.id, a.id).toFixed(1)}
                                        </td>
                                    ))}
                                    <td style={{ textAlign: 'center', backgroundColor: CLO_COLORS[clo]?.light, fontWeight: 'bold' }}>
                                        {getCLOMarks(student.id, clo).toFixed(1)}
                                    </td>
                                </Fragment>
                            ))}

                            {finalAssessments.map(a => (
                                <td key={`sfm-${student.id}-${a.id}`} style={{ textAlign: 'center' }}>
                                    {getMarks(student.id, a.id).toFixed(1)}
                                </td>
                            ))}
                            {finalCLOs.map(clo => (
                                <td key={`sfcs-${student.id}-${clo}`} style={{ textAlign: 'center', backgroundColor: CLO_COLORS[clo]?.light, fontWeight: 'bold' }}>
                                    {getFinalCLOMarks(student.id, clo).toFixed(1)}
                                </td>
                            ))}

                            <td style={{ textAlign: 'center', fontWeight: 'bold', backgroundColor: '#D9D9D9' }}>
                                {getGrandTotal(student.id).toFixed(1)}
                            </td>

                            {allActiveCLOs.map(clo => (
                                <Fragment key={`sach-${student.id}-${clo}`}>
                                    <td style={{ textAlign: 'center', backgroundColor: CLO_COLORS[clo]?.light }}>
                                        {getCLOWeightedScore(student.id, clo).toFixed(2)}
                                    </td>
                                    <td style={{ textAlign: 'center', backgroundColor: CLO_COLORS[clo]?.light }}>
                                        {getCLOPercent(student.id, clo).toFixed(1)}
                                    </td>
                                </Fragment>
                            ))}
                        </tr>
                    ))}

                    {/* Pass count row */}
                    <tr>
                        <td colSpan={labelColSpan}
                            style={{ textAlign: 'right', fontWeight: 'bold', backgroundColor: '#F2F2F2', fontSize: '7pt', paddingRight: '4px' }}>
                            BILANGAN PELAJAR YANG MENCAPAI TAHAP &gt;40%
                        </td>
                        {allActiveCLOs.map(clo => (
                            <Fragment key={`pc-${clo}`}>
                                <td style={{ textAlign: 'center', fontWeight: 'bold', backgroundColor: CLO_COLORS[clo]?.light }}>
                                    {cloPassCounts[clo] || 0}
                                </td>
                                <td style={{ textAlign: 'center', fontWeight: 'bold', backgroundColor: CLO_COLORS[clo]?.light }}>
                                    {cloPassCounts[clo] || 0}
                                </td>
                            </Fragment>
                        ))}
                    </tr>

                    {/* Achievement % row */}
                    <tr>
                        <td colSpan={labelColSpan}
                            style={{ textAlign: 'right', fontWeight: 'bold', backgroundColor: '#D9E1F2', fontSize: '7pt', paddingRight: '4px' }}>
                            PERATUS PENCAPAIAN CLO / PLO
                        </td>
                        {allActiveCLOs.map(clo => (
                            <Fragment key={`pa-${clo}`}>
                                <td style={{ textAlign: 'center', fontWeight: 'bold', backgroundColor: CLO_COLORS[clo]?.header, color: 'white' }}>
                                    {cloAchievements[clo]}%
                                </td>
                                <td style={{ textAlign: 'center', fontWeight: 'bold', backgroundColor: CLO_COLORS[clo]?.header, color: 'white' }}>
                                    {cloAchievements[clo]}%
                                </td>
                            </Fragment>
                        ))}
                    </tr>

                    {/* Grand average row */}
                    <tr>
                        <td colSpan={labelColSpan}
                            style={{ textAlign: 'right', fontWeight: 'bold', backgroundColor: '#FCE4D6', fontSize: '7pt', paddingRight: '4px' }}>
                            PURATA PERATUS PENCAPAIAN KESELURUHAN CLO
                        </td>
                        <td colSpan={allActiveCLOs.length * 2}
                            style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '8pt', backgroundColor: '#FFC000' }}>
                            {grandAvgAchievement}%
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Signature Boxes */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
                <div style={{ border: '0.5pt solid #333', padding: '10px 24px', minWidth: '220px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '8px', textAlign: 'center' }}>DISEDIAKAN OLEH :</div>
                    <div style={{ marginBottom: '16px' }}>TANDATANGAN :</div>
                    <div>TARIKH &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; :</div>
                </div>
                <div style={{ border: '0.5pt solid #333', padding: '10px 24px', minWidth: '220px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '8px', textAlign: 'center' }}>DISEMAK DAN DISAHKAN OLEH :</div>
                    <div style={{ marginBottom: '16px' }}>TANDATANGAN :</div>
                    <div>TARIKH &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; :</div>
                </div>
            </div>
        </div>
    );
};

export default PrintableCLOReport;
