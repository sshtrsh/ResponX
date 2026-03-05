import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

type SubscriptionEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

interface UseRealtimeSubscriptionOptions {
    /** Unique name for this Supabase channel. */
    channelName: string;
    /** The table to subscribe to. */
    table: string;
    /** Which events to listen to (default: all). */
    event?: SubscriptionEvent;
    /** Callback fired after the debounce delay. */
    onEvent: () => void;
    /** Debounce delay in ms — collapses rapid-fire events into one call (default: 500ms). */
    debounceMs?: number;
}

/**
 * Shared real-time subscription hook.
 *
 * Subscribes to a Supabase postgres_changes channel for the given table, and
 * debounces the callback so that bursts of rapid events (e.g. 10 inserts in 1s)
 * only trigger ONE refetch at the end, preventing fetch storms.
 *
 * Usage:
 *   useRealtimeSubscription({
 *     channelName: "dashboard:reports",
 *     table: "reports",
 *     onEvent: fetchReports,
 *   });
 */
export function useRealtimeSubscription({
    channelName,
    table,
    event = "*",
    onEvent,
    debounceMs = 500,
}: UseRealtimeSubscriptionOptions): void {
    // Use a ref so the latest onEvent callback is always used without
    // resetting the subscription on every render.
    const onEventRef = useRef(onEvent);
    useEffect(() => {
        onEventRef.current = onEvent;
    }, [onEvent]);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | null = null;

        const handleChange = () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                onEventRef.current();
            }, debounceMs);
        };

        const subscription = supabase
            .channel(channelName)
            .on<Record<string, unknown>>(
                "postgres_changes",
                { event: event as "*", schema: "public", table },
                handleChange,
            )
            .subscribe();

        return () => {
            if (timer) clearTimeout(timer);
            void subscription.unsubscribe();
        };
    }, [channelName, table, event, debounceMs]);
}
