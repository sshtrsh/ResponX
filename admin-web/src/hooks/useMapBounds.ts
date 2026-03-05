import type { LatLngBounds } from "leaflet";
import { useState } from "react";
import { useMapEvents } from "react-leaflet";

export function useMapBounds() {
    const [bounds, setBounds] = useState<LatLngBounds | null>(null);

    useMapEvents({
        moveend: (e) => setBounds(e.target.getBounds()),
        zoomend: (e) => setBounds(e.target.getBounds()),
        load: (e) => setBounds(e.target.getBounds()),
    });

    return bounds;
}
