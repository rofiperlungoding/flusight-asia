import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { GeoForecast } from '../../hooks/useGeoForecasts';

// Centroids for our target Asian countries
const COUNTRY_CENTROIDS: Record<string, [number, number]> = {
    "China": [35.8617, 104.1954],
    "Japan": [36.2048, 138.2529],
    "South Korea": [35.9078, 127.7669],
    "Korea": [35.9078, 127.7669], // Alias
    "Taiwan": [23.6978, 120.9605],
    "Singapore": [1.3521, 103.8198],
    "Thailand": [15.8700, 100.9925],
    "Vietnam": [14.0583, 108.2772],
    "Malaysia": [4.2105, 101.9758],
    "Indonesia": [-0.7893, 113.9213],
    "Philippines": [12.8797, 121.7740],
    "India": [20.5937, 78.9629],
    "Bangladesh": [23.6850, 90.3563],
    "Hong Kong": [22.3193, 114.1694]
};

// Color palette for variants - keep consistent with charts
const VARIANT_COLORS: Record<string, string> = {
    'H3N2': '#3b82f6', // blue-500
    'H1N1': '#ef4444', // red-500
    'Yamagata': '#10b981', // emerald-500
    'Victoria': '#f59e0b', // amber-500
    'Other': '#64748b' // slate-500
};

// Helper to get color for dominant variant
const getDominantColor = (dist: Record<string, number>) => {
    let max = -1;
    let dominant = 'Other';

    Object.entries(dist).forEach(([variant, prob]) => {
        if (prob > max) {
            max = prob;
            dominant = variant;
        }
    });

    // Hash string to color fallback if not in palette
    if (!VARIANT_COLORS[dominant]) {
        return '#8b5cf6'; // violet-500 default for new variants
    }
    return VARIANT_COLORS[dominant];
};

interface SpreadMapProps {
    data: GeoForecast[];
}

export function SpreadMap({ data }: SpreadMapProps) {
    return (
        <div className="w-full h-[600px] rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm relative z-0">
            <MapContainer
                center={[20, 100]} // Center on Asia
                zoom={4}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
                className="z-0"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />

                {data.map((forecast) => {
                    const coords = COUNTRY_CENTROIDS[forecast.country];
                    if (!coords) return null;

                    const color = getDominantColor(forecast.variant_distribution);

                    return (
                        <CircleMarker
                            key={`${forecast.country}-${forecast.forecast_date}`}
                            center={coords}
                            pathOptions={{ fillColor: color, color: '#fff', weight: 2, fillOpacity: 0.8 }}
                            radius={15}
                        >
                            <Popup>
                                <div className="p-2 min-w-[150px]">
                                    <h3 className="font-bold text-slate-900 border-b pb-1 mb-2">
                                        {forecast.country}
                                    </h3>
                                    <p className="text-xs text-slate-500 mb-2 font-mono">
                                        {forecast.forecast_date}
                                    </p>
                                    <div className="space-y-1">
                                        {Object.entries(forecast.variant_distribution)
                                            .sort(([, a], [, b]) => b - a)
                                            .map(([variant, prob]) => (
                                                <div key={variant} className="flex justify-between text-xs">
                                                    <span className="text-slate-700 font-medium">{variant}</span>
                                                    <span className="text-slate-500">{(prob * 100).toFixed(1)}%</span>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            </Popup>
                        </CircleMarker>
                    );
                })}
            </MapContainer>

            {/* Legend Overlay */}
            <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur p-3 rounded-lg shadow-lg z-[1000] border border-slate-200 dark:border-slate-700">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-wider">Dominant Variant</h4>
                <div className="space-y-1">
                    {Object.entries(VARIANT_COLORS).map(([variant, color]) => (
                        <div key={variant} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
                            <span className="text-xs text-slate-600 dark:text-slate-300">{variant}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
