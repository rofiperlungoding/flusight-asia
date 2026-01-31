import { useDashboardStats, useRecentSequences } from '../hooks';
import { formatDistanceToNow } from 'date-fns';

export function Dashboard() {
    const { data: stats, isLoading: statsLoading } = useDashboardStats();
    const { data: recentSeqs, isLoading: seqsLoading } = useRecentSequences(5);

    const formatLastUpdated = (date: string | null) => {
        if (!date) return 'Never';
        return formatDistanceToNow(new Date(date), { addSuffix: true });
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Page header */}
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Dashboard Overview</h1>
                    <p className="mt-2 text-gray-500 dark:text-gray-400">
                        Real-time intelligence on H3N2 mutation tracking in Asia
                    </p>
                </div>
                <div className="flex space-x-3">
                    <button className="btn-secondary bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                        Download Report
                    </button>
                    <button
                        className="btn-primary shadow-lg shadow-primary-500/20"
                        onClick={() => window.location.reload()}
                    >
                        Refresh Data
                    </button>
                </div>
            </div>

            {/* Alert banner - show only when no data */}
            {!statsLoading && stats?.totalSequences === 0 && (
                <div className="bg-gradient-to-r from-warning-50 to-white dark:from-warning-900/10 dark:to-gray-800 border border-warning-200 dark:border-warning-900/30 rounded-xl p-4 shadow-sm">
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-warning-100 dark:bg-warning-900/30 rounded-lg text-warning-600 dark:text-warning-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-warning-800 dark:text-warning-200">System Initialization</h3>
                            <p className="mt-1 text-sm text-warning-700 dark:text-warning-300/80">
                                The data pipeline is waiting for the initial ingestion cycle. Run the ingestion workflow on GitHub Actions to populate sequences from NCBI.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    {
                        label: 'Total Sequences',
                        value: statsLoading ? '...' : stats?.totalSequences.toLocaleString() ?? '0',
                        sub: `Last updated: ${formatLastUpdated(stats?.lastUpdated ?? null)}`,
                        icon: '🧬',
                        color: 'text-indigo-500'
                    },
                    {
                        label: 'Recent (30 days)',
                        value: statsLoading ? '...' : stats?.recentSequences.toLocaleString() ?? '0',
                        sub: 'Newly added sequences',
                        icon: '📊',
                        color: 'text-teal-500'
                    },
                    {
                        label: 'Countries Covered',
                        value: statsLoading ? '...' : stats?.totalCountries.toString() ?? '0',
                        sub: 'Asian region focus',
                        icon: '🌏',
                        color: 'text-blue-500'
                    },
                    {
                        label: 'Dominant Strain',
                        value: 'H3N2',
                        sub: 'Seasonal influenza A',
                        icon: '🦠',
                        color: 'text-purple-500'
                    },
                ].map((stat, i) => (
                    <div key={i} className="card hover:shadow-md transition-shadow duration-200 border-t-4 border-t-transparent hover:border-t-primary-500">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</h3>
                            <span className={`p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-xl ${stat.color}`}>{stat.icon}</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{stat.sub}</p>
                    </div>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Large Chart Area */}
                <div className="lg:col-span-2 card bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/50">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Regional Spread Forecast</h3>
                        <select className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm rounded-lg px-3 py-1 text-gray-600 dark:text-gray-300 outline-none focus:ring-2 focus:ring-primary-500/50">
                            <option>Next 3 Months</option>
                            <option>Next 6 Months</option>
                        </select>
                    </div>
                    <div className="h-80 rounded-xl bg-gray-100 dark:bg-gray-700/50 border border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-50"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                        <p>Geographic spread visualization</p>
                        <span className="text-xs opacity-70 mt-2">Map integration coming in Phase 3</span>
                    </div>
                </div>

                {/* Recent Sequences */}
                <div className="card">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Recent Sequences</h3>
                    <div className="space-y-3">
                        {seqsLoading ? (
                            // Loading skeleton
                            [1, 2, 3, 4, 5].map((_, i) => (
                                <div key={i} className="flex gap-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700/50">
                                    <div className="space-y-2 w-full">
                                        <div className="h-2.5 bg-gray-200 dark:bg-gray-600 rounded w-3/4 animate-pulse"></div>
                                        <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded w-1/2 animate-pulse"></div>
                                    </div>
                                </div>
                            ))
                        ) : recentSeqs && recentSeqs.length > 0 ? (
                            // Actual data
                            recentSeqs.map((seq) => (
                                <div
                                    key={seq.id}
                                    className="flex gap-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                                >
                                    <div className="w-1.5 h-1.5 mt-2 rounded-full bg-primary-500 shrink-0"></div>
                                    <div className="space-y-1 overflow-hidden">
                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                                            {seq.strain_name}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {seq.collection_date ?? 'Unknown date'} • {seq.sequence_length}bp
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            // Empty state
                            <div className="text-center py-8 text-gray-400">
                                <p className="text-sm">No sequences yet</p>
                                <p className="text-xs mt-1">Run the pipeline to fetch data</p>
                            </div>
                        )}
                    </div>
                    <button
                        className="w-full mt-6 py-2 text-sm text-primary-600 dark:text-primary-400 font-medium hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                        onClick={() => window.location.href = '/sequences'}
                    >
                        View All Sequences →
                    </button>
                </div>
            </div>
        </div>
    );
}
