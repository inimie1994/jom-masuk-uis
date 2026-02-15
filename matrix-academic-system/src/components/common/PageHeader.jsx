
import { Plus } from 'lucide-react';

const PageHeader = ({ title, actionLabel, onAction }) => {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
            {actionLabel && (
                <button
                    onClick={onAction}
                    className="flex items-center justify-center px-4 py-2 bg-primary text-white rounded-xl hover:opacity-90 transition-all shadow-sm shadow-indigo-200 dark:shadow-none"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    {actionLabel}
                </button>
            )}
        </div>
    );
};

export default PageHeader;
