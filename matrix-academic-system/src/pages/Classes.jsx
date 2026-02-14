
import PageHeader from '../components/common/PageHeader';
import PlaceholderTable from '../components/common/PlaceholderTable';
import EmptyState from '../components/common/EmptyState';
import { useState } from 'react';

const Classes = () => {
    const [hasData, setHasData] = useState(true);

    return (
        <div>
            <PageHeader
                title="Classes"
                actionLabel="Add Class"
                onAction={() => console.log('Add class clicked')}
            />
            {hasData ? (
                <PlaceholderTable
                    headers={['Class Code', 'Subject', 'Lecturer', 'Schedule', 'Room']}
                    rowCount={5}
                />
            ) : (
                <EmptyState
                    message="No active classes found. Schedule your first class."
                    actionLabel="Add Class"
                    onAction={() => console.log('Add class clicked')}
                />
            )}
        </div>
    );
};

export default Classes;
