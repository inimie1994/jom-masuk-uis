
import React, { useMemo } from 'react';
import uisLogo from '../../assets/LOGO-RASMI-UIS cropped.png';

const PrintableWorkloadSheet = ({
    lecturer,
    timetable,
    activities = [],
    studentCounts,
    semesterSession = "",
    className
}) => {
    // Helper to calculate hours
    const calculateHours = (start, end) => {
        if (!start || !end) return 0;
        const startH = parseInt(start.split(':')[0]);
        const endH = parseInt(end.split(':')[0]);
        if (isNaN(startH) || isNaN(endH)) return 0;
        return Math.max(0, endH - startH);
    };

    // Helper to format time
    const formatTime = (timeStr) => {
        if (!timeStr || typeof timeStr !== 'string') return '';
        const parts = timeStr.split(':');
        if (parts.length < 2) return timeStr;
        const [hour, minute] = parts;
        const h = parseInt(hour);
        if (isNaN(h)) return timeStr;
        const ampm = h >= 12 ? 'PETANG' : 'PAGI';
        const displayH = h > 12 ? h - 12 : (h === 0 ? 12 : h);
        return `${displayH}${minute === '00' ? '' : '.' + minute} ${ampm}`;
    };

    // Process timetable data
    // Group by Subject ID to potentially merge rows or just list them
    // The template shows listing courses. If a course has multiple slots, they are listed.
    // We will list each timetable entry.
    const sortedTimetable = [...timetable].sort((a, b) => {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        if (a.subjects?.code !== b.subjects?.code) {
            return (a.subjects?.code || '').localeCompare(b.subjects?.code || '');
        }
        if (days.indexOf(a.day) !== days.indexOf(b.day)) return days.indexOf(a.day) - days.indexOf(b.day);
        return (a.start_time || '').localeCompare(b.start_time || '');
    });

    // Calculate totals
    let totalStudents = 0;
    let totalLectureHours = 0;
    let totalTutorialHours = 0;
    let totalTeachingHours = 0;

    // Calculate daily totals for summary table
    const dailyTotals = {
        Mon: { pdp: 0, activity: 0 },
        Tue: { pdp: 0, activity: 0 },
        Wed: { pdp: 0, activity: 0 },
        Thu: { pdp: 0, activity: 0 },
        Fri: { pdp: 0, activity: 0 },
        Sat: { pdp: 0, activity: 0 },
        Sun: { pdp: 0, activity: 0 }
    };

    const dayMap = {
        'Monday': 'Mon', 'Tuesday': 'Tue', 'Wednesday': 'Wed', 'Thursday': 'Thu', 'Friday': 'Fri', 'Saturday': 'Sat', 'Sunday': 'Sun'
    };

    const rows = sortedTimetable.map(item => {
        const hours = calculateHours(item.start_time, item.end_time);

        // Student count for this slot
        // sum of counts for all groups in this slot
        const groups = Array.isArray(item.group_names) ? item.group_names : (item.group_names ? [item.group_names] : []);
        const studentCount = groups.reduce((sum, group) => sum + (studentCounts[group] || 0), 0);

        const isLecture = item.class_type === 'Lecture';
        const isActivity = item.isActivity;

        const lectureHours = isLecture ? hours : 0;
        const tutorialHours = (!isLecture && !isActivity) ? hours : 0;
        // For activities, we don't count them as Lecture or Tutorial hours for now, 
        // or we could add a column. But usually 'Teaching Hours' refers to classes.
        // If we want to include them in the total, we can.
        // Let's assume they contribute to "Total Teaching Hours" only if requested, 
        // but usually non-teaching activities are separate. 
        // However, the request says "workload report", so maybe they should be just listed.
        // Let's keep them out of "Lecture" and "Tutorial" columns but valid in the "Hours" column?
        // Or maybe just show dash?
        const displayHours = isActivity ? hours : hours; // Show hours for everything in the total column?

        totalStudents += studentCount; // Note: This might double count if same students attend multiple classes. 
        // But based on the template "BILANGAN PELAJAR" column sum, it seems to sum per row.
        totalLectureHours += lectureHours;
        totalTutorialHours += tutorialHours;
        totalTeachingHours += displayHours;

        // Add to daily totals
        // (Removed logic)

        return {
            ...item,
            hours: displayHours,
            studentCount: isActivity ? '-' : studentCount,
            lectureHours: isActivity ? '-' : lectureHours,
            tutorialHours: isActivity ? '-' : tutorialHours,
            dayTime: `${item.day ? item.day.toUpperCase() : ''} / ${formatTime(item.start_time)} - ${formatTime(item.end_time).replace(' ', '')}`
        };
    });

    return (
        <div className={`printable-workload-sheet hidden print:block print:w-full bg-white text-black font-sans ${className || ''}`}>
            <style type="text/css" media="print">
                {`
                    @page { size: landscape; margin: 10mm; }
                    
                    @media print {
                        body > * { visibility: hidden !important; }
                        .printable-workload-sheet, .printable-workload-sheet * { visibility: visible !important; }
                        .printable-workload-sheet {
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100% !important;
                        }
                       html, body, #root { height: auto !important; overflow: visible !important; }
                    }
                    .print-table th, .print-table td { border: 1px solid black !important; padding: 4px; vertical-align: top; }
                `}
            </style>

            <div className="flex flex-col items-center mb-6">
                <img src={uisLogo} alt="Logo" className="h-24 w-auto mb-2" />
                <div className="text-center">
                    <div className="text-sm font-bold uppercase">PUSAT MATRIKULASI</div>
                    <div className="text-sm font-bold uppercase">BORANG LAPORAN PENGAJARAN {semesterSession}</div>
                </div>
            </div>

            {/* Info Row */}
            <div className="flex justify-between text-[11px] font-bold uppercase mb-0.5" style={{ borderBottom: '2px solid black' }}>
                <div className="flex gap-1 pb-1">
                    <span>NAMA PENSYARAH:</span>
                    <span className="text-red-600 pl-1">{lecturer?.name || ''}</span>
                </div>
                <div className="flex gap-1 pb-1">
                    <span>JABATAN:</span>
                    <span className="text-red-600 pl-1">{lecturer?.departments?.name || 'JABATAN PENGAJIAN ISLAM'}</span>
                </div>
                <div className="flex gap-1 pb-1">
                    <span>MOD:</span>
                    <span className="text-red-600 pl-1">C</span>
                </div>
            </div>

            {/* Table */}
            <table className="w-full border-collapse border border-black text-center text-[10px] print-table mb-1">
                <thead>
                    <tr className="bg-black text-white border-b border-black h-10 align-middle">
                        <th className="w-24 border-r border-white font-bold uppercase py-1">KOD KURSUS</th>
                        <th className="text-center border-r border-white font-bold uppercase py-1">NAMA KURSUS</th>
                        <th className="w-48 border-r border-white font-bold uppercase py-1">HARI DAN MASA</th>
                        <th className="w-20 border-r border-white leading-tight font-bold uppercase py-1 text-[9px]">BILANGAN<br />PELAJAR</th>
                        <th className="w-16 border-r border-white leading-tight font-bold uppercase py-1 text-[9px]">JAM<br />KULIAH</th>
                        <th className="w-16 border-r border-white leading-tight font-bold uppercase py-1 text-[9px]">JAM<br />TUTORIAL</th>
                        <th className="w-24 leading-tight font-bold uppercase py-1 text-[9px]">JUMLAH JAM<br />PENGAJARAN</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.length > 0 ? rows.map((row, index) => {
                        const showSubject = index === 0 || rows[index - 1].subjects?.code !== row.subjects?.code;
                        // Calculate rowSpan for this subject if it's the first occurrence
                        let rowSpan = 1;
                        if (showSubject) {
                            for (let i = index + 1; i < rows.length; i++) {
                                if (rows[i].subjects?.code === row.subjects?.code) {
                                    rowSpan++;
                                } else {
                                    break;
                                }
                            }
                        }

                        return (
                            <tr key={index} className="h-8">
                                {showSubject && (
                                    <td className="text-left font-medium" rowSpan={rowSpan}>
                                        {row.subjects?.code}
                                    </td>
                                )}
                                {showSubject && (
                                    <td className="text-left font-medium uppercase" rowSpan={rowSpan}>
                                        {row.subjects?.name}
                                    </td>
                                )}
                                <td className="text-left uppercase font-medium pl-2">{row.dayTime}</td>
                                <td className="text-center">{row.studentCount}</td>
                                <td className="text-center">{row.lectureHours}</td>
                                <td className="text-center">{row.tutorialHours}</td>
                                <td className="text-center">{row.hours}</td>
                            </tr>
                        );
                    }) : (
                        <tr className="h-32">
                            <td colSpan={7}>&nbsp;</td>
                        </tr>
                    )}
                    {/* Empty row filler if needed to match height, but table auto-height is usually fine. */}

                    <tr className="font-bold h-8">
                        <td colSpan={4} className="text-right pr-2">JUMLAH</td>
                        <td className="text-center">{totalLectureHours}</td>
                        <td className="text-center">{totalTutorialHours}</td>
                        <td className="text-center">{totalTeachingHours}</td>
                    </tr>
                </tbody>
            </table>

            {/* Total Hours Summary Table (Removed) */}

            {/* Signatures */}
            <div className="grid grid-cols-[350px_1fr] border border-black text-[10px] mb-6">
                {/* Left Box: Signature & Date */}
                <div className="border-r border-black relative h-32">
                    <div className="p-1 font-bold">TANDA TANGAN:</div>
                    {/* Signature Area */}

                    <div className="absolute bottom-1 left-1 right-1">
                        <div className="font-bold border border-black px-2 py-0.5 inline-block w-full bg-white">
                            <span className="text-red-600">TARIKH: {new Date().toLocaleDateString('en-GB').replace(/\//g, '.')}</span>
                        </div>
                    </div>
                </div>

                {/* Right Box: Appovals */}
                <div className="flex flex-col h-32">
                    <div className="bg-black text-white font-bold grid grid-cols-2 text-center items-center h-8">
                        <div className="border-r border-white h-full flex items-center justify-center text-[9px] leading-tight px-1">
                            DIPERAKUKAN OLEH KETUA JABATAN / TIMBALAN DEKAN AKADEMIK
                        </div>
                        <div className="h-full flex items-center justify-center text-[9px] leading-tight px-1">
                            DISAHKAN OLEH TIMBALAN DEKAN AKADEMIK / DEKAN
                        </div>
                    </div>
                    <div className="grid grid-cols-2 flex-1">
                        <div className="border-r border-black p-1 relative">
                            <div className="font-bold">TANDA TANGAN</div>
                        </div>
                        <div className="p-1 relative">
                            <div className="font-bold">TANDA TANGAN</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="text-[10px] font-medium">
                *Borang ini perlu diserahkan kepada Ketua Jabatan/ Timbalan Dekan Akademik pada minggu ke-3 pada setiap semester.
            </div>

        </div>
    );
};

export default PrintableWorkloadSheet;
