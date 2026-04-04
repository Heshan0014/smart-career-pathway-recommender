import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import MessageModal from "./MessageModal";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8001";

export default function CommonHeader({ user = null }) {
  const [localUser, setLocalUser] = useState(null);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const activeUser = user || localUser;
  const isAdmin = activeUser?.user_role === "ADMIN";
  const isStudent = activeUser?.user_role === "STUDENT";

  useEffect(() => {
    const userData = localStorage.getItem("user");

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
    const token = localStorage.getItem("token");
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

  return (
    <>
      <header className="w-full sticky top-0 z-50 border-b border-slate-200/60 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl flex items-center px-4 md:px-8 py-3">
          <div className="flex items-center gap-3">
            <div className={isAdmin ? "admin-brand-logo" : "w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold flex items-center justify-center shadow-md"}>
              N
            </div>
            <h1 className="text-lg md:text-xl font-semibold text-slate-900 tracking-tight">NextStep IT</h1>
          </div>

          {!isAdmin && (
            <div className="hidden md:flex flex-1 justify-center">
              <nav className="flex gap-7 text-sm text-slate-600 font-medium justify-center">
                <Link to={{ pathname: "/", hash: "#home" }} className="hover:text-emerald-600 transition">Home</Link>
                <Link to={{ pathname: "/", hash: "#features" }} className="hover:text-emerald-600 transition">Features</Link>
                <Link to={{ pathname: "/", hash: "#how" }} className="hover:text-emerald-600 transition">How It Works</Link>
                <Link to={{ pathname: "/", hash: "#stories" }} className="hover:text-emerald-600 transition">Success Stories</Link>
              </nav>
            </div>
          )}

          {activeUser ? (
            <div className="ml-auto flex gap-2 items-center justify-end">
              {isStudent && (
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition"
                >
                  Dashboard
                </button>
              )}

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => navigate("/admin/messages")}
                  className="relative w-10 h-10 flex items-center justify-center text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
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
                <span className="text-sm text-slate-700">Hi, {activeUser.full_name || "User"}</span>
                {isAdmin && <span className="text-xs text-sky-600 font-semibold">Admin</span>}
              </div>

              <button
                type="button"
                onClick={() => navigate(isAdmin ? "/admin/profile" : "/profile")}
                className="w-9 h-9 bg-slate-200 rounded-full flex items-center justify-center hover:bg-slate-300 overflow-hidden transition"
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
              <Link to="/login" className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 transition">Login</Link>
              <Link to="/signup" className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm transition">Sign Up</Link>
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
