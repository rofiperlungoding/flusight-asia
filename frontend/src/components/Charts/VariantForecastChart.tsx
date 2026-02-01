import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import { useVariantForecasts } from '../../hooks/useVariantForecasts';

const COLORS = [
    '#8884d8', // Purple
    '#82ca9d', // Green
    '#ffc658', // Yellow
    '#ff7300', // Orange
    '#0088fe', // Blue
    '#00C49F', // Teal
    '#FFBB28', // Gold
    '#FF8042', // Coral
];

export function VariantForecastChart() {
    const { data, isLoading } = useVariantForecasts();

    if (isLoading) {
        return <div className="h-64 flex items-center justify-center text-slate-400">Loading projection...</div>;
    }

    if (!data || data.length === 0) {
        return (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                <span className="text-2xl mb-2">📉</span>
                <p>No forecast data available</p>
                <p className="text-xs">Run the temporal prediction pipeline</p>
            </div>
        );
    }

    // Transform data for Recharts
    // Input: { variant_distribution: { "Clade A": 0.5, "Clade B": 0.5 ... } }
    // Output: { name: "2026-W05", "Clade A": 0.5, "Clade B": 0.5 }

    const chartData = data.map(d => ({
        name: d.week_iso || d.forecast_date.substring(5), // Use Week or MM-DD
        ...d.variant_distribution
    }));

    // Get all variant keys from the first record
    const variants = Object.keys(data[0].variant_distribution);

    return (
        <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={chartData}
                    margin={{
                        top: 10,
                        right: 30,
                        left: 0,
                        bottom: 0,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11 }}
                        stroke="#94a3b8"
                        tickMargin={10}
                    />
                    <YAxis
                        tick={{ fontSize: 11 }}
                        stroke="#94a3b8"
                        unit="%"
                        tickFormatter={(v) => `${(v * 100).toFixed(0)}`}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#1e293b',
                            borderColor: '#334155',
                            borderRadius: '8px',
                            color: '#e2e8f0'
                        }}
                        formatter={(value: any) => [`${(Number(value) * 100).toFixed(1)}%`, '']}


                        itemStyle={{ fontSize: '12px' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />

                    {variants.map((v, i) => (
                        <Area
                            key={v}
                            type="monotone"
                            dataKey={v}
                            stackId="1"
                            stroke={COLORS[i % COLORS.length]}
                            fill={COLORS[i % COLORS.length]}
                            fillOpacity={0.6}
                            animationDuration={1500}
                        />
                    ))}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
