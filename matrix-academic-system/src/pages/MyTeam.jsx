import { useAuth } from '../auth/AuthContext';
import HodHopTeam from '../components/dashboard/HodHopTeam';

const MyTeam = () => {
    const { user } = useAuth();

    if (!['hod', 'hop'].includes(user?.role)) {
        return (
            <div className="p-8 text-center text-gray-500 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700">
                Access Restricted. This section is only for HOD and HOP roles.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Team</h1>
                <p className="text-gray-500 dark:text-gray-400">
                    Manage department lecturers and subject assignments
                </p>
            </header>

            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <HodHopTeam />
            </div>
        </div>
    );
};

export default MyTeam;
