import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth, type UserRole } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

interface RoleGuardProps {
    allowedRoles: UserRole[];
    children: React.ReactNode;
}

/**
 * Wraps a route element and signs out + redirects to /login
 * if the current user's role is not in `allowedRoles`.
 * Waits for the profile to load before evaluating the role
 * to avoid bouncing users on the default "resident" value.
 */
export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
    const { role, isLoaded } = useAuth();

    const isUnauthorized = isLoaded && !allowedRoles.includes(role);

    // Sign the user out if they don't have the right role.
    // This clears the Supabase session so they can't just navigate back.
    useEffect(() => {
        if (isUnauthorized) {
            void supabase.auth.signOut();
        }
    }, [isUnauthorized]);

    if (!isLoaded) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
        );
    }

    if (isUnauthorized) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}
