
import { useState, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useGeoForecasts, type GeoForecast } from '../../hooks/useGeoForecasts';

import { format } from 'date-fns';

// Static Centroids for Asian Countries
const COUNTRY_CENTROIDS: Record<string, [number, number]> = {
    "China": [35.8617, 104.1954],
    "Japan": [36.2048, 138.2529],
    "South Korea": [35.9078, 127.7669],
    "Singapore": [1.3521, 103.8198],
    "Thailand": [15.8700, 100.9925],
    "Vietnam": [14.0583, 108.2772],
    "Indonesia": [-0.7893, 113.9213],
    "India": [20.5937, 78.9629],
    "Malaysia": [4.2105, 101.9758],
    "Philippines": [12.8797, 121.7740]
};

// Travel Edges for Visualization (matching graph topology)
const EDGES: [string, string][] = [
    ["China", "Japan"], ["China", "South Korea"], ["China", "Thailand"],
    ["Japan", "South Korea"],
    ["Singapore", "Thailand"], ["Singapore", "Indonesia"], ["Singapore", "Malaysia"],
    ["Malaysia", "Thailand"], ["Thailand", "Vietnam"], ["Vietnam", "China"],
    ["India", "Singapore"], ["Philippines", "Singapore"]
];

const VARIANT_COLORS: Record<string, string> = {
    "Clade A": "#ef4444", // Red
    "Clade B": "#f97316", // Orange
    "Clade C": "#eab308", // Yellow
    "Clade D": "#22c55e", // Green
    "Clade E": "#3b82f6", // Blue
    "Other": "#94a3b8"   // Slate
};

export function SpreadMap() {
    const { data: forecasts, isLoading } = useGeoForecasts();
    const [sliderIndex, setSliderIndex] = useState(0);

    // 1. Group forecasts by Date
    const uniqueDates = useMemo(() => {
        if (!forecasts) return [];
        const dates = Array.from(new Set(forecasts.map(f => f.forecast_date))).sort();
        return dates;
    }, [forecasts]);

    // 2. Get current timeframe data
    const currentFrameData = useMemo(() => {
        if (!forecasts || uniqueDates.length === 0) return [];
        const date = uniqueDates[sliderIndex];
        return forecasts.filter(f => f.forecast_date === date);
    }, [forecasts, uniqueDates, sliderIndex]);

    // 3. Helper to determine dominant variant color and radius
    const getMarkerStyle = (forecast: GeoForecast) => {
        const dist = forecast.variant_distribution;
        let maxVar = "Other";
        let maxVal = 0;

        Object.entries(dist).forEach(([k, v]) => {
            if (v > maxVal) {
                maxVal = v;
                maxVar = k;
            }
        });

        // Radius based on "Entropy" or just max dominance? 
        // Let's size by maxVal (certainty)
        return {
            color: VARIANT_COLORS[maxVar] || "#64748b",
            radius: 10 + (maxVal * 20), // 10 to 30px
            fillOpacity: 0.6,
            dominant: maxVar
        };
    };

    if (isLoading) return <div className="h-[500px] flex items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-xl">Loading simulation...</div>;
    if (!forecasts || forecasts.length === 0) return <div className="h-[500px] flex items-center justify-center">No GNN forecasts available.</div>;

    const currentDate = uniqueDates[sliderIndex];

    return (
        <div className="card h-[600px] flex flex-col p-0 overflow-hidden relative border border-slate-200 dark:border-slate-700 bg-slate-900">
            {/* Map Header / Controls */}
            <div className="absolute top-4 left-4 z-[500] bg-slate-900/90 backdrop-blur border border-slate-700 p-4 rounded-xl shadow-xl w-72">
                <h3 className="text-white font-bold flex items-center gap-2 mb-2">
                    <span className="text-xl">🕸️</span> Viral Flow Simulation
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                    GNN-predicted dominance spread across Asia.
                </p>

                <div className="space-y-2">
                    <div className="flex justify-between text-xs font-mono text-cyan-400">
                        <span>Forecast Week:</span>
                        <span>{format(new Date(currentDate), 'MMM d, yyyy')}</span>
                    </div>

                    <input
                        type="range"
                        min={0}
                        max={uniqueDates.length - 1}
                        value={sliderIndex}
                        onChange={(e) => setSliderIndex(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />

                    <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Now</span>
                        <span>+4 Weeks</span>
                    </div>
                </div>

                {/* Legend */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                    {Object.entries(VARIANT_COLORS).map(([v, c]) => (
                        <div key={v} className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c }}></span>
                            <span className="text-[10px] text-slate-300">{v}</span>
                        </div>
                    ))}
                </div>
            </div>

            <MapContainer
                center={[20, 110]}
                zoom={4}
                style={{ height: '100%', width: '100%' }}
                className="bg-slate-900"
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                />

                {/* Draw Edges */}
                {EDGES.map(([u, v], i) => {
                    const p1 = COUNTRY_CENTROIDS[u];
                    const p2 = COUNTRY_CENTROIDS[v];
                    if (p1 && p2) {
                        return <Polyline key={i} positions={[p1, p2]} color="#334155" weight={1} dashArray="4 4" />;
                    }
                    return null;
                })}

                {/* Draw Nodes */}
                {currentFrameData.map((forecast) => {
                    const pos = COUNTRY_CENTROIDS[forecast.country];
                    if (!pos) return null;

                    const style = getMarkerStyle(forecast);

                    return (
                        <CircleMarker
                            key={forecast.id}
                            center={pos}
                            radius={style.radius}
                            pathOptions={{
                                color: style.color,
                                fillColor: style.color,
                                fillOpacity: style.fillOpacity,
                                weight: 2
                            }}
                        >
                            <Popup className="bg-slate-900 border-slate-700">
                                <div className="p-1">
                                    <h4 className="font-bold text-slate-900">{forecast.country}</h4>
                                    <p className="text-xs text-slate-500 mb-2">
                                        Week: {forecast.week_iso}
                                    </p>
                                    <div className="space-y-1">
                                        {Object.entries(forecast.variant_distribution)
                                            .sort(([, a], [, b]) => b - a)
                                            .map(([v, p]) => (
                                                <div key={v} className="flex items-center justify-between text-xs gap-4">
                                                    <div className="flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: VARIANT_COLORS[v] || '#ccc' }}></span>
                                                        <span>{v}</span>
                                                    </div>
                                                    <span className="font-mono">{(p * 100).toFixed(0)}%</span>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>
                            </Popup>
                        </CircleMarker>
                    );
                })}
            </MapContainer>
        </div>
    );
}
