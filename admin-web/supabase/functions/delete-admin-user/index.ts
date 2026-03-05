import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function decodeJwtPayload(jwt: string): Record<string, unknown> {
    const parts = jwt.split(".");
    if (parts.length !== 3) throw new Error("Invalid JWT format");
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
}

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // ── 1. Extract and decode JWT ──────────────────────────────────────────
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return new Response(JSON.stringify({ error: "Missing or invalid Authorization header" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }
        const jwt = authHeader.substring(7);

        let callerId: string;
        try {
            const payload = decodeJwtPayload(jwt);
            const sub = payload["sub"];
            if (typeof sub !== "string" || !sub) throw new Error("No sub claim");
            callerId = sub;
        } catch {
            return new Response(JSON.stringify({ error: "Invalid token" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // ── 2. Check caller's role ─────────────────────────────────────────────
        const adminClient = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );

        const { data: callerProfile } = await adminClient
            .from("profiles")
            .select("role")
            .eq("id", callerId)
            .single();

        if (!callerProfile || !["super_admin", "police_admin"].includes(callerProfile.role)) {
            return new Response(JSON.stringify({ error: "Forbidden" }), {
                status: 403,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // ── 3. Parse body ──────────────────────────────────────────────────────
        const { userId } = await req.json() as { userId: string };
        if (!userId) {
            return new Response(JSON.stringify({ error: "Missing userId" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        if (userId === callerId) {
            return new Response(JSON.stringify({ error: "You cannot delete your own account" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // ── 4. Delete ──────────────────────────────────────────────────────────
        await adminClient.from("profiles").delete().eq("id", userId);
        const { error } = await adminClient.auth.admin.deleteUser(userId);

        if (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (err: unknown) {
        return new Response(JSON.stringify({ error: String(err) }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
