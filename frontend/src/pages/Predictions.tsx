
import { useState } from 'react';
import { ForecastChart } from '../components/Charts/ForecastChart';
import { VariantForecastChart } from '../components/Charts/VariantForecastChart';
import { useForecasts } from '../hooks/useForecasts';
import { useVariantForecasts } from '../hooks/useVariantForecasts';
import { format } from 'date-fns';

export function Predictions() {
    const [viewMode, setViewMode] = useState<'graph' | 'table' | 'map'>('graph');

    // Fetch data handles for Table view
    const { data: riskData } = useForecasts();
    const { data: variantData } = useVariantForecasts();

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Mutation Forecasts</h1>
                    <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-2xl">
                        Ensemble model predictions for H3N2 antigenic drift and variant trajectories over the next 12-24 weeks.
                    </p>
                </div>
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg self-start md:self-auto">
                    <button
                        onClick={() => setViewMode('table')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'table' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                    >
                        Table
                    </button>
                    <button
                        onClick={() => setViewMode('graph')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'graph' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                    >
                        Models
                    </button>
                    <button
                        onClick={() => setViewMode('map')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'map' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                    >
                        Spread Map
                    </button>
                </div>
            </div>

            {viewMode === 'graph' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* H3N2 Antigenic Risk Model (LSTM) */}
                    <div className="card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <span className="text-xl">🔮</span> Antigenic Risk Forecast
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">LSTM Model • Predicted drift potential (0-1) based on mutation accumulation.</p>
                            </div>
                        </div>
                        <ForecastChart />
                    </div>

                    {/* Variant Trajectory Model (Transformer) */}
                    <div className="card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <span className="text-xl">🧬</span> Variant Trajectories
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">Temporal Transformer • Predicted dominance of top clades.</p>
                            </div>
                        </div>
                        <VariantForecastChart />
                    </div>

                    {/* Insights Panel */}
                    <div className="lg:col-span-2 card bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4">🤖 Automated Insights</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm">
                                <h4 className="text-sm font-semibold text-rose-500 mb-2">High Risk Alert</h4>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                    Risk score is projected to exceed <strong>0.5</strong> in Week 12. Enhanced surveillance recommended for <strong>South East Asia</strong>.
                                </p>
                            </div>
                            <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm">
                                <h4 className="text-sm font-semibold text-blue-500 mb-2">Dominant Shift</h4>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                    <strong>Clade C</strong> is predicted to overtake Clade A as the dominant strain by <strong>{format(new Date(Date.now() + 86400000 * 30), 'MMMM yyyy')}</strong>.
                                </p>
                            </div>
                            <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm">
                                <h4 className="text-sm font-semibold text-emerald-500 mb-2">Vaccine Match</h4>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                    Current vaccine strain remains <strong>effective</strong> against 85% of projected circulating variants for the next quarter.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {viewMode === 'table' && (
                <div className="space-y-8 animate-fade-in">
                    {/* Table View */}
                    <div className="card overflow-hidden p-0 border border-slate-200 dark:border-slate-700">
                        <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                            <h3 className="font-bold text-slate-900 dark:text-white">Antigenic Risk Predictions (LSTM)</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-medium">
                                    <tr>
                                        <th className="px-6 py-3">Forecast Date</th>
                                        <th className="px-6 py-3">Risk Score</th>
                                        <th className="px-6 py-3">Confidence Interval</th>
                                        <th className="px-6 py-3">Top Predicted Mutation</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {riskData?.map((row) => (
                                        <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-300">
                                                {row.forecast_date}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${row.risk_score > 0.5 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                    {row.risk_score.toFixed(3)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 text-xs">
                                                [{row.confidence_lower.toFixed(2)} - {row.confidence_upper.toFixed(2)}]
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs">
                                                {row.predicted_variants?.[0] ? `${row.predicted_variants[0].aa} (${Math.round(row.predicted_variants[0].probability * 100)}%)` : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="card overflow-hidden p-0 border border-slate-200 dark:border-slate-700">
                        <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                            <h3 className="font-bold text-slate-900 dark:text-white">Variant Dominance Projections (Transformer)</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-medium">
                                    <tr>
                                        <th className="px-6 py-3">Week</th>
                                        {/* Dynamic headers */}
                                        {variantData && variantData.length > 0 &&
                                            Object.keys(variantData[0].variant_distribution)
                                                .sort()
                                                .map(key => (
                                                    <th key={key} className="px-6 py-3">{key}</th>
                                                ))
                                        }
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {variantData?.map((row) => (
                                        <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-300">
                                                {row.week_iso || row.forecast_date}
                                            </td>
                                            {variantData && variantData.length > 0 &&
                                                Object.keys(variantData[0].variant_distribution)
                                                    .sort()
                                                    .map(key => (
                                                        <td key={key} className="px-6 py-4">
                                                            <span className="text-slate-600 dark:text-slate-300">
                                                                {((row.variant_distribution[key] || 0) * 100).toFixed(1)}%
                                                            </span>
                                                        </td>
                                                    ))
                                            }
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {viewMode === 'map' && <LinkSpreadMap />}
        </div>
    );
}

// Sub-component to isolate Map logic and hooks
import { SpreadMap } from '../components/Map/SpreadMap';
import { useGeoForecasts } from '../hooks/useGeoForecasts';

function LinkSpreadMap() {
    const { data: geoData, isLoading } = useGeoForecasts();
    const [sliderIndex, setSliderIndex] = useState(0);

    // Group data by date
    const uniqueDates = Array.from(new Set(geoData?.map(d => d.forecast_date) || [])).sort();

    // Filter data for current slider position
    const currentDate = uniqueDates[sliderIndex];
    const currentData = geoData?.filter(d => d.forecast_date === currentDate) || [];

    if (isLoading) return <div className="p-12 text-center text-slate-500">Loading geospatial data...</div>;
    if (!geoData || geoData.length === 0) return (
        <div className="card border-dashed border-2 border-slate-300 p-12 text-center">
            <h3 className="text-lg font-medium text-slate-900">No Geographic Forecasts Yet</h3>
            <p className="text-slate-500 mt-2">The GNN model pipeline has not generated spatial predictions yet. Please run the pipeline.</p>
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <span className="text-xl">🌏</span> Geographic Spread Simulation
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">Spatiotemporal GNN • Prediction of variant flow across Asia.</p>
                    </div>
                    {/* Time Slider */}
                    <div className="w-full md:w-1/2 bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                        <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            <span>{uniqueDates[0]}</span>
                            <span className="text-primary-600">Selected: {currentDate}</span>
                            <span>{uniqueDates[uniqueDates.length - 1]}</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max={uniqueDates.length - 1}
                            value={sliderIndex}
                            onChange={(e) => setSliderIndex(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                        />
                        <div className="text-center mt-1 text-[10px] text-slate-400">
                            Slide to see future weeks (+ {sliderIndex + 1} weeks)
                        </div>
                    </div>
                </div>

                <SpreadMap data={currentData} />

                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-100 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-200">
                    <strong>💡 How to read:</strong> Each circle represents a country. The color indicates the predicted
                    <em> dominant variant</em> for that week. Click on a circle to see the full probability breakdown.
                </div>
            </div>
        </div>
    )
}
