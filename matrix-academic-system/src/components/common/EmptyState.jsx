
import { Inbox } from 'lucide-react';

const EmptyState = ({ message, actionLabel, onAction }) => {
    return (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-lg border border-dashed border-gray-300 text-center">
            <div className="p-4 bg-gray-50 rounded-full mb-4">
                <Inbox className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No data available</h3>
            <p className="text-gray-500 mb-6 max-w-sm">{message}</p>
            {actionLabel && (
                <button
                    onClick={onAction}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
};

export default EmptyState;
