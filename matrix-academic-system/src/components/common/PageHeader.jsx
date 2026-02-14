
import { Plus } from 'lucide-react';

const PageHeader = ({ title, actionLabel, onAction }) => {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {actionLabel && (
                <button
                    onClick={onAction}
                    className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    {actionLabel}
                </button>
            )}
        </div>
    );
};

export default PageHeader;
