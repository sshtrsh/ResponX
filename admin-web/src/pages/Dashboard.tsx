import { ErrorBoundary } from "../components/ErrorBoundary";
import { Sidebar } from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import { DashboardHeader } from "../features/dashboard/components/DashboardHeader";
import { KpiBar } from "../features/dashboard/components/KpiBar";
import { RejectModal } from "../features/dashboard/components/RejectModal";
import { ReportList } from "../features/dashboard/components/ReportList";
import { SearchBar } from "../features/dashboard/components/SearchBar";
import { StatusTabs } from "../features/dashboard/components/StatusTabs";
import { useReportActions } from "../features/dashboard/hooks/useReportActions";
import { useReports } from "../features/dashboard/hooks/useReports";
import { isEditableRole } from "../features/dashboard/utils/reportHelpers";
import type { StatusFilter } from "../types/report";

const STATUS_TABS: StatusFilter[] = [
  "All",
  "Pending",
  "Verified",
  "Escalated",
  "Rejected",
  "Resolved",
];

export default function Dashboard() {
  const { role: userRole, jurisdiction: userJurisdiction, fullName: userName, isLoaded: isUserLoaded } = useAuth();

  const {
    setReports,
    filter,
    setFilter,
    loading,
    searchTerm,
    setSearchTerm,
    filteredReports,
    kpi,
    tabCounts,
    fetchReports,
    updateLocalList,
    loadMore,
  } = useReports({ userRole, userJurisdiction: userJurisdiction ?? null, isUserLoaded });

  const {
    updating,
    rejectModal,
    setRejectModal,
    onStatusChange,
    confirmReject,
    confirmDelete,
    handleEscalate,
    handleExport,
  } = useReportActions({ updateLocalList, setReports, filteredReports, adminName: userName, adminRole: userRole, adminJurisdiction: userJurisdiction ?? undefined });

  const canEdit = isEditableRole(userRole);

  return (
    <div className="relative flex min-h-screen bg-slate-50 font-sans">
      <Sidebar />

      <main className="ml-64 flex-1 p-8 max-w-[calc(100vw-256px)]">
        <ErrorBoundary label="Dashboard">
          <DashboardHeader
            userRole={userRole}
            userName={userName}
            loading={loading}
            onExport={handleExport}
            onRefresh={() => { void fetchReports(); }}
          />

          <KpiBar {...kpi} />

          <SearchBar value={searchTerm} onChange={setSearchTerm} />

          <StatusTabs
            tabs={STATUS_TABS}
            activeTab={filter}
            onTabChange={setFilter}
            tabCounts={tabCounts}
          />

          <ReportList
            reports={filteredReports}
            loading={loading}
            updating={updating}
            canEdit={canEdit}
            userRole={userRole}
            onStatusChange={onStatusChange}
            onEscalate={handleEscalate}
            onLoadMore={loadMore}
          />
        </ErrorBoundary>
      </main>

      <RejectModal
        rejectModal={rejectModal}
        setRejectModal={setRejectModal}
        onReject={() => { void confirmReject(); }}
        onDelete={() => { void confirmDelete(); }}
        isSuperAdmin={userRole === "police_admin"}
      />
    </div>
  );
}