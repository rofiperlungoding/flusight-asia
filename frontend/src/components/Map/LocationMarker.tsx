import { CircleMarker, Popup, Tooltip } from 'react-leaflet';
import type { LocationStats } from '../../hooks/useGeography';

interface LocationMarkerProps {
    location: LocationStats;
}

export function LocationMarker({ location }: LocationMarkerProps) {
    // Calculate radius based on sequence count (logarithmic scale)
    const radius = Math.max(8, Math.log(location.sequence_count + 1) * 5);

    // Calculate mutation density (average mutations per sequence)
    const mutationDensity = location.sequence_count > 0
        ? location.mutation_count / location.sequence_count
        : 0;

    // Determine color based on mutation density (Heatmap effect)
    let color = "#0ea5e9"; // sky-500 (Low)
    let fillColor = "#38bdf8"; // sky-400

    if (mutationDensity > 5) {
        color = "#f43f5e"; // rose-500 (High)
        fillColor = "#fb7185"; // rose-400
    } else if (mutationDensity > 2) {
        color = "#eab308"; // yellow-500 (Medium)
        fillColor = "#facc15"; // yellow-400
    }

    return (
        <CircleMarker
            center={[location.latitude, location.longitude]}
            pathOptions={{ color, fillColor, fillOpacity: 0.7, weight: 2 }}
            radius={radius}
            eventHandlers={{
                click: () => {
                    // Navigate to country sequences filter (future feature)
                    // navigate(`/sequences?country=${location.country}`);
                },
            }}
        >
            <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                <span className="font-semibold">{location.country}</span>
            </Tooltip>
            <Popup>
                <div className="p-2 min-w-[150px]">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                        {location.country}
                    </h3>
                    <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                        <div className="flex justify-between">
                            <span>Sequences:</span>
                            <span className="font-medium text-slate-900 dark:text-white">
                                {location.sequence_count.toLocaleString()}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>Mutations (Avg):</span>
                            <span className={`font-medium ${(location.mutation_count / location.sequence_count) > 5 ? 'text-rose-500' :
                                    (location.mutation_count / location.sequence_count) > 2 ? 'text-yellow-500' :
                                        'text-sky-500'
                                }`}>
                                {(location.mutation_count / location.sequence_count).toFixed(1)} / seq
                            </span>
                        </div>
                    </div>
                </div>
            </Popup>
        </CircleMarker>
    );
}
