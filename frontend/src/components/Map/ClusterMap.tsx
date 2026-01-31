import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

// Fix for default Leaflet marker icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface ClusterMapProps {
    startDate?: Date | null;
    endDate?: Date | null;
}

export function ClusterMap({ startDate, endDate }: ClusterMapProps) {
    const navigate = useNavigate();

    // Fetch all sequences with location data
    const { data: sequences, isLoading } = useQuery({
        queryKey: ['sequences', 'map', startDate?.toISOString(), endDate?.toISOString()],
        queryFn: async () => {
            let query = supabase
                .from('sequences')
                .select(`
                    id,
                    strain_name,
                    collection_date,
                    locations!inner (
                        country,
                        lat,
                        lng
                    )
                `)
                .not('locations', 'is', null);

            if (startDate) {
                query = query.gte('collection_date', startDate.toISOString());
            }
            if (endDate) {
                query = query.lte('collection_date', endDate.toISOString());
            }

            // Limit to 2000 to avoid browser crash if too many
            const { data, error } = await query.limit(2000);

            if (error) throw error;
            return data;
        },
    });

    if (isLoading) {
        return (
            <div className="w-full h-[600px] bg-slate-100 dark:bg-slate-900 rounded-lg animate-pulse flex items-center justify-center text-slate-400">
                Loading Cluster Map...
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

                <MarkerClusterGroup
                    chunkedLoading
                    spiderfyOnMaxZoom={true}
                >
                    {sequences?.map((seq) => {
                        const loc = seq.locations as any;
                        if (!loc.lat || !loc.lng) return null;

                        return (
                            <Marker
                                key={seq.id}
                                position={[loc.lat, loc.lng]}
                            >
                                <Popup>
                                    <div className="p-1">
                                        <h3 className="font-bold text-sm text-slate-900">{seq.strain_name}</h3>
                                        <p className="text-xs text-slate-500 mb-2">{loc.country}</p>
                                        <p className="text-xs text-slate-500">
                                            Date: {seq.collection_date || 'Unknown'}
                                        </p>
                                        <button
                                            className="mt-2 text-xs bg-primary-500 text-white px-2 py-1 rounded hover:bg-primary-600 w-full"
                                            onClick={() => navigate(`/sequences/${seq.id}`)}
                                        >
                                            View Details
                                        </button>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}
                </MarkerClusterGroup>
            </MapContainer>
        </div>
    );
}
