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
        if (!attendanceData[studentId]) return 0;
        return Object.values(attendanceData[studentId]).filter(s => s === 'Present').length;
    };

    return (
        <div className="hidden print:block print:w-full bg-white text-black p-4 text-[10px] font-sans leading-tight">
            <style type="text/css" media="print">
                {`
                    @page { size: landscape; margin: 10mm; }
                    body { -webkit-print-color-adjust: exact; margin: 0; }
                    .print-table th, .print-table td { border: 1px solid black !important; }
                `}
            </style>

            {/* Header / Logo Section */}
            <div className="border border-black flex mb-2">
                <div className="w-24 border-r border-black p-2 flex items-center justify-center">
                    <img src={logoUrl || "/vite.svg"} alt="Logo" className={`h-16 w-auto ${!logoUrl ? 'grayscale' : 'object-contain'}`} />
                </div>
                <div className="flex-1 flex flex-col justify-center text-center font-bold">
                    <div className="border-b border-black py-2 text-lg">UNIVERSITI ISLAM SELANGOR</div>
                    <div className="py-2 text-lg">BORANG KEHADIRAN PELAJAR</div>
                </div>
                <div className="w-24 border-l border-black p-1 text-[8px] flex items-end justify-end">
                    BKP/FAKULTI/2025/Pin.8
                </div>
            </div>

            {/* Info Section */}
            <div className="grid grid-cols-2 gap-x-8 mb-2 font-bold uppercase">
                <div className="grid grid-cols-[100px_10px_1fr] gap-y-1">
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
                <div className="grid grid-cols-[140px_10px_1fr] gap-y-1">
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
            <table className="w-full border-collapse border border-black text-center mb-4 print-table">
                <thead>
                    <tr className="bg-gray-200 print:bg-gray-200">
                        <th className="border border-black w-8" rowSpan={2} style={{ verticalAlign: 'middle' }}>BIL.</th>
                        <th className="border border-black w-24" rowSpan={2} style={{ verticalAlign: 'middle' }}>NO. MATRIK</th>
                        <th className="border border-black text-left px-2" rowSpan={2} style={{ verticalAlign: 'middle' }}>NAMA</th>
                        <th className="border border-black h-6" colSpan={totalColumns} style={{ verticalAlign: 'middle' }}>TARIKH</th>
                        <th className="border border-black w-12" rowSpan={2} style={{ verticalAlign: 'middle' }}>JUMLAH</th>
                        <th className="border border-black w-20" rowSpan={2} style={{ verticalAlign: 'middle' }}>CATATAN</th>
                    </tr>
                    <tr className="h-6">
                        {displayDates.map((col, idx) => (
                            <th key={idx} className="border border-black text-[8px] w-6 h-6 font-normal" style={{ minWidth: '24px' }}>
                                {/* Ensure dates are only shown if they exist, otherwise empty */}
                                {col ? col.displayDate : ''}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {students.map((student, idx) => (
                        <tr key={student.id} className="h-6">
                            <td className="border border-black">{idx + 1}</td>
                            <td className="border border-black text-left px-1">{student.matric_no}</td>
                            <td className="border border-black text-left px-2 uppercase">{student.name}</td>
                            {displayDates.map((col, cIdx) => {
                                if (!col) return <td key={cIdx} className="border border-black"></td>;

                                const key = `${col.date}_${col.startTime}`;
                                const isPresent = attendanceData[student.id]?.[key] === 'Present';
                                return (
                                    <td key={cIdx} className="border border-black text-black font-bold">
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

            {/* Footer / Notes */}
            <div className="text-center text-[8px] italic mb-8">
                (NOTA: SIMPAN BORANG DALAM FAIL KURSUS)
            </div>

            <div className="font-bold mb-12">
                DIPERAKUKAN KELAS PENGAJARAN DI ATAS TELAH DILAKSANAKAN.
            </div>

            <div className="flex justify-between items-end px-4">
                <div className="text-center w-64">
                    <div className="mb-2">Disediakan oleh:</div>
                    <div className="border-b border-black border-dashed mb-1 h-12"></div>
                    <div className="text-left text-[8px]">Tarikh:</div>
                </div>
                <div className="text-center w-64">
                    <div className="mb-2">Disemak dan disahkan oleh:</div>
                    <div className="border-b border-black border-dashed mb-1 h-12"></div>
                    <div className="text-center text-[8px]">Tarikh:</div>
                </div>
            </div>
        </div>
    );
};

export default PrintableAttendanceSheet;
