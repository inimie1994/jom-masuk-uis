
import PageHeader from '../components/common/PageHeader';
import PlaceholderTable from '../components/common/PlaceholderTable';
import { useState } from 'react';

const AuditLogs = () => {
    // eslint-disable-next-line no-unused-vars
    const [hasData, setHasData] = useState(true);

    return (
        <div>
            <PageHeader title="Audit Logs" />
            <PlaceholderTable
                headers={['Timestamp', 'User', 'Action', 'Details', 'IP Address']}
                rowCount={12}
            />
        </div>
    );
};

export default AuditLogs;
