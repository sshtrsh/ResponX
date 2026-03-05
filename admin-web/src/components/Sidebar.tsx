import {
  type LucideIcon,
  BarChart3,
  BookOpen,
  LayoutDashboard,
  Loader2,
  LogOut,
  Map,
  Megaphone,
  Settings,
  UserCircle
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, isLoaded, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const isActive = (path: string) => location.pathname === path;

  if (!isLoaded) {
    return (
      <div className="w-64 h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-white" />
      </div>
    );
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900 text-slate-300 flex flex-col z-50">
      {/* Brand */}
      <div className="p-6 flex items-center gap-3 text-white mb-6">
        <div className="p-1 bg-white/10 rounded-lg">
          <img src="/logo.png" alt="ResponX Logo" className="w-8 h-8 object-contain rounded-md" />
        </div>
        <div>
          <h1 className="font-bold text-lg tracking-tight">ResponX</h1>
          <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">
            {role?.replace("_", " ")}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2">
        {/* Operational pages — police_admin & barangay_admin only */}
        {role !== "super_admin" && (
          <>
            <SidebarItem
              icon={LayoutDashboard}
              label="Dispatch"
              to="/dashboard"
              active={isActive("/dashboard")}
            />

            <SidebarItem
              icon={Map}
              label="Live Map"
              to="/map"
              active={isActive("/map")}
            />

            {/* Blotter — barangay_admin only (private dispute data) */}
            {role === "barangay_admin" && (
              <SidebarItem
                icon={BookOpen}
                label="Blotter"
                to="/blotter"
                active={isActive("/blotter")}
              />
            )}

            <SidebarItem
              icon={Megaphone}
              label="Broadcasts"
              to="/broadcast"
              active={isActive("/broadcast")}
            />

            <SidebarItem
              icon={BarChart3}
              label="Intel & Stats"
              to="/stats"
              active={isActive("/stats")}
            />
          </>
        )}

        {/* System Admin — super_admin + police_admin */}
        {(role === "super_admin" || role === "police_admin") && (
          <SidebarItem
            icon={Settings}
            label="System Admin"
            to="/settings"
            active={isActive("/settings")}
          />
        )}
      </nav>

      {/* Footer / Account */}
      <div className="p-4 border-t border-slate-800 space-y-2">
        <Link
          to="/account"
          className={`flex items-center gap-3 px-4 py-3 w-full text-sm font-medium rounded-lg transition-colors ${isActive("/account")
            ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20 font-bold"
            : "hover:bg-slate-800 text-slate-300 hover:text-white"
            }`}
        >
          <UserCircle size={18} />
          My Account
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full text-sm font-medium hover:bg-slate-800 rounded-lg transition-colors text-red-400 hover:text-red-300"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  to: string;
  active?: boolean;
}

function SidebarItem({ icon: Icon, label, to, active }: SidebarItemProps) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active
        ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20 font-bold"
        : "hover:bg-slate-800 hover:text-white font-medium"
        }`}
    >
      <Icon size={20} />
      {label}
    </Link>
  );
}