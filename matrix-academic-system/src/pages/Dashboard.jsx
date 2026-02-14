
const Dashboard = () => {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <p className="text-gray-600">Welcome to the Matrix Academic System Dashboard.</p>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                        <h3 className="font-semibold text-blue-700">Total Students</h3>
                        <p className="text-2xl font-bold text-blue-900">--</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-md border border-green-100">
                        <h3 className="font-semibold text-green-700">Active Classes</h3>
                        <p className="text-2xl font-bold text-green-900">--</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-md border border-purple-100">
                        <h3 className="font-semibold text-purple-700">Pending Reports</h3>
                        <p className="text-2xl font-bold text-purple-900">--</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
