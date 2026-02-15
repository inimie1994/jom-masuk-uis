import { useAuth } from '../../auth/AuthContext';
import { LogOut, Bell, Search, Menu } from 'lucide-react';
import ThemeToggle from '../ThemeToggle';

const Topbar = ({ toggleMobileSidebar }) => {
    const { user, signOut } = useAuth();

    // Simple placeholder for user email/name
    const userRole = 'Faculty Admin';

    return (
        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 sticky top-0 z-40 transition-colors">
            <div className="flex items-center">
                <button onClick={toggleMobileSidebar} className="mr-4 lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md text-gray-500 dark:text-gray-300">
                    <Menu size={20} />
                </button>
                <div className="relative hidden md:block">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search students, classes..."
                        className="pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-600 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64 transition-all dark:bg-slate-700 dark:text-white dark:placeholder-gray-400"
                    />
                </div>
            </div>

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
                        <p className="text-xs text-gray-500 dark:text-slate-400">{userRole}</p>
                    </div>
                    <button
                        onClick={() => signOut()}
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
