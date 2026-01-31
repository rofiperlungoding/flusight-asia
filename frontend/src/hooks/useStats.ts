import { useQuery } from '@tanstack/react-query';
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
        queryFn: async (): Promise<DashboardStats> => {
            // Get total sequences
            const { count: totalSequences } = await supabase
                .from('sequences')
                .select('*', { count: 'exact', head: true });

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
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

export function usePipelineLogs(limit: number = 10) {
    return useQuery({
        queryKey: ['stats', 'pipeline-logs', limit],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('pipeline_logs')
                .select('*')
                .order('started_at', { ascending: false })
                .limit(limit);

            if (error) {
                throw new Error(error.message);
            }

            return data ?? [];
        },
        staleTime: 1000 * 60, // 1 minute
    });
}

export function useLocationStats() {
    return useQuery({
        queryKey: ['stats', 'locations'],
        queryFn: async () => {
            // Get sequence counts by location
            const { data, error } = await supabase
                .from('sequences')
                .select(`
          location_id,
          locations!inner(country, country_code, lat, lng)
        `);

            if (error) {
                throw new Error(error.message);
            }

            // Aggregate counts by country
            const countsByCountry: Record<string, { count: number; country: string; lat: number; lng: number }> = {};

            for (const seq of data ?? []) {
                const loc = seq.locations as { country: string; country_code: string; lat: number; lng: number };
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
        },
    });
}
