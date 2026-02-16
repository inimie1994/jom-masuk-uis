import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabaseClient';
import PageHeader from '../components/common/PageHeader';
import ThemeToggle from '../components/ThemeToggle';
import { User, Building, Monitor, Save, Upload, Image as ImageIcon } from 'lucide-react';

const Settings = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
    const [facultyName, setFacultyName] = useState('');
    const [logoPreview, setLogoPreview] = useState(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        if (user?.faculty_id && activeTab === 'faculty') {
            fetchFacultyDetails();
        }
    }, [user?.faculty_id, activeTab]);

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

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        ...(user?.role === 'admin' ? [{ id: 'faculty', label: 'Faculty', icon: Building }] : []),
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
        </div>
    );
};

export default Settings;
