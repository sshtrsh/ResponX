import { ArrowLeft, Loader2, Mail, Shield } from "lucide-react";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Construct the redirect URL dynamically
    const redirectTo = `${window.location.origin}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({
        type: "success",
        text: "Password reset link sent! Please check your email inbox.",
      });
    }
    setLoading(false);
  };

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
          Forgot Password?
        </h1>
        <p className="text-center text-slate-500 mb-8 text-sm">
          Enter your email address and we'll send you a link to reset your
          password.
        </p>

        {/* Message Alert */}
        {message && (
          <div
            className={`text-sm p-3 rounded-lg mb-4 text-center border animate-in fade-in slide-in-from-top-2 ${
              message.type === "success"
                ? "bg-green-50 text-green-700 border-green-100"
                : "bg-red-50 text-red-600 border-red-100"
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition pl-10"
                placeholder="admin@barangay.gov.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full font-bold py-3 rounded-lg transition-all shadow-md flex justify-center items-center ${
              loading
                ? "bg-blue-400 cursor-not-allowed text-white/80"
                : "bg-blue-700 hover:bg-blue-800 text-white"
            }`}
          >
            {loading ? (
              <Loader2 className="animate-spin w-5 h-5" />
            ) : (
              "Send Reset Link"
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
