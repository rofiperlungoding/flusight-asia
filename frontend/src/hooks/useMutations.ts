import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface Mutation {
    id: string;
    sequence_id: string;
    position: number;
    reference_aa: string;
    variant_aa: string;
    mutation_notation: string;
    antigenic_site: string | null;
    is_escape_mutation: boolean;
    is_novel: boolean;
    functional_impact: string | null;
    created_at: string;
}

/**
 * Fetch mutations for a specific sequence
 */
export function useMutations(sequenceId: string | undefined) {
    return useQuery({
        queryKey: ['mutations', sequenceId],
        queryFn: async () => {
            if (!sequenceId) return [];

            const { data, error } = await supabase
                .from('mutations')
                .select('*')
                .eq('sequence_id', sequenceId)
                .order('position', { ascending: true });

            if (error) throw error;
            return data as Mutation[];
        },
        enabled: !!sequenceId,
    });
}

/**
 * Fetch mutation statistics across all sequences
 */
export function useMutationStats() {
    return useQuery({
        queryKey: ['mutation-stats'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('mutations')
                .select('antigenic_site, is_escape_mutation, is_novel');

            if (error) throw error;

            const mutations = data || [];
            return {
                total: mutations.length,
                atAntigenic: mutations.filter(m => m.antigenic_site).length,
                escapeCount: mutations.filter(m => m.is_escape_mutation).length,
                novelCount: mutations.filter(m => m.is_novel).length,
            };
        },
    });
}

/**
 * Fetch top mutations by frequency
 */
export function useTopMutations(limit: number = 10) {
    return useQuery({
        queryKey: ['top-mutations', limit],
        queryFn: async () => {
            const { data, error } = await supabase
                .rpc('get_mutation_frequencies', { limit_count: limit });

            // If RPC doesn't exist, fall back to manual count
            if (error) {
                const { data: mutations, error: mutError } = await supabase
                    .from('mutations')
                    .select('mutation_notation, antigenic_site, is_escape_mutation');

                if (mutError) throw mutError;

                // Count frequencies manually
                const freqMap = new Map<string, { count: number; site: string | null; isEscape: boolean }>();
                for (const m of mutations || []) {
                    const existing = freqMap.get(m.mutation_notation);
                    if (existing) {
                        existing.count++;
                    } else {
                        freqMap.set(m.mutation_notation, {
                            count: 1,
                            site: m.antigenic_site,
                            isEscape: m.is_escape_mutation,
                        });
                    }
                }

                return Array.from(freqMap.entries())
                    .map(([notation, stats]) => ({
                        mutation_notation: notation,
                        count: stats.count,
                        antigenic_site: stats.site,
                        is_escape_mutation: stats.isEscape,
                    }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, limit);
            }

            return data;
        },
    });
}
