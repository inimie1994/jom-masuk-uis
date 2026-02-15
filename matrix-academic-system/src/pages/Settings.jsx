
import PageHeader from '../components/common/PageHeader';

const Settings = () => {
    return (
        <div>
            <PageHeader title="Settings" />
            <div className="bg-white dark:bg-slate-800 shadow rounded-lg p-6 max-w-2xl border border-gray-200 dark:border-slate-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">General Settings</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Faculty Name</label>
                        <input type="text" className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 dark:bg-slate-700 dark:text-white" defaultValue="Faculty of Computer Science" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Academic Year</label>
                        <select className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 dark:bg-slate-700 dark:text-white">
                            <option>2023/2024</option>
                            <option>2024/2025</option>
                        </select>
                    </div>
                    <div className="flex items-center">
                        <input id="notifications" type="checkbox" className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded dark:bg-slate-700 dark:border-slate-600" defaultChecked />
                        <label htmlFor="notifications" className="ml-2 block text-sm text-gray-900 dark:text-gray-200">Enable Email Notifications</label>
                    </div>
                    <div className="pt-4">
                        <button className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Save Changes</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
