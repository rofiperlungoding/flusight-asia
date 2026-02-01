
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAllSequences } from '../hooks';

export function Sequences() {
    const navigate = useNavigate();
    const { data: sequences, isLoading, error } = useAllSequences();

    // Client-side pagination state
    const [page, setPage] = useState(1);
    const pageSize = 50; // Render 50 at a time to keep UI responsive

    const totalPages = sequences ? Math.ceil(sequences.length / pageSize) : 0;
    const paginatedSequences = sequences ? sequences.slice((page - 1) * pageSize, page * pageSize) : [];

    const handleExport = async () => {
        try {
            const { utils, writeFile } = await import("xlsx");
            if (!sequences || sequences.length === 0) return;

            // Format data
            const formattedData = sequences.map(item => ({
                "Strain Name": item.strain_name,
                "Collection Date": item.collection_date || "Unknown",
                "Subtype": item.subtype,
                "Segment": item.segment,
                "Length (bp)": item.sequence_length,
                "Added At": new Date(item.created_at).toLocaleDateString()
            }));

            const wb = utils.book_new();
            const ws = utils.json_to_sheet(formattedData);

            // Auto-width
            const colWidths = Object.keys(formattedData[0]).map(key => ({
                wch: Math.max(key.length, ...formattedData.map(row => String(row[key as keyof typeof row] || "").length)) + 2
            }));
            ws['!cols'] = colWidths;

            utils.book_append_sheet(wb, ws, "Sequences");
            writeFile(wb, `sequences_export_${new Date().toISOString().split('T')[0]}.xlsx`);
        } catch (e) {
            console.error("Export failed", e);
            alert("Export failed");
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Sequence Explorer</h1>
                    <p className="mt-2 text-slate-500 dark:text-slate-400">
                        Browse and analyze H3N2 hemagglutinin sequences.
                        {sequences && <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">{sequences.length} loaded</span>}
                    </p>
                </div>
                <button
                    className="btn-primary flex items-center gap-2"
                    onClick={handleExport}
                    disabled={!sequences || sequences.length === 0}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Export Data (XLSX)
                </button>
            </div>

            <div className="card overflow-hidden p-0 border border-slate-200 dark:border-slate-700">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-medium">
                            <tr>
                                <th className="px-6 py-4">Strain Name</th>
                                <th className="px-6 py-4">Collection Date</th>
                                <th className="px-6 py-4">Subtype</th>
                                <th className="px-6 py-4">Segment</th>
                                <th className="px-6 py-4 text-right">Length</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {isLoading ? (
                                // Loading skeleton
                                [1, 2, 3, 4, 5].map((_, i) => (
                                    <tr key={i}>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-48 animate-pulse"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24 animate-pulse"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16 animate-pulse"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-12 animate-pulse"></div></td>
                                        <td className="px-6 py-4 text-right"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16 ml-auto animate-pulse"></div></td>
                                    </tr>
                                ))
                            ) : error ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-red-500">
                                        <span className="text-2xl block mb-2">❌</span>
                                        Error loading sequences
                                    </td>
                                </tr>
                            ) : paginatedSequences && paginatedSequences.length > 0 ? (
                                paginatedSequences.map((seq) => (
                                    <tr
                                        key={seq.id}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                                        onClick={() => navigate(`/sequences/${seq.id}`)}
                                    >
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                            {seq.strain_name}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                            {seq.collection_date || 'Unknown'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded text-xs font-medium">
                                                {seq.subtype}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                            {seq.segment}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-slate-600 dark:text-slate-300">
                                            {seq.sequence_length?.toLocaleString() || '—'} bp
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <span className="text-4xl mb-4">🧬</span>
                                            <p className="font-medium text-slate-900 dark:text-white">No sequences found</p>
                                            <p className="text-sm mt-1 mb-4">The database is empty. Run the ingestion pipeline to fetch data.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-sm text-slate-500">
                        {sequences ? `Showing ${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, sequences.length)} of ${sequences.length} sequences` : 'Loading...'}
                    </span>
                    <div className="flex gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            className="px-3 py-1 text-sm border rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <span className="px-3 py-1 text-sm text-slate-500">Page {page} of {totalPages}</span>
                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            className="px-3 py-1 text-sm border rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
