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

export default function AdminReadiness() {
  const navigate = useNavigate();
  const currentUser = useMemo(() => parseUser(), []);
  const [stats, setStats] = useState(null);
  const [readyStudents, setReadyStudents] = useState([]);
  const [blockedStudents, setBlockedStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ type: "error", message: "" });

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

  const fetchStudents = useCallback(async (query) => {
    const headers = buildAuthHeaders();
    if (!headers) {
      return { items: [] };
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/admin/students?${query}`, { headers });

    if (response.status === 401 || response.status === 403) {
      forceLogout("Your admin session has expired.");
      return { items: [] };
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.detail || "Failed to load readiness data.");
    }

    return payload;
  }, [buildAuthHeaders, forceLogout]);

  const loadReadiness = useCallback(async () => {
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
        throw new Error(statsPayload.detail || "Failed to load readiness stats.");
      }
      setStats(statsPayload);

      const [readyPayload, blockedPayload] = await Promise.all([
        fetchStudents("recommendation_status=ready&page=0&size=5"),
        fetchStudents("recommendation_status=blocked&page=0&size=5"),
      ]);

      setReadyStudents(Array.isArray(readyPayload.items) ? readyPayload.items : []);
      setBlockedStudents(Array.isArray(blockedPayload.items) ? blockedPayload.items : []);
    } catch (err) {
      setToast({ type: "error", message: err.message || "Failed to load readiness insights." });
    } finally {
      setLoading(false);
    }
  }, [buildAuthHeaders, fetchStudents, forceLogout]);

  useEffect(() => {
    if (currentUser?.user_role !== "ADMIN") {
      forceLogout("Admin access is required.");
      return;
    }

    loadReadiness();
  }, [currentUser?.user_role, forceLogout, loadReadiness]);

  const totalStudents = stats?.total_students || 0;
  const readyCount = stats?.recommendation_ready_count || 0;
  const readinessPercentage = totalStudents > 0 ? Math.round((readyCount * 100) / totalStudents) : 0;

  return (
    <AdminLayout
      user={currentUser}
      title="Readiness"
      subtitle="Track recommendation readiness and quickly identify blocked students."
      actions={<button type="button" onClick={loadReadiness} className="admin-lite-btn admin-lite-btn-primary" disabled={loading}>Refresh</button>}
    >
      <AdminToast type={toast.type} message={toast.message} onClose={() => setToast({ type: "error", message: "" })} />

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <article className="admin-lite-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Recommendation Ready</p>
          <p className="text-3xl font-bold text-emerald-700 mt-2">{loading ? "..." : readyCount}</p>
        </article>
        <article className="admin-lite-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Blocked Students</p>
          <p className="text-3xl font-bold text-rose-700 mt-2">{loading ? "..." : Math.max((stats?.total_students || 0) - readyCount, 0)}</p>
        </article>
        <article className="admin-lite-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Readiness Ratio</p>
          <p className="text-3xl font-bold text-sky-700 mt-2">{loading ? "..." : `${readinessPercentage}%`}</p>
          <div className="w-full mt-3 h-2 rounded-full bg-slate-200 overflow-hidden">
            <div className="h-2 rounded-full bg-sky-500" style={{ width: `${readinessPercentage}%` }} />
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <article className="admin-lite-card rounded-2xl p-5">
          <h3 className="text-lg font-semibold text-slate-900">Top Ready Students</h3>
          <p className="text-xs text-slate-500 mt-1">Students eligible for recommendation now</p>
          <div className="mt-4 space-y-3">
            {loading ? <p className="text-sm text-slate-500">Loading...</p> : null}
            {!loading && readyStudents.length === 0 ? <p className="text-sm text-slate-500">No ready students found.</p> : null}
            {!loading && readyStudents.map((student) => (
              <div key={student.id} className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
                <p className="text-sm font-semibold text-slate-900">{student.full_name}</p>
                <p className="text-xs text-slate-600 mt-1">{student.email}</p>
                <p className="text-xs text-emerald-700 mt-1">Profile {student.profile_completion_percentage}% • Quiz submitted</p>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-lite-card rounded-2xl p-5">
          <h3 className="text-lg font-semibold text-slate-900">Top Blocked Students</h3>
          <p className="text-xs text-slate-500 mt-1">Students requiring profile or quiz completion</p>
          <div className="mt-4 space-y-3">
            {loading ? <p className="text-sm text-slate-500">Loading...</p> : null}
            {!loading && blockedStudents.length === 0 ? <p className="text-sm text-slate-500">No blocked students found.</p> : null}
            {!loading && blockedStudents.map((student) => (
              <div key={student.id} className="rounded-xl border border-rose-200 bg-rose-50/70 p-3">
                <p className="text-sm font-semibold text-slate-900">{student.full_name}</p>
                <p className="text-xs text-slate-600 mt-1">{student.email}</p>
                <p className="text-xs text-rose-700 mt-1">Profile {student.profile_completion_percentage}% • {student.quiz_submitted ? "Quiz submitted" : "Quiz pending"}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </AdminLayout>
  );
}
