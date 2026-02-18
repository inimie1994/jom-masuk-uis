import React from 'react';

const PrintableAttendanceSheet = ({
    month,
    group,
    subject,
    students,
    dates,
    attendanceData,
    lecturerName,
    logoUrl,
    className
}) => {
    // Helper to format month name in Malay usually found in these forms
    const getMonthName = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr + '-01');
        return date.toLocaleDateString('ms-MY', { month: 'long', year: 'numeric' }).toUpperCase();
    };

    const totalColumns = 14;
    const displayDates = [...dates];
    while (displayDates.length < totalColumns) {
        displayDates.push(null);
    }

    const calculateTotal = (studentId) => {
        const presentCount = attendanceData[studentId]
            ? Object.values(attendanceData[studentId]).filter(s => s === 'Present').length
            : 0;
        const holidayCount = dates.filter(d => d.isHoliday).length;
        return presentCount + holidayCount;
    };

    const STUDENTS_PER_PAGE = 15;
    const totalPages = Math.ceil(students.length / STUDENTS_PER_PAGE);

    return (
        <div className={`printable-attendance-sheet hidden print:block print:w-full bg-white text-black text-[9px] font-sans leading-tight ${className || ''}`}>
            <style type="text/css" media="print">
                {`
                    @page { size: landscape; margin: 5mm; }
                    
                    /* Hide everything in the body by default during print */
                    @media print {
                        body > * {
                            visibility: hidden !important;
                        }
                        
                        /* Show only our printable component and its children */
                        .printable-attendance-sheet,
                        .printable-attendance-sheet * {
                            visibility: visible !important;
                        }
                        
                        /* Position the print content at the very top left */
                        .printable-attendance-sheet {
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

                        .page-container { 
                            display: block !important; 
                            page-break-after: always !important; 
                            page-break-inside: avoid !important;
                            width: 100% !important;
                            padding-bottom: 20px !important;
                        }
                        
                        .page-container:last-child { 
                            page-break-after: auto !important; 
                        }
                    }
                    
                    .print-table th, .print-table td { border: 1px solid black !important; }
                `}
            </style>

            {Array.from({ length: totalPages }).map((_, pageIndex) => {
                const currentStudents = students.slice(pageIndex * STUDENTS_PER_PAGE, (pageIndex + 1) * STUDENTS_PER_PAGE);
                const isLastPage = pageIndex === totalPages - 1;

                return (
                    <div key={pageIndex} className="page-container">
                        <div className="flex justify-between items-center mb-1 text-[8px] font-bold">
                            <div className="italic text-gray-500 uppercase">
                                Muka Surat {pageIndex + 1} dari {totalPages}
                            </div>
                            <div>
                                BKP/FAKULTI/2025/Pin.8
                            </div>
                        </div>

                        {/* Header / Logo Section */}
                        <div className="border border-black flex mb-2">
                            <div className="w-15 border-r border-black p-0.5 flex items-center justify-center">
                                <img src={logoUrl || "/vite.svg"} alt="Logo" className={`h-[35px] w-auto ${!logoUrl ? 'grayscale' : 'object-contain'}`} />
                            </div>
                            <div className="flex-1 flex flex-col justify-center text-center font-bold">
                                <div className="border-b border-black py-0.5 text-lg">UNIVERSITI ISLAM SELANGOR</div>
                                <div className="py-0.5 text-lg">BORANG KEHADIRAN PELAJAR</div>
                            </div>
                        </div>

                        {/* Info Section */}
                        <div className="grid grid-cols-2 gap-x-4 mb-1 font-bold uppercase text-[8px]">
                            <div className="grid grid-cols-[80px_5px_1fr] gap-y-0">
                                <div>NAMA TENAGA</div>
                                <div>:</div>
                                <div className="uppercase">{lecturerName || "__________________________"}</div>
                                <div>PROGRAM</div>
                                <div>:</div>
                                <div>{group}</div>
                                <div>KOD</div>
                                <div>:</div>
                                <div>{subject?.code}</div>
                                <div>BULAN</div>
                                <div>:</div>
                                <div>{getMonthName(month)}</div>
                            </div>
                            <div className="grid grid-cols-[120px_5px_1fr] gap-y-0">
                                <div>SESI/ TAHUN AKADEMIK</div>
                                <div>:</div>
                                <div>2025/2026</div>
                                <div>SEMESTER/ KUMPULAN</div>
                                <div>:</div>
                                <div>{group}</div>
                                <div>KURSUS</div>
                                <div>:</div>
                                <div>{subject?.name}</div>
                            </div>
                        </div>

                        {/* Table */}
                        <table className="w-full border-collapse border border-black text-center mb-1 print-table">
                            <thead>
                                <tr className="bg-gray-200 print:bg-gray-200">
                                    <th className="border border-black w-8" rowSpan={2} style={{ verticalAlign: 'middle' }}>BIL.</th>
                                    <th className="border border-black w-24" rowSpan={2} style={{ verticalAlign: 'middle' }}>NO. MATRIK</th>
                                    <th className="border border-black text-left px-2" rowSpan={2} style={{ verticalAlign: 'middle' }}>NAMA</th>
                                    <th className="border border-black h-[20px]" colSpan={totalColumns} style={{ verticalAlign: 'middle' }}>TARIKH</th>
                                    <th className="border border-black w-12" rowSpan={2} style={{ verticalAlign: 'middle' }}>JUMLAH</th>
                                    <th className="border border-black w-20" rowSpan={2} style={{ verticalAlign: 'middle' }}>CATATAN</th>
                                </tr>
                                <tr className="h-[20px]">
                                    {displayDates.map((col, idx) => (
                                        <th key={idx} className={`border border-black text-[8px] w-6 h-[20px] font-normal ${col?.isHoliday ? 'bg-gray-300' : ''}`} style={{ minWidth: '24px' }}>
                                            {/* Ensure dates are only shown if they exist, otherwise empty */}
                                            {col ? col.displayDate : ''}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {currentStudents.map((student, idx) => (
                                    <tr key={student.id} className="h-[20px]">
                                        <td className="border border-black">{(pageIndex * STUDENTS_PER_PAGE) + idx + 1}</td>
                                        <td className="border border-black text-left px-1">{student.matric_no}</td>
                                        <td className="border border-black text-left px-2 uppercase">{student.name}</td>
                                        {displayDates.map((col, cIdx) => {
                                            if (!col) return <td key={cIdx} className="border border-black"></td>;

                                            if (col.isHoliday) {
                                                return <td key={cIdx} className="border border-black bg-gray-300 font-bold">C</td>;
                                            }

                                            const key = `${col.date}_${col.startTime}`;
                                            const isPresent = attendanceData[student.id]?.[key] === 'Present';
                                            return (
                                                <td key={cIdx} className={`border border-black text-black font-bold ${isPresent ? '' : ''}`}>
                                                    {isPresent ? '/' : ''}
                                                </td>
                                            );
                                        })}
                                        <td className="border border-black">{calculateTotal(student.id)}</td>
                                        <td className="border border-black"></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Holiday Notes */}
                        {dates.filter(d => d.isHoliday).length > 0 && (
                            <div className="mb-2 text-[8px]">
                                <span className="font-bold underline italic">*NOTA:</span>
                                <ul className="list-none p-0 inline-flex flex-wrap gap-x-4 ml-2">
                                    {[...new Map(dates.filter(d => d.isHoliday).map(d => [d.date, d])).values()]
                                        .sort((a, b) => a.date.localeCompare(b.date))
                                        .map((h, i) => (
                                            <li key={i} className="italic capitalize">
                                                {h.holidayName.toLowerCase()} - {h.displayDate}
                                            </li>
                                        ))
                                    }
                                </ul>
                            </div>
                        )}

                        {/* Push footer to bottom if needed, or just display after table */}
                        <div className="flex-1"></div>

                        {/* Footer / Notes */}
                        <div className="text-center text-[7px] italic mb-4">
                            (NOTA: SIMPAN BORANG DALAM FAIL KURSUS)
                        </div>

                        <div className="font-bold mb-4 text-[9px]">
                            DIPERAKUKAN KELAS PENGAJARAN DI ATAS TELAH DILAKSANAKAN.
                        </div>
                        <br />
                        <div className="flex justify-between items-end px-4">
                            <div className="text-center w-64">
                                <div className="mb-0.5 text-[8px]">Disediakan oleh:</div>
                                <div className="border-b border-black border-dashed mb-0.5 h-6"></div>
                                <div className="text-left text-[7px]">Tarikh:</div>
                            </div>
                            <div className="text-center w-64">
                                <div className="mb-0.5 text-[8px]">Disemak dan disahkan oleh:</div>
                                <div className="border-b border-black border-dashed mb-0.5 h-6"></div>
                                <div className="text-center text-[7px]">Tarikh:</div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default PrintableAttendanceSheet;
