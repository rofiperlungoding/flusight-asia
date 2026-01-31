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

            // Get sequences with count
            const { data, error, count } = await supabase
                .from('sequences')
                .select('*', { count: 'exact' })
                .order(orderBy, { ascending })
                .range(from, to);

            if (error) {
                throw new Error(error.message);
            }

            const totalCount = count ?? 0;

            return {
                data: data ?? [],
                count: totalCount,
                page,
                pageSize,
                totalPages: Math.ceil(totalCount / pageSize),
            };
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

export function useSequenceById(id: string) {
    return useQuery({
        queryKey: ['sequence', id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('sequences')
                .select(`
          *,
          location:locations(country, country_code, region),
          mutations(*)
        `)
                .eq('id', id)
                .single();

            if (error) {
                throw new Error(error.message);
            }

            return data;
        },
        enabled: !!id,
    });
}

export function useRecentSequences(limit: number = 5) {
    return useQuery({
        queryKey: ['sequences', 'recent', limit],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('sequences')
                .select('id, strain_name, collection_date, sequence_length, created_at')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) {
                throw new Error(error.message);
            }

            return data ?? [];
        },
        staleTime: 1000 * 60, // 1 minute
    });
}
