import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import MessageModal from "./MessageModal";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8001";

export default function CommonHeader({ user = null, alwaysVisible = false }) {
  const [localUser, setLocalUser] = useState(null);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showSolidHeader, setShowSolidHeader] = useState(false);
  const [hideHeaderItems, setHideHeaderItems] = useState(false);
  const navigate = useNavigate();
  const activeUser = user || localUser;
  const isAdmin = activeUser?.user_role === "ADMIN";
  const isStudent = activeUser?.user_role === "STUDENT";

  useEffect(() => {
    const userData = sessionStorage.getItem("user");

    if (userData) {
      try {
        setLocalUser(JSON.parse(userData));
      } catch {
        setLocalUser(null);
      }
    } else {
      setLocalUser(null);
    }
  }, [user]);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) return;

    const isStudentUser = isStudent;
    const isAdminUser = isAdmin;

    const loadUnreadCount = async () => {
      try {
        const endpoint = isAdminUser
          ? `${API_BASE_URL}/api/v1/messages/admin/unread-count`
          : isStudentUser
            ? `${API_BASE_URL}/api/v1/messages/my-unread-count`
            : null;

        if (!endpoint) {
          return;
        }

        const response = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (isAdminUser) {
            setUnreadCount(data.unreadCount || 0);
          }
        }
      } catch (error) {
        console.error("Error loading unread count:", error);
      }
    };

    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [isAdmin, isStudent]);

  useEffect(() => {
    if (alwaysVisible) {
      setShowSolidHeader(true);
      setHideHeaderItems(false);
      return;
    }

    let lastScrollY = window.scrollY;

    const onScroll = () => {
      const currentScrollY = window.scrollY;
      const nextShowSolid = currentScrollY > 30 && currentScrollY < lastScrollY;
      const isScrollingDown = currentScrollY > lastScrollY;

      if (currentScrollY <= 30) {
        setHideHeaderItems(false);
      } else if (isScrollingDown) {
        setHideHeaderItems(true);
      } else {
        setHideHeaderItems(false);
      }

      setShowSolidHeader((prev) => (prev === nextShowSolid ? prev : nextShowSolid));
      lastScrollY = currentScrollY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [alwaysVisible]);

  const headerShellClass = showSolidHeader
    ? "bg-white/95 border-slate-200/80 shadow-lg shadow-slate-300/35 backdrop-blur-xl"
    : "bg-transparent border-transparent shadow-none backdrop-blur-0";

  const brandTextClass = showSolidHeader ? "text-slate-900" : "text-white";
  const navTextClass = showSolidHeader
    ? "text-sm text-slate-700 font-semibold"
    : "text-sm text-slate-100/90 font-semibold";

  const navLinkClass = showSolidHeader
    ? "relative transition text-slate-700 hover:text-rose-700"
    : "relative transition text-slate-100 hover:text-white";

  const headerItemsClass = hideHeaderItems
    ? "opacity-0 -translate-y-3 pointer-events-none"
    : "opacity-100 translate-y-0 pointer-events-auto";

  return (
    <>
      <header className="w-full sticky top-0 z-50 px-3 md:px-5 pt-3">
        <div className={`mx-auto  flex items-center px-4 md:px-8 py-3 rounded-2xl border transition-all duration-300 ${headerShellClass} ${headerItemsClass}`}>
          <div className="flex items-center gap-3">
            <div className={isAdmin ? "admin-brand-logo" : "w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-700 to-emerald-400 text-white font-black flex items-center justify-center shadow-lg shadow-emerald-500/40"}>
              N
            </div>
            <h1 className={`text-lg md:text-xl font-semibold tracking-tight ${brandTextClass}`}>NextStep IT</h1>
          </div>

          {!isAdmin && (
            <div className="hidden md:flex flex-1 justify-center">
              <nav className={`flex gap-7 justify-center ${navTextClass}`}>
                <Link to={{ pathname: "/", hash: "#home" }} className={navLinkClass}>Home</Link>
                <Link to={{ pathname: "/", hash: "#features" }} className={navLinkClass}>Features</Link>
                <Link to={{ pathname: "/", hash: "#how" }} className={navLinkClass}>How It Works</Link>
                <Link to={{ pathname: "/", hash: "#stories" }} className={navLinkClass}>Success Stories</Link>
              </nav>
            </div>
          )}

          {activeUser ? (
            <div className="ml-auto flex gap-2 items-center justify-end">
              {isStudent && (
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className={`px-3 py-2 text-xs font-semibold rounded-lg border transition ${
                    showSolidHeader
                      ? "text-rose-800 bg-white/70 border-rose-200 hover:bg-white"
                      : "text-white bg-white/10 border-white/30 hover:bg-white/20"
                  }`}
                >
                  Dashboard
                </button>
              )}

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => navigate("/admin/messages")}
                  className={`relative w-10 h-10 flex items-center justify-center rounded-lg transition ${
                    showSolidHeader
                      ? "text-slate-700 hover:text-rose-700 hover:bg-white/70"
                      : "text-slate-100 hover:text-white hover:bg-white/15"
                  }`}
                  title="View student messages"
                >
                  <img src="/Images/message.png" alt="Messages" className="w-7 h-7 object-contain" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
              )}

              <div className="hidden sm:flex flex-col items-end text-right">
                <span className={`text-sm ${showSolidHeader ? "text-slate-700" : "text-slate-100"}`}>Hi, {activeUser.full_name || "User"}</span>
                {isAdmin && <span className={`text-xs font-semibold ${showSolidHeader ? "text-rose-600" : "text-amber-300"}`}>Admin</span>}
              </div>

              <button
                type="button"
                onClick={() => navigate(isAdmin ? "/admin/profile" : "/profile")}
                className={`w-9 h-9 rounded-full flex items-center justify-center overflow-hidden transition ${
                  showSolidHeader ? "bg-rose-100 hover:bg-rose-200" : "bg-white/85 hover:bg-white"
                }`}
                title="Go to profile"
              >
                {activeUser.profile_image ? (
                  <img src={activeUser.profile_image} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold">{(activeUser.full_name || "U").charAt(0).toUpperCase()}</span>
                )}
              </button>
            </div>
          ) : (
            <div className="flex gap-2 items-center">
              <Link
                to="/login"
                className={`px-3 py-1.5 text-sm rounded-lg transition border ${
                  showSolidHeader
                    ? "border-rose-200 text-slate-700 hover:bg-white/80"
                    : "border-white/35 text-white hover:bg-white/15"
                }`}
              >
                Login
              </Link>
              <Link
                to="/signup"
                className={`px-3 py-1.5 text-sm text-white rounded-lg shadow-sm transition ${
                  showSolidHeader ? "bg-rose-600 hover:bg-rose-500" : "bg-amber-500 hover:bg-amber-400 text-slate-900"
                }`}
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </header>

      {isStudent && (
        <MessageModal
          isOpen={isMessageModalOpen}
          onClose={() => setIsMessageModalOpen(false)}
          user={activeUser}
        />
      )}
    </>
  );
}
