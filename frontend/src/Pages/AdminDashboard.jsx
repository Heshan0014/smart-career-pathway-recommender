import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../components/admin/AdminLayout";
import AdminToast from "../components/admin/AdminToast";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8001";

function parseUser() {
  const raw = sessionStorage.getItem("user");
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
  const [pieAnimatedRatio, setPieAnimatedRatio] = useState(0);

  const forceLogout = useCallback((message) => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    navigate("/login", { replace: true, state: { errorMessage: message || "Session expired. Please login again." } });
  }, [navigate]);

  const buildAuthHeaders = useCallback(() => {
    const token = sessionStorage.getItem("token");
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

      setStats(statsPayload);

      const studentsResponse = await fetch(`${API_BASE_URL}/api/v1/admin/students?page=0&size=6`, { headers });
      if (studentsResponse.status === 401 || studentsResponse.status === 403) {
        forceLogout("Your admin session has expired.");
        return;
      }
      const studentsPayload = await studentsResponse.json().catch(() => ({}));
      if (!studentsResponse.ok) {
        setQuickStudents([]);
        throw new Error(studentsPayload.detail || "Failed to load student snapshot.");
      }

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

  useEffect(() => {
    if (loading) {
      setPieAnimatedRatio(0);
      return;
    }

    const target = Math.max(0, Math.min(100, readinessRatio));
    const duration = 850;
    const start = performance.now();

    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setPieAnimatedRatio(Math.round(target * eased));

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  }, [loading, readinessRatio]);

  const completionChartData = [
    { label: "Completed", value: stats?.completed_profiles || 0, tone: "bg-emerald-500" },
    { label: "Pending", value: stats?.pending_profiles || 0, tone: "bg-amber-500" },
    { label: "Quiz", value: stats?.quiz_submitted_count || 0, tone: "bg-indigo-500" },
    { label: "Assessment", value: stats?.assessment_completed_count || 0, tone: "bg-cyan-500" },
    { label: "Ready", value: stats?.recommendation_ready_count || 0, tone: "bg-rose-500" },
  ];

  const maxChartValue = Math.max(...completionChartData.map((item) => item.value), 1);

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

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
        {[
          ["Total Students", stats?.total_students, "sky"],
          ["Completed Profiles", stats?.completed_profiles, "emerald"],
          ["Pending Profiles", stats?.pending_profiles, "amber"],
          ["Quiz Submitted", stats?.quiz_submitted_count, "violet"],
          ["Assessment Completed", stats?.assessment_completed_count, "cyan"],
          ["Recommendation Ready", stats?.recommendation_ready_count, "rose"],
        ].map(([label, value, tone]) => (
          <article key={label} className={`admin-kpi-lite admin-tone-${tone} rounded-2xl p-4`}>
            <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
            <p className="text-3xl font-bold text-slate-900 mt-3">{loading ? "..." : Number(value || 0).toLocaleString()}</p>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <article className="admin-lite-card rounded-2xl p-5 md:p-6">
          <h3 className="text-lg font-semibold text-slate-900">Profile Completion Bar Chart</h3>
          <p className="text-sm text-slate-600 mt-1">Quick visual of completion and recommendation milestones.</p>

          <div className="mt-5 space-y-4">
            {completionChartData.map((item) => {
              const width = Math.max(Math.round((item.value / maxChartValue) * 100), item.value > 0 ? 8 : 0);
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{item.label}</span>
                    <span className="font-semibold text-slate-900">{loading ? "..." : item.value.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-200 mt-2 overflow-hidden">
                    <div className={`h-2.5 rounded-full ${item.tone}`} style={{ width: `${loading ? 0 : width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="admin-lite-card rounded-2xl p-5 md:p-6">
          <h3 className="text-lg font-semibold text-slate-900">Readiness Pie Chart</h3>
          <p className="text-sm text-slate-600 mt-1">Students ready for recommendations based on completion gate.</p>

          <div className="mt-5 flex items-center justify-center">
            <div
              className="h-44 w-44 rounded-full relative"
              style={{
                background: `conic-gradient(#0ea5e9 0% ${pieAnimatedRatio}%, #e2e8f0 ${pieAnimatedRatio}% 100%)`,
                transition: "transform 320ms ease",
              }}
            >
              <div className="absolute inset-[18%] rounded-full bg-white flex items-center justify-center text-center">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Ready</p>
                  <p className="text-2xl font-bold text-slate-900">{loading ? "..." : `${readinessRatio}%`}</p>
                </div>
              </div>
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

        <article className="admin-lite-card rounded-2xl p-5 md:p-6 xl:col-span-1">
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
