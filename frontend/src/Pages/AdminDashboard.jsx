import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../components/admin/AdminLayout";
import AdminToast from "../components/admin/AdminToast";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8001";

function parseUser() {
  const raw = localStorage.getItem("user");
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const currentUser = useMemo(() => parseUser(), []);
  const [stats, setStats] = useState(null);
  const [quickStudents, setQuickStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ type: "error", message: "" });

  const forceLogout = useCallback((message) => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true, state: { errorMessage: message || "Session expired. Please login again." } });
  }, [navigate]);

  const buildAuthHeaders = useCallback(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      forceLogout("Please login as admin.");
      return null;
    }

    return { Authorization: `Bearer ${token}` };
  }, [forceLogout]);

  const loadDashboard = useCallback(async () => {
    const headers = buildAuthHeaders();
    if (!headers) {
      return;
    }

    try {
      setLoading(true);

      const statsResponse = await fetch(`${API_BASE_URL}/api/v1/admin/dashboard/stats`, { headers });
      if (statsResponse.status === 401 || statsResponse.status === 403) {
        forceLogout("Your admin session has expired.");
        return;
      }
      const statsPayload = await statsResponse.json().catch(() => ({}));
      if (!statsResponse.ok) {
        throw new Error(statsPayload.detail || "Failed to load dashboard stats.");
      }

      const studentsResponse = await fetch(`${API_BASE_URL}/api/v1/admin/students?page=0&size=6`, { headers });
      if (studentsResponse.status === 401 || studentsResponse.status === 403) {
        forceLogout("Your admin session has expired.");
        return;
      }
      const studentsPayload = await studentsResponse.json().catch(() => ({}));
      if (!studentsResponse.ok) {
        throw new Error(studentsPayload.detail || "Failed to load student snapshot.");
      }

      setStats(statsPayload);
      setQuickStudents(Array.isArray(studentsPayload.items) ? studentsPayload.items : []);
    } catch (err) {
      setToast({ type: "error", message: err.message || "Failed to load admin dashboard." });
    } finally {
      setLoading(false);
    }
  }, [buildAuthHeaders, forceLogout]);

  useEffect(() => {
    if (currentUser?.user_role !== "ADMIN") {
      forceLogout("Admin access is required.");
      return;
    }

    loadDashboard();
  }, [currentUser?.user_role, forceLogout, loadDashboard]);

  const readinessRatio = stats?.total_students
    ? Math.round(((stats?.recommendation_ready_count || 0) * 100) / stats.total_students)
    : 0;

  return (
    <AdminLayout
      user={currentUser}
      title="Dashboard"
      subtitle="Executive overview of student progress, readiness, and completion quality."
      actions={
        <>
          <button type="button" onClick={loadDashboard} disabled={loading} className="admin-lite-btn admin-lite-btn-primary">
            Refresh
          </button>
          <button type="button" onClick={() => navigate("/admin/students")} className="admin-lite-btn admin-lite-btn-muted">
            Open Students
          </button>
        </>
      }
    >
      <AdminToast type={toast.type} message={toast.message} onClose={() => setToast({ type: "error", message: "" })} />

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {[
          ["Total Students", stats?.total_students, "sky"],
          ["Completed Profiles", stats?.completed_profiles, "emerald"],
          ["Pending Profiles", stats?.pending_profiles, "amber"],
          ["Quiz Submitted", stats?.quiz_submitted_count, "violet"],
          ["Recommendation Ready", stats?.recommendation_ready_count, "rose"],
        ].map(([label, value, tone]) => (
          <article key={label} className={`admin-kpi-lite admin-tone-${tone} rounded-2xl p-4`}>
            <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
            <p className="text-3xl font-bold text-slate-900 mt-3">{loading ? "..." : Number(value || 0).toLocaleString()}</p>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-4">
        <article className="admin-lite-card rounded-2xl p-5 md:p-6">
          <h3 className="text-lg font-semibold text-slate-900">Readiness Overview</h3>
          <p className="text-sm text-slate-600 mt-1">Students ready for recommendations based on completion gate.</p>

          <div className="mt-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Readiness ratio</span>
              <span className="font-semibold text-slate-900">{loading ? "..." : `${readinessRatio}%`}</span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-200 mt-2 overflow-hidden">
              <div className="h-3 rounded-full admin-progress-grad" style={{ width: `${readinessRatio}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
            <div className="admin-stat-soft rounded-xl p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Completed Profiles</p>
              <p className="text-xl font-bold text-emerald-700 mt-1">{loading ? "..." : stats?.completed_profiles || 0}</p>
            </div>
            <div className="admin-stat-soft rounded-xl p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Pending Profiles</p>
              <p className="text-xl font-bold text-amber-700 mt-1">{loading ? "..." : stats?.pending_profiles || 0}</p>
            </div>
          </div>
        </article>

        <article className="admin-lite-card rounded-2xl p-5 md:p-6">
          <h3 className="text-lg font-semibold text-slate-900">Recent Student Snapshot</h3>
          <p className="text-sm text-slate-600 mt-1">Quick look at the latest student status updates.</p>

          <div className="mt-4 space-y-3">
            {loading ? <p className="text-sm text-slate-500">Loading...</p> : null}
            {!loading && quickStudents.length === 0 ? <p className="text-sm text-slate-500">No student records available.</p> : null}
            {!loading && quickStudents.map((student) => (
              <div key={student.id} className="admin-student-strip rounded-xl p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{student.full_name}</p>
                    <p className="text-xs text-slate-500 mt-1">{student.email}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${student.recommendation_eligible ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                    {student.recommendation_eligible ? "Ready" : "Blocked"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </AdminLayout>
  );
}
