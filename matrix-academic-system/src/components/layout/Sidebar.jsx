
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
    LayoutDashboard,
    Users,
    Building2,
    GraduationCap,
    BookOpen,
    CalendarDays,
    CalendarCheck,
    ClipboardList,
    FileText,
    PieChart,
    Activity,
    Settings,
    ChevronLeft,
    ChevronRight,
    School,
    CalendarRange
} from 'lucide-react';

const Sidebar = ({ isMobile, className = '' }) => {
    const { user, realUser, activeFaculty } = useAuth();
    const [collapsed, setCollapsed] = useState(false);

    const adminNavItems = [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/students', label: 'Students', icon: Users },
        { path: '/lecturers', label: 'Lecturers', icon: GraduationCap },
        { path: '/subjects', label: 'Subjects', icon: BookOpen },
        { path: '/enrollment', label: 'Enrollment', icon: ClipboardList },
        { path: '/timetable', label: 'Timetable', icon: CalendarDays },
        { path: '/attendance', label: 'Attendance', icon: CalendarCheck },
        { path: '/assessments', label: 'Assessments', icon: FileText },
        { path: '/reports', label: 'Reports', icon: PieChart },
        { path: '/audit-logs', label: 'Audit Logs', icon: Activity },
        { path: '/settings', label: 'Settings', icon: Settings },
        { path: '/unjuran-maker', label: 'Unjuran Maker', icon: CalendarRange },
    ];

    const lecturerNavItems = [
        { path: '/lecturer-dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/lecturer-timetable', label: 'Timetable', icon: CalendarDays },
        { path: '/subjects', label: 'My Classes', icon: GraduationCap },
        { path: '/my-students', label: 'My Students', icon: Users },
        { path: '/attendance', label: 'Mark Attendance', icon: CalendarCheck },
        { path: '/assessments', label: 'Assessments', icon: FileText },
        { path: '/lecturer-reports', label: 'Reports', icon: PieChart },
        ...(user?.role === 'hod' || user?.role === 'hop' ? [{ path: '/my-team', label: 'My Team', icon: Users }] : []),
        ...(user?.role === 'hod' || user?.role === 'hop' ? [{ path: '/unjuran-maker', label: 'Unjuran Maker', icon: CalendarRange }] : []),
        { path: '/settings', label: 'Settings', icon: Settings },
    ];

    const isLecturerRole = ['lecturer', 'hod', 'hop'].includes(user?.role);
    const isSuperadminRoot = realUser?.role === 'superadmin' && !activeFaculty;

    const superadminNavItems = [
        { path: '/admin/faculties', label: 'Platform Management', icon: Building2 },
    ];

    const navItems = isSuperadminRoot ? superadminNavItems : (isLecturerRole ? lecturerNavItems : adminNavItems);

    const getRoleLabel = () => {
        if (!user) return 'Guest';
        if (realUser?.role === 'superadmin') return activeFaculty ? 'Admin (Impersonating)' : 'Super Administrator';
        switch (user.role) {
            case 'admin': return 'Faculty Admin';
            case 'hod': return 'Head of Department';
            case 'hop': return 'Head of Program';
            case 'lecturer': return 'Lecturer';
            default: return 'Loading Role...';
        }
    };
    const roleLabel = getRoleLabel();

    const toggleSidebar = () => {
        setCollapsed(!collapsed);
    };

    return (
        <aside
            className={`
                bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 transition-all duration-300 flex flex-col z-50
                ${isMobile ? 'fixed inset-y-0 left-0 w-64' : `hidden lg:flex ${collapsed ? 'w-20' : 'w-64'}`}
                ${isMobile && collapsed ? '-translate-x-full' : ''}
                ${className}
            `}
        >
            <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100 dark:border-slate-800">
                {!collapsed && (
                    <div className="flex items-center gap-3 overflow-hidden">
                        {user?.faculty_logo ? (
                            <img src={user.faculty_logo} alt="Faculty Logo" className="h-10 w-auto object-contain flex-shrink-0" />
                        ) : (
                            <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                                <span className="text-xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent italic">M</span>
                            </div>
                        )}
                        <div className="flex flex-col min-w-0">
                            {user?.faculty_name ? (
                                <span className={`font-bold leading-tight dark:text-white uppercase truncate-2-lines ${user.faculty_name.length > 25 ? 'text-[9px]' : 'text-[10px]'}`}>
                                    {user.faculty_name}
                                </span>
                            ) : (
                                <span className="text-xl font-bold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">Matrix</span>
                            )}
                        </div>
                    </div>
                )}
                {!isMobile && (
                    <button onClick={toggleSidebar} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 dark:text-slate-400 dark:hover:text-white transition-colors">
                        {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                    </button>
                )}
            </div>

            <nav className="flex-1 overflow-y-auto py-4">
                <ul className="space-y-1 px-2">
                    {navItems.map((item) => (
                        <li key={item.path}>
                            <NavLink
                                to={item.path}
                                className={({ isActive }) => `
                                    flex items-center px-4 py-3 rounded-xl transition-all duration-200
                                    ${isActive
                                        ? 'bg-pastel-indigo text-indigo-600 shadow-sm border border-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800/50'
                                        : 'text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50 dark:hover:text-white'
                                    }
                                `}
                            >
                                <item.icon size={20} className={`${collapsed ? 'mx-auto' : 'mr-3'}`} />
                                {!collapsed && <span>{item.label}</span>}
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>

            <div className="p-4 border-t border-gray-200 dark:border-slate-800">
                <div className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-3'}`}>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                        {user?.email?.substring(0, 2).toUpperCase() || 'US'}
                    </div>
                    {!collapsed && (
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{user?.email}</p>
                            <p className="text-xs text-gray-500 dark:text-slate-500">{roleLabel}</p>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
