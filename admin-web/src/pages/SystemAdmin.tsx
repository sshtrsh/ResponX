import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  UserCog,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { Sidebar } from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

interface SystemUser {
  id: string;
  email?: string;
  full_name?: string;
  role: string;
  jurisdiction?: string;
  created_at?: string;
}

interface CreateAdminForm {
  email: string;
  password: string;
  full_name: string;
  role: string;
  jurisdiction: string;
}

const EMPTY_FORM: CreateAdminForm = {
  email: "",
  password: "",
  full_name: "",
  role: "barangay_admin",
  jurisdiction: "",
};

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  super_admin: { label: "Super Admin", color: "bg-purple-100 text-purple-800 border-purple-200" },
  police_admin: { label: "Police Admin", color: "bg-blue-100 text-blue-800 border-blue-200" },
  barangay_admin: { label: "Barangay Admin", color: "bg-green-100 text-green-800 border-green-200" },
  resident: { label: "Resident", color: "bg-slate-100 text-slate-600 border-slate-200" },
};

const ITEMS_PER_PAGE = 8;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SystemAdmin() {
  const { role: callerRole } = useAuth();

  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState<CreateAdminForm>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // jurisdiction edits committed on blur to avoid per-keystroke writes
  const [localJurisdictions, setLocalJurisdictions] = useState<Record<string, string>>({});

  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchTerm]);

  const fetchUsers = async () => {
    setLoading(true);
    let query = supabase
      .from("profiles")
      .select("*", { count: "exact" })
      .neq("role", "resident"); // Only show admin-tier accounts

    if (searchTerm) {
      query = query.or(`email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%,role.ilike.%${searchTerm}%`);
    }

    const from = page * ITEMS_PER_PAGE;
    const { data, error, count } = await query
      .order("updated_at", { ascending: false })
      .range(from, from + ITEMS_PER_PAGE - 1);

    if (error) {
      toast.error("Failed to load users: " + error.message);
    } else {
      setUsers(data as SystemUser[]);
    }
    if (count !== null) setTotalCount(count);

    // Pre-populate local jurisdiction state
    const jmap: Record<string, string> = {};
    (data ?? []).forEach((u: SystemUser) => {
      jmap[u.id] = u.jurisdiction ?? "";
    });
    setLocalJurisdictions(jmap);

    setLoading(false);
  };

  // ── Edge Function helper ───────────────────────────────────────────────────
  // getSession() returns a cached (possibly expired) token → Supabase gateway
  // rejects it with "Invalid JWT". refreshSession() always fetches a fresh
  // token from the server, then falls back to the cached session if the
  // refresh token itself is missing.
  const callEdgeFunction = async (fnName: string, body: unknown) => {
    // Try to get a fresh token; if refresh fails, fall back to cached session.
    // With verify_jwt=false on the function, the gateway won't reject expired tokens —
    // our function validates the JWT independently via payload decode.
    const { data: { session: refreshed } } = await supabase.auth.refreshSession();
    const session = refreshed ?? (await supabase.auth.getSession()).data.session;
    if (!session?.access_token) {
      throw new Error("No active session. Please sign out and sign in again.");
    }
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fnName}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      },
    );
    const json = await res.json() as Record<string, unknown>;
    if (!res.ok) throw new Error(String(json.error ?? json.message ?? `HTTP ${res.status}`));
    return json;
  };

  // ── Create admin ──────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!EMAIL_REGEX.test(form.email)) return toast.error("Invalid email address.");
    if (form.password.length < 8) return toast.error("Password must be at least 8 characters.");
    if (!form.full_name.trim()) return toast.error("Full name is required.");
    if (form.role === "barangay_admin" && !form.jurisdiction.trim())
      return toast.error("Barangay jurisdiction is required for Barangay Admin.");

    setCreating(true);
    try {
      await callEdgeFunction("create-admin-user", {
        email: form.email.toLowerCase(),
        password: form.password,
        full_name: form.full_name.trim(),
        role: form.role,
        jurisdiction: form.jurisdiction.trim() || undefined,
      });
      toast.success(`Admin account created for ${form.email}!`);
      setShowCreateModal(false);
      setForm(EMPTY_FORM);
      void fetchUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create admin.");
    } finally {
      setCreating(false);
    }
  };

  // ── Delete admin ──────────────────────────────────────────────────────────
  const handleDelete = async (user: SystemUser) => {
    if (!window.confirm(`Permanently delete ${user.email ?? user.full_name}? This cannot be undone.`)) return;
    setDeletingId(user.id);

    try {
      await callEdgeFunction("delete-admin-user", { userId: user.id });
      toast.success("Admin account removed.");
      void fetchUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete user.");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Update role ───────────────────────────────────────────────────────────
  const handleRoleUpdate = async (id: string, newRole: string) => {
    const user = users.find(u => u.id === id);
    if (!window.confirm(`Change ${user?.email ?? "this user"}'s role to ${ROLE_LABELS[newRole]?.label ?? newRole}?`)) return;
    const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", id);
    if (error) toast.error("Failed to update role: " + error.message);
    else {
      toast.success("Role updated.");
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, role: newRole } : u));
    }
  };

  // ── Update jurisdiction on input blur ─────────────────────────────────────
  const commitJurisdiction = async (id: string) => {
    const jurisdiction = localJurisdictions[id] ?? "";
    const original = users.find((u) => u.id === id)?.jurisdiction ?? "";
    if (jurisdiction === original) return;
    const { error } = await supabase.from("profiles").update({ jurisdiction }).eq("id", id);
    if (error) toast.error("Failed to update jurisdiction: " + error.message);
    else toast.success("Jurisdiction saved.");
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar />
      <main className="ml-64 flex-1 p-8">
        <ErrorBoundary label="System Admin">
          {/* HEADER */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                <ShieldAlert className="w-8 h-8 text-blue-900" />
                Admin Management
              </h1>
              <p className="text-slate-500 mt-1">
                Create, assign, and remove administrator accounts.
              </p>
            </div>

            <button
              onClick={() => { setShowCreateModal(true); setForm(EMPTY_FORM); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-900 text-white font-bold text-sm rounded-lg hover:bg-blue-800 transition shadow-lg shadow-blue-900/20"
            >
              <Plus size={18} />
              Create Admin Account
            </button>
          </div>

          {/* SEARCH */}
          <div className="relative mb-6 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search by name, email, role…"
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
            />
          </div>

          {/* USER TABLE */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500 uppercase tracking-wider font-bold">
                  <th className="px-5 py-3 text-left">Admin</th>
                  <th className="px-5 py-3 text-left">Role</th>
                  <th className="px-5 py-3 text-left">Jurisdiction</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="text-center py-16">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-900 mx-auto" />
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-slate-400">
                      <UserCog className="w-10 h-10 mx-auto mb-2 text-slate-200" />
                      No admin accounts found.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const roleStyle = ROLE_LABELS[user.role] ?? ROLE_LABELS["resident"];
                    return (
                      <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                        {/* Admin info */}
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900">
                            {user.full_name || <span className="italic text-slate-400">No name</span>}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">{user.email}</div>
                        </td>

                        {/* Role */}
                        <td className="px-5 py-4">
                          <select
                            className={`text-xs font-bold px-2.5 py-1 rounded-lg border cursor-pointer outline-none ${roleStyle.color}`}
                            value={user.role}
                            onChange={(e) => void handleRoleUpdate(user.id, e.target.value)}
                            disabled={callerRole !== "super_admin"}
                          >
                            <option value="super_admin">Super Admin</option>
                            <option value="police_admin">Police Admin</option>
                            <option value="barangay_admin">Barangay Admin</option>
                          </select>
                        </td>

                        {/* Jurisdiction */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5">
                            <Building2 size={13} className="text-slate-400 shrink-0" />
                            <input
                              type="text"
                              placeholder="Not set"
                              className="text-sm bg-transparent border-b border-dashed border-slate-200 focus:border-blue-400 focus:outline-none py-0.5 max-w-[180px]"
                              value={localJurisdictions[user.id] ?? ""}
                              onChange={(e) =>
                                setLocalJurisdictions((p) => ({ ...p, [user.id]: e.target.value }))
                              }
                              onBlur={() => void commitJurisdiction(user.id)}
                            />
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => void handleDelete(user)}
                            disabled={deletingId === user.id}
                            className="p-1.5 text-slate-300 hover:text-red-500 transition disabled:opacity-50"
                            title="Delete admin account"
                          >
                            {deletingId === user.id
                              ? <Loader2 size={16} className="animate-spin" />
                              : <Trash2 size={16} />}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* PAGINATION */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50 text-sm text-slate-500">
                <span>{totalCount} admin{totalCount !== 1 ? "s" : ""} total</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="font-semibold text-slate-700">
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-40"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </ErrorBoundary>
      </main>

      {/* CREATE ADMIN MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-blue-900 px-6 py-5 flex justify-between items-center">
              <div>
                <h2 className="text-white font-bold text-lg">Create Admin Account</h2>
                <p className="text-blue-200 text-xs mt-0.5">Account is ready to use immediately</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-white/70 hover:text-white transition p-1"
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={(e) => void handleCreate(e)} className="p-6 space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Juan dela Cruz"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
                <input
                  required
                  type="email"
                  placeholder="admin@example.com"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
                <div className="relative">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    className="w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Role</label>
                <select
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  {callerRole === "super_admin" && (
                    <option value="police_admin">Police Admin</option>
                  )}
                  <option value="barangay_admin">Barangay Admin</option>
                  {callerRole === "super_admin" && (
                    <option value="super_admin">Super Admin</option>
                  )}
                </select>
              </div>

              {/* Jurisdiction */}
              {(form.role === "barangay_admin" || form.role === "police_admin") && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Jurisdiction / Barangay
                    {form.role === "barangay_admin" && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Canlubang"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                    value={form.jurisdiction}
                    onChange={(e) => setForm({ ...form, jurisdiction: e.target.value })}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={creating}
                className="w-full py-3 bg-blue-900 text-white font-bold rounded-lg hover:bg-blue-800 transition flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {creating ? (
                  <><Loader2 size={16} className="animate-spin" /> Creating account…</>
                ) : (
                  <><Plus size={16} /> Create Admin Account</>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
