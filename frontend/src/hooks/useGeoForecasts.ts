import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface GeoForecast {
    id: string;
    forecast_date: string;
    week_iso: string;
    country: string;
    variant_distribution: Record<string, number>;
    model_version: string;
}

export function useGeoForecasts() {
    return useQuery({
        queryKey: ['geo_forecasts'],
        queryFn: async () => {
            // Get the latest available forecasts
            // We want all countries for all future dates available
            const { data, error } = await supabase
                .from('geo_forecasts')
                .select('*')
                .order('forecast_date', { ascending: true });

            if (error) throw error;
            return data as GeoForecast[];
        }
    });
}
