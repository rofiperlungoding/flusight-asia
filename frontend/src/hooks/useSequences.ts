import { useQuery } from '@tanstack/react-query';
import { supabase, type Sequence } from '../lib/supabase';

interface UseSequencesOptions {
    page?: number;
    pageSize?: number;
    orderBy?: keyof Sequence;
    ascending?: boolean;
}

interface SequencesResult {
    data: Sequence[];
    count: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export function useSequences(options: UseSequencesOptions = {}) {
    const { page = 1, pageSize = 20, orderBy = 'created_at', ascending = false } = options;

    return useQuery({
        queryKey: ['sequences', { page, pageSize, orderBy, ascending }],
        queryFn: async (): Promise<SequencesResult> => {
            // Calculate range for pagination
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;

            try {
                // Get sequences with count
                const { data, error, count } = await supabase
                    .from('sequences')
                    .select('*', { count: 'exact' })
                    .order(orderBy, { ascending })
                    .range(from, to);

                if (error) throw error;

                const totalCount = count ?? 0;

                return {
                    data: data ?? [],
                    count: totalCount,
                    page,
                    pageSize,
                    totalPages: Math.ceil(totalCount / pageSize),
                };
            } catch (e) {
                console.error("Failed to fetch sequences:", e);
                return {
                    data: [],
                    count: 0,
                    page,
                    pageSize,
                    totalPages: 0,
                };
            }
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

export function useSequenceById(id: string) {
    return useQuery({
        queryKey: ['sequence', id],
        queryFn: async () => {
            try {
                const { data, error } = await supabase
                    .from('sequences')
                    .select(`
            *,
            location:locations(country, country_code, region),
            mutations(*)
            `)
                    .eq('id', id)
                    .single();

                if (error) throw error;
                return data;
            } catch (e) {
                console.error("Failed to fetch sequence details:", e);
                return null;
            }
        },
        enabled: !!id,
    });
}



export function useRecentSequences(limit: number = 5) {
    return useQuery({
        queryKey: ['sequences', 'recent', limit],
        queryFn: async () => {
            try {
                const { data, error } = await supabase
                    .from('sequences')
                    .select('id, strain_name, collection_date, sequence_length, created_at')
                    .order('created_at', { ascending: false })
                    .limit(limit);

                if (error) throw error;
                return data ?? [];
            } catch (e) {
                console.error("Failed to fetch recent sequences:", e);
                return [];
            }
        },
        staleTime: 1000 * 60, // 1 minute
    });
}

export function useAllSequences() {
    return useQuery({
        queryKey: ['sequences', 'all'],
        queryFn: async () => {
            try {
                // Fetch for export - maybe we want more fields?
                const { data, error } = await supabase
                    .from('sequences')
                    .select('*') // Select all for full export
                    .order('collection_date', { ascending: false })
                    .limit(10000);

                if (error) throw error;
                return data ?? [];
            } catch (e) {
                console.error("Failed to fetch all sequences:", e);
                return [];
            }
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}
