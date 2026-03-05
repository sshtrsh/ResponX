/* eslint-disable react-refresh/only-export-components */
import type { Session, User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

export type UserRole =
    | "super_admin"
    | "barangay_admin"
    | "police_admin"
    | "resident";

interface AuthState {
    session: Session | null;
    user: User | null;
    role: UserRole;
    jurisdiction: string;
    fullName: string;
    /** True once the profile fetch has finished (success or error). */
    isLoaded: boolean;
}

interface AuthContextValue extends AuthState {
    /** Call this to force a fresh profile reload, e.g. after a role change. */
    refreshProfile: () => Promise<void>;
    signOut: () => Promise<void>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const VALID_ROLES: UserRole[] = [
    "super_admin",
    "barangay_admin",
    "police_admin",
    "resident",
];

function toUserRole(value: string | undefined | null): UserRole {
    if (value && VALID_ROLES.includes(value as UserRole)) {
        return value as UserRole;
    }
    return "resident";
}

const DEFAULT_STATE: AuthState = {
    session: null,
    user: null,
    role: "resident",
    jurisdiction: "",
    fullName: "",
    isLoaded: false,
};

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue>({
    ...DEFAULT_STATE,
    refreshProfile: async () => { },
    signOut: async () => { },
});

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<AuthState>(DEFAULT_STATE);

    const loadProfile = useCallback(async (user: User) => {
        const { data, error } = await supabase
            .from("profiles")
            .select("role, jurisdiction, full_name")
            .eq("id", user.id)
            .single<{ role?: string; jurisdiction?: string; full_name?: string }>();

        if (error) {
            // SECURITY: user_metadata is writable by any client via supabase.auth.updateUser().
            // Never use it to determine role — always fall back to "resident" so a compromise
            // of this code path cannot elevate privileges. Role is canonical only in `profiles`.
            setState((prev) => ({
                ...prev,
                role: "resident",
                jurisdiction: "",
                fullName: user.email ?? "Admin",
                isLoaded: true,
            }));
            return;
        }

        setState((prev) => ({
            ...prev,
            role: toUserRole(data?.role),
            jurisdiction: data?.jurisdiction ?? "",
            fullName: data?.full_name ?? user.email ?? "Admin",
            isLoaded: true,
        }));
    }, []);

    const refreshProfile = useCallback(async () => {
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (user) await loadProfile(user);
    }, [loadProfile]);

    const signOut = useCallback(async () => {
        await supabase.auth.signOut();
    }, []);

    // Bootstrap: get the current session, then subscribe to auth changes.
    useEffect(() => {
        void supabase.auth.getSession().then(({ data: { session } }) => {
            setState((prev) => ({ ...prev, session, user: session?.user ?? null }));
            if (session?.user) {
                void loadProfile(session.user);
            } else {
                setState((prev) => ({ ...prev, isLoaded: true }));
            }
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setState((prev) => {
                // When going from no-session → session (new sign-in),
                // reset isLoaded so RoleGuard waits for loadProfile to finish
                // instead of immediately evaluating the default "resident" role.
                const isNewSignIn = !!session && !prev.session;
                return {
                    ...prev,
                    session,
                    user: session?.user ?? null,
                    isLoaded: isNewSignIn ? false : (session ? prev.isLoaded : true),
                };
            });
            if (session?.user) {
                void loadProfile(session.user);
            }
        });

        return () => subscription.unsubscribe();
    }, [loadProfile]);

    return (
        <AuthContext.Provider value={{ ...state, refreshProfile, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Returns the shared auth state (session, role, jurisdiction, full name).
 * Must be used inside <AuthProvider>.
 */
export function useAuth(): AuthContextValue {
    return useContext(AuthContext);
}