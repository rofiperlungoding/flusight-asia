import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface VariantForecast {
    id: string;
    forecast_date: string;
    week_iso: string;
    region: string;
    variant_distribution: Record<string, number>;
    model_version: string;
}

export function useVariantForecasts(region: string = 'Asia') {
    return useQuery({
        queryKey: ['variant_forecasts', region],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('variant_forecasts')
                .select('*')
                .eq('region', region)
                .order('forecast_date', { ascending: true })
                .limit(12); // Get next 12 weeks

            if (error) throw error;
            return data as VariantForecast[];
        }
    });
}
