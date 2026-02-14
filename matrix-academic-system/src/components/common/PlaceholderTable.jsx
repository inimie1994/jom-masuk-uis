
const PlaceholderTable = ({ headers = [], rowCount = 5 }) => {
    return (
        <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        {headers.map((header, index) => (
                            <th
                                key={index}
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {[...Array(rowCount)].map((_, rowIndex) => (
                        <tr key={rowIndex} className="animate-pulse">
                            {headers.map((_, colIndex) => (
                                <td key={colIndex} className="px-6 py-4 whitespace-nowrap">
                                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default PlaceholderTable;
