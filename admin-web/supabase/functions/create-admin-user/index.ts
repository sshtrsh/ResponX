import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Decode a JWT payload without verifying the signature.
 *  Safe here because the Supabase gateway already verified the JWT before
 *  routing the request to this function (verify_jwt = true by default). */
function decodeJwtPayload(jwt: string): Record<string, unknown> {
    const parts = jwt.split(".");
    if (parts.length !== 3) throw new Error("Invalid JWT format");
    // atob handles standard base64; JWT uses base64url, so replace chars first
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
}

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // ── 1. Extract the JWT ─────────────────────────────────────────────────
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return new Response(JSON.stringify({ error: "Missing or invalid Authorization header" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }
        const jwt = authHeader.substring(7);

        // ── 2. Decode JWT to get caller's user ID ──────────────────────────────
        //    The Supabase gateway already verified the signature, so we just
        //    need the `sub` claim (user ID).
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

        // ── 3. Use service-role client to check caller's profile role ──────────
        const adminClient = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );

        const { data: callerProfile, error: profileError } = await adminClient
            .from("profiles")
            .select("role")
            .eq("id", callerId)
            .single();

        if (profileError || !callerProfile) {
            return new Response(JSON.stringify({ error: "Could not verify caller profile" }), {
                status: 403,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const allowedCallerRoles = ["super_admin", "police_admin"];
        if (!allowedCallerRoles.includes(callerProfile.role)) {
            return new Response(JSON.stringify({ error: "Forbidden: insufficient role" }), {
                status: 403,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // ── 4. Parse + validate request body ──────────────────────────────────
        const { email, password, full_name, role, jurisdiction } = await req.json() as {
            email: string;
            password: string;
            full_name: string;
            role: string;
            jurisdiction?: string;
        };

        if (!email || !password || !full_name || !role) {
            return new Response(JSON.stringify({ error: "Missing required fields" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const allowedRoles = ["police_admin", "barangay_admin", "super_admin"];
        if (!allowedRoles.includes(role)) {
            return new Response(JSON.stringify({ error: "Invalid role" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        if (callerProfile.role === "police_admin" && role !== "barangay_admin") {
            return new Response(JSON.stringify({ error: "Police admins can only create barangay admin accounts" }), {
                status: 403,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // ── 5. Create auth user ────────────────────────────────────────────────
        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name },
        });

        if (createError) {
            return new Response(JSON.stringify({ error: createError.message }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // ── 6. Upsert profile row ──────────────────────────────────────────────
        const { error: profileUpsertError } = await adminClient
            .from("profiles")
            .upsert({
                id: newUser.user!.id,
                email,
                full_name,
                role,
                jurisdiction: jurisdiction || null,
            });

        if (profileUpsertError) {
            await adminClient.auth.admin.deleteUser(newUser.user!.id);
            return new Response(JSON.stringify({ error: "Profile creation failed: " + profileUpsertError.message }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        return new Response(
            JSON.stringify({ success: true, userId: newUser.user!.id }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );

    } catch (err: unknown) {
        return new Response(JSON.stringify({ error: String(err) }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
