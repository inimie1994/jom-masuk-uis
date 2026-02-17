import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabaseClient';
import PageHeader from '../components/common/PageHeader';
import ThemeToggle from '../components/ThemeToggle';
import { User, Building, Monitor, Save, Upload, Image as ImageIcon, CalendarDays, Plus, Trash2, DownloadCloud } from 'lucide-react';

const Settings = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
    const [facultyName, setFacultyName] = useState('');
    const [logoPreview, setLogoPreview] = useState(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    // Attendance Settings State
    const [semesterStart, setSemesterStart] = useState('');
    const [semesterEnd, setSemesterEnd] = useState('');
    const [holidays, setHolidays] = useState([]);
    const [newHolidayName, setNewHolidayName] = useState('');
    const [newHolidayDate, setNewHolidayDate] = useState('');
    const [loadingHolidays, setLoadingHolidays] = useState(false);

    useEffect(() => {
        if (user?.faculty_id) {
            if (activeTab === 'faculty') fetchFacultyDetails();
            if (activeTab === 'attendance') fetchAttendanceSettings();
        }
    }, [user?.faculty_id, activeTab]);

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
                    semester_end_date: semesterEnd
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
                    date: newHolidayDate
                }]);

            if (error) throw error;
            setNewHolidayName('');
            setNewHolidayDate('');
            fetchHolidays();
            setMessage({ type: 'success', text: 'Holiday added successfully.' });
        } catch (err) {
            console.error('Error adding holiday:', err);
            setMessage({ type: 'error', text: 'Failed to add holiday.' });
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

        if (!confirm('This will import holidays from Google Calendar for the current semester range. Continue?')) return;

        setLoadingHolidays(true);
        setMessage(null);

        try {
            // Google Calendar ICS URL for Malaysia Holidays
            const calendarUrl = 'https://calendar.google.com/calendar/ical/en.malaysia%23holiday%40group.v.calendar.google.com/public/basic.ics';
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(calendarUrl)}`;

            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error(`External service error: ${response.status} ${response.statusText}`);

            const text = await response.text();
            if (!text || !text.includes('BEGIN:VEVENT')) {
                throw new Error('Invalid or empty calendar data received');
            }

            // Regex to parse VEVENTs
            const eventBlocks = text.split('BEGIN:VEVENT').slice(1);
            const newHolidays = [];

            const semStart = new Date(semesterStart);
            const semEnd = new Date(semesterEnd);

            // Normalize dates to start of day for comparison
            semStart.setHours(0, 0, 0, 0);
            semEnd.setHours(23, 59, 59, 999);

            eventBlocks.forEach(block => {
                if (!block.includes('END:VEVENT')) return;

                // Extract Summary (Name) - handle potential multi-line and different line endings
                const summaryMatch = block.match(/SUMMARY:(.*?)(?:\r\n|\r|\n)/);
                let name = summaryMatch ? summaryMatch[1].trim() : 'Unknown Holiday';
                // Remove backslash escapes common in ICS
                name = name.replace(/\\,/g, ',').replace(/\\;/g, ';');

                // Extract Start Date
                // Format: DTSTART;VALUE=DATE:20250101 or DTSTART:20250101T000000Z
                const dtStartMatch = block.match(/DTSTART(?:;VALUE=DATE)?:(\d{8})/);

                if (dtStartMatch) {
                    const dateStr = dtStartMatch[1]; // YYYYMMDD
                    const year = parseInt(dateStr.substring(0, 4));
                    const month = parseInt(dateStr.substring(4, 6)) - 1;
                    const day = parseInt(dateStr.substring(6, 8));

                    const dateObj = new Date(year, month, day);

                    // Filter by Semester Range
                    if (dateObj >= semStart && dateObj <= semEnd) {
                        const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                        // Check for duplicates within this batch
                        if (!newHolidays.find(h => h.date === formattedDate)) {
                            newHolidays.push({
                                faculty_id: user.faculty_id,
                                name: name,
                                date: formattedDate
                            });
                        }
                    }
                }
            });

            if (newHolidays.length === 0) {
                setMessage({ type: 'info', text: 'No holidays found within the specified semester dates.' });
            } else {
                // Insert into Supabase (Upsert to avoid duplicates)
                const { error: upsertError } = await supabase
                    .from('holidays')
                    .upsert(newHolidays, { onConflict: 'faculty_id, date' });

                if (upsertError) throw upsertError;

                await fetchHolidays();
                setMessage({ type: 'success', text: `Successfully imported ${newHolidays.length} holidays.` });
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
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white border-b pb-2 dark:border-slate-700">Your Profile</h3>
                                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                                    <div className="sm:col-span-4">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                                        <div className="mt-1 flex rounded-md shadow-sm">
                                            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-400 sm:text-sm">
                                                @
                                            </span>
                                            <input
                                                type="text"
                                                disabled
                                                value={user?.email || ''}
                                                className="flex-1 pointer-events-none min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 dark:border-slate-600 bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 sm:text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="sm:col-span-3">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
                                        <input
                                            type="text"
                                            disabled
                                            value={user?.role?.toUpperCase() || 'USER'}
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 sm:text-sm"
                                        />
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
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                                Save Duration
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
                                            <div className="w-full md:w-48">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                                                <input
                                                    type="date"
                                                    value={newHolidayDate}
                                                    onChange={(e) => setNewHolidayDate(e.target.value)}
                                                    className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-slate-800 dark:text-white"
                                                    required
                                                />
                                            </div>
                                            <button
                                                type="submit"
                                                className="w-full md:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                            >
                                                <Plus size={16} className="mr-2" />
                                                Add Holiday
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
                                                        <div key={holiday.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-md border border-gray-200 dark:border-slate-700 shadow-sm">
                                                            <div className="flex items-center space-x-4">
                                                                <div className="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 p-2 rounded-full">
                                                                    <CalendarDays size={18} />
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium text-gray-900 dark:text-white">{holiday.name}</p>
                                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                        {new Date(holiday.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => handleDeleteHoliday(holiday.id)}
                                                                className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                                                                title="Delete Holiday"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
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
