import { Session } from "@supabase/supabase-js";
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";

type AuthContextType = {
  session: Session | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let initialSessionCheck: Promise<void> | null = null;

    // Check for active session on load
    initialSessionCheck = supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (isMounted) {
          setSession(session);
          setLoading(false);
        }
      })
      .catch(async (error) => {
        // Handle invalid/expired refresh token by clearing the corrupted session
        console.warn('Session recovery failed, signing out:', error.message);
        if (isMounted) {
          await supabase.auth.signOut();
          setSession(null);
          setLoading(false);
        }
      });

    // Listen for changes (login/logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      // Cancel initial session check if subscription fires first to prevent race condition
      if (initialSessionCheck && event === 'SIGNED_IN' && newSession) {
        initialSessionCheck = null;
      }

      if (event === 'TOKEN_REFRESHED' && !newSession) {
        // Token refresh failed — clear the invalid session
        console.warn('Token refresh failed, signing out.');
        if (isMounted) {
          await supabase.auth.signOut();
          setSession(null);
        }
      } else if (isMounted) {
        setSession(newSession);
      }
      
      if (isMounted && loading) {
        setLoading(false);
      }
    });

    // Cleanup function
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
