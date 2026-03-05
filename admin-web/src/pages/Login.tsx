import { Eye, EyeOff, Loader2 } from "lucide-react";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // State Variables
  const [showPassword, setShowPassword] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Rate Limiting (Client-Side)
    if (loginAttempts >= 5) {
      setErrorMsg("Too many failed attempts. Please try again later.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    // Login with Supabase
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoginAttempts((prev) => prev + 1);
      // Better Error Messages
      if (error.message.includes("Invalid login credentials")) {
        setErrorMsg("Invalid email or password. Please try again.");
      } else if (error.message.includes("Email not confirmed")) {
        setErrorMsg("Please verify your email address before logging in.");
      } else if (error.message.toLowerCase().includes("network")) {
        setErrorMsg("Network error. Please check your connection.");
      } else {
        setErrorMsg(error.message);
      }
      setLoading(false);
      return;
    }

    if (authData.user) {
      // Role-Based Access Control (RBAC)
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", authData.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        setErrorMsg("Error fetching user profile.");
        setLoading(false);
        return;
      }

      const allowedRoles = ["super_admin", "barangay_admin", "police_admin"];

      if (!allowedRoles.includes(profile.role)) {
        await supabase.auth.signOut();
        setErrorMsg(
          "Access denied. This portal is for authorized personnel only.",
        );
        setLoading(false);
        return;
      }

      // Redirect first based on role
      if (profile.role === "super_admin") {
        navigate("/settings", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }

      // Audit Logging — fully fire-and-forget after navigation
      setTimeout(() => {
        void supabase.from("audit_logs").insert([
          {
            user_id: authData.user.id,
            action: "login",
            details: `${profile.full_name || email} logged in as ${profile.role}`,
          },
        ]).then(({ error }) => {
          if (error) console.warn("Audit log failed (non-critical):", error.message);
        });
      }, 500);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
        {/* Logo / Icon */}
        <div className="flex justify-center mb-6">
          <div className="bg-slate-50 p-2 rounded-2xl shadow-inner border border-slate-100">
            <img src="/logo.png" alt="ResponX Logo" className="w-16 h-16 object-contain rounded-xl" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">
          Command Center
        </h1>
        <p className="text-center text-slate-500 mb-8">
          Authorized Personnel Only
        </p>

        {/* Error Message */}
        {errorMsg && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 text-center border border-red-100 animate-in fade-in slide-in-from-top-2">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              placeholder="admin@barangay.gov.ph"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition pr-10"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 transition"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end text-sm">
            {/* ✅ FIXED: Now navigates to the actual route instead of showing an alert */}
            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
              className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full font-bold py-3 rounded-lg transition-all shadow-md flex justify-center items-center ${loading
              ? "bg-blue-400 cursor-not-allowed text-white/80"
              : "bg-blue-700 hover:bg-blue-800 text-white"
              }`}
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Sign In"}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-slate-400">
          Secured by ResponX v1.0
        </div>
      </div>
    </div>
  );
}
