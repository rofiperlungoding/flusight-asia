import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';



export function useDashboardStats() {
    return useQuery({
        queryKey: ['stats', 'dashboard'],
        queryFn: async () => {
            try {
                // Get total sequences
                const { count: totalSequences, error: countError } = await supabase
                    .from('sequences')
                    .select('*', { count: 'exact', head: true });

                if (countError) throw countError;

                // Get sequences from last 30 days
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                const { count: recentSequences } = await supabase
                    .from('sequences')
                    .select('*', { count: 'exact', head: true })
                    .gte('created_at', thirtyDaysAgo.toISOString());

                // Get unique countries with sequences
                const { data: locations } = await supabase
                    .from('sequences')
                    .select('location_id')
                    .not('location_id', 'is', null);

                const uniqueLocations = new Set(locations?.map(l => l.location_id) ?? []);

                // Get last pipeline run
                const { data: lastLog } = await supabase
                    .from('pipeline_logs')
                    .select('completed_at')
                    .eq('status', 'success')
                    .order('completed_at', { ascending: false })
                    .limit(1)
                    .single();

                return {
                    totalSequences: totalSequences ?? 0,
                    recentSequences: recentSequences ?? 0,
                    totalCountries: uniqueLocations.size,
                    lastUpdated: lastLog?.completed_at ?? null,
                };
            } catch (e) {
                console.warn('Failed to fetch dashboard stats:', e);
                return {
                    totalSequences: 0,
                    recentSequences: 0,
                    totalCountries: 0,
                    lastUpdated: null,
                };
            }
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

export function usePipelineLogs(limit: number = 10) {
    const queryClient = useQueryClient();

    useEffect(() => {
        const channel = supabase
            .channel('pipeline_logs_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'pipeline_logs'
                },
                (payload) => {
                    console.log('Realtime update:', payload);
                    queryClient.invalidateQueries({ queryKey: ['stats', 'pipeline-logs'] });
                    // Also invalidate dashboard stats to show latest "Last updated"
                    queryClient.invalidateQueries({ queryKey: ['stats', 'dashboard'] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient]);

    return useQuery({
        queryKey: ['stats', 'pipeline-logs', limit],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('pipeline_logs')
                .select('*')
                .order('started_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data ?? [];
        },
        staleTime: 1000 * 60 * 5,
    });
}

export function useLocationStats() {
    return useQuery({
        queryKey: ['stats', 'locations'],
        queryFn: async () => {
            try {
                // Get sequence counts by location
                const { data, error } = await supabase
                    .from('sequences')
                    .select(`
            location_id,
            locations!inner(country, country_code, lat, lng)
            `);

                if (error) throw error;

                if (!data || data.length === 0) {
                    return [];
                }

                // Aggregate counts by country
                const countsByCountry: Record<string, { count: number; country: string; lat: number; lng: number }> = {};

                for (const seq of data ?? []) {
                    const loc = seq.locations as unknown as { country: string; country_code: string; lat: number; lng: number } | null;
                    if (loc) {
                        if (!countsByCountry[loc.country]) {
                            countsByCountry[loc.country] = {
                                count: 0,
                                country: loc.country,
                                lat: loc.lat,
                                lng: loc.lng,
                            };
                        }
                        countsByCountry[loc.country].count++;
                    }
                }

                return Object.values(countsByCountry).sort((a, b) => b.count - a.count);
            } catch (e) {
                console.warn('Failed to fetch location stats:', e);
                return [];
            }
        },
    });
}
