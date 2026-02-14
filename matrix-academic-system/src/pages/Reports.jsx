
import PageHeader from '../components/common/PageHeader';
import EmptyState from '../components/common/EmptyState';
import { useState } from 'react';

const Reports = () => {
    const [hasData, setHasData] = useState(false);

    return (
        <div>
            <PageHeader
                title="Reports"
                actionLabel="Generate Report"
                onAction={() => console.log('Generate report clicked')}
            />
            {hasData ? (
                <div>Report Charts Placeholder</div>
            ) : (
                <EmptyState
                    message="No reports generated. Generate a new report to view analysis."
                    actionLabel="Generate Report"
                    onAction={() => console.log('Generate report clicked')}
                />
            )}
        </div>
    );
};

export default Reports;
