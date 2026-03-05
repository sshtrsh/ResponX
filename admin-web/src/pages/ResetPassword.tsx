import { CheckCircle2, Eye, EyeOff, Loader2, Lock, Shield } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }

    if (password.length < 6) {
      setMessage({
        type: "error",
        text: "Password must be at least 6 characters.",
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    // Update password for the currently authenticated user (from the reset link session)
    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
      setLoading(false);
    } else {
      setMessage({
        type: "success",
        text: "Password updated successfully! Redirecting...",
      });
    }
  };

  // Redirect after success, with cleanup on unmount
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (message?.type === "success") {
      redirectTimer.current = setTimeout(() => navigate("/"), 2000);
    }
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, [message, navigate]);

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
        {/* Logo / Icon */}
        <div className="flex justify-center mb-6">
          <div className="bg-blue-600 p-4 rounded-full shadow-lg shadow-blue-200">
            <Shield className="w-10 h-10 text-white" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">
          Set New Password
        </h1>
        <p className="text-center text-slate-500 mb-8 text-sm">
          Please enter your new password below.
        </p>

        {/* Message Alert */}
        {message && (
          <div
            className={`text-sm p-3 rounded-lg mb-4 text-center border flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-2 ${message.type === "success"
                ? "bg-green-50 text-green-700 border-green-100"
                : "bg-red-50 text-red-600 border-red-100"
              }`}
          >
            {message.type === "success" && <CheckCircle2 className="w-4 h-4" />}
            {message.text}
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              New Password
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

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition pr-10"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <Lock className="absolute right-3 top-3.5 w-5 h-5 text-slate-400" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || message?.type === "success"}
            className={`w-full font-bold py-3 rounded-lg transition-all shadow-md flex justify-center items-center ${loading || message?.type === "success"
                ? "bg-blue-400 cursor-not-allowed text-white/80"
                : "bg-blue-700 hover:bg-blue-800 text-white"
              }`}
          >
            {loading ? (
              <Loader2 className="animate-spin w-5 h-5" />
            ) : (
              "Update Password"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
