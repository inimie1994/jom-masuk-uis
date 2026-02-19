
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useState } from 'react';

const DashboardLayout = () => {
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    const toggleMobileSidebar = () => {
        setMobileSidebarOpen(!mobileSidebarOpen);
    };

    return (
        <div className="flex h-screen bg-slate-100 dark:bg-slate-950 overflow-hidden font-sans transition-colors">
            {/* Mobile Sidebar Overlay */}
            {mobileSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setMobileSidebarOpen(false)}
                ></div>
            )}

            <Sidebar isMobile={mobileSidebarOpen} className="print:hidden" />

            <div className="flex flex-col flex-1 overflow-hidden">
                <div className="print:hidden">
                    <Topbar toggleMobileSidebar={toggleMobileSidebar} />
                </div>
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-6 scroll-smooth print:p-0 print:overflow-visible">
                    <div className="max-w-7xl mx-auto print:max-w-none print:w-full">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
