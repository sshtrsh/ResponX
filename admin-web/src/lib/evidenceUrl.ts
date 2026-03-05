/**
 * evidenceUrl.ts
 * ──────────────
 * Resolves evidence storage paths stored in `reports.image_url` (text[] column)
 * into short-lived signed URLs (60 min) that work with a private storage bucket.
 *
 * The `image_url` column is a native Postgres text[] array.
 * Supabase returns it as a JavaScript string[] directly — no JSON parsing needed.
 */

import { supabase } from "./supabase";

const BUCKET = "evidence";
/** How long the signed URL stays valid (seconds). */
const SIGNED_URL_TTL = 3600; // 1 hour

/**
 * Normalize the raw `image_url` DB value into an array of storage paths.
 * Handles: string[] (native), legacy JSON string, or a plain single path.
 */
function parsePaths(rawImageUrl: string[] | string | null | undefined): string[] {
    if (!rawImageUrl) return [];

    // Native text[] — Supabase returns this as a JS array
    if (Array.isArray(rawImageUrl)) {
        return rawImageUrl.filter((v): v is string => typeof v === "string" && v.length > 0);
    }

    // Legacy: JSON-stringified array (old TEXT column data)
    if (typeof rawImageUrl === "string" && rawImageUrl.startsWith("[")) {
        try {
            const parsed = JSON.parse(rawImageUrl) as unknown;
            if (Array.isArray(parsed)) {
                return parsed.filter((v): v is string => typeof v === "string");
            }
        } catch {
            // fall through
        }
    }

    // Legacy: full public URL — extract the path after /object/public/evidence/
    if (typeof rawImageUrl === "string") {
        const publicUrlMarker = `/object/public/${BUCKET}/`;
        if (rawImageUrl.includes(publicUrlMarker)) {
            const path = rawImageUrl.split(publicUrlMarker)[1];
            return path ? [path] : [];
        }
        // Already a plain path
        return [rawImageUrl];
    }

    return [];
}

/**
 * Resolve `image_url` into an array of signed URLs.
 * Returns an empty array if the value is null, empty, or all URLs fail to sign.
 */
export async function getEvidenceUrls(rawImageUrl: string[] | string | null | undefined): Promise<string[]> {
    const paths = parsePaths(rawImageUrl);
    if (paths.length === 0) return [];

    const results = await Promise.all(
        paths.map(async (path) => {
            const { data, error } = await supabase.storage
                .from(BUCKET)
                .createSignedUrl(path, SIGNED_URL_TTL);
            if (error || !data?.signedUrl) return null;
            return data.signedUrl;
        }),
    );

    return results.filter((url): url is string => url !== null);
}

/**
 * Convenience: resolve and return just the first signed URL.
 * Useful for the single-image thumbnail in ReportCard.
 */
export async function getFirstEvidenceUrl(rawImageUrl: string[] | string | null | undefined): Promise<string | null> {
    const urls = await getEvidenceUrls(rawImageUrl);
    return urls[0] ?? null;
}
