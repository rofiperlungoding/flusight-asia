// Type declarations for react-leaflet
// This file extends the default types to fix compatibility issues

import 'react-leaflet';
import { LatLngExpression, PathOptions, PointExpression } from 'leaflet';

declare module 'react-leaflet' {
    import { ReactNode } from 'react';

    interface MapContainerProps {
        center?: LatLngExpression;
        zoom?: number;
        scrollWheelZoom?: boolean;
        style?: React.CSSProperties;
        className?: string;
        children?: ReactNode;
    }

    interface TileLayerProps {
        attribution?: string;
        url: string;
    }

    interface CircleMarkerProps {
        center: LatLngExpression;
        pathOptions?: PathOptions;
        radius?: number;
        eventHandlers?: Record<string, () => void>;
        children?: ReactNode;
    }

    interface TooltipProps {
        direction?: 'auto' | 'top' | 'bottom' | 'left' | 'right' | 'center';
        offset?: PointExpression;
        opacity?: number;
        children?: ReactNode;
    }

    interface PopupProps {
        children?: ReactNode;
    }
}
