
import PageHeader from '../components/common/PageHeader';
import EmptyState from '../components/common/EmptyState';
import { useState } from 'react';

const Timetable = () => {
    const [hasData, setHasData] = useState(false);

    return (
        <div>
            <PageHeader
                title="Timetable"
                actionLabel="Manage Timetable"
                onAction={() => console.log('Manage timetable clicked')}
            />
            {hasData ? (
                <div className="p-6 bg-white rounded-lg shadow border border-gray-200">
                    {/* Placeholder for timetable grid */}
                    <p className="text-center text-gray-500 py-10">Timetable Grid Placeholder</p>
                </div>
            ) : (
                <EmptyState
                    message="No timetable data available. Create a schedule for classes."
                    actionLabel="Manage Timetable"
                    onAction={() => console.log('Manage timetable clicked')}
                />
            )}
        </div>
    );
};

export default Timetable;
