import { useEffect, useRef } from "react";

/**
 * Calls the handler when a click occurs outside the referenced element.
 */
export function useClickOutside<T extends HTMLElement>(
    handler: () => void,
    active = true,
) {
    const ref = useRef<T>(null);

    useEffect(() => {
        if (!active) return;
        const listener = (e: MouseEvent | TouchEvent) => {
            if (!ref.current || ref.current.contains(e.target as Node)) return;
            handler();
        };
        document.addEventListener("mousedown", listener);
        document.addEventListener("touchstart", listener);
        return () => {
            document.removeEventListener("mousedown", listener);
            document.removeEventListener("touchstart", listener);
        };
    }, [handler, active]);

    return ref;
}
