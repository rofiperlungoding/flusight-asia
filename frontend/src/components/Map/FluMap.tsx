import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { LocationMarker } from './LocationMarker';
import { useGeography } from '../../hooks/useGeography';

interface FluMapProps {
    startDate: Date | null;
    endDate: Date | null;
}

export function FluMap({ startDate: _startDate, endDate: _endDate }: FluMapProps) {
    const { data: locations, isLoading, error } = useGeography();

    if (isLoading) {
        return (
            <div className="w-full h-[600px] bg-slate-100 dark:bg-slate-900 rounded-lg animate-pulse flex items-center justify-center text-slate-400">
                Loading Map Data...
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full h-[600px] bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center justify-center text-red-500 border border-red-200 dark:border-red-800">
                Error loading map data: {error.message}
            </div>
        );
    }

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

                {locations?.map((location) => (
                    <LocationMarker key={location.id} location={location} />
                ))}
            </MapContainer>
        </div>
    );
}
