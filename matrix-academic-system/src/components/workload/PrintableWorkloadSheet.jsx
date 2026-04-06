
import React, { useMemo } from 'react';
import uisLogo from '../../assets/LOGO-RASMI-UIS cropped.png';

const PrintableWorkloadSheet = ({
    lecturer,
    timetable = [],
    activities = [],
    studentCounts = {},
    semesterSession = "",
    className
}) => {
    // 1. Setup Time Slots (8.00 to 5.00 + Malam)
    const timeSlots = [
        { label: '8.00', start: 8 },
        { label: '9.00', start: 9 },
        { label: '10.00', start: 10 },
        { label: '11.00', start: 11 },
        { label: '12.00', start: 12 },
        { label: '1.00', start: 13 },
        { label: '2.00', start: 14 },
        { label: '3.00', start: 15 },
        { label: '4.00', start: 16 },
        { label: '5.00', start: 17 },
        { label: 'Malam', start: 18 } // Simplified for evening classes
    ];

    const days = [
        { key: 'Monday', label: 'ISNIN' },
        { key: 'Tuesday', label: 'SELASA' },
        { key: 'Wednesday', label: 'RABU' },
        { key: 'Thursday', label: 'KHAMIS' },
        { key: 'Friday', label: 'JUMAAT' },
        { key: 'Saturday', label: 'SABTU' },
        { key: 'Sunday', label: 'AHAD' }
    ];

    // Helper to get hour from HH:mm:ss
    const getHour = (timeStr) => {
        if (!timeStr) return 0;
        const h = parseInt(timeStr.split(':')[0]);
        // Handle 12-hour format or 24-hour format if needed, 
        // but assuming 24h based on earlier code
        return h;
    };

    // 2. Prepare Data Grid
    const gridData = useMemo(() => {
        const grid = {};
        days.forEach(day => {
            grid[day.key] = {
                slots: new Array(timeSlots.length).fill(null),
                pdpHours: 0,
                activityHours: 0
            };
        });

        // Combine timetable and activities
        // Note: activities might be objects like { day, start_time, end_time, name }
        const allEvents = [
            ...timetable.map(t => ({ ...t, type: 'pdp' })),
            ...activities.map(a => ({ ...a, type: 'activity' }))
        ];

        allEvents.forEach(event => {
            const dayKey = event.day;
            if (!grid[dayKey]) return;

            const startH = getHour(event.start_time);
            const endH = getHour(event.end_time);
            const duration = Math.max(1, endH - startH);

            if (event.type === 'pdp') grid[dayKey].pdpHours += duration;
            else grid[dayKey].activityHours += duration;

            // Find slot index
            const slotIndex = timeSlots.findIndex(s => s.start === startH);
            if (slotIndex !== -1) {
                // If there's already something here (overlap), we might need to handle it.
                // For now, first one wins or overwrite.
                grid[dayKey].slots[slotIndex] = {
                    ...event,
                    colSpan: duration
                };
                // Mark subsequent slots as occupied
                for (let i = 1; i < duration; i++) {
                    if (slotIndex + i < timeSlots.length) {
                        grid[dayKey].slots[slotIndex + i] = 'skip';
                    }
                }
            }
        });

        return grid;
    }, [timetable, activities]);

    // Unique Courses for Header
    const uniqueCourses = useMemo(() => {
        const subjects = timetable.map(t => t.subjects).filter(Boolean);
        const map = new Map();
        subjects.forEach(s => map.set(s.code, s));
        return Array.from(map.values());
    }, [timetable]);

    const totalPdp = Object.values(gridData).reduce((sum, d) => sum + d.pdpHours, 0);
    const totalActivity = Object.values(gridData).reduce((sum, d) => sum + d.activityHours, 0);

    return (
        <div className={`printable-workload-sheet hidden print:block print:w-full bg-white text-black font-sans p-4 ${className || ''}`}>
            <style type="text/css" media="print">
                {`
                    @page { size: landscape; margin: 8mm; }
                    @media print {
                        body > * { visibility: hidden !important; }
                        .printable-workload-sheet, .printable-workload-sheet * { visibility: visible !important; }
                        .printable-workload-sheet {
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100% !important;
                        }
                    }
                    .grid-table th, .grid-table td { border: 1px solid black !important; vertical-align: middle; height: 35px; }
                    .grid-table tr.empty-row td { height: 22px !important; }
                    .grid-table th { background: #f8fafc; font-weight: bold; text-transform: uppercase; font-size: 8px; padding: 2px; }
                `}
            </style>

            {/* Header Section */}
            <div className="flex items-start justify-between mb-6">
                <div className="flex items-center">
                    <img src={uisLogo} alt="UIS Logo" className="h-[70px] w-auto mr-4" />
                    <div className="border-l-[1.5px] border-black pl-3 h-[60px] flex flex-col justify-center">
                        <h1 className="text-sm font-bold tracking-tight leading-tight uppercase">PUSAT MATRIKULASI</h1>
                        <h2 className="text-sm font-bold leading-tight uppercase">JADUAL KULIAH PENSYARAH</h2>
                        <h2 className="text-sm font-bold leading-tight uppercase">{semesterSession || "SESI II TAHUN AKADEMIK 2025/2026"}</h2>
                    </div>
                </div>
            </div>

            {/* Info Tri-Column */}
            <div className="grid grid-cols-[1fr_auto_auto] gap-12 text-[8px] items-start mb-4">
                {/* Column 1: Lecturer Info */}
                <div className="space-y-0.5">
                    <div className="grid grid-cols-[90px_10px_1fr]">
                        <span>NAMA PENSYARAH</span><span>:</span><span className="uppercase">{lecturer?.name || ''}</span>
                    </div>
                    <div className="grid grid-cols-[90px_10px_1fr]">
                        <span>JABATAN</span><span>:</span><span className="uppercase">{lecturer?.departments?.name || ''}</span>
                    </div>
                    <div className="grid grid-cols-[90px_10px_1fr]">
                        <span>KURSUS</span><span>:</span>
                        <div className="flex flex-col uppercase">
                            {uniqueCourses.length > 0 ? uniqueCourses.map((c, idx) => (
                                <div key={c.id}>{c.code} - {c.name}</div>
                            )) : <span>-</span>}
                        </div>
                    </div>
                </div>

                {/* Column 2: Contact Info */}
                <div className="space-y-1">
                    <div className="grid grid-cols-[14px_10px_1fr] items-center">
                        <div className="flex justify-center text-[10px]">☏</div>
                        <span>:</span><span>03-89117000 ext:</span>
                    </div>
                    <div className="grid grid-cols-[14px_10px_1fr] items-center">
                        <div className="flex justify-center text-[10px]">📱</div>
                        <span>:</span><span>{lecturer?.phone_number || '018-2324150'}</span>
                    </div>
                    <div className="grid grid-cols-[14px_10px_1fr] items-center">
                        <div className="flex justify-center text-[10px]">✉</div>
                        <span>:</span><span className="text-blue-700 underline lowercase">{lecturer?.email || 'email@uis.edu.my'}</span>
                    </div>
                </div>

                {/* Column 3: Total Hours */}
                <div className="space-y-1 pr-16 border-none">
                    <div className="grid grid-cols-[90px_10px_1fr]">
                        <span>JAM PENGAJARAN</span><span>:</span><span>{totalPdp} JAM</span>
                    </div>
                    <div className="grid grid-cols-[90px_10px_1fr]">
                        <span></span><span>:</span><span></span>
                    </div>
                </div>
            </div>

            {/* Timetable Grid */}
            <table className="w-full border-collapse grid-table text-center text-[7px] leading-tight mb-2">
                <thead>
                    <tr>
                        <th className="w-16">HARI/ WAKTU</th>
                        {timeSlots.map(s => <th key={s.label} className="w-16">{s.label}</th>)}
                        <th className="w-10">PdP (jam)</th>
                        <th className="w-10 italic">Lain-lain Aktiviti (jam)</th>
                    </tr>
                </thead>
                <tbody>
                    {days.map(day => {
                        const isEmpty = gridData[day.key].pdpHours === 0 && gridData[day.key].activityHours === 0;
                        return (
                            <tr key={day.key} className={isEmpty ? 'empty-row' : ''}>
                                <td className="font-bold bg-slate-50 text-[8px]">{day.label}</td>
                            {gridData[day.key].slots.map((slot, i) => {
                                if (slot === 'skip') return null;
                                if (!slot) return <td key={i}></td>;
                                
                                return (
                                    <td key={i} colSpan={slot.colSpan} className="p-1 font-medium bg-white border border-black">
                                        {slot.type === 'pdp' ? (
                                            <div className="flex flex-col justify-center h-full">
                                                <div className="text-[7.5px]">{slot.subjects?.code}</div>
                                                <div className="font-bold text-[7.5px]">{slot.class_type?.toUpperCase()}</div>
                                                <div className="text-[6.5px]">[{slot.room || ''}] [{Array.isArray(slot.group_names) ? slot.group_names.join(', ') : slot.group_names}]</div>
                                            </div>
                                        ) : (
                                            <div className="uppercase font-bold text-[7.5px]">{slot.name || slot.type_name || 'AKTIVITI'}</div>
                                        )}
                                    </td>
                                );
                            })}
                            <td className="font-bold text-[9px]">{gridData[day.key].pdpHours || '0'}</td>
                            <td className="font-bold text-[9px]">{gridData[day.key].activityHours || '0'}</td>
                        </tr>
                    );
                })}
                    <tr className="font-bold text-[9px]">
                        <td colSpan={12} className="text-right border-none h-8 pr-2">Jumlah Jam</td>
                        <td className="border border-black">{totalPdp}</td>
                        <td className="border border-black">{totalActivity}</td>
                    </tr>
                    <tr className="font-bold text-[9px]">
                        <td colSpan={12} className="text-right border-none h-8 pr-2">Jumlah Jam Keseluruhan</td>
                        <td colSpan={2} className="border border-black text-center">{totalPdp + totalActivity}</td>
                    </tr>
</tbody>
            </table>

            {/* Signatures */}
            <div className="flex justify-between items-start mt-8 text-[8px]">
                {/* Left: Disediakan Oleh */}
                <div className="w-[300px]">
                    <p className="font-bold mb-6">DISEDIAKAN OLEH:</p>
                    <div className="space-y-1">
                        <div className="grid grid-cols-[90px_10px_1fr]">
                            <span className="font-bold">NAMA</span>
                            <span>:</span>
                            <span className="uppercase">{lecturer?.name || ''}</span>
                        </div>
                        <div className="grid grid-cols-[90px_10px_1fr]">
                            <span className="font-bold">JAWATAN</span>
                            <span>:</span>
                            <span className="uppercase">
                                {lecturer?.role?.toUpperCase() === 'HOD' ? 'Ketua Jabatan' : 
                                 lecturer?.role?.toUpperCase() === 'HOP' ? 'Ketua Program' : 
                                 lecturer?.role?.toUpperCase() === 'LECTURER' ? 'Pensyarah' : 
                                 lecturer?.role || ''}
                            </span>
                        </div>
                        <div className="grid grid-cols-[90px_10px_1fr]">
                            <span className="font-bold">TARIKH</span>
                            <span>:</span>
                            <span>{new Date().toLocaleDateString('en-GB').replace(/\//g, '.')}</span>
                        </div>
                    </div>
                </div>

                {/* Right: Disahkan Oleh */}
                <div className="w-[300px]">
                    <p className="font-bold mb-6">DISAHKAN OLEH:</p>
                    <div className="space-y-1">
                        <div className="grid grid-cols-[90px_10px_1fr]">
                            <span className="font-bold">NAMA</span>
                            <span>:</span>
                            <span></span>
                        </div>
                        <div className="grid grid-cols-[90px_10px_1fr]">
                            <span className="font-bold">JAWATAN</span>
                            <span>:</span>
                            <span></span>
                        </div>
                        <div className="grid grid-cols-[90px_10px_1fr]">
                            <span className="font-bold">TARIKH</span>
                            <span>:</span>
                            <span></span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrintableWorkloadSheet;

