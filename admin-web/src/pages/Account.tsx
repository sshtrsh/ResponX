import { KeyRound, Loader2 } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { Sidebar } from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

export default function Account() {
    const { role, fullName, user } = useAuth();
    const email = user?.email;
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [updating, setUpdating] = useState(false);

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password.length < 8) {
            return toast.error("Password must be at least 8 characters long.");
        }
        if (password !== confirmPassword) {
            return toast.error("Passwords do not match.");
        }

        setUpdating(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) {
                toast.error("Failed to update password: " + error.message);
            } else {
                toast.success("Password updated successfully!");
                setPassword("");
                setConfirmPassword("");
            }
        } catch {
            toast.error("An unexpected error occurred.");
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-slate-50 font-sans">
            <Sidebar />
            <main className="ml-64 flex-1 p-8">
                <ErrorBoundary label="Account Settings">
                    <div className="max-w-2xl mx-auto">
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">
                            My Account
                        </h1>
                        <p className="text-slate-500 mb-8">
                            Manage your personal admin account settings and security.
                        </p>

                        {/* Profile Info Card (Read-only for now) */}
                        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6">
                            <h2 className="text-lg font-bold text-slate-800 mb-4">Profile Information</h2>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                                        Full Name
                                    </label>
                                    <div className="font-medium text-slate-900">{fullName || "Not set"}</div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                                        Email Address
                                    </label>
                                    <div className="font-medium text-slate-900">{email}</div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                                        Role
                                    </label>
                                    <div className="font-medium text-slate-900 capitalize px-2.5 py-1 bg-slate-100 rounded-md inline-block">
                                        {role?.replace("_", " ")}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Change Password Card */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                        <KeyRound size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-800">Change Password</h2>
                                        <p className="text-sm text-slate-500">Update your account password.</p>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={(e) => void handlePasswordUpdate(e)} className="p-6 bg-slate-50/50">
                                <div className="space-y-4 max-w-md">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                                            New Password
                                        </label>
                                        <input
                                            required
                                            type="password"
                                            placeholder="Min. 8 characters"
                                            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                                            Confirm New Password
                                        </label>
                                        <input
                                            required
                                            type="password"
                                            placeholder="Type password again"
                                            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                        />
                                    </div>

                                    <div className="pt-2">
                                        <button
                                            type="submit"
                                            disabled={updating || !password || !confirmPassword}
                                            className="w-full py-2.5 bg-blue-900 text-white font-bold rounded-lg hover:bg-blue-800 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                        >
                                            {updating ? (
                                                <><Loader2 size={16} className="animate-spin" /> Updating...</>
                                            ) : (
                                                "Update Password"
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>

                    </div>
                </ErrorBoundary>
            </main>
        </div>
    );
}
