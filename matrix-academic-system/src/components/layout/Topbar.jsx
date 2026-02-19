import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { LogOut, Bell, Search, Menu } from 'lucide-react';
import ThemeToggle from '../ThemeToggle';

const Topbar = ({ toggleMobileSidebar }) => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        const isLecturer = ['lecturer', 'hod', 'hop'].includes(user?.role);
        await signOut();
        if (isLecturer) {
            navigate('/lecturer-login');
        } else {
            navigate('/login');
        }
    };

    const roleLabel = user?.role === 'lecturer' ? 'Lecturer' :
        user?.role === 'hod' ? 'Head of Department' :
            user?.role === 'hop' ? 'Head of Program' :
                (user?.role === 'admin' ? 'Faculty Admin' : 'System User');

    return (
        <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 flex items-center justify-between px-6 sticky top-0 z-40 transition-colors">
            <div className="flex items-center">
                <button onClick={toggleMobileSidebar} className="mr-4 lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md text-gray-500 dark:text-gray-300">
                    <Menu size={20} />
                </button>
                <div className="relative hidden md:block">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search students, classes..."
                        className="pl-10 pr-4 py-2 border border-gray-100 dark:border-slate-700 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-800 w-64 transition-all dark:bg-slate-800 dark:text-white dark:placeholder-gray-500"
                    />
                </div>
            </div>

            {user?.semester_name && (
                <div className="hidden lg:flex items-center px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-full flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                    <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-widest leading-none">
                        {user.semester_name}
                    </span>
                </div>
            )}

            <div className="flex items-center space-x-4">
                <ThemeToggle />
                <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-full transition-colors relative">
                    <Bell size={20} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-slate-800"></span>
                </button>

                <div className="h-8 w-px bg-gray-200 dark:bg-slate-700 mx-2"></div>

                <div className="flex items-center space-x-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium text-gray-800 dark:text-white">{user?.email || 'User'}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">{roleLabel}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                        title="Sign Out"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Topbar;
