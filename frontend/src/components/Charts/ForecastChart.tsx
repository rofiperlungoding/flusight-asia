import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useForecasts } from '../../hooks/useForecasts';
import { format } from 'date-fns';

export function ForecastChart({ region = 'Asia' }: { region?: string }) {
    const { data: forecasts, isLoading } = useForecasts(region);

    if (isLoading) {
        return (
            <div className="h-[300px] w-full bg-slate-50 dark:bg-slate-800/50 rounded-lg animate-pulse flex items-center justify-center text-slate-400">
                Loading Forecasts...
            </div>
        );
    }

    if (!forecasts || forecasts.length === 0) {
        return (
            <div className="h-[300px] w-full bg-slate-50 dark:bg-slate-800/50 rounded-lg flex items-center justify-center text-slate-400">
                No forecast data available.
            </div>
        );
    }

    // Prepare data
    // Mock 2 historical points for context
    const today = new Date();
    const historicalData = [
        {
            date: format(new Date(today.setMonth(today.getMonth() - 2)), 'yyyy-MM-dd'),
            score: 0.15,
            range: [0.15, 0.15],
            type: 'history'
        },
        {
            date: format(new Date(today.setMonth(today.getMonth() + 1)), 'yyyy-MM-dd'), // Prev month
            score: 0.18,
            range: [0.18, 0.18],
            type: 'history'
        }
    ];

    const forecastData = forecasts.map(f => ({
        date: f.forecast_date,
        score: f.risk_score,
        range: [f.confidence_lower, f.confidence_upper], // [min, max] for Area
        variants: f.predicted_variants,
        type: 'forecast'
    }));

    // Connect them: Add last history point to first forecast (if needed) but Recharts handles independent lines better if separate or same data key.
    // Let's combine them into one dataset
    const combinedData = [...historicalData, ...forecastData];

    return (
        <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                    data={combinedData}
                    margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#e11d48" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#e11d48" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                        dataKey="date"
                        tickFormatter={(str) => format(new Date(str), 'MMM yy')}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        dy={10}
                    />
                    <YAxis
                        dataKey="score"
                        domain={[0, 1]}
                        label={{ value: 'Risk Score (0-1)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                    />
                    <Tooltip
                        content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                    <div className="bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl">
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">
                                            {label ? format(new Date(label), 'MMMM yyyy') : ''}
                                        </p>
                                        <div className="text-xs space-y-1">
                                            <p className={`${data.type === 'forecast' ? 'text-rose-500' : 'text-violet-500'} font-semibold`}>
                                                {data.type === 'forecast' ? '🔮 Predicted Risk' : '📜 Historical Risk'}: {data.score}
                                            </p>
                                            {data.type === 'forecast' && (
                                                <p className="text-slate-500">
                                                    Confidence: {data.range[0]} - {data.range[1]}
                                                </p>
                                            )}
                                        </div>
                                        {data.variants && (
                                            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                                <p className="text-[10px] text-slate-400 uppercase font-mono mb-1">Top Variants</p>
                                                <div className="flex gap-2">
                                                    {data.variants.map((v: any, i: number) => (
                                                        <span key={i} className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 font-mono">
                                                            {v.aa} ({Math.round(v.probability * 100)}%)
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />

                    {/* Confidence Interval Area */}
                    <Area
                        type="monotone"
                        dataKey="range"
                        stroke="none"
                        fill="url(#colorRisk)"
                    />

                    {/* Line */}
                    <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#e11d48"
                        strokeWidth={2}
                        dot={{ r: 4, strokeWidth: 2 }}
                        activeDot={{ r: 6 }}
                        strokeDasharray="5 5"
                    />

                    <ReferenceLine y={0.5} label="Medium Risk" stroke="orange" strokeDasharray="3 3" />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
