
import PageHeader from '../components/common/PageHeader';
import PlaceholderTable from '../components/common/PlaceholderTable';
import EmptyState from '../components/common/EmptyState';
import { useState } from 'react';

const Subjects = () => {
    const [hasData, setHasData] = useState(true);

    return (
        <div>
            <PageHeader
                title="Subjects"
                actionLabel="Add Subject"
                onAction={() => console.log('Add subject clicked')}
            />
            {hasData ? (
                <PlaceholderTable
                    headers={['Code', 'Name', 'Credits', 'Department', 'Semester']}
                    rowCount={10}
                />
            ) : (
                <EmptyState
                    message="No subjects found. Add your first subject to get started."
                    actionLabel="Add Subject"
                    onAction={() => console.log('Add subject clicked')}
                />
            )}
        </div>
    );
};

export default Subjects;
