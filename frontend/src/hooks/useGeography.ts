import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface LocationStats {
    id: string;
    country: string;
    country_code: string;
    latitude: number;
    longitude: number;
    sequence_count: number;
    mutation_count: number;
    antigenic_mutation_count: number;
}

export function useGeography() {
    return useQuery({
        queryKey: ['geography', 'stats'],
        queryFn: async (): Promise<LocationStats[]> => {
            // Get location stats with sequence and mutation counts
            const { data, error } = await supabase.rpc('get_location_stats');

            if (error) {
                // Fallback to manual query if RPC doesn't exist
                const { data: locations, error: locError } = await supabase
                    .from('locations')
                    .select(`
                        id,
                        country,
                        country_code,
                        latitude,
                        longitude,
                        sequences:sequences(count)
                    `);

                if (locError) throw new Error(locError.message);

                // Transform the data
                return (locations ?? []).map((loc: any) => ({
                    id: loc.id,
                    country: loc.country,
                    country_code: loc.country_code,
                    latitude: parseFloat(loc.latitude),
                    longitude: parseFloat(loc.longitude),
                    sequence_count: loc.sequences?.[0]?.count ?? 0,
                    mutation_count: 0,
                    antigenic_mutation_count: 0,
                })).filter((loc: LocationStats) => loc.sequence_count > 0);
            }

            return data ?? [];
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

export function useLocationDetails(locationId: string) {
    return useQuery({
        queryKey: ['location', locationId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('locations')
                .select(`
                    *,
                    sequences(
                        id,
                        strain_name,
                        collection_date,
                        subtype
                    )
                `)
                .eq('id', locationId)
                .single();

            if (error) throw new Error(error.message);
            return data;
        },
        enabled: !!locationId,
    });
}
