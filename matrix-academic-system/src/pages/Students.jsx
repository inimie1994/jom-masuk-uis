
import PageHeader from '../components/common/PageHeader';
import PlaceholderTable from '../components/common/PlaceholderTable';
import EmptyState from '../components/common/EmptyState';
import { useState } from 'react';

const Students = () => {
    const [hasData, setHasData] = useState(true);

    return (
        <div>
            <PageHeader
                title="Students"
                actionLabel="Add Student"
                onAction={() => console.log('Add student clicked')}
            />
            {hasData ? (
                <PlaceholderTable
                    headers={['Name', 'Student ID', 'Email', 'Department', 'Status']}
                    rowCount={8}
                />
            ) : (
                <EmptyState
                    message="No students found. Add your first student to get started."
                    actionLabel="Add Student"
                    onAction={() => console.log('Add student clicked')}
                />
            )}
        </div>
    );
};

export default Students;
