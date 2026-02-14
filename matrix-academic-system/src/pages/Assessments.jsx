
import PageHeader from '../components/common/PageHeader';
import PlaceholderTable from '../components/common/PlaceholderTable';
import EmptyState from '../components/common/EmptyState';
import { useState } from 'react';

const Assessments = () => {
    const [hasData, setHasData] = useState(true);

    return (
        <div>
            <PageHeader
                title="Assessments"
                actionLabel="Create Assessment"
                onAction={() => console.log('Create assessment clicked')}
            />
            {hasData ? (
                <PlaceholderTable
                    headers={['Title', 'Subject', 'Type', 'Due Date', 'Weight']}
                    rowCount={4}
                />
            ) : (
                <EmptyState
                    message="No assessments created yet."
                    actionLabel="Create Assessment"
                    onAction={() => console.log('Create assessment clicked')}
                />
            )}
        </div>
    );
};

export default Assessments;
