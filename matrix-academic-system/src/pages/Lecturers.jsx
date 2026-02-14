
import PageHeader from '../components/common/PageHeader';
import PlaceholderTable from '../components/common/PlaceholderTable';
import EmptyState from '../components/common/EmptyState';
import { useState } from 'react';

const Lecturers = () => {
    const [hasData, setHasData] = useState(true);

    return (
        <div>
            <PageHeader
                title="Lecturers"
                actionLabel="Add Lecturer"
                onAction={() => console.log('Add lecturer clicked')}
            />
            {hasData ? (
                <PlaceholderTable
                    headers={['Name', 'Staff ID', 'Email', 'Department', 'Role']}
                    rowCount={6}
                />
            ) : (
                <EmptyState
                    message="No lecturers found. Add your first lecturer to get started."
                    actionLabel="Add Lecturer"
                    onAction={() => console.log('Add lecturer clicked')}
                />
            )}
        </div>
    );
};

export default Lecturers;
