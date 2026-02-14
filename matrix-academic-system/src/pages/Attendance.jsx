
import PageHeader from '../components/common/PageHeader';
import PlaceholderTable from '../components/common/PlaceholderTable';
import EmptyState from '../components/common/EmptyState';
import { useState } from 'react';

const Attendance = () => {
    const [hasData, setHasData] = useState(true);

    return (
        <div>
            <PageHeader
                title="Attendance"
                actionLabel="Mark Attendance"
                onAction={() => console.log('Mark attendance clicked')}
            />
            {hasData ? (
                <PlaceholderTable
                    headers={['Date', 'Class', 'Student', 'Status', 'Recorded By']}
                    rowCount={8}
                />
            ) : (
                <EmptyState
                    message="No attendance records found."
                    actionLabel="Mark Attendance"
                    onAction={() => console.log('Mark attendance clicked')}
                />
            )}
        </div>
    );
};

export default Attendance;
