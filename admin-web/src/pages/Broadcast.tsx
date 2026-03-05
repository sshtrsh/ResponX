import { Bell, Loader2, Megaphone, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { Sidebar } from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import { useBroadcastData } from "../features/broadcast/hooks/useBroadcastData";

export default function Broadcast() {
  const { jurisdiction, fullName } = useAuth();

  const { announcements, loading, sendAnnouncement, deleteAnnouncement } =
    useBroadcastData({ jurisdiction: jurisdiction ?? "", fullName: fullName ?? "" });

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [sending, setSending] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    const ok = await sendAnnouncement({ title, message, priority });
    if (ok) {
      setTitle("");
      setMessage("");
    }
    setSending(false);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar />

      <main className="ml-64 flex-1 p-8">
        <ErrorBoundary label="Broadcast">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Public Broadcast
            </h1>
            <p className="text-slate-500">
              Send alerts and news to residents in your jurisdiction.
            </p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LEFT: COMPOSE MESSAGE */}
            <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm sticky top-8">
                <div className="flex items-center gap-2 mb-6 text-slate-800 font-bold text-lg">
                  <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                    <Megaphone size={20} />
                  </div>
                  Compose Alert
                </div>

                <form onSubmit={handleSend} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Headline</label>
                    <input
                      required
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="e.g. Water Interruption"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Priority Level</label>
                    <div className="flex gap-2">
                      {["Normal", "Urgent", "Emergency"].map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setPriority(level)}
                          className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg border ${priority === level
                              ? level === "Emergency"
                                ? "bg-red-600 text-white border-red-600"
                                : level === "Urgent"
                                  ? "bg-orange-500 text-white border-orange-500"
                                  : "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                            }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Message Body</label>
                    <textarea
                      required
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg h-32 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                      placeholder="Type your announcement details here..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </div>

                  <button
                    disabled={sending}
                    type="submit"
                    className="w-full py-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 flex items-center justify-center gap-2"
                  >
                    {sending ? "Sending..." : <><Send size={16} /> Broadcast Now</>}
                  </button>
                </form>
              </div>
            </div>

            {/* RIGHT: HISTORY FEED */}
            <div className="lg:col-span-2">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Bell size={18} className="text-slate-400" /> Recent Broadcasts
              </h3>

              <div className="space-y-4">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
                    <p className="text-sm text-slate-400 font-medium">Loading broadcasts...</p>
                  </div>
                ) : announcements.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
                    <Megaphone className="w-12 h-12 text-slate-200 mb-3" />
                    <h3 className="text-slate-900 font-bold">No broadcasts yet</h3>
                    <p className="text-slate-500 text-sm">Compose your first alert using the form on the left.</p>
                  </div>
                ) : (
                  announcements.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between group"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${item.priority === "Emergency"
                                ? "bg-red-50 text-red-600 border-red-100"
                                : item.priority === "Urgent"
                                  ? "bg-orange-50 text-orange-600 border-orange-100"
                                  : "bg-blue-50 text-blue-600 border-blue-100"
                              }`}
                          >
                            {item.priority}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">
                            {new Date(item.created_at).toLocaleDateString()} • {item.barangay}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-800 text-lg">{item.title}</h4>
                        <p className="text-slate-600 text-sm mt-1 leading-relaxed">{item.message}</p>
                        <p className="text-xs text-slate-400 mt-3 font-medium">Sent by: {item.author_name}</p>
                      </div>

                      <button
                        onClick={() => deleteAnnouncement(item.id)}
                        aria-label="Delete announcement"
                        className="text-slate-300 hover:text-red-500 transition p-2"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </ErrorBoundary>
      </main>
    </div>
  );
}
