
import CalendarWidget from '../components/dashboard/CalendarWidget';

const Dashboard = () => {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Dashboard</h1>
            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-pastel border border-gray-100 dark:border-slate-800">
                <p className="text-gray-500 dark:text-slate-400 font-medium">Welcome to the Matrix Academic System Dashboard.</p>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-pastel-blue p-5 rounded-2xl border border-blue-100 dark:bg-blue-900/10 dark:border-blue-800/30">
                        <h3 className="font-bold text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">Total Students</h3>
                        <p className="text-3xl font-extrabold text-blue-900 dark:text-blue-100">--</p>
                    </div>
                    <div className="bg-pastel-green p-5 rounded-2xl border border-green-100 dark:bg-green-900/10 dark:border-green-800/30">
                        <h3 className="font-bold text-xs uppercase tracking-wider text-green-600 dark:text-green-400 mb-1">Active Classes</h3>
                        <p className="text-3xl font-extrabold text-green-900 dark:text-green-100">--</p>
                    </div>
                    <div className="bg-pastel-purple p-5 rounded-2xl border border-purple-100 dark:bg-purple-900/10 dark:border-purple-800/30">
                        <h3 className="font-bold text-xs uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-1">Pending Reports</h3>
                        <p className="text-3xl font-extrabold text-purple-900 dark:text-purple-100">--</p>
                    </div>
                </div>
            </div>

            <CalendarWidget />
        </div>
    );
};

export default Dashboard;
