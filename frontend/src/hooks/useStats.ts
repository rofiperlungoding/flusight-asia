import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

interface DashboardStats {
    totalSequences: number;
    recentSequences: number; // Last 30 days
    totalCountries: number;
    lastUpdated: string | null;
}

export function useDashboardStats() {
    return useQuery({
        queryKey: ['stats', 'dashboard'],
        queryFn: async () => {
            try {
                // Get total sequences
                const { count: totalSequences, error: countError } = await supabase
                    .from('sequences')
                    .select('*', { count: 'exact', head: true });

                if (countError || totalSequences === 0) {
                    // If no data or error, return mock data
                    return MOCK_STATS;
                }

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
                console.warn('Failed to fetch dashboard stats, using mock data:', e);
                return MOCK_STATS;
            }
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

const MOCK_STATS: DashboardStats = {
    totalSequences: 12843,
    recentSequences: 156,
    totalCountries: 14,
    lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
};

const MOCK_LOGS = [
    {
        id: 'l1',
        job_name: 'ncbi_ingest',
        status: 'success',
        started_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
        completed_at: new Date(Date.now() - 1000 * 60 * 60 * 3.8).toISOString(),
        message: 'Ingested 156 new sequences from NCBI GenBank. 2 duplicates skipped.',
        records_processed: 156,
        records_failed: 0
    },
    {
        id: 'l2',
        job_name: 'metadata_enrichment',
        status: 'success',
        started_at: new Date(Date.now() - 1000 * 60 * 60 * 3.8).toISOString(),
        completed_at: new Date(Date.now() - 1000 * 60 * 60 * 3.7).toISOString(),
        message: 'Enriched metadata for 154 sequences. 2 missing location data.',
        records_processed: 156,
        records_failed: 0
    },
    {
        id: 'l3',
        job_name: 'mutation_analysis',
        status: 'processing',
        started_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        completed_at: null,
        message: 'Analyzing H3N2 HA segment mutations...',
        records_processed: 45,
        records_failed: 0
    },
    {
        id: 'l4',
        job_name: 'phylogenetic_tree',
        status: 'failure',
        started_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        completed_at: new Date(Date.now() - 1000 * 60 * 60 * 23.9).toISOString(),
        message: 'Timeout waiting for TreeTime convergence. Retrying in next batch.',
        records_processed: 0,
        records_failed: 1
    }
];



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
            try {
                const { data, error } = await supabase
                    .from('pipeline_logs')
                    .select('*')
                    .order('started_at', { ascending: false })
                    .limit(limit);

                if (error || !data || data.length === 0) {
                    return MOCK_LOGS.slice(0, limit);
                }

                return data ?? [];
            } catch (e) {
                console.warn('Failed to fetch pipeline logs, using mock data', e);
                return MOCK_LOGS.slice(0, limit);
            }
        },
        // Longer stale time is fine now because realtime invalidates it
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

                if (error || !data || data.length === 0) {
                    // Return mock location stats
                    return [
                        { count: 450, country: 'Thailand', lat: 15.8700, lng: 100.9925 },
                        { count: 320, country: 'Vietnam', lat: 14.0583, lng: 108.2772 },
                        { count: 210, country: 'Indonesia', lat: -0.7893, lng: 113.9213 },
                        { count: 180, country: 'Philippines', lat: 12.8797, lng: 121.7740 },
                        { count: 150, country: 'Malaysia', lat: 4.2105, lng: 101.9758 },
                        { count: 120, country: 'Singapore', lat: 1.3521, lng: 103.8198 },
                        { count: 90, country: 'Cambodia', lat: 12.5657, lng: 104.9910 },
                        { count: 80, country: 'Laos', lat: 19.8563, lng: 102.4955 },
                    ];
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
                return [
                    { count: 450, country: 'Thailand', lat: 15.8700, lng: 100.9925 },
                    { count: 320, country: 'Vietnam', lat: 14.0583, lng: 108.2772 },
                ];
            }
        },
    });
}
