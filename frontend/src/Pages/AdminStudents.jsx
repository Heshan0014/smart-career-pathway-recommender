import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../components/admin/AdminLayout";
import AdminToast from "../components/admin/AdminToast";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8001";
const INITIAL_FILTERS = { profile_status: "", quiz_status: "", recommendation_status: "" };

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

export default function AdminStudents() {
  const navigate = useNavigate();
  const currentUser = useMemo(() => parseUser(), []);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({ type: "error", message: "" });
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

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

  const loadStudents = useCallback(async () => {
    const headers = buildAuthHeaders();
    if (!headers) {
      return;
    }

    try {
      setLoadingStudents(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("size", String(size));

      if (search.trim()) {
        params.set("search", search.trim());
      }
      if (filters.profile_status) {
        params.set("profile_status", filters.profile_status);
      }
      if (filters.quiz_status) {
        params.set("quiz_status", filters.quiz_status);
      }
      if (filters.recommendation_status) {
        params.set("recommendation_status", filters.recommendation_status);
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/admin/students?${params.toString()}`, { headers });

      if (response.status === 401 || response.status === 403) {
        forceLogout("Your admin session has expired.");
        return;
      }

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.detail || "Failed to load student table.");
      }

      setStudents(Array.isArray(payload.items) ? payload.items : []);
      setTotalPages(payload.total_pages || 0);
      setTotalItems(payload.total_items || 0);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load student table.");
      setToast({ type: "error", message: err.message || "Failed to load student table." });
    } finally {
      setLoadingStudents(false);
    }
  }, [buildAuthHeaders, filters, forceLogout, page, search, size]);

  useEffect(() => {
    if (currentUser?.user_role !== "ADMIN") {
      forceLogout("Admin access is required.");
      return;
    }

    loadStudents();
  }, [currentUser?.user_role, forceLogout, loadStudents]);

  return (
    <AdminLayout
      user={currentUser}
      title="Students"
      subtitle="Search and monitor profile completion, quiz submission, and recommendation readiness."
      actions={<button type="button" onClick={loadStudents} className="admin-lite-btn admin-lite-btn-primary">Refresh</button>}
    >
      <AdminToast type={toast.type} message={toast.message} onClose={() => setToast({ type: "error", message: "" })} />

      {error ? (
        <section className="admin-lite-card rounded-2xl p-4 md:p-5 border border-rose-200 bg-rose-50/80 text-rose-700 text-sm flex items-center justify-between gap-3">
          <span>{error}</span>
          <button type="button" onClick={loadStudents} className="font-semibold underline underline-offset-2">Retry</button>
        </section>
      ) : null}

      <section className="admin-lite-card rounded-2xl p-4 md:p-5 space-y-4">
        <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))] gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setPage(0);
              setSearch(e.target.value);
            }}
            placeholder="Search by student name or email"
            className="admin-lite-input"
          />
          <select
            value={filters.profile_status}
            onChange={(e) => {
              setPage(0);
              setFilters((prev) => ({ ...prev, profile_status: e.target.value }));
            }}
            className="admin-lite-input"
          >
            <option value="">Profile: All</option>
            <option value="completed">Profile: Completed</option>
            <option value="pending">Profile: Pending</option>
          </select>
          <select
            value={filters.quiz_status}
            onChange={(e) => {
              setPage(0);
              setFilters((prev) => ({ ...prev, quiz_status: e.target.value }));
            }}
            className="admin-lite-input"
          >
            <option value="">Quiz: All</option>
            <option value="submitted">Quiz: Submitted</option>
            <option value="pending">Quiz: Pending</option>
          </select>
          <select
            value={filters.recommendation_status}
            onChange={(e) => {
              setPage(0);
              setFilters((prev) => ({ ...prev, recommendation_status: e.target.value }));
            }}
            className="admin-lite-input"
          >
            <option value="">Recommendation: All</option>
            <option value="ready">Recommendation: Ready</option>
            <option value="blocked">Recommendation: Blocked</option>
          </select>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[920px] text-sm text-left">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Profile %</th>
                <th className="px-4 py-3 font-semibold">Quiz</th>
                <th className="px-4 py-3 font-semibold">Recommendation</th>
                <th className="px-4 py-3 font-semibold">Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {loadingStudents ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">Loading students...</td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No students found for current filters.</td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="border-t border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium">{student.full_name}</td>
                    <td className="px-4 py-3">{student.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${student.profile_completion_percentage >= 80 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {student.profile_completion_percentage}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${student.quiz_submitted ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                        {student.quiz_submitted ? "Submitted" : "Pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${student.recommendation_eligible ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                        {student.recommendation_eligible ? "Ready" : "Blocked"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{student.last_updated_at ? new Date(student.last_updated_at).toLocaleString() : "--"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-slate-600">
          <p>Total students: {totalItems}</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={page === 0 || loadingStudents}
              onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
              className="admin-lite-btn admin-lite-btn-muted disabled:opacity-50"
            >
              Previous
            </button>
            <span>Page {totalPages === 0 ? 0 : page + 1} / {totalPages}</span>
            <button
              type="button"
              disabled={loadingStudents || page + 1 >= totalPages}
              onClick={() => setPage((prev) => prev + 1)}
              className="admin-lite-btn admin-lite-btn-muted disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </AdminLayout>
  );
}
