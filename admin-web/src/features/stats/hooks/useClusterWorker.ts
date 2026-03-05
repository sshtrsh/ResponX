import { useCallback, useEffect, useRef, useState } from "react";
import type { HotspotData } from "../../../types/stats";

/**
 * Manages the DBSCAN cluster Web Worker lifecycle.
 * Initialises the worker on mount and terminates it on unmount.
 * Exposes `hotspots` state populated by worker messages,
 * and `postReports` to send new report data for clustering.
 */
export function useClusterWorker() {
    const workerRef = useRef<Worker | null>(null);
    const [hotspots, setHotspots] = useState<HotspotData[]>([]);
    const [clusterLoading, setClusterLoading] = useState(false);

    useEffect(() => {
        // Wrapped in try/catch so a missing worker file
        // doesn't white-screen the whole page.
        try {
            workerRef.current = new Worker(
                new URL("../../../workers/cluster.worker.ts", import.meta.url),
                { type: "module" },
            );
            workerRef.current.onmessage = (e: MessageEvent) => {
                setHotspots(e.data);
                setClusterLoading(false);
            };
            workerRef.current.onerror = (err) => {
                console.warn("Cluster worker error:", err);
                setHotspots([]);
                setClusterLoading(false);
            };
        } catch (err) {
            console.warn("Could not start cluster worker:", err);
        }

        return () => workerRef.current?.terminate();
    }, []);

    const postReports = useCallback((reports: unknown[]) => {
        setClusterLoading(true);
        workerRef.current?.postMessage(reports);
    }, []);

    return { hotspots, setHotspots, postReports, clusterLoading };
}
