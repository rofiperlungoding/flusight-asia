import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface Forecast {
    id: string;
    forecast_date: string;
    risk_score: number;
    predicted_variants: Array<{ aa: string; probability: number }>;
    confidence_lower: number;
    confidence_upper: number;
    region: string;
}

export function useForecasts(region: string = 'Asia') {
    return useQuery({
        queryKey: ['forecasts', region],
        queryFn: async () => {
            try {
                // Fetch forecasts sorted by date
                const { data, error } = await supabase
                    .from('forecasts')
                    .select('*')
                    .eq('region', region)
                    .order('forecast_date', { ascending: true })
                    .limit(24); // More context

                if (error) throw error;

                return (data as Forecast[]) || [];
            } catch (e) {
                console.error("Failed to fetch forecasts:", e);
                return [];
            }
        },
        staleTime: 1000 * 60 * 60, // 1 hour (forecasts updates rarely)
    });
}
