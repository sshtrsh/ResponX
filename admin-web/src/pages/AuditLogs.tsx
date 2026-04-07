import { format } from "date-fns";
import { ChevronLeft, ChevronRight, FileSearch, Loader2, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { Sidebar } from "../components/Sidebar";
import { supabase } from "../lib/supabase";

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  details: string;
  created_at: string;
  profiles: {
    full_name: string | null;
    email: string | null;
  } | null;
}

const ITEMS_PER_PAGE = 12;

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    void fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const fetchLogs = async () => {
    setLoading(true);
    const from = page * ITEMS_PER_PAGE;
    
    // We join with the profiles table to get the name/email of the user who performed the action
    const { data, error, count } = await supabase
      .from("audit_logs")
      .select("*, profiles(full_name, email)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, from + ITEMS_PER_PAGE - 1);

    if (error) {
      toast.error("Failed to load audit logs: " + error.message);
    } else {
      setLogs(data as unknown as AuditLog[]);
    }
    if (count !== null) setTotalCount(count);

    setLoading(false);
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar />
      <main className="ml-64 flex-1 p-8">
        <ErrorBoundary label="Audit Logs">
          {/* HEADER */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                <FileSearch className="w-8 h-8 text-blue-900" />
                System Audit Logs
              </h1>
              <p className="text-slate-500 mt-1">
                Immutable record of administrative actions and status changes.
              </p>
            </div>
          </div>

          {/* TABLE LOGS */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500 uppercase tracking-wider font-bold">
                  <th className="px-5 py-4 text-left">Timestamp</th>
                  <th className="px-5 py-4 text-left">Admin / User</th>
                  <th className="px-5 py-4 text-left">Action</th>
                  <th className="px-5 py-4 text-left">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="text-center py-16">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-900 mx-auto" />
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-slate-400">
                      <ShieldAlert className="w-10 h-10 mx-auto mb-2 text-slate-200" />
                      No audit logs found.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap text-slate-500">
                        {format(new Date(log.created_at), "MMM d, yyyy h:mm a")}
                      </td>
                      <td className="px-5 py-4">
                        {log.profiles ? (
                          <>
                            <div className="font-semibold text-slate-900">{log.profiles.full_name || "Unknown Name"}</div>
                            <div className="text-xs text-slate-400">{log.profiles.email}</div>
                          </>
                        ) : (
                          <div className="text-slate-500 italic">System / Service Role</div>
                        )}
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-700">
                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-600 line-clamp-2" title={log.details}>
                        {log.details}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50 text-sm text-slate-500">
                <span>{totalCount} log{totalCount !== 1 ? "s" : ""} recorded</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="font-semibold text-slate-700">
                    Page {page + 1} of {totalPages}
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
    </div>
  );
}
