import { format } from "date-fns";
import {
  BookOpen,
  Calendar,
  CheckCircle,
  FileText,
  Gavel,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { Sidebar } from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import {
  DEFAULT_FORM,
  useBlotterData,
  type BlotterFormData,
} from "../features/blotter/hooks/useBlotterData";

const STATUS_TABS = ["Scheduled", "Settled", "Unresolved", "File to Court"];

export default function Blotter() {
  const { role: userRole, jurisdiction: userJurisdiction, fullName: userFullName, isLoaded } = useAuth();

  const [activeTab, setActiveTab] = useState("Scheduled");
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<BlotterFormData>(DEFAULT_FORM);

  const { cases, loading, submitCase, updateStatus, deleteCase } = useBlotterData({
    activeTab,
    userRole,
    userJurisdiction: userJurisdiction ?? null,
    userFullName: userFullName ?? "",
    isLoaded,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await submitCase(formData);
    if (ok) {
      setShowModal(false);
      setFormData({ ...DEFAULT_FORM });
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar />

      <main className="ml-64 flex-1 p-8">
        <ErrorBoundary label="Blotter">
          <header className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                <BookOpen className="w-8 h-8 text-blue-900" />
                Barangay Blotter
              </h1>
              <p className="text-slate-500 mt-1">
                Digital logbook for{" "}
                <span className="font-bold text-slate-700">
                  {userJurisdiction || "All Barangays"}
                </span>
              </p>
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-blue-900 text-white rounded-lg font-bold text-sm hover:bg-blue-800 transition flex items-center gap-2 shadow-lg shadow-blue-900/20"
            >
              <Plus size={18} />
              File New Case
            </button>
          </header>

          {/* TABS */}
          <div className="flex gap-2 mb-6 border-b border-slate-200">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === tab
                    ? "border-blue-900 text-blue-900"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* CASE LIST */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {loading ? (
              <div className="col-span-2 flex flex-col items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-blue-900 mb-3" />
                <p className="text-sm text-slate-400 font-medium">Loading records...</p>
              </div>
            ) : cases.length === 0 ? (
              <div className="col-span-2 text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                <Gavel className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <h3 className="text-slate-900 font-bold">No cases found</h3>
                <p className="text-slate-500 text-sm">
                  There are no {activeTab.toLowerCase()} cases in {userJurisdiction}.
                </p>
              </div>
            ) : (
              cases.map((c) => (
                <div
                  key={c.id}
                  className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-2">
                      <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider">
                        {c.incident_type}
                      </span>
                      {userRole === "police_admin" && (
                        <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider">
                          {c.barangay}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-mono">
                        {c.created_at ? format(new Date(c.created_at), "MMM d, yyyy") : "—"}
                      </span>
                      {c.filed_by && (
                        <span className="text-[11px] text-slate-400">
                          · Filed by <span className="font-semibold text-slate-500">{c.filed_by}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-6">
                    <div className="text-center flex-1">
                      <div className="font-bold text-slate-900 text-lg">{c.complainant}</div>
                      <div className="text-xs text-slate-400 uppercase tracking-wide font-bold">Complainant</div>
                    </div>
                    <div className="text-slate-300 font-serif italic text-sm">vs</div>
                    <div className="text-center flex-1">
                      <div className="font-bold text-slate-900 text-lg">{c.respondent}</div>
                      <div className="text-xs text-slate-400 uppercase tracking-wide font-bold">Respondent</div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-lg mb-4">
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                      <FileText size={12} /> Narrative
                    </h4>
                    <p className="text-sm text-slate-700 italic">"{c.narrative}"</p>
                  </div>

                  {c.hearing_date && (
                    <div className="flex items-center gap-2 text-sm text-blue-700 font-semibold bg-blue-50 p-3 rounded mb-4">
                      <Calendar size={16} />
                      Hearing: {format(new Date(c.hearing_date), "MMMM d, yyyy")}
                    </div>
                  )}

                  <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                    {activeTab === "Scheduled" && (
                      <>
                        <button
                          onClick={() => updateStatus(c.id, "Settled")}
                          className="flex-1 py-2 bg-green-50 text-green-700 rounded font-bold text-xs hover:bg-green-100 transition flex justify-center items-center gap-2"
                        >
                          <CheckCircle size={14} /> Settle
                        </button>
                        <button
                          onClick={() => updateStatus(c.id, "File to Court")}
                          className="flex-1 py-2 bg-slate-100 text-slate-600 rounded font-bold text-xs hover:bg-slate-200 transition flex justify-center items-center gap-2"
                        >
                          <Gavel size={14} /> Court
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => deleteCase(c.id)}
                      className="p-2 text-slate-300 hover:text-red-500 transition"
                      aria-label="Delete case"
                      title="Delete Record"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ErrorBoundary>
      </main>

      {/* NEW CASE MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-blue-900 px-6 py-4 flex justify-between items-center">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Gavel size={20} /> New Case Entry
              </h3>
              <button
                onClick={() => setShowModal(false)}
                aria-label="Close modal"
                className="text-white/70 hover:text-white transition"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-4 bg-blue-50 border border-blue-100 p-2 rounded text-xs text-blue-800 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-600" />
                Filing case for: <strong>{userJurisdiction || "General Jurisdiction"}</strong>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Complainant</label>
                  <input
                    required
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Full Name"
                    value={formData.complainant}
                    onChange={(e) => setFormData({ ...formData, complainant: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Respondent</label>
                  <input
                    required
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Full Name"
                    value={formData.respondent}
                    onChange={(e) => setFormData({ ...formData, respondent: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Case Type</label>
                  <select
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    value={formData.incident_type}
                    onChange={(e) => setFormData({ ...formData, incident_type: e.target.value })}
                  >
                    <option>Neighborhood Dispute</option>
                    <option>Collection of Debt</option>
                    <option>Property Damage</option>
                    <option>Unjust Vexation</option>
                    <option>Gossip / Libel</option>
                    <option>Physical Injury</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hearing Date</label>
                  <input
                    type="date"
                    required
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={formData.hearing_date}
                    onChange={(e) => setFormData({ ...formData, hearing_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Incident Narrative</label>
                <textarea
                  required
                  className="w-full p-3 border border-slate-300 rounded h-24 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Describe what happened..."
                  value={formData.narrative}
                  onChange={(e) => setFormData({ ...formData, narrative: e.target.value })}
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-900 text-white font-bold rounded-lg hover:bg-blue-800 transition"
              >
                File Case
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
