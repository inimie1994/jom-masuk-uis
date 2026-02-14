
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
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
    School
} from 'lucide-react';

const Sidebar = ({ isMobile }) => {
    const [collapsed, setCollapsed] = useState(false);

    const navItems = [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/students', label: 'Students', icon: Users },
        { path: '/lecturers', label: 'Lecturers', icon: GraduationCap },
        { path: '/subjects', label: 'Subjects', icon: BookOpen },
        { path: '/classes', label: 'Classes', icon: School },
        { path: '/enrollment', label: 'Enrollment', icon: ClipboardList },
        { path: '/timetable', label: 'Timetable', icon: CalendarDays },
        { path: '/attendance', label: 'Attendance', icon: CalendarCheck },
        { path: '/assessments', label: 'Assessments', icon: FileText },
        { path: '/reports', label: 'Reports', icon: PieChart },
        { path: '/audit-logs', label: 'Audit Logs', icon: Activity },
        { path: '/settings', label: 'Settings', icon: Settings },
    ];

    const toggleSidebar = () => {
        setCollapsed(!collapsed);
    };

    return (
        <aside
            className={`
                bg-slate-900 text-white transition-all duration-300 flex flex-col
                ${isMobile ? 'fixed inset-y-0 left-0 z-50 w-64' : (collapsed ? 'w-20' : 'w-64')}
                ${isMobile && collapsed ? '-translate-x-full' : ''}
            `}
        >
            <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
                {!collapsed && <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Matrix</span>}
                {!isMobile && (
                    <button onClick={toggleSidebar} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
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
                                    flex items-center px-4 py-3 rounded-md transition-colors
                                    ${isActive
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
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

            <div className="p-4 border-t border-slate-800">
                <div className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-3'}`}>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold">
                        FA
                    </div>
                    {!collapsed && (
                        <div>
                            <p className="text-sm font-medium">Faculty Admin</p>
                            <p className="text-xs text-slate-500">View Profile</p>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
