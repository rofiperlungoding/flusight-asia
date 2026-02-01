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

const MOCK_FORECASTS: Forecast[] = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() + i);
    // Create a smooth-ish curve for risk score
    const risk_score = 0.3 + (Math.sin(i / 2) * 0.2) + (Math.random() * 0.1);

    return {
        id: `f-${i}`,
        forecast_date: date.toISOString().split('T')[0],
        risk_score: Math.max(0.1, Math.min(0.9, risk_score)),
        predicted_variants: [
            { aa: 'K123N', probability: 0.7 + Math.random() * 0.2 },
            { aa: 'E456D', probability: 0.1 + Math.random() * 0.1 }
        ],
        confidence_lower: Math.max(0, risk_score - 0.15),
        confidence_upper: Math.min(1, risk_score + 0.15),
        region: 'Asia'
    };
});

export function useForecasts(region: string = 'Asia') {
    return useQuery({
        queryKey: ['forecasts', region],
        queryFn: async () => {
            try {
                const { data, error } = await supabase
                    .from('forecasts')
                    .select('*')
                    .eq('region', region)
                    .order('forecast_date', { ascending: true })
                    .limit(12);

                if (error || !data || data.length === 0) {
                    return MOCK_FORECASTS;
                }

                return data as Forecast[];
            } catch (e) {
                return MOCK_FORECASTS;
            }
        },
        staleTime: 1000 * 60 * 60, // 1 hour (forecasts updates rarely)
    });
}
