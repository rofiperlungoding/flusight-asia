import { Link } from 'react-router-dom';
import { useDashboardStats, useRecentSequences, usePipelineLogs } from '../hooks';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../lib/supabase';
import { ClusterMap } from '../components/Map/ClusterMap';
import { TemporalTrendChart } from '../components/Charts/TemporalTrendChart';

export function Dashboard() {
    const { data: stats, isLoading: statsLoading } = useDashboardStats();
    const { data: recentSeqs, isLoading: seqsLoading } = useRecentSequences(5);
    const { data: logs, isLoading: logsLoading } = usePipelineLogs(5);

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
                    <button
                        className="btn-secondary"
                        onClick={() => window.location.reload()}
                    >
                        Refresh Data
                    </button>
                    <button
                        className="btn-primary flex items-center gap-2"
                        onClick={async () => {
                            // Generate CSV report
                            const { data } = await supabase.from('sequences').select('strain_name, genbank_id, collection_date, sequence_length, source').limit(1000);
                            if (data && data.length > 0) {
                                const headers = Object.keys(data[0]).join(',');
                                const rows = data.map(row => Object.values(row).join(','));
                                const csv = [headers, ...rows].join('\n');
                                const blob = new Blob([csv], { type: 'text/csv' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `flusight-report-${new Date().toISOString().split('T')[0]}.csv`;
                                a.click();
                            }
                        }}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Download Report
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
                    <div key={i} className="card card-hover border-t-4 border-t-transparent hover:border-t-primary-500">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 font-sans tracking-wide uppercase text-[11px]">{stat.label}</h3>
                            <span className={`p-2.5 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-xl ${stat.color}`}>{stat.icon}</span>
                        </div>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white font-sans">{stat.value}</p>
                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 font-medium">{stat.sub}</p>
                    </div>
                ))}
            </div>

            {/* Pipeline Status */}
            <div className="card bg-slate-900 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <svg className="w-32 h-32" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                </div>
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            Live Pipeline Status
                        </h3>
                        <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-1 rounded border border-slate-700">
                            Auto-sync: 6h
                        </span>
                    </div>

                    <div className="space-y-4">
                        {logsLoading ? (
                            <div className="text-sm text-slate-400">Loading pipeline status...</div>
                        ) : logs && logs.length > 0 ? (
                            logs.map((log) => (
                                <div key={log.id} className="flex items-start gap-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition-colors">
                                    <div className={`mt-1 p-1.5 rounded-full ${log.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                        {log.status === 'success' ? (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        ) : (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-slate-200">
                                                {log.job_name === 'ncbi_ingest' ? 'NCBI Data Ingestion' : log.job_name}
                                            </p>
                                            <span className="text-xs text-slate-500">
                                                {formatDistanceToNow(new Date(log.started_at), { addSuffix: true })}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1 truncate">
                                            {log.message}
                                        </p>
                                        <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                                            <span>Processed: {log.records_processed}</span>
                                            <span>Errors: {log.records_failed}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-6 text-slate-500 text-sm">
                                No pipeline logs available yet.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Large Chart Area */}
                <div className="lg:col-span-2 card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-0 overflow-hidden relative h-[600px]">
                    <div className="absolute top-4 left-4 z-[1000] bg-white/90 dark:bg-slate-800/90 backdrop-blur px-3 py-1.5 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <span className="text-lg">🗺️</span> Geographic Distribution
                        </h3>
                    </div>
                    <ClusterMap />
                </div>

                {/* Recent Sequences */}
                <div className="card h-full flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Sequences</h3>
                        <span className="text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-2 py-1 rounded-full">
                            Latest 5
                        </span>
                    </div>

                    <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                        {seqsLoading ? (
                            // Loading skeleton
                            [1, 2, 3, 4, 5].map((_, i) => (
                                <div key={i} className="flex gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700/50">
                                    <div className="space-y-2 w-full">
                                        <div className="h-2.5 bg-slate-200 dark:bg-slate-600 rounded w-3/4 animate-pulse"></div>
                                        <div className="h-2 bg-slate-200 dark:bg-slate-600 rounded w-1/2 animate-pulse"></div>
                                    </div>
                                </div>
                            ))
                        ) : recentSeqs && recentSeqs.length > 0 ? (
                            // Actual data
                            recentSeqs.map((seq) => (
                                <Link
                                    key={seq.id}
                                    to={`/sequences/${seq.id}`}
                                    className="group flex gap-4 p-3 rounded-xl bg-slate-50/50 dark:bg-slate-700/20 border border-slate-100 dark:border-slate-700/30 hover:bg-white dark:hover:bg-slate-700/50 hover:shadow-md hover:shadow-slate-200/50 dark:hover:shadow-none hover:border-primary-200 dark:hover:border-primary-500/30 transition-all cursor-pointer"
                                >
                                    <div className="w-2 h-2 mt-2 rounded-full bg-primary-500 shrink-0 group-hover:scale-125 transition-transform"></div>
                                    <div className="space-y-1 overflow-hidden">
                                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                            {seq.strain_name}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
                                            <span>{seq.collection_date ?? 'Unknown date'}</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                                            <span>{seq.sequence_length}bp</span>
                                        </div>
                                    </div>
                                </Link>
                            ))
                        ) : (
                            // Empty state
                            <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                                <span className="text-4xl block mb-2">🧬</span>
                                <p className="text-sm font-medium">No sequences found</p>
                                <p className="text-xs mt-1 opacity-70">Run the pipeline to fetch data</p>
                            </div>
                        )}
                    </div>

                    <button
                        className="w-full mt-6 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                        onClick={() => window.location.href = '/sequences'}
                    >
                        View All Sequences →
                    </button>
                </div>
            </div>
            {/* Temporal Trends */}
            <div className="card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="text-xl">📈</span> Sequence Collection Trends
                    </h3>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-violet-500"></span>
                        <span className="text-sm text-slate-500">Collected per Month</span>
                    </div>
                </div>
                <TemporalTrendChart />
            </div>
        </div>
    );
}
