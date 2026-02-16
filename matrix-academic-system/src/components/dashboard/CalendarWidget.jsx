import React from 'react';

const CalendarWidget = () => {
    return (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-pastel border border-gray-100 dark:border-slate-800 mt-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Academic Calendar & Holidays</h2>
            <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                <iframe
                    src="https://calendar.google.com/calendar/embed?height=600&wkst=1&bgcolor=%23ffffff&ctz=Asia%2FKuala_Lumpur&src=ZW4ubWFsYXlzaWEjaG9saWRheUBncm91cC52LmNhbGVuZGFyLmdvb2dsZS5jb20&color=%230B8043"
                    style={{
                        border: 0,
                        width: '100%',
                        height: '100%',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        borderRadius: '0.75rem'
                    }}
                    frameBorder="0"
                    scrolling="no"
                    title="Malaysia Holidays Calendar"
                ></iframe>
            </div>
        </div>
    );
};

export default CalendarWidget;
