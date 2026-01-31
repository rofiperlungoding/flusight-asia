import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../../lib/supabase';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';

export function TemporalTrendChart() {
    const { data, isLoading } = useQuery({
        queryKey: ['stats', 'temporal-trends'],
        queryFn: async () => {
            const endDate = new Date();
            const startDate = subMonths(endDate, 11); // Last 12 months

            // Fetch collection dates
            const { data: sequences, error } = await supabase
                .from('sequences')
                .select('collection_date')
                .gte('collection_date', startOfMonth(startDate).toISOString())
                .lte('collection_date', endOfMonth(endDate).toISOString())
                .not('collection_date', 'is', null);

            if (error) throw error;

            // Generate all months in range
            const months = eachMonthOfInterval({ start: startDate, end: endDate });
            const statsMap = new Map<string, number>();

            // Initialize with 0
            months.forEach(month => {
                statsMap.set(format(month, 'yyyy-MM'), 0);
            });

            // Count sequences
            sequences?.forEach(seq => {
                const date = seq.collection_date as string;
                if (!date) return;
                const monthKey = date.substring(0, 7); // YYYY-MM
                if (statsMap.has(monthKey)) {
                    statsMap.set(monthKey, statsMap.get(monthKey)! + 1);
                }
            });

            // Convert to array
            return Array.from(statsMap.entries()).map(([date, count]) => ({
                date,
                month: format(new Date(date + '-01'), 'MMM yy'),
                count
            }));
        }
    });

    if (isLoading) {
        return (
            <div className="h-[300px] w-full bg-slate-50 dark:bg-slate-800/50 rounded-lg animate-pulse flex items-center justify-center text-slate-400">
                Loading Trends...
            </div>
        );
    }

    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={data}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            borderRadius: '8px',
                            border: 'none',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                        itemStyle={{ color: '#6d28d9', fontWeight: 600 }}
                    />
                    <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#8b5cf6"
                        fillOpacity={1}
                        fill="url(#colorCount)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
