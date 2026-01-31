import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useMutations } from '../hooks';
import { supabase } from '../lib/supabase';

interface Sequence {
    id: string;
    genbank_id: string;
    strain_name: string;
    segment: string;
    subtype: string;
    raw_sequence: string;
    sequence_length: number;
    collection_date: string | null;
    source: string;
    created_at: string;
}

export function SequenceDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // Fetch sequence data
    const { data: sequence, isLoading: seqLoading, error: seqError } = useQuery({
        queryKey: ['sequence', id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('sequences')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data as Sequence;
        },
        enabled: !!id,
    });

    // Fetch mutations for this sequence
    const { data: mutations, isLoading: mutLoading } = useMutations(id);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Could add toast notification here
    };

    if (seqLoading) {
        return (
            <div className="animate-fade-in">
                <div className="card">
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
                        <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (seqError || !sequence) {
        return (
            <div className="card text-center py-12">
                <span className="text-4xl mb-4 block">❌</span>
                <p className="text-lg font-medium text-slate-700 dark:text-slate-300">Sequence not found</p>
                <button
                    className="btn-secondary mt-4"
                    onClick={() => navigate('/sequences')}
                >
                    ← Back to Sequences
                </button>
            </div>
        );
    }

    const antigenicMutations = mutations?.filter(m => m.antigenic_site) || [];
    const escapeMutations = mutations?.filter(m => m.is_escape_mutation) || [];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <button
                        className="text-sm text-slate-500 hover:text-primary-600 mb-2 flex items-center gap-1"
                        onClick={() => navigate('/sequences')}
                    >
                        ← Back to Sequences
                    </button>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {sequence.strain_name}
                    </h1>
                    <div className="flex items-center gap-3 mt-2 text-sm text-slate-500 dark:text-slate-400">
                        <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded">
                            {sequence.subtype}
                        </span>
                        <span>{sequence.segment}</span>
                        <span>•</span>
                        <span>{sequence.collection_date || 'Unknown date'}</span>
                        <span>•</span>
                        <span className="font-mono">{sequence.genbank_id}</span>
                    </div>
                </div>
                <button
                    className="btn-primary flex items-center gap-2"
                    onClick={() => copyToClipboard(sequence.raw_sequence)}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Sequence
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card">
                    <p className="text-xs uppercase text-slate-500 dark:text-slate-400 font-medium">Length</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{sequence.sequence_length} bp</p>
                </div>
                <div className="card">
                    <p className="text-xs uppercase text-slate-500 dark:text-slate-400 font-medium">Total Mutations</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{mutations?.length || 0}</p>
                </div>
                <div className="card">
                    <p className="text-xs uppercase text-slate-500 dark:text-slate-400 font-medium">Antigenic Site</p>
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{antigenicMutations.length}</p>
                </div>
                <div className="card">
                    <p className="text-xs uppercase text-slate-500 dark:text-slate-400 font-medium">Escape Mutations</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{escapeMutations.length}</p>
                </div>
            </div>

            {/* Raw Sequence */}
            <div className="card">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Raw Sequence</h2>
                <div className="sequence-display max-h-48 overflow-y-auto">
                    <code className="text-xs break-all whitespace-pre-wrap">
                        {sequence.raw_sequence}
                    </code>
                </div>
            </div>

            {/* Mutations Table */}
            <div className="card">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Detected Mutations</h2>
                    {mutLoading && <span className="text-sm text-slate-400">Loading...</span>}
                </div>

                {mutations && mutations.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700">
                                    <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Mutation</th>
                                    <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Position</th>
                                    <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Site</th>
                                    <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Escape</th>
                                    <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Novel</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mutations.map((mut) => (
                                    <tr
                                        key={mut.id}
                                        className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                    >
                                        <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-white">
                                            {mut.mutation_notation}
                                        </td>
                                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{mut.position}</td>
                                        <td className="py-3 px-4">
                                            {mut.antigenic_site ? (
                                                <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded text-xs font-medium">
                                                    Site {mut.antigenic_site}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">—</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4">
                                            {mut.is_escape_mutation ? (
                                                <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs font-medium">
                                                    Yes
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">No</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4">
                                            {mut.is_novel ? (
                                                <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs font-medium">
                                                    Novel
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">Known</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-8 text-slate-400 dark:text-slate-500">
                        <span className="text-3xl block mb-2">🧬</span>
                        <p className="text-sm">No mutations detected</p>
                        <p className="text-xs mt-1 opacity-70">This sequence matches the reference strain</p>
                    </div>
                )}
            </div>
        </div>
    );
}
