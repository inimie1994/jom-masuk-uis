import React from 'react';
import uisLogo from '../../assets/LOGO-RASMI-UIS cropped.png';

const PrintableTimetableSheet = ({
    lecturer,
    timetable = [],
    activities = [],
    semesterSession = "", // Updated default
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

    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const DAY_MAP = {
        'Monday': 'Isnin',
        'Tuesday': 'Selasa',
        'Wednesday': 'Rabu',
        'Thursday': 'Khamis',
        'Friday': 'Jumaat',
        'Saturday': 'Sabtu',
        'Sunday': 'Ahad'
    };

    // Time slots 8.00 - 18.00 (10 slots)
    // 8-9, 9-10, 10-11, 11-12, 12-13, 13-14 (REHAT), 14-15, 15-16, 16-17, 17-18
    const TIME_SLOTS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

    // Calculate daily totals map
    const dailyTotals = {
        Monday: { pdp: 0, activity: 0 },
        Tuesday: { pdp: 0, activity: 0 },
        Wednesday: { pdp: 0, activity: 0 },
        Thursday: { pdp: 0, activity: 0 },
        Friday: { pdp: 0, activity: 0 },
        Saturday: { pdp: 0, activity: 0 },
        Sunday: { pdp: 0, activity: 0 }
    };

    let grandTotalPdp = 0;
    let grandTotalActivity = 0;

    // Process totals
    [...timetable, ...activities.map(a => ({ ...a, isActivity: true }))].forEach(item => {
        const hours = calculateHours(item.start_time, item.end_time);
        if (item.day && dailyTotals[item.day]) {
            if (item.isActivity) {
                dailyTotals[item.day].activity += hours;
                grandTotalActivity += hours;
            } else {
                dailyTotals[item.day].pdp += hours;
                grandTotalPdp += hours;
            }
        }
    });

    const getCellContent = (day, hour) => {
        const timeStr = `${hour.toString().padStart(2, '0')}:00:00`;
        // Check for Class
        const classItem = timetable.find(t => t.day === day && t.start_time === timeStr);
        if (classItem) {
            const duration = calculateHours(classItem.start_time, classItem.end_time);
            return {
                type: 'class',
                data: classItem,
                duration
            };
        }
        // Check for Activity
        const activityItem = activities.find(a => a.day === day && a.start_time === timeStr);
        if (activityItem) {
            const duration = calculateHours(activityItem.start_time, activityItem.end_time);
            return {
                type: 'activity',
                data: activityItem,
                duration
            };
        }

        // Check if occupied by previous
        const occupied = [...timetable, ...activities].some(t => {
            const startH = parseInt(t.start_time.split(':')[0]);
            const endH = parseInt(t.end_time.split(':')[0]);
            return t.day === day && hour > startH && hour < endH;
        });

        if (occupied) return { type: 'occupied' };

        return { type: 'empty' };
    };

    return (
        <div className={`printable-timetable-sheet hidden print:block print:w-full bg-white text-black font-sans text-[10px] ${className || ''}`}>
            <style type="text/css" media="print">
                {`
                    @page { size: landscape; margin: 10mm; }
                    @media print {
                        body > * { visibility: hidden !important; }
                        .printable-timetable-sheet, .printable-timetable-sheet * { visibility: visible !important; }
                        .printable-timetable-sheet {
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100% !important;
                            zoom: 0.85 !important;
                        }
                        .print-cell { border: 1px solid black !important; text-align: center; vertical-align: middle; padding: 2px; }
                        .bg-peach { background-color: #ffdab9 !important; -webkit-print-color-adjust: exact; }
                        .bg-blue-light { background-color: #dae8fc !important; -webkit-print-color-adjust: exact; }
                        .bg-gray-light { background-color: #f3f4f6 !important; -webkit-print-color-adjust: exact; }
                        .section-header { font-weight: bold; }
                    }
                `}
            </style>

            {/* Header Info */}
            <div className="mb-4 font-bold uppercase text-xs">
                <div className="flex mb-1">
                    <span className="w-40">Nama Pensyarah :</span>
                    <span className="underline">{lecturer?.name || ''}</span>
                </div>
                <div className="flex">
                    <span className="w-40">Jabatan / Fakulti :</span>
                    <span className="underline">
                        {lecturer?.departments?.name || 'JABATAN PENGAJIAN ISLAM'} / {lecturer?.departments?.faculties?.name || 'PUSAT MATRIKULASI'}
                    </span>
                </div>
            </div>

            {/* Title */}
            <div className="text-center font-bold uppercase text-sm mb-2">
                JUMLAH JAM KESELURUHAN SEMINGGU – {semesterSession}
            </div>

            {/* Main Table */}
            <table className="w-full border-collapse border border-black text-center">
                <thead>
                    <tr className="h-10">
                        <th rowSpan={2} className="print-cell w-20">Hari</th>
                        {TIME_SLOTS.map(hour => (
                            hour !== 13 ? (
                                <th key={hour} rowSpan={2} className="print-cell w-24">
                                    {hour}.00 –<br />{(hour + 1)}.00
                                </th>
                            ) : (
                                <th key={hour} rowSpan={2} className="print-cell w-8" style={{ writingMode: 'vertical-lr' }}>
                                    REHAT
                                </th>
                            )
                        ))}
                        <th className="print-cell w-16 text-[9px]">PdP<br />(jam)</th>
                        <th className="print-cell w-20 text-[9px]">Lain-Lain<br />Aktiviti<br />(jam)</th>
                    </tr>
                    <tr className="h-6">
                        <th className="print-cell bg-blue-light"></th>
                        <th className="print-cell bg-peach"></th>
                    </tr>
                </thead>
                <tbody>
                    {DAYS.map((day, dayIndex) => {
                        // Skip rendering Sunday if empty? No, render all 7 days usually. E.g. Isnin-Ahad.
                        // Actually let's assume Monday-Sunday row rendering.

                        const isWeekend = day === 'Saturday' || day === 'Sunday';

                        return (
                            <tr key={day} className={isWeekend ? "h-10" : "h-16"}>
                                <td className="print-cell font-bold">{DAY_MAP[day]}</td>

                                {TIME_SLOTS.map((hour) => {
                                    if (hour === 13) {
                                        // REHAT Column - RowSpan 7 on first day
                                        if (dayIndex === 0) {
                                            return (
                                                <td key={hour} rowSpan={DAYS.length} className="print-cell font-bold" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                                                    REHAT
                                                </td>
                                            );
                                        } else {
                                            return null;
                                        }
                                    }

                                    const content = getCellContent(day, hour);

                                    if (content.type === 'occupied') return null;

                                    if (content.type === 'class') {
                                        // Colors: Classes usually blue-ish
                                        return (
                                            <td key={hour} colSpan={content.duration} className="print-cell bg-blue-light">
                                                <div className="font-bold">{content.data.subjects?.code}</div>
                                                <div className="uppercase">{content.data.class_type}</div>
                                                <div>{content.data.room}</div>
                                                {/* Group Names */}
                                                <div className="text-[9px]">
                                                    {Array.isArray(content.data.group_names)
                                                        ? content.data.group_names.join(', ')
                                                        : content.data.group_names}
                                                </div>
                                            </td>
                                        );
                                    }

                                    if (content.type === 'activity') {
                                        // Colors: Activities usually peach/orange
                                        return (
                                            <td key={hour} colSpan={content.duration} className="print-cell bg-peach">
                                                <div className="font-bold uppercase">{content.data.activity_type}</div>
                                                <div className="italic">{content.data.description}</div>
                                            </td>
                                        );
                                    }

                                    return <td key={hour} className="print-cell"></td>;
                                })}

                                {/* Totals Columns */}
                                <td className="print-cell bg-blue-light font-bold text-sm">
                                    {dailyTotals[day].pdp || 0}
                                </td>
                                <td className="print-cell bg-peach font-bold text-sm">
                                    {dailyTotals[day].activity || 0}
                                </td>
                            </tr>
                        );
                    })}

                    {/* Grand Total Row */}
                    <tr className="h-10 bg-gray-light">
                        <td colSpan={11} className="print-cell text-right pr-4 font-bold">
                            Jumlah Jam
                        </td>
                        <td className="print-cell font-bold text-sm bg-blue-light">{grandTotalPdp}</td>
                        <td className="print-cell font-bold text-sm bg-peach">{grandTotalActivity}</td>
                    </tr>
                    <tr className="h-10 text-white bg-gray-600 print:bg-gray-600 border-t-2 border-black">
                        <td colSpan={11} className="print-cell text-right pr-4 font-bold text-white uppercase tracking-wider">
                            Jumlah Jam Keseluruhan Seminggu
                        </td>
                        <td colSpan={2} className="print-cell font-bold text-sm text-white text-center">
                            {grandTotalPdp + grandTotalActivity}
                        </td>
                    </tr>

                </tbody>
            </table>

            {/* Footer Signatures */}
            <div className="flex justify-between mt-12 px-4 uppercase text-xs">
                <div className="text-center">
                    <div className="mb-16">Disediakan oleh:</div>
                    <div className="border-t border-black w-48 border-dotted"></div>
                </div>
                <div className="text-center">
                    <div className="mb-16">Disemak oleh:</div>
                    <div className="border-t border-black w-48 border-dotted"></div>
                </div>
                <div className="text-center">
                    <div className="mb-16">Diluluskan oleh:</div>
                    <div className="border-t border-black w-48 border-dotted"></div>
                </div>
            </div>

        </div>
    );
};

export default PrintableTimetableSheet;
