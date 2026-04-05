import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import CommonHeader from "../CommonHeader";

const NAV_ITEMS = [
  { to: "/admin/dashboard", label: "Dashboard", icon: "/Images/dashboard.png" },
  { to: "/admin/students", label: "Students", icon: "/Images/students.png" },
  { to: "/admin/messages", label: "Messages", icon: "/Images/message.png" },
  { to: "/admin/readiness", label: "Readiness", icon: "/Images/readiness.png" },
  { to: "/admin/profile", label: "My Profile", icon: "/Images/my-profile.png" },
];

export default function AdminLayout({ user, title, subtitle, actions, children }) {
  const navigate = useNavigate();
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = React.useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(() => {
    const savedState = localStorage.getItem("adminSidebarCollapsed");
    return savedState ? JSON.parse(savedState) : false;
  });

  // Persist collapse state to localStorage
  React.useEffect(() => {
    localStorage.setItem("adminSidebarCollapsed", JSON.stringify(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen admin-light-shell">
      <CommonHeader user={user} alwaysVisible />
      <div className="max-w-[1440px] mx-auto px-3 md:px-6 py-4 md:py-6">
        <div className={`grid grid-cols-1 ${isSidebarCollapsed ? "lg:grid-cols-[88px_minmax(0,1fr)]" : "lg:grid-cols-[230px_minmax(0,1fr)]"} gap-4 md:gap-6 admin-grid-transition`}>
          <aside className={`admin-side-card rounded-2xl p-3 md:p-4 ${isSidebarCollapsed ? "is-collapsed" : ""}`}>
            {!isSidebarCollapsed && <p className="text-xs uppercase tracking-[0.16em] text-sky-700/80 font-semibold">Admin Navigation</p>}

            <button
              type="button"
              className="admin-collapse-btn mt-3"
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>

            <nav className="mt-4 space-y-1.5">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `admin-nav-link ${isActive ? "is-active" : ""}`}
                  title={isSidebarCollapsed ? item.label : undefined}
                >
                  <span className="admin-nav-content">
                    <span className="admin-nav-icon" aria-hidden="true">
                      <img src={item.icon} alt="" className="admin-nav-icon-image" />
                    </span>
                    {!isSidebarCollapsed && <span>{item.label}</span>}
                  </span>
                </NavLink>
              ))}
            </nav>

            {!isSidebarCollapsed && (
              <div className="mt-5 admin-side-user">
                <p className="text-xs text-slate-500">Logged in as</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">{user?.full_name || "Admin"}</p>
                <p className="text-xs text-slate-500 mt-1">{user?.email || "admin@local"}</p>
              </div>
            )}

            <button type="button" onClick={() => setIsLogoutDialogOpen(true)} className="admin-side-logout mt-4">
              {isSidebarCollapsed ? "Out" : "Logout"}
            </button>
          </aside>

          <main className="space-y-4">
            <section className="admin-top-card rounded-2xl p-5 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-sky-700/80 font-semibold">Administration</p>
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">{title}</h2>
                  {subtitle && <p className="text-sm text-slate-600 mt-2">{subtitle}</p>}
                </div>
                {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
              </div>
            </section>

            {children}
          </main>
        </div>

        {isLogoutDialogOpen && (
          <div className="admin-dialog-overlay">
            <div className="admin-dialog-card rounded-2xl">
              <h3 className="text-lg font-bold text-slate-900">Confirm Logout</h3>
              <p className="text-sm text-slate-600 mt-2">Are you sure you want to log out?</p>
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={() => setIsLogoutDialogOpen(false)} className="admin-lite-btn admin-lite-btn-muted">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsLogoutDialogOpen(false);
                    logout();
                  }}
                  className="admin-lite-btn admin-lite-btn-danger"
                >
                  Yes, Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
