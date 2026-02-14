
import PageHeader from '../components/common/PageHeader';
import PlaceholderTable from '../components/common/PlaceholderTable';
import EmptyState from '../components/common/EmptyState';
import { useState } from 'react';

const Enrollment = () => {
    const [hasData, setHasData] = useState(true);

    return (
        <div>
            <PageHeader
                title="Enrollment"
                actionLabel="New Enrollment"
                onAction={() => console.log('New enrollment clicked')}
            />
            {hasData ? (
                <PlaceholderTable
                    headers={['Student', 'Subject', 'Term', 'Date', 'Status']}
                    rowCount={7}
                />
            ) : (
                <EmptyState
                    message="No enrollments found. Enroll students to subjects."
                    actionLabel="New Enrollment"
                    onAction={() => console.log('New enrollment clicked')}
                />
            )}
        </div>
    );
};

export default Enrollment;
