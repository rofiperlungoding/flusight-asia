export function Sequences() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sequence Explorer</h1>
                    <p className="mt-2 text-gray-500 dark:text-gray-400">
                        Browse and analyze H3N2 hemagglutinin sequences.
                    </p>
                </div>
                <button className="btn-primary flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Export Data
                </button>
            </div>

            <div className="card overflow-hidden p-0 border border-gray-200 dark:border-gray-700">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 font-medium">
                            <tr>
                                <th className="px-6 py-4">Strain Name</th>
                                <th className="px-6 py-4">Collection Date</th>
                                <th className="px-6 py-4">Location</th>
                                <th className="px-6 py-4">Clade</th>
                                <th className="px-6 py-4 text-center">Quality</th>
                                <th className="px-6 py-4 text-right">Mutations</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {/* Empty state row */}
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                    <div className="flex flex-col items-center justify-center">
                                        <span className="text-4xl mb-4">🧬</span>
                                        <p className="font-medium text-gray-900 dark:text-white">No sequences found</p>
                                        <p className="text-sm mt-1 mb-4">The database is empty. Run the ingestion pipeline to fetch data.</p>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    <span className="text-sm text-gray-500">Showing 0 of 0 results</span>
                    <div className="flex gap-2">
                        <button disabled className="px-3 py-1 text-sm border rounded bg-white dark:bg-gray-800 text-gray-400 cursor-not-allowed">Previous</button>
                        <button disabled className="px-3 py-1 text-sm border rounded bg-white dark:bg-gray-800 text-gray-400 cursor-not-allowed">Next</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
