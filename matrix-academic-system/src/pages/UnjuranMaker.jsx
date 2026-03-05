import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabaseClient';
import PageHeader from '../components/common/PageHeader';
import Modal from '../components/common/Modal';
import {
    Plus, Trash2, Printer, Download, Save, ChevronDown,
    Edit3, Check, X, Copy, AlertCircle, Loader, BookOpen, FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';

const CLASS_TYPES = ['Lecture', 'Tutorial', 'Lab', 'Mentoring'];
const CAN_EDIT_ROLES = ['hop', 'hod', 'admin'];

// ─────────────────────────────────────────────
// Printable Report (matches E-JADUAL screenshot format)
// ─────────────────────────────────────────────
const PrintableUnjuran = ({ rows, summaries, lecturers, subjects, sessionName, facultyName, comparisonSessions }) => {
    const getLecturerById = (id) => lecturers.find(l => l.id === id);
    const getSubjectById = (id) => subjects.find(s => s.id === id);

    // Group rows by lecturer_id
    const lectGroupMap = {};
    rows.forEach(row => {
        const key = row.lecturer_id || '__no_lecturer__';
        if (!lectGroupMap[key]) lectGroupMap[key] = [];
        lectGroupMap[key].push(row);
    });
    const lecturerGroups = Object.entries(lectGroupMap);

    const sessionCols = comparisonSessions.length > 0 ? comparisonSessions : ['—', '—', '—', '—'];

    return (
        <div className="printable-unjuran hidden print:block font-serif text-black text-[8px] p-4">
            <style>{`
                @media print {
                    body > * { visibility: hidden !important; }
                    .printable-unjuran, .printable-unjuran * { visibility: visible !important; }
                    .printable-unjuran { position: fixed; top: 0; left: 0; width: 100%; }
                    @page { size: A3 landscape; margin: 10mm; }
                }
            `}</style>
            <div className="text-center mb-3">
                <div className="font-bold text-[11px]">E-JADUAL (JADUAL WAKTU KULIAH)</div>
                <div className="font-bold text-[11px] underline">UNJURAN</div>
            </div>
            <table className="text-[7px] mb-3" style={{ borderCollapse: 'collapse' }}>
                <tbody>
                    <tr>
                        <td className="pr-4 font-bold">JABATAN:</td>
                        <td className="border-b border-black min-w-[200px]">&nbsp;</td>
                    </tr>
                    <tr>
                        <td className="pr-4 font-bold">FAKULTI/PUSAT:</td>
                        <td className="border-b border-black">{facultyName}</td>
                    </tr>
                    <tr>
                        <td className="pr-4 font-bold">SESI:</td>
                        <td className="border-b border-black">{sessionName}</td>
                    </tr>
                </tbody>
            </table>

            <table className="w-full text-[7px]" style={{ borderCollapse: 'collapse', border: '1px solid black' }}>
                <thead>
                    <tr>
                        <th rowSpan={2} className="border border-black p-1 text-center">NO</th>
                        <th rowSpan={2} className="border border-black p-1 text-center">KOD PENSYARAH</th>
                        <th rowSpan={2} className="border border-black p-1 text-center">NAMA PENSYARAH<br />(MODE A - E)</th>
                        <th rowSpan={2} className="border border-black p-1 text-center">KOD KURSUS</th>
                        <th rowSpan={2} className="border border-black p-1 text-center">NAMA KURSUS</th>
                        <th rowSpan={2} className="border border-black p-1 text-center">KUMPULAN<br />PELAJAR</th>
                        <th rowSpan={2} className="border border-black p-1 text-center">KATEGORI<br />KELAS</th>
                        <th rowSpan={2} className="border border-black p-1 text-center">KULIAH</th>
                        <th rowSpan={2} className="border border-black p-1 text-center">TUTORIAL</th>
                        <th rowSpan={2} className="border border-black p-1 text-center">MAKMAL</th>
                        <th rowSpan={2} className="border border-black p-1 text-center">BILANGAN<br />PELAJAR</th>
                        <th rowSpan={2} className="border border-black p-1 text-center">JAM<br />MENGAJAR</th>
                        <th rowSpan={2} className="border border-black p-1 text-center">KETERANGAN SEKIRANYA<br />KELAS GABUNG</th>
                        <th colSpan={sessionCols.length} className="border border-black p-1 text-center">JAM TAHUNAN</th>
                    </tr>
                    <tr>
                        {sessionCols.map((s, i) => (
                            <th key={i} className="border border-black p-1 text-center">{s}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {lecturerGroups.map(([lectId, lectRows], groupIdx) => {
                        const lect = getLecturerById(lectId);
                        const summary = summaries.find(s => s.lecturer_id === lectId);
                        const jamTahunan = summary?.jam_tahunan || {};
                        const nonMentoring = lectRows.filter(r => !r.is_mentoring);
                        const totalStudents = nonMentoring.reduce((sum, r) => sum + (r.student_count || 0), 0);
                        return (
                            <>
                                {lectRows.map((row, rowIdx) => {
                                    const subj = getSubjectById(row.subject_id);
                                    const isFirst = rowIdx === 0;
                                    return (
                                        <tr key={row.id} className={row.is_mentoring ? 'bg-gray-100' : ''}>
                                            {isFirst && (
                                                <>
                                                    <td rowSpan={lectRows.length + 2} className="border border-black p-1 text-center align-top">{groupIdx + 1}</td>
                                                    <td rowSpan={lectRows.length + 2} className="border border-black p-1 text-center align-top">{lect?.name?.split(' ')[0] || '—'}</td>
                                                    <td rowSpan={lectRows.length + 2} className="border border-black p-1 text-center align-top">
                                                        {lect?.name || '—'}<br />
                                                        {row.lecturer_mode && <span className="text-[6px]">({row.lecturer_mode})</span>}
                                                    </td>
                                                </>
                                            )}
                                            {row.is_mentoring ? (
                                                <td colSpan={9} className="border border-black p-1 text-center font-bold">MENTORING</td>
                                            ) : (
                                                <>
                                                    <td className="border border-black p-1 text-center">{subj?.code || '—'}</td>
                                                    <td className="border border-black p-1">{subj?.name || '—'}</td>
                                                    <td className="border border-black p-1 text-center">{row.group_name || '—'}</td>
                                                    <td className="border border-black p-1 text-center">{row.class_type || '—'}</td>
                                                    <td className="border border-black p-1 text-center">{row.kuliah_hours || '—'}</td>
                                                    <td className="border border-black p-1 text-center">{row.tutorial_hours || '—'}</td>
                                                    <td className="border border-black p-1 text-center">{row.makmal_hours || '—'}</td>
                                                    <td className="border border-black p-1 text-center">{row.student_count || '—'}</td>
                                                    <td className="border border-black p-1 text-center">{row.jam_mengajar || '—'}</td>
                                                    <td className="border border-black p-1 text-[6px]">{row.notes || ''}</td>
                                                    {isFirst && sessionCols.map((s, i) => (
                                                        <td key={i} rowSpan={lectRows.length + 2} className="border border-black p-1 text-center align-middle font-bold bg-red-50">
                                                            {jamTahunan[s] ?? '—'}
                                                        </td>
                                                    ))}
                                                </>
                                            )}
                                        </tr>
                                    );
                                })}
                                {/* Total row per lecturer */}
                                <tr>
                                    <td colSpan={7} className="border border-black p-1 text-right font-bold text-[6px]">Jumlah:</td>
                                    <td className="border border-black p-1 text-center font-bold">{totalStudents}</td>
                                    <td className="border border-black p-1 text-center font-bold">
                                        {nonMentoring.reduce((sum, r) => sum + (r.jam_mengajar || 0), 0)}
                                    </td>
                                    <td className="border border-black p-1"></td>
                                </tr>
                                {/* Grand total row */}
                                <tr className="bg-gray-200">
                                    <td colSpan={10} className="border border-black p-1 text-center font-bold">Jumlah</td>
                                    <td className="border border-black p-1 text-center font-bold">{totalStudents}</td>
                                    <td className="border border-black p-1 text-center font-bold">
                                        {nonMentoring.reduce((sum, r) => sum + (r.jam_mengajar || 0), 0)}
                                    </td>
                                    <td className="border border-black p-1"></td>
                                </tr>
                            </>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

// ─────────────────────────────────────────────
// Inline editable cell
// ─────────────────────────────────────────────
const EditableCell = ({ value, onSave, type = 'text', options, className = '', readOnly = false }) => {
    const [editing, setEditing] = useState(false);
    const [local, setLocal] = useState(value ?? '');
    const inputRef = useRef(null);

    useEffect(() => { setLocal(value ?? ''); }, [value]);
    useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

    const commit = () => { onSave(local); setEditing(false); };
    const cancel = () => { setLocal(value ?? ''); setEditing(false); };

    if (readOnly) return <td className={`px-2 py-1 text-xs text-center ${className}`}>{value ?? '—'}</td>;

    if (editing) {
        if (type === 'select') return (
            <td className={`px-1 py-0.5 ${className}`}>
                <select ref={inputRef} value={local} onChange={e => setLocal(e.target.value)} onBlur={commit}
                    className="w-full text-xs border border-indigo-300 rounded px-1 py-0.5 bg-white dark:bg-slate-800 dark:text-white">
                    <option value="">—</option>
                    {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
                </select>
            </td>
        );
        return (
            <td className={`px-1 py-0.5 ${className}`}>
                <input ref={inputRef} type={type === 'number' ? 'number' : 'text'} value={local}
                    onChange={e => setLocal(type === 'number' ? Number(e.target.value) : e.target.value)}
                    onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
                    className="w-full text-xs border border-indigo-300 rounded px-1 py-0.5 bg-white dark:bg-slate-800 dark:text-white"
                />
            </td>
        );
    }
    return (
        <td className={`px-2 py-1 text-xs text-center cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20 group ${className}`}
            onDoubleClick={() => !readOnly && setEditing(true)}>
            <span className="group-hover:underline decoration-dashed decoration-indigo-400">{value || <span className="text-gray-300 text-[10px]">—</span>}</span>
        </td>
    );
};

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
const UnjuranMaker = () => {
    const { user } = useAuth();
    const canEdit = CAN_EDIT_ROLES.includes(user?.role);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Data
    const [lecturers, setLecturers] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [rows, setRows] = useState([]);
    const [summaries, setSummaries] = useState([]);

    // Session management
    const [sessionName, setSessionName] = useState('');
    const [allSessions, setAllSessions] = useState([]);
    const [newSession, setNewSession] = useState('');
    const [showNewSessionInput, setShowNewSessionInput] = useState(false);

    // Comparison sessions for JAM TAHUNAN (stored on summaries)
    const [comparisonSessions, setComparisonSessions] = useState([]);
    const [newCompSession, setNewCompSession] = useState('');

    // Department Resolution
    const [departmentId, setDepartmentId] = useState(user?.department_id || null);
    const [isCheckingDept, setIsCheckingDept] = useState(!user?.department_id);

    useEffect(() => {
        const resolveDepartment = async () => {
            if (user?.role === 'admin') {
                setIsCheckingDept(false);
                return;
            }

            if (user?.department_id) {
                setDepartmentId(user.department_id);
                setIsCheckingDept(false);
                return;
            }

            if (user?.lecturer_id) {
                try {
                    const { data, error } = await supabase
                        .from('lecturers')
                        .select('department_id')
                        .eq('id', user.lecturer_id)
                        .single();

                    if (data) {
                        setDepartmentId(data.department_id);
                    }
                } catch (err) {
                    console.error('Error resolving department:', err);
                }
            }
            setIsCheckingDept(false);
        };

        resolveDepartment();
    }, [user]);

    // Modals
    const [addRowModal, setAddRowModal] = useState(false);
    const [importModal, setImportModal] = useState(false);
    const [summaryModal, setSummaryModal] = useState(false);
    const [selectedLecturerForSummary, setSelectedLecturerForSummary] = useState(null);
    const [formData, setFormData] = useState({
        lecturer_id: '', lecturer_mode: '', subject_id: '', group_name: '',
        class_type: 'Lecture', kuliah_hours: 0, tutorial_hours: 0,
        makmal_hours: 0, student_count: 0, jam_mengajar: 0, notes: '', is_mentoring: false
    });

    const showMsg = (msg, isError = false) => {
        if (isError) setError(msg); else setSuccess(msg);
        setTimeout(() => { setError(null); setSuccess(null); }, 3500);
    };

    // ── Fetch lookups ──
    useEffect(() => {
        if (user?.faculty_id && !isCheckingDept) {
            fetchLecturers();
            fetchSubjects();
            fetchSessions();
        }
    }, [user?.faculty_id, isCheckingDept, departmentId]);

    // ── Fetch rows when session changes ──
    useEffect(() => {
        if (sessionName) {
            fetchRows();
            fetchSummaries();
        } else {
            setRows([]);
            setSummaries([]);
        }
    }, [sessionName]);

    const fetchLecturers = async () => {
        let query = supabase.from('lecturers').select('id, name').eq('faculty_id', user.faculty_id);

        // Filter by department if not admin and departmentId is resolved
        if (user.role !== 'admin' && departmentId) {
            query = query.eq('department_id', departmentId);
        }

        const { data } = await query.order('name');
        setLecturers(data || []);
    };

    const fetchSubjects = async () => {
        let query = supabase.from('subjects').select('id, code, name').eq('faculty_id', user.faculty_id);

        // Filter by department if not admin and departmentId is resolved
        if (user.role !== 'admin' && departmentId) {
            query = query.eq('department_id', departmentId);
        }

        const { data } = await query.order('code');
        setSubjects(data || []);
    };

    const fetchSessions = async () => {
        const { data } = await supabase.from('unjuran').select('session_name').eq('faculty_id', user.faculty_id);
        const unique = [...new Set((data || []).map(r => r.session_name))].sort();
        setAllSessions(unique);
    };

    const fetchRows = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('unjuran')
            .select('*').eq('faculty_id', user.faculty_id).eq('session_name', sessionName)
            .order('sort_order').order('created_at');
        if (error) showMsg(error.message, true);
        setRows(data || []);
        setLoading(false);
    };

    const fetchSummaries = async () => {
        const { data } = await supabase.from('unjuran_lecturer_summary')
            .select('*').eq('faculty_id', user.faculty_id).eq('session_name', sessionName);
        setSummaries(data || []);
        // Derive comparison sessions from first summary
        if (data && data.length > 0 && data[0].comparison_sessions?.length > 0) {
            setComparisonSessions(data[0].comparison_sessions);
        } else {
            setComparisonSessions([]);
        }
    };

    // ── Session creation ──
    const handleCreateSession = async () => {
        const name = newSession.trim();
        if (!name) return;
        setSessionName(name);
        if (!allSessions.includes(name)) setAllSessions([...allSessions, name].sort());
        setNewSession('');
        setShowNewSessionInput(false);
    };

    // ── Add row ──
    const handleAddRow = async () => {
        if (!sessionName) return;
        setSaving(true);
        const payload = { ...formData, faculty_id: user.faculty_id, session_name: sessionName, created_by: user.id };
        const { error } = await supabase.from('unjuran').insert([payload]);
        if (error) showMsg(error.message, true);
        else { showMsg('Row added.'); await fetchRows(); setAddRowModal(false); }
        setSaving(false);
    };

    // ── Inline cell update ──
    const handleCellUpdate = async (rowId, field, value) => {
        setRows(prev => prev.map(r => r.id === rowId ? { ...r, [field]: value } : r));
        const { error } = await supabase.from('unjuran').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', rowId);
        if (error) showMsg(error.message, true);
    };

    // ── Delete row ──
    const handleDeleteRow = async (rowId) => {
        if (!window.confirm('Delete this row?')) return;
        const { error } = await supabase.from('unjuran').delete().eq('id', rowId);
        if (error) showMsg(error.message, true);
        else { setRows(prev => prev.filter(r => r.id !== rowId)); }
    };

    // ── Import from workload ──
    const handleImportWorkload = async () => {
        if (!sessionName) return;
        setSaving(true);
        const { data: wData, error: wErr } = await supabase
            .from('workload')
            .select(`*, lecturers(id, name, faculty_id), subjects(id, code, name)`)
            .in('lecturer_id', lecturers.map(l => l.id));
        if (wErr) { showMsg(wErr.message, true); setSaving(false); return; }

        const payloads = (wData || []).map((w, i) => ({
            faculty_id: user.faculty_id,
            session_name: sessionName,
            lecturer_id: w.lecturer_id,
            subject_id: w.subject_id,
            class_type: w.type,
            kuliah_hours: w.type === 'Lecture' ? w.hours : 0,
            tutorial_hours: w.type === 'Tutorial' ? w.hours : 0,
            makmal_hours: w.type === 'Lab' ? w.hours : 0,
            student_count: 0, jam_mengajar: w.hours,
            sort_order: i, created_by: user.id
        }));
        const { error } = await supabase.from('unjuran').insert(payloads);
        if (error) showMsg(error.message, true);
        else { showMsg(`Imported ${payloads.length} rows from current workload.`); await fetchRows(); setImportModal(false); }
        setSaving(false);
    };

    // ── JAM TAHUNAN inline update ──
    const handleJamTahunanUpdate = async (lectId, sessionKey, value) => {
        const existing = summaries.find(s => s.lecturer_id === lectId);
        const newJam = { ...(existing?.jam_tahunan || {}), [sessionKey]: Number(value) };
        if (existing) {
            const { error } = await supabase.from('unjuran_lecturer_summary')
                .update({ jam_tahunan: newJam, comparison_sessions: comparisonSessions, updated_at: new Date().toISOString() })
                .eq('id', existing.id);
            if (!error) setSummaries(prev => prev.map(s => s.lecturer_id === lectId ? { ...s, jam_tahunan: newJam } : s));
        } else {
            const payload = { faculty_id: user.faculty_id, session_name: sessionName, lecturer_id: lectId, jam_tahunan: newJam, comparison_sessions: comparisonSessions };
            const { data, error } = await supabase.from('unjuran_lecturer_summary').insert([payload]).select().single();
            if (!error && data) setSummaries(prev => [...prev, data]);
        }
    };

    // ── Save comparison sessions ──
    const handleSaveCompSessions = async () => {
        // Update all summaries with new comparison sessions
        for (const sum of summaries) {
            await supabase.from('unjuran_lecturer_summary').update({ comparison_sessions: comparisonSessions }).eq('id', sum.id);
        }
        showMsg('Comparison sessions updated.');
    };

    // ── Group rows by lecturer ──
    const groupedRows = {};
    rows.forEach(r => {
        const key = r.lecturer_id || '__none__';
        if (!groupedRows[key]) groupedRows[key] = [];
        groupedRows[key].push(r);
    });

    const getLecturer = (id) => lecturers.find(l => l.id === id);
    const getSubject = (id) => subjects.find(s => s.id === id);

    const handleExportExcel = () => {
        if (!sessionName || rows.length === 0) return;

        // 1. Prepare Header Info
        const headerData = [
            ['E-JADUAL (JADUAL WAKTU KULIAH)'],
            ['UNJURAN'],
            [],
            ['JABATAN:', ''],
            ['FAKULTI/PUSAT:', user?.faculty_name || ''],
            ['SESI:', sessionName],
            []
        ];

        // 2. Prepare Table Header
        const tableHeader = [
            'NO',
            'KOD PENSYARAH',
            'NAMA PENSYARAH (MODE A - E)',
            'KOD KURSUS',
            'NAMA KURSUS',
            'KUMPULAN PELAJAR',
            'KATEGORI KELAS',
            'KULIAH',
            'TUTORIAL',
            'MAKMAL',
            'BILANGAN PELAJAR',
            'JAM MENGAJAR',
            'KETERANGAN SEKIRANYA KELAS GABUNG'
        ];

        // Add comparison sessions to header
        comparisonSessions.forEach(s => tableHeader.push(`JAM TAHUNAN: ${s}`));

        const dataRows = [];
        const merges = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: tableHeader.length - 1 } }, // Title
            { s: { r: 1, c: 0 }, e: { r: 1, c: tableHeader.length - 1 } }  // Subtitle
        ];

        let currentRow = headerData.length + 1; // 0-indexed row in sheet (after table header)

        // 3. Process Lecturer Groups
        Object.entries(groupedRows).forEach(([lectId, lectRows], groupIdx) => {
            const lect = getLecturer(lectId);
            const summary = summaries.find(s => s.lecturer_id === lectId);
            const jamTahunan = summary?.jam_tahunan || {};

            const startRow = currentRow;
            const nonMentoring = lectRows.filter(r => !r.is_mentoring);
            const totalStudents = nonMentoring.reduce((sum, r) => sum + (r.student_count || 0), 0);
            const totalJam = nonMentoring.reduce((sum, r) => sum + (r.jam_mengajar || 0), 0);

            lectRows.forEach((row, rowIdx) => {
                const subj = getSubject(row.subject_id);
                const rowArr = [
                    groupIdx + 1,
                    lect?.name?.split(' ')[0] || '—',
                    lect?.name + (row.lecturer_mode ? ` (${row.lecturer_mode})` : ''),
                    row.is_mentoring ? 'MENTORING' : (subj?.code || '—'),
                    row.is_mentoring ? '' : (subj?.name || '—'),
                    row.is_mentoring ? '' : (row.group_name || '—'),
                    row.is_mentoring ? '' : (row.class_type || '—'),
                    row.is_mentoring ? 0 : (row.kuliah_hours || 0),
                    row.is_mentoring ? 0 : (row.tutorial_hours || 0),
                    row.is_mentoring ? 0 : (row.makmal_hours || 0),
                    row.is_mentoring ? 0 : (row.student_count || 0),
                    row.is_mentoring ? 0 : (row.jam_mengajar || 0),
                    row.notes || ''
                ];

                // Add comparison session values only on first row of lecturer
                comparisonSessions.forEach(s => {
                    rowArr.push(rowIdx === 0 ? (jamTahunan[s] || 0) : '');
                });

                dataRows.push(rowArr);
                currentRow++;
            });

            // Add Merges for Lecturer Info (spanning all subject rows + 2 summary rows)
            const spanHeight = lectRows.length + 2; // Rows for data + per-lecturer total + grand total (as in print)
            // Actually, print has summary and grand total. Let's match print exactly or slightly simplify.
            // Let's add the sub-total and total rows.

            // Sub-total
            dataRows.push([
                '', '', '', '', '', '', 'Jumlah:', '', '', '', totalStudents, totalJam, ''
            ]);
            currentRow++;

            // Grand total (visual separator in print)
            dataRows.push([
                '', '', '', '', '', '', 'Jumlah', '', '', '', totalStudents, totalJam, ''
            ]);
            currentRow++;

            // Apply Merges for NO, KOD, NAMA, and JAM TAHUNAN
            const endRow = currentRow - 1;
            merges.push({ s: { r: startRow, c: 0 }, e: { r: endRow, c: 0 } }); // NO
            merges.push({ s: { r: startRow, c: 1 }, e: { r: endRow, c: 1 } }); // KOD
            merges.push({ s: { r: startRow, c: 2 }, e: { r: endRow, c: 2 } }); // NAMA

            comparisonSessions.forEach((s, idx) => {
                const colIdx = 13 + idx;
                merges.push({ s: { r: startRow, c: colIdx }, e: { r: endRow, c: colIdx } });
            });
        });

        // 4. Create Workbook
        const worksheet = XLSX.utils.aoa_to_sheet([...headerData, tableHeader, ...dataRows]);
        worksheet['!merges'] = merges;

        // Set column widths
        worksheet['!cols'] = [
            { wch: 5 },  // NO
            { wch: 15 }, // KOD
            { wch: 30 }, // NAMA
            { wch: 12 }, // KOD KURSUS
            { wch: 40 }, // NAMA KURSUS
            { wch: 15 }, // KUMPULAN
            { wch: 15 }, // KATEGORI
            { wch: 8 },  // KULIAH
            { wch: 8 },  // TUT
            { wch: 8 },  // MAKMAL
            { wch: 12 }, // BIL PELAJAR
            { wch: 12 }, // JAM
            { wch: 30 }, // KETERANGAN
            ...comparisonSessions.map(() => ({ wch: 12 }))
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Unjuran');

        // 5. Download
        XLSX.writeFile(workbook, `Unjuran_${sessionName.replace(/\s+/g, '_')}.xlsx`);
    };

    return (
        <div className="h-full flex flex-col">
            {/* Printable (hidden until Ctrl+P) */}
            <PrintableUnjuran rows={rows} summaries={summaries} lecturers={lecturers} subjects={subjects}
                sessionName={sessionName} facultyName={user?.faculty_name || ''} comparisonSessions={comparisonSessions} />

            <PageHeader
                title="Unjuran Maker"
                description="Projected teaching schedule for the next semester"
            />

            {/* Alerts */}
            {error && (
                <div className="mx-6 mb-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
                    <AlertCircle size={16} /> {error}
                </div>
            )}
            {success && (
                <div className="mx-6 mb-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
                    <Check size={16} /> {success}
                </div>
            )}

            {/* Session Bar */}
            <div className="px-6 mb-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">Sesi Unjuran:</label>
                    <select value={sessionName} onChange={e => setSessionName(e.target.value)}
                        className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm px-3 py-2 shadow-sm w-56 dark:text-white">
                        <option value="">— Pilih Sesi —</option>
                        {allSessions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                {canEdit && (
                    showNewSessionInput ? (
                        <div className="flex items-center gap-2">
                            <input autoFocus value={newSession} onChange={e => setNewSession(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleCreateSession(); if (e.key === 'Escape') setShowNewSessionInput(false); }}
                                placeholder="e.g. SESI I 2026/2027" className="rounded-xl border border-indigo-300 bg-white dark:bg-slate-800 text-sm px-3 py-2 w-52 dark:text-white" />
                            <button onClick={handleCreateSession} className="px-3 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition">Use</button>
                            <button onClick={() => setShowNewSessionInput(false)} className="px-3 py-2 text-xs font-bold border border-gray-200 dark:border-slate-700 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition">Cancel</button>
                        </div>
                    ) : (
                        <button onClick={() => setShowNewSessionInput(true)}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-dashed border-indigo-400 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition">
                            <Plus size={14} /> New Session
                        </button>
                    )
                )}

                <div className="ml-auto flex items-center gap-2">
                    {canEdit && sessionName && (
                        <>
                            <button onClick={() => setImportModal(true)}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition">
                                <BookOpen size={14} /> Import Workload
                            </button>
                            <button onClick={() => setAddRowModal(true)}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm">
                                <Plus size={14} /> Add Row
                            </button>
                        </>
                    )}
                    {sessionName && (
                        <>
                            <button onClick={handleExportExcel}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-gray-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition">
                                <FileSpreadsheet size={14} /> Excel
                            </button>
                            <button onClick={() => window.print()}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-slate-800 text-white hover:bg-slate-700 transition">
                                <Printer size={14} /> Print
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Comparison Sessions Manager */}
            {sessionName && (
                <div className="px-6 mb-4 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">JAM TAHUNAN Columns:</span>
                        {comparisonSessions.map((cs, idx) => (
                            <span key={idx} className="flex items-center gap-1 px-2 py-1 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-400 font-medium">
                                {cs}
                                {canEdit && (
                                    <button onClick={() => setComparisonSessions(prev => prev.filter((_, i) => i !== idx))}
                                        className="hover:text-red-900 ml-0.5"><X size={10} /></button>
                                )}
                            </span>
                        ))}
                        {canEdit && (
                            <div className="flex items-center gap-1.5">
                                <input value={newCompSession} onChange={e => setNewCompSession(e.target.value)}
                                    placeholder="Add session label..." className="text-xs rounded-lg border border-gray-200 dark:border-slate-700 px-2 py-1 dark:bg-slate-900 dark:text-white w-40" />
                                <button onClick={() => { if (newCompSession.trim()) { setComparisonSessions(prev => [...prev, newCompSession.trim()]); setNewCompSession(''); } }}
                                    className="text-xs px-2 py-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition text-gray-700 dark:text-white">+ Add</button>
                                <button onClick={handleSaveCompSessions}
                                    className="text-xs px-2 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-bold flex items-center gap-1"><Save size={11} /> Save</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Main Table */}
            <div className="px-6 flex-1 overflow-auto">
                {!sessionName ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-slate-500">
                        <BookOpen size={56} className="mb-4 opacity-20" />
                        <p className="text-sm font-medium">Select or create a session to begin</p>
                    </div>
                ) : loading ? (
                    <div className="flex items-center justify-center h-64 text-gray-400">
                        <Loader size={24} className="animate-spin mr-2" /> Loading...
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs" style={{ minWidth: '1200px' }}>
                                <thead className="bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-800">
                                    <tr>
                                        <th className="px-3 py-3 text-left font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide text-[10px]">NO</th>
                                        <th className="px-3 py-3 text-left font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide text-[10px]">PENSYARAH (MODE)</th>
                                        <th className="px-3 py-3 text-left font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide text-[10px]">KOD KURSUS</th>
                                        <th className="px-3 py-3 text-left font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide text-[10px]">NAMA KURSUS</th>
                                        <th className="px-3 py-3 text-center font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide text-[10px]">KUMPULAN</th>
                                        <th className="px-3 py-3 text-center font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide text-[10px]">KATEGORI</th>
                                        <th className="px-3 py-3 text-center font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide text-[10px]">KULIAH</th>
                                        <th className="px-3 py-3 text-center font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide text-[10px]">TUT</th>
                                        <th className="px-3 py-3 text-center font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide text-[10px]">MAKMAL</th>
                                        <th className="px-3 py-3 text-center font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide text-[10px]">BIL PELAJAR</th>
                                        <th className="px-3 py-3 text-center font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide text-[10px]">JAM</th>
                                        <th className="px-3 py-3 text-left font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide text-[10px]">KETERANGAN</th>
                                        {comparisonSessions.map(cs => (
                                            <th key={cs} className="px-3 py-3 text-center font-bold text-red-600 dark:text-red-400 uppercase tracking-wide text-[10px] bg-red-50 dark:bg-red-900/10">{cs}</th>
                                        ))}
                                        {canEdit && <th className="px-3 py-3 text-center font-bold text-gray-400 text-[10px]">DEL</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(groupedRows).map(([lectId, lectRows], groupIdx) => {
                                        const lect = getLecturer(lectId);
                                        const summary = summaries.find(s => s.lecturer_id === lectId);
                                        const nonMentoring = lectRows.filter(r => !r.is_mentoring);
                                        const totalStudents = nonMentoring.reduce((acc, r) => acc + (r.student_count || 0), 0);
                                        const totalJam = nonMentoring.reduce((acc, r) => acc + (r.jam_mengajar || 0), 0);

                                        return (
                                            <>
                                                {/* Lecturer header row */}
                                                <tr key={`hdr-${lectId}`} className="bg-slate-50 dark:bg-slate-900/50 border-t-2 border-indigo-100 dark:border-indigo-800">
                                                    <td className="px-3 py-2 font-bold text-indigo-600 dark:text-indigo-400">{groupIdx + 1}</td>
                                                    <td colSpan={11} className="px-3 py-2 font-bold text-gray-800 dark:text-gray-100">
                                                        {lect?.name || 'Unknown Lecturer'}
                                                        {lectRows[0]?.lecturer_mode && (
                                                            <span className="ml-2 text-[10px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-bold">
                                                                {lectRows[0].lecturer_mode}
                                                            </span>
                                                        )}
                                                    </td>
                                                    {comparisonSessions.map(cs => (
                                                        <td key={cs} className="bg-red-50 dark:bg-red-900/10 px-1 py-1 text-center">
                                                            {canEdit ? (
                                                                <input type="number" min="0"
                                                                    defaultValue={summary?.jam_tahunan?.[cs] ?? ''}
                                                                    onBlur={e => handleJamTahunanUpdate(lectId, cs, e.target.value)}
                                                                    className="w-12 text-center text-xs border border-red-200 dark:border-red-800 rounded px-1 py-0.5 bg-white dark:bg-slate-800 dark:text-white font-bold text-red-600 dark:text-red-400" />
                                                            ) : (
                                                                <span className="font-bold text-red-600 dark:text-red-400">{summary?.jam_tahunan?.[cs] ?? '—'}</span>
                                                            )}
                                                        </td>
                                                    ))}
                                                    {canEdit && <td />}
                                                </tr>

                                                {/* Subject rows */}
                                                {lectRows.map(row => {
                                                    const subj = getSubject(row.subject_id);
                                                    if (row.is_mentoring) {
                                                        return (
                                                            <tr key={row.id} className="bg-amber-50 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-900">
                                                                <td />
                                                                <td colSpan={11} className="px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 italic">Mentoring</td>
                                                                {comparisonSessions.map(cs => <td key={cs} className="bg-red-50 dark:bg-red-900/10" />)}
                                                                {canEdit && (
                                                                    <td className="text-center px-2 py-1">
                                                                        <button onClick={() => handleDeleteRow(row.id)} className="text-red-400 hover:text-red-600 transition"><Trash2 size={13} /></button>
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        );
                                                    }
                                                    return (
                                                        <tr key={row.id} className="border-b border-gray-50 dark:border-slate-700 hover:bg-gray-50/50 dark:hover:bg-slate-700/20 group/row">
                                                            <td className="px-3 py-1.5 text-[10px] text-gray-400 dark:text-slate-500 text-center">{groupIdx + 1}.{lectRows.indexOf(row) + 1}</td>
                                                            <td className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">{subj?.code || '—'}</td>
                                                            <td className="px-2 py-1 text-xs text-gray-700 dark:text-gray-200 max-w-[160px] truncate">{subj?.name || '—'}</td>
                                                            <EditableCell value={row.group_name} type="text" readOnly={!canEdit}
                                                                onSave={v => handleCellUpdate(row.id, 'group_name', v)} />
                                                            <EditableCell value={row.class_type} type="select" readOnly={!canEdit}
                                                                options={CLASS_TYPES.map(t => ({ value: t, label: t }))}
                                                                onSave={v => handleCellUpdate(row.id, 'class_type', v)} />
                                                            <EditableCell value={row.kuliah_hours || null} type="number" readOnly={!canEdit}
                                                                onSave={v => handleCellUpdate(row.id, 'kuliah_hours', Number(v))} />
                                                            <EditableCell value={row.tutorial_hours || null} type="number" readOnly={!canEdit}
                                                                onSave={v => handleCellUpdate(row.id, 'tutorial_hours', Number(v))} />
                                                            <EditableCell value={row.makmal_hours || null} type="number" readOnly={!canEdit}
                                                                onSave={v => handleCellUpdate(row.id, 'makmal_hours', Number(v))} />
                                                            <EditableCell value={row.student_count || null} type="number" readOnly={!canEdit}
                                                                onSave={v => handleCellUpdate(row.id, 'student_count', Number(v))} />
                                                            <EditableCell value={row.jam_mengajar || null} type="number" readOnly={!canEdit}
                                                                onSave={v => handleCellUpdate(row.id, 'jam_mengajar', Number(v))} />
                                                            <EditableCell value={row.notes} type="text" readOnly={!canEdit}
                                                                onSave={v => handleCellUpdate(row.id, 'notes', v)} className="max-w-[140px]" />
                                                            {comparisonSessions.map(cs => <td key={cs} className="bg-red-50 dark:bg-red-900/10" />)}
                                                            {canEdit && (
                                                                <td className="text-center px-2 py-1 opacity-0 group-hover/row:opacity-100 transition">
                                                                    <button onClick={() => handleDeleteRow(row.id)} className="text-red-400 hover:text-red-600 transition"><Trash2 size={13} /></button>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    );
                                                })}

                                                {/* Totals row per lecturer */}
                                                <tr key={`tot-${lectId}`} className="bg-indigo-50 dark:bg-indigo-900/20 border-b-2 border-indigo-100 dark:border-indigo-800">
                                                    <td colSpan={9} className="px-3 py-1.5 text-right text-[11px] font-bold text-indigo-700 dark:text-indigo-300">Jumlah:</td>
                                                    <td className="px-2 py-1.5 text-center font-bold text-[11px] text-indigo-700 dark:text-indigo-300">{totalStudents}</td>
                                                    <td className="px-2 py-1.5 text-center font-bold text-[11px] text-indigo-700 dark:text-indigo-300">{totalJam}</td>
                                                    <td colSpan={comparisonSessions.length + 2} />
                                                </tr>
                                            </>
                                        );
                                    })}
                                    {rows.length === 0 && (
                                        <tr><td colSpan={13 + comparisonSessions.length} className="px-6 py-12 text-center text-gray-400 dark:text-slate-500 text-sm">
                                            No rows yet. {canEdit ? 'Click "Add Row" to begin.' : ''}
                                        </td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {canEdit && rows.length > 0 && (
                            <div className="px-4 py-2 text-[10px] text-gray-400 dark:text-slate-500 italic border-t border-gray-100 dark:border-slate-700">
                                Double-click any cell to edit inline.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Add Row Modal ── */}
            <Modal isOpen={addRowModal} onClose={() => setAddRowModal(false)} title="Add Unjuran Row">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pensyarah</label>
                            <select value={formData.lecturer_id} onChange={e => setFormData({ ...formData, lecturer_id: e.target.value })}
                                className="block w-full rounded-xl border border-gray-200 dark:border-slate-700 px-3 py-2 text-sm dark:bg-slate-800 dark:text-white">
                                <option value="">Select...</option>
                                {lecturers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mode (A/B/C/D/E)</label>
                            <input value={formData.lecturer_mode} onChange={e => setFormData({ ...formData, lecturer_mode: e.target.value })}
                                placeholder="e.g. MODE A" className="block w-full rounded-xl border border-gray-200 dark:border-slate-700 px-3 py-2 text-sm dark:bg-slate-800 dark:text-white" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subjek</label>
                            <select value={formData.subject_id} onChange={e => setFormData({ ...formData, subject_id: e.target.value })}
                                className="block w-full rounded-xl border border-gray-200 dark:border-slate-700 px-3 py-2 text-sm dark:bg-slate-800 dark:text-white">
                                <option value="">Select...</option>
                                {subjects.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kumpulan Pelajar</label>
                            <input value={formData.group_name} onChange={e => setFormData({ ...formData, group_name: e.target.value })}
                                placeholder="e.g. FASI 1A" className="block w-full rounded-xl border border-gray-200 dark:border-slate-700 px-3 py-2 text-sm dark:bg-slate-800 dark:text-white" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kategori Kelas</label>
                            <select value={formData.class_type} onChange={e => setFormData({ ...formData, class_type: e.target.value, is_mentoring: e.target.value === 'Mentoring' })}
                                className="block w-full rounded-xl border border-gray-200 dark:border-slate-700 px-3 py-2 text-sm dark:bg-slate-800 dark:text-white">
                                {CLASS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bil. Pelajar</label>
                            <input type="number" value={formData.student_count} onChange={e => setFormData({ ...formData, student_count: Number(e.target.value) })}
                                className="block w-full rounded-xl border border-gray-200 dark:border-slate-700 px-3 py-2 text-sm dark:bg-slate-800 dark:text-white" />
                        </div>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                        {[['Kuliah', 'kuliah_hours'], ['Tutorial', 'tutorial_hours'], ['Makmal', 'makmal_hours'], ['Jam Mengajar', 'jam_mengajar']].map(([label, field]) => (
                            <div key={field}>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
                                <input type="number" min="0" value={formData[field]} onChange={e => setFormData({ ...formData, [field]: Number(e.target.value) })}
                                    className="block w-full rounded-xl border border-gray-200 dark:border-slate-700 px-3 py-2 text-sm dark:bg-slate-800 dark:text-white" />
                            </div>
                        ))}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Keterangan (Kelas Gabung)</label>
                        <input value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            className="block w-full rounded-xl border border-gray-200 dark:border-slate-700 px-3 py-2 text-sm dark:bg-slate-800 dark:text-white" />
                    </div>
                    <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-slate-700">
                        <button onClick={() => setAddRowModal(false)} className="px-5 py-2 text-xs font-bold border border-gray-200 dark:border-slate-700 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition">Cancel</button>
                        <button onClick={handleAddRow} disabled={saving} className="px-5 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-1.5">
                            {saving && <Loader size={12} className="animate-spin" />} Add Row
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ── Import Modal ── */}
            <Modal isOpen={importModal} onClose={() => setImportModal(false)} title="Import from Current Workload">
                <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        This will import all lecturer workload records from the <strong>current semester</strong> into the session <strong>"{sessionName}"</strong> as a starting point.
                        Existing rows will <em>not</em> be overwritten — new rows will be appended.
                    </p>
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
                        ⚠️ Student counts and group names will need to be updated manually after import.
                    </div>
                    <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-slate-700">
                        <button onClick={() => setImportModal(false)} className="px-5 py-2 text-xs font-bold border border-gray-200 dark:border-slate-700 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition">Cancel</button>
                        <button onClick={handleImportWorkload} disabled={saving} className="px-5 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-1.5">
                            {saving && <Loader size={12} className="animate-spin" />} Import
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default UnjuranMaker;
