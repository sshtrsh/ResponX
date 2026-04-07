import { Loader2 } from "lucide-react";
import { lazy, Suspense } from "react";
import { Toaster } from "react-hot-toast";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { RoleGuard } from "./components/RoleGuard";
import { AuthProvider, useAuth } from "./context/AuthContext";

// ── Lazy-loaded pages ──────────────────────────────────────────────────────────
// Each page is a separate chunk — users only download what they navigate to.
// Auth pages (Login, ForgotPassword, ResetPassword) are tiny and kept eager
// because they're the first thing anonymous users see.
import ForgotPassword from "./pages/ForgotPassword";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const LiveMap = lazy(() => import("./pages/Map"));
const Stats = lazy(async () => await import("./pages/Stats"));
const Blotter = lazy(async () => await import("./pages/Blotter"));
const Broadcast = lazy(async () => await import("./pages/Broadcast"));
const SystemAdmin = lazy(async () => await import("./pages/SystemAdmin"));
const AuditLogs = lazy(async () => await import("./pages/AuditLogs"));
const Account = lazy(async () => await import("./pages/Account"));

// ── Shared page-level loading fallback ────────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-7 h-7 animate-spin text-slate-400" />
    </div>
  );
}

function AppRoutes() {
  const { session, role, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-slate-500">Loading system...</p>
      </div>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route
          path="/"
          element={
            session
              ? <Navigate to={role === "super_admin" ? "/settings" : "/dashboard"} />
              : <Navigate to="/login" />
          }
        />

        <Route
          path="/login"
          element={
            !session ? <Login /> : <Navigate to={role === "super_admin" ? "/settings" : "/dashboard"} replace />
          }
        />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* PROTECTED ROUTES */}
        <Route
          path="/dashboard"
          element={session ? <RoleGuard allowedRoles={["police_admin", "barangay_admin", "super_admin"]}><Dashboard /></RoleGuard> : <Navigate to="/login" />}
        />
        <Route
          path="/map"
          element={session ? <RoleGuard allowedRoles={["police_admin", "barangay_admin", "super_admin"]}><LiveMap /></RoleGuard> : <Navigate to="/login" />}
        />
        {/* Nested routes for settings and account */}
        <Route path="/settings" element={session ? <RoleGuard allowedRoles={["super_admin", "police_admin"]}><SystemAdmin /></RoleGuard> : <Navigate to="/login" />} />
        <Route path="/audit-logs" element={session ? <RoleGuard allowedRoles={["super_admin"]}><AuditLogs /></RoleGuard> : <Navigate to="/login" />} />
        <Route path="/account" element={session ? <RoleGuard allowedRoles={["super_admin", "police_admin", "barangay_admin"]}><Account /></RoleGuard> : <Navigate to="/login" />} />
        <Route
          path="/stats"
          element={session ? <RoleGuard allowedRoles={["police_admin", "barangay_admin", "super_admin"]}><Stats /></RoleGuard> : <Navigate to="/login" />}
        />
        <Route
          path="/blotter"
          element={session ? <RoleGuard allowedRoles={["barangay_admin"]}><Blotter /></RoleGuard> : <Navigate to="/login" />}
        />
        <Route
          path="/broadcast"
          element={session ? <RoleGuard allowedRoles={["police_admin", "barangay_admin"]}><Broadcast /></RoleGuard> : <Navigate to="/login" />}
        />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
