import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabaseClient';
import PageHeader from '../components/common/PageHeader';
import { Filter, Search, Clock, User, Shield } from 'lucide-react';

const AuditLogs = () => {
    const { user } = useAuth();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [actionFilter, setActionFilter] = useState('');
    const [userFilter, setUserFilter] = useState(''); // Text search for user ID or email (if joined)

    // For now we don't have user emails joined easily without a new stored procedure or public view usually
    // But we can just show keys from details if available or just raw logs.

    useEffect(() => {
        if (user?.faculty_id) {
            fetchLogs();
        }
    }, [user?.faculty_id, actionFilter]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('audit_logs')
                .select('*')
                .eq('faculty_id', user.faculty_id)
                .order('created_at', { ascending: false })
                .limit(100);

            if (actionFilter) {
                query = query.eq('action', actionFilter);
            }

            const { data, error } = await query;
            if (error) throw error;
            setLogs(data || []);
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader title="Audit Logs" />

            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                    <Filter size={20} className="text-gray-400" />
                    <select
                        value={actionFilter}
                        onChange={(e) => setActionFilter(e.target.value)}
                        className="rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-slate-700 dark:text-white px-3 py-2 border"
                    >
                        <option value="">All Actions</option>
                        <option value="LOGIN">LOGIN</option>
                        <option value="LOGOUT">LOGOUT</option>
                        <option value="GRADE_UPDATE">GRADE_UPDATE</option>
                        <option value="ASSESSMENT_CREATE">ASSESSMENT_CREATE</option>
                        <option value="ASSESSMENT_DELETE">ASSESSMENT_DELETE</option>
                        <option value="ENROLLMENT_BATCH">ENROLLMENT_BATCH</option>
                    </select>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                    <thead className="bg-gray-50 dark:bg-slate-900">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Details</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                        {loading ? (
                            <tr>
                                <td colSpan="4" className="px-6 py-4 text-center text-gray-500">Loading logs...</td>
                            </tr>
                        ) : logs.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="px-6 py-4 text-center text-gray-500">No logs found.</td>
                            </tr>
                        ) : (
                            logs.map(log => (
                                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        <span className="flex items-center">
                                            <Clock size={14} className="mr-1.5 text-gray-400" />
                                            {new Date(log.created_at).toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${log.action === 'LOGIN' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                                log.action === 'GRADE_UPDATE' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                                    log.action === 'ASSESSMENT_DELETE' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                                        'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'}`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400" title={log.user_id}>
                                        <span className="flex items-center">
                                            <User size={14} className="mr-1.5 text-gray-400" />
                                            {log.user_id?.substring(0, 8)}...
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                        <pre className="text-xs bg-gray-50 dark:bg-slate-900 p-2 rounded max-w-md overflow-x-auto">
                                            {JSON.stringify(log.details, null, 2)}
                                        </pre>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AuditLogs;
