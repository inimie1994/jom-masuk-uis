import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabaseClient';
import PageHeader from '../components/common/PageHeader';
import ThemeToggle from '../components/ThemeToggle';
import { User, Building, Monitor, Save, Upload, Image as ImageIcon, CalendarDays, Plus, Trash2, DownloadCloud, Mail, Lock } from 'lucide-react';

const Settings = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
    const [facultyName, setFacultyName] = useState('');
    const [logoPreview, setLogoPreview] = useState(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [lecturerDetails, setLecturerDetails] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(false);

    // Attendance Settings State
    const [semesterStart, setSemesterStart] = useState('');
    const [semesterEnd, setSemesterEnd] = useState('');
    const [semesterName, setSemesterName] = useState('');
    const [holidays, setHolidays] = useState([]);
    const [newHolidayName, setNewHolidayName] = useState('');
    const [newHolidayDate, setNewHolidayDate] = useState('');
    const [newHolidayEndDate, setNewHolidayEndDate] = useState('');
    const [loadingHolidays, setLoadingHolidays] = useState(false);
    const [editingHolidayId, setEditingHolidayId] = useState(null);
    const [editHolidayName, setEditHolidayName] = useState('');
    const [editHolidayDate, setEditHolidayDate] = useState('');
    const [editHolidayEndDate, setEditHolidayEndDate] = useState('');

    useEffect(() => {
        if (user?.id) {
            if (activeTab === 'profile') fetchLecturerDetails();
        }
        if (user?.faculty_id) {
            if (activeTab === 'faculty' && user?.role === 'admin') fetchFacultyDetails();
            if (activeTab === 'attendance' && user?.role === 'admin') fetchAttendanceSettings();
        }
    }, [user?.id, user?.faculty_id, activeTab]);

    const fetchLecturerDetails = async () => {
        if (!user?.lecturer_id) return;
        try {
            setLoadingProfile(true);
            const { data, error } = await supabase
                .from('lecturers')
                .select(`
                    *,
                    departments (
                        id,
                        code,
                        name
                    )
                `)
                .eq('id', user.lecturer_id)
                .single();

            if (error) throw error;
            setLecturerDetails(data);
        } catch (err) {
            console.error('Error fetching lecturer details:', err);
        } finally {
            setLoadingProfile(false);
        }
    };

    const fetchAttendanceSettings = async () => {
        try {
            // Fetch Faculty Semester Dates
            const { data: facultyData, error: facultyError } = await supabase
                .from('faculties')
                .select('semester_start_date, semester_end_date')
                .eq('id', user.faculty_id)
                .single();

            if (facultyError) throw facultyError;
            if (facultyData) {
                setSemesterStart(facultyData.semester_start_date || '');
                setSemesterEnd(facultyData.semester_end_date || '');
                setSemesterName(facultyData.semester_name || '');
            }

            // Fetch Holidays
            fetchHolidays();
        } catch (err) {
            console.error('Error fetching attendance settings:', err);
        }
    };

    const fetchHolidays = async () => {
        try {
            setLoadingHolidays(true);
            const { data, error } = await supabase
                .from('holidays')
                .select('*')
                .eq('faculty_id', user.faculty_id)
                .order('date', { ascending: true });

            if (error) throw error;
            setHolidays(data || []);
        } catch (err) {
            console.error('Error fetching holidays:', err);
        } finally {
            setLoadingHolidays(false);
        }
    };

    const fetchFacultyDetails = async () => {
        const { data, error } = await supabase
            .from('faculties')
            .select('name')
            .eq('id', user.faculty_id)
            .single();

        if (data) {
            setFacultyName(data.name);
            setLogoPreview(data.logo_url);
        }
    };

    const handleUpdateFaculty = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const { error } = await supabase
                .from('faculties')
                .update({ name: facultyName })
                .eq('id', user.faculty_id);

            if (error) throw error;
            setMessage({ type: 'success', text: 'Faculty settings updated successfully.' });
        } catch (error) {
            console.error('Error updating faculty:', error);
            setMessage({ type: 'error', text: 'Failed to update faculty settings.' });
        } finally {
            setLoading(false);
        }
    };

    const handleLogoUpload = async (e) => {
        try {
            setUploadingLogo(true);
            const file = e.target.files[0];
            if (!file) return;

            const fileExt = file.name.split('.').pop();
            const fileName = `${user.faculty_id}/${Date.now()}_logo.${fileExt}`;
            const filePath = `faculty_logos/${fileName}`;

            // 1. Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('assets')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('assets')
                .getPublicUrl(filePath);

            // 3. Update Database
            const { error: dbError } = await supabase
                .from('faculties')
                .update({ logo_url: publicUrl })
                .eq('id', user.faculty_id);

            if (dbError) throw dbError;

            setLogoPreview(publicUrl);
            setMessage({ type: 'success', text: 'Faculty logo updated successfully.' });

            // Reload page to reflect changes globally (simple way to update AuthContext)
            window.location.reload();

        } catch (error) {
            console.error('Error uploading logo:', error);
            setMessage({ type: 'error', text: 'Failed to upload logo.' });
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleUpdateSemester = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        try {
            const { error } = await supabase
                .from('faculties')
                .update({
                    semester_start_date: semesterStart,
                    semester_end_date: semesterEnd,
                    semester_name: semesterName
                })
                .eq('id', user.faculty_id);

            if (error) throw error;
            setMessage({ type: 'success', text: 'Semester dates updated successfully.' });
        } catch (err) {
            console.error('Error updating semester dates:', err);
            setMessage({ type: 'error', text: 'Failed to update semester dates.' });
        } finally {
            setLoading(false);
        }
    };

    const handleAddHoliday = async (e) => {
        e.preventDefault();
        if (!newHolidayName || !newHolidayDate) return;

        try {
            const { error } = await supabase
                .from('holidays')
                .insert([{
                    faculty_id: user.faculty_id,
                    name: newHolidayName,
                    date: newHolidayDate,
                    end_date: newHolidayEndDate || null
                }]);

            if (error) throw error;
            setNewHolidayName('');
            setNewHolidayDate('');
            setNewHolidayEndDate('');
            fetchHolidays();
            setMessage({ type: 'success', text: 'Holiday added successfully.' });
        } catch (err) {
            console.error('Error adding holiday:', err);
            setMessage({ type: 'error', text: `Failed to add holiday: ${err.message || err.details || err}` });
        }
    };

    const handleEditHoliday = (holiday) => {
        setEditingHolidayId(holiday.id);
        setEditHolidayName(holiday.name);
        setEditHolidayDate(holiday.date);
        setEditHolidayEndDate(holiday.end_date || '');
    };

    const handleCancelEdit = () => {
        setEditingHolidayId(null);
        setEditHolidayName('');
        setEditHolidayDate('');
        setEditHolidayEndDate('');
    };

    const handleUpdateHoliday = async (e) => {
        e.preventDefault();
        if (!editHolidayName || !editHolidayDate) return;

        try {
            const { error } = await supabase
                .from('holidays')
                .update({
                    name: editHolidayName,
                    date: editHolidayDate,
                    end_date: editHolidayEndDate || null
                })
                .eq('id', editingHolidayId);

            if (error) throw error;
            setEditingHolidayId(null);
            fetchHolidays();
            setMessage({ type: 'success', text: 'Holiday updated successfully.' });
        } catch (err) {
            console.error('Error updating holiday:', err);
            setMessage({ type: 'error', text: `Failed to update holiday: ${err.message || err.details || err}` });
        }
    };

    const handleDeleteHoliday = async (id) => {
        if (!confirm('Are you sure you want to delete this holiday?')) return;
        try {
            const { error } = await supabase
                .from('holidays')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchHolidays();
            setMessage({ type: 'success', text: 'Holiday deleted successfully.' });
        } catch (err) {
            console.error('Error deleting holiday:', err);
            setMessage({ type: 'error', text: 'Failed to delete holiday.' });
        }
    };

    const handleImportHolidays = async () => {
        if (!semesterStart || !semesterEnd) {
            setMessage({ type: 'error', text: 'Please set Semester Dates first.' });
            return;
        }

        if (!confirm('This will import Public Holidays for Malaysia based on the semester duration. Continue?')) return;

        setLoadingHolidays(true);
        setMessage(null);

        try {
            const semStart = new Date(semesterStart);
            const semEnd = new Date(semesterEnd);
            const startYear = semStart.getFullYear();
            const endYear = semEnd.getFullYear();

            // Create list of years to fetch
            const yearsToFetch = [];
            for (let y = startYear; y <= endYear; y++) {
                yearsToFetch.push(y);
            }

            // Fetch holidays for each year from Nager.Date API
            // API Docs: https://date.nager.at/Api
            const allFetchedHolidays = [];

            for (const year of yearsToFetch) {
                try {
                    const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/MY`);
                    if (!response.ok) throw new Error(`Failed to fetch for ${year}`);
                    const data = await response.json();
                    allFetchedHolidays.push(...data);
                } catch (err) {
                    console.error(`Error fetching holidays for ${year}:`, err);
                    // Continue to next year even if one fails
                }
            }

            if (allFetchedHolidays.length === 0) {
                throw new Error('No holiday data could be retrieved.');
            }

            // Normalize and Filter
            semStart.setHours(0, 0, 0, 0);
            semEnd.setHours(23, 59, 59, 999);

            const holidaysToInsert = [];
            const seenDates = new Set(); // Avoid duplicates from API or overlap

            allFetchedHolidays.forEach(h => {
                const hDate = new Date(h.date);
                hDate.setHours(0, 0, 0, 0);

                if (hDate >= semStart && hDate <= semEnd) {
                    // Use localName if available, else name
                    const name = h.localName || h.name;
                    const dateStr = h.date; // YYYY-MM-DD

                    if (!seenDates.has(dateStr)) {
                        seenDates.add(dateStr);
                        holidaysToInsert.push({
                            faculty_id: user.faculty_id,
                            name: name,
                            date: dateStr
                        });
                    }
                }
            });

            if (holidaysToInsert.length === 0) {
                setMessage({ type: 'info', text: 'No holidays found within the specified semester dates.' });
            } else {
                // Upsert to Supabase
                const { error: upsertError } = await supabase
                    .from('holidays')
                    .upsert(holidaysToInsert, { onConflict: 'faculty_id, date' });

                if (upsertError) throw upsertError;

                await fetchHolidays();
                setMessage({ type: 'success', text: `Successfully imported ${holidaysToInsert.length} holidays.` });
            }

        } catch (err) {
            console.error('Error importing holidays:', err);
            setMessage({
                type: 'error',
                text: `Import failed: ${err.message || 'Unknown error'}. You can still add holidays manually.`
            });
        } finally {
            setLoadingHolidays(false);
        }
    };

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        ...(user?.role === 'admin' ? [
            { id: 'faculty', label: 'Faculty', icon: Building },
            { id: 'attendance', label: 'Attendance', icon: CalendarDays }
        ] : []),
        { id: 'application', label: 'Application', icon: Monitor },
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <PageHeader title="Settings" />

            <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700 min-h-[400px]">
                <div className="flex flex-col md:flex-row h-full">
                    {/* Sidebar Tabs */}
                    <div className="w-full md:w-64 bg-gray-50 dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700">
                        <nav className="p-4 space-y-1">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${activeTab === tab.id
                                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-slate-800/50 hover:text-gray-900 dark:hover:text-gray-200'
                                        }`}
                                >
                                    <tab.icon size={18} className="mr-3" />
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 p-8">
                        {message && (
                            <div className={`mb-6 p-4 rounded-md text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
                                {message.text}
                            </div>
                        )}

                        {activeTab === 'profile' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center border-b pb-4 dark:border-slate-700">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Your Profile</h3>
                                    {loadingProfile && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Primary Info */}
                                    <div className="space-y-5">
                                        <div>
                                            <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">Display Name</label>
                                            <div className="text-lg font-bold text-gray-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-gray-100 dark:border-slate-800">
                                                {lecturerDetails?.name || user?.name || 'N/A'}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">Email Address</label>
                                            <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-gray-100 dark:border-slate-800">
                                                <Mail size={18} className="text-gray-400" />
                                                <span className="font-medium">{user?.email || 'N/A'}</span>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">System Role</label>
                                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/50">
                                                <Lock size={16} />
                                                <span className="font-bold uppercase tracking-wide text-sm">{user?.role || 'User'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Professional Info */}
                                    <div className="space-y-5">
                                        <div>
                                            <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">Staff ID / Username</label>
                                            <div className="text-gray-700 dark:text-gray-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-gray-100 dark:border-slate-800 flex items-center gap-3">
                                                <User size={18} className="text-gray-400" />
                                                <span className="font-bold">{lecturerDetails?.username || user?.username || 'N/A'}</span>
                                            </div>
                                        </div>

                                        {lecturerDetails?.departments && (
                                            <div>
                                                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">Department</label>
                                                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-gray-100 dark:border-slate-800 flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center font-black text-indigo-600 dark:text-indigo-400 border border-indigo-50 dark:border-indigo-900/30">
                                                        {lecturerDetails.departments.code}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900 dark:text-white leading-tight">
                                                            {lecturerDetails.departments.name}
                                                        </div>
                                                        <div className="text-[10px] uppercase font-black tracking-widest text-gray-400 mt-1">
                                                            Primary Affiliation
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {lecturerDetails?.program_code && (
                                            <div>
                                                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">Academic Program</label>
                                                <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50 rounded-xl inline-flex font-bold text-sm">
                                                    {lecturerDetails.program_code}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'faculty' && user?.role === 'admin' && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white border-b pb-2 dark:border-slate-700">Faculty Settings</h3>
                                <form onSubmit={handleUpdateFaculty}>
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Faculty Name</label>
                                            <input
                                                type="text"
                                                value={facultyName}
                                                onChange={(e) => setFacultyName(e.target.value)}
                                                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-slate-700 dark:text-white"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Institution Logo</label>
                                            <div className="mt-2 flex items-center space-x-6">
                                                <div className="shrink-0">
                                                    {logoPreview ? (
                                                        <img
                                                            className="h-24 w-24 object-contain rounded-md border border-gray-200 dark:border-slate-600 bg-white"
                                                            src={logoPreview}
                                                            alt="Current faculty logo"
                                                        />
                                                    ) : (
                                                        <div className="h-24 w-24 rounded-md border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 flex items-center justify-center">
                                                            <ImageIcon className="h-10 w-10 text-gray-400" />
                                                        </div>
                                                    )}
                                                </div>
                                                <label className="block">
                                                    <span className="sr-only">Choose profile photo</span>
                                                    <div className="relative">
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={handleLogoUpload}
                                                            disabled={uploadingLogo}
                                                            className="block w-full text-sm text-slate-500
                                                            file:mr-4 file:py-2 file:px-4
                                                            file:rounded-full file:border-0
                                                            file:text-sm file:font-semibold
                                                            file:bg-indigo-50 file:text-indigo-700
                                                            hover:file:bg-indigo-100 disabled:opacity-50 cursor-pointer"
                                                        />
                                                        {uploadingLogo && (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-slate-800/50">
                                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">PNG, JPG, GIF up to 2MB</p>
                                                </label>
                                            </div>
                                        </div>

                                        <div className="flex justify-end">
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                                            >
                                                {loading ? 'Saving...' : 'Save Changes'}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        )}



                        {activeTab === 'attendance' && user?.role === 'admin' && (
                            <div className="space-y-8">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white border-b pb-2 dark:border-slate-700 flex items-center">
                                    <CalendarDays className="mr-2" size={20} />
                                    Attendance Settings
                                </h3>

                                {/* Semester Settings */}
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4">Semester Duration</h4>
                                    <form onSubmit={handleUpdateSemester} className="bg-gray-50 dark:bg-slate-900/50 p-6 rounded-lg border border-gray-100 dark:border-slate-800">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Semester Name / Session</label>
                                                <input
                                                    type="text"
                                                    value={semesterName}
                                                    onChange={(e) => setSemesterName(e.target.value)}
                                                    placeholder="e.g. SESI I 2024/2025"
                                                    className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-slate-800 dark:text-white"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Semester Start Date</label>
                                                <input
                                                    type="date"
                                                    value={semesterStart}
                                                    onChange={(e) => setSemesterStart(e.target.value)}
                                                    className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-slate-800 dark:text-white"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Semester End Date</label>
                                                <input
                                                    type="date"
                                                    value={semesterEnd}
                                                    onChange={(e) => setSemesterEnd(e.target.value)}
                                                    className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-slate-800 dark:text-white"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="mt-4 flex justify-end">
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                                            >
                                                <Save size={16} className="mr-2" />
                                                Save Settings
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {/* Holiday Management */}
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Public Holidays</h4>
                                        <button
                                            type="button"
                                            onClick={handleImportHolidays}
                                            disabled={loadingHolidays}
                                            className="inline-flex items-center text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium disabled:opacity-50"
                                        >
                                            <DownloadCloud size={14} className="mr-1" />
                                            Import from Google Calendar
                                        </button>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-slate-900/50 p-6 rounded-lg border border-gray-100 dark:border-slate-800 space-y-6">
                                        {/* Add Holiday Form */}
                                        <form onSubmit={handleAddHoliday} className="flex flex-col md:flex-row gap-4 items-end">
                                            <div className="flex-1 w-full">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Holiday Name</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. New Year"
                                                    value={newHolidayName}
                                                    onChange={(e) => setNewHolidayName(e.target.value)}
                                                    className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-slate-800 dark:text-white"
                                                    required
                                                />
                                            </div>
                                            <div className="w-full md:w-40">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                                                <input
                                                    type="date"
                                                    value={newHolidayDate}
                                                    onChange={(e) => setNewHolidayDate(e.target.value)}
                                                    className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-slate-800 dark:text-white"
                                                    required
                                                />
                                            </div>
                                            <div className="w-full md:w-40">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date (Optional)</label>
                                                <input
                                                    type="date"
                                                    value={newHolidayEndDate}
                                                    onChange={(e) => setNewHolidayEndDate(e.target.value)}
                                                    className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-slate-800 dark:text-white"
                                                />
                                            </div>
                                            <button
                                                type="submit"
                                                className="w-full md:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 h-10"
                                            >
                                                <Plus size={16} className="mr-2" />
                                                Add
                                            </button>
                                        </form>

                                        {/* Holiday List */}
                                        <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
                                            {loadingHolidays ? (
                                                <div className="text-center text-gray-500 py-4">Loading holidays...</div>
                                            ) : holidays.length === 0 ? (
                                                <div className="text-center text-gray-400 py-4 italic">No holidays added yet.</div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {holidays.map((holiday) => (
                                                        <div key={holiday.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-md border border-gray-200 dark:border-slate-700 shadow-sm leading-none">
                                                            {editingHolidayId === holiday.id ? (
                                                                <form onSubmit={handleUpdateHoliday} className="flex-1 flex flex-col md:flex-row gap-3 items-end">
                                                                    <div className="flex-1 w-full">
                                                                        <input
                                                                            type="text"
                                                                            value={editHolidayName}
                                                                            onChange={(e) => setEditHolidayName(e.target.value)}
                                                                            className="block w-full px-2 py-1.5 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm dark:bg-slate-700 dark:text-white"
                                                                            required
                                                                        />
                                                                    </div>
                                                                    <div className="w-full md:w-36">
                                                                        <input
                                                                            type="date"
                                                                            value={editHolidayDate}
                                                                            onChange={(e) => setEditHolidayDate(e.target.value)}
                                                                            className="block w-full px-2 py-1.5 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm dark:bg-slate-700 dark:text-white"
                                                                            required
                                                                        />
                                                                    </div>
                                                                    <div className="w-full md:w-36">
                                                                        <input
                                                                            type="date"
                                                                            value={editHolidayEndDate}
                                                                            onChange={(e) => setEditHolidayEndDate(e.target.value)}
                                                                            className="block w-full px-2 py-1.5 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm dark:bg-slate-700 dark:text-white"
                                                                        />
                                                                    </div>
                                                                    <div className="flex gap-2 shrink-0">
                                                                        <button type="submit" className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md">
                                                                            <Save size={18} />
                                                                        </button>
                                                                        <button type="button" onClick={handleCancelEdit} className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md">
                                                                            <Plus size={18} className="rotate-45" />
                                                                        </button>
                                                                    </div>
                                                                </form>
                                                            ) : (
                                                                <>
                                                                    <div className="flex items-center space-x-4">
                                                                        <div className="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 p-2 rounded-full">
                                                                            <CalendarDays size={18} />
                                                                        </div>
                                                                        <div>
                                                                            <h5 className="text-sm font-bold text-gray-900 dark:text-white">{holiday.name}</h5>
                                                                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                                                                                {new Date(holiday.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                                                {holiday.end_date && ` - ${new Date(holiday.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center space-x-1">
                                                                        <button
                                                                            onClick={() => handleEditHoliday(holiday)}
                                                                            className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-md transition-colors"
                                                                            title="Edit Holiday"
                                                                        >
                                                                            <Save size={16} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteHoliday(holiday.id)}
                                                                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                                                            title="Delete Holiday"
                                                                        >
                                                                            <Trash2 size={16} />
                                                                        </button>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'application' && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white border-b pb-2 dark:border-slate-700">Application Settings</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-base font-medium text-gray-900 dark:text-white">Theme Preference</h4>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Manage your light or dark mode preference.</p>
                                        </div>
                                        <ThemeToggle />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div >
    );
};

export default Settings;
