import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CommonHeader from "../components/CommonHeader";
import MessageModal from "../components/MessageModal";
import { StudentBanner, StudentEmptyState, StudentPageLoader } from "../components/student/StudentStates";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8001";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [quizSubmittedAt, setQuizSubmittedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recommendation, setRecommendation] = useState(null);
  const [recommendationError, setRecommendationError] = useState("");
  const [isRecommendationLoading, setIsRecommendationLoading] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [studentUnreadCount, setStudentUnreadCount] = useState(0);

  const loadRecommendation = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/login");
      return;
    }

    try {
      setIsRecommendationLoading(true);
      setRecommendationError("");

      const response = await fetch(`${API_BASE_URL}/api/v1/recommendations/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const responseData = await response.json().catch(() => ({}));

        if (response.status === 401 || response.status === 403 || response.status === 404) {
          if (response.status === 403) {
            throw new Error(responseData.detail || "Recommendations are locked. Complete profile and quiz requirements first.");
          }

          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
          return;
        }

        throw new Error(responseData.detail || "Failed to generate recommendation.");
      }

      const responseData = await response.json();
      setRecommendation(responseData);
    } catch (err) {
      setRecommendationError(err.message || "Failed to generate recommendation.");
    } finally {
      setIsRecommendationLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const meResponse = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!meResponse.ok) {
          if (meResponse.status === 401 || meResponse.status === 403 || meResponse.status === 404) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            navigate("/login");
            return;
          }
          throw new Error("Unable to load profile");
        }

        const meData = await meResponse.json();
        setProfile(meData);
        localStorage.setItem("user", JSON.stringify(meData));

        const quizResponse = await fetch(`${API_BASE_URL}/api/v1/quiz/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (quizResponse.ok) {
          const quizData = await quizResponse.json();
          setQuizSubmittedAt(quizData.submitted_at || "");
        } else if (quizResponse.status === 404) {
          setQuizSubmittedAt("");
        }
      } catch (err) {
        setError("Failed to load dashboard.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [navigate]);

  const progress = useMemo(() => {
    if (!profile || typeof profile.profile_completion_percentage !== "number") {
      return 0;
    }
    return profile.profile_completion_percentage;
  }, [profile]);

  const requiredCompletion = profile?.recommendation_required_completion_percentage ?? 80;
  const quizSubmitted = Boolean(profile?.quiz_submitted);
  const recommendationEligible = Boolean(profile?.recommendation_eligible);

  useEffect(() => {
    if (location.state?.autoGenerateRecommendation && recommendationEligible) {
      loadRecommendation();
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [loadRecommendation, location.pathname, location.state, navigate, recommendationEligible]);

  // Poll for unread message replies
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const loadUnreadCount = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/messages/my-unread-count`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setStudentUnreadCount(data.unreadCount || 0);
        }
      } catch (error) {
        console.error("Error loading unread count:", error);
      }
    };

    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen app-shell-bg">
        <CommonHeader />
        <div className="max-w-7xl mx-auto p-6 md:p-10">
          <StudentPageLoader message="Loading dashboard..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-shell-bg">
      <CommonHeader user={profile} />

      <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-6">
        <StudentBanner type="error" message={error} />
        <StudentBanner type="warning" message={recommendationError} />

        {!profile ? (
          <StudentEmptyState
            title="No dashboard data available"
            description="We couldn't find your student profile yet. Please complete your profile details and refresh."
            action={
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="modern-btn-primary px-4 py-2 rounded-xl"
              >
                Open Profile
              </button>
            }
          />
        ) : (
          <>

        <section className="glass-panel rounded-2xl p-6 md:p-8">
          <p className="text-xs uppercase tracking-wide text-emerald-700 font-semibold">Student Dashboard</p>
          <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 mt-2">
            Welcome back, {profile?.full_name || "Student"}
          </h1>
          <p className="text-sm md:text-base text-slate-600 mt-3 max-w-2xl leading-relaxed">
            Track completion status, quiz progress, and recommendation readiness from one place.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-panel-soft rounded-2xl p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Profile Completion</p>
            <p className="text-3xl font-bold text-emerald-700 mt-2">{progress}%</p>
            <div className="w-full h-2 mt-3 rounded-full bg-emerald-100 overflow-hidden">
              <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${progress}%` }} />
            </div>
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="mt-4 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Complete Profile
            </button>
          </div>

          <div className="glass-panel-soft rounded-2xl p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Quiz Status</p>
            <p className={`text-2xl font-bold mt-2 ${quizSubmitted ? "text-emerald-700" : "text-amber-700"}`}>
              {quizSubmitted ? "Submitted" : "Pending"}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              {quizSubmittedAt ? `Submitted at ${new Date(quizSubmittedAt).toLocaleString()}` : "No submission yet"}
            </p>
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="mt-4 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
            >
              {quizSubmitted ? "Review Quiz" : "Take Quiz"}
            </button>
          </div>

          <div className="glass-panel-soft rounded-2xl p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Recommendation Gate</p>
            <p className={`text-2xl font-bold mt-2 ${recommendationEligible ? "text-emerald-700" : "text-amber-700"}`}>
              {recommendationEligible ? "Ready" : "Locked"}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Needs {requiredCompletion}% profile completion + submitted quiz
            </p>
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="mt-4 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Check Requirements
            </button>
          </div>
        </section>

        <section className="glass-panel rounded-2xl p-6">
          <h2 className="modern-section-title">Readiness Checklist</h2>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className={`rounded-xl px-3 py-2 ${progress >= requiredCompletion ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-amber-50 text-amber-800 border border-amber-200"}`}>
              Profile completion {progress >= requiredCompletion ? "met" : "not met"}: {progress}% / {requiredCompletion}%
            </div>
            <div className={`rounded-xl px-3 py-2 ${quizSubmitted ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-amber-50 text-amber-800 border border-amber-200"}`}>
              Quiz submission {quizSubmitted ? "met" : "not met"}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="px-4 py-2 rounded-xl font-semibold modern-btn-primary"
            >
              Open Profile Workspace
            </button>
            <button
              type="button"
              onClick={loadRecommendation}
              disabled={!recommendationEligible || isRecommendationLoading}
              className={`px-4 py-2 rounded-xl font-semibold ${recommendationEligible ? "modern-btn-secondary" : "bg-slate-300 text-slate-600 cursor-not-allowed"}`}
              title={recommendationEligible ? "Recommendation flow will be available in next step" : "Complete the gate requirements first"}
            >
              {isRecommendationLoading ? "Generating..." : "Generate Recommendation"}
            </button>
          </div>
        </section>

        {recommendation && (
          <section className="glass-panel rounded-2xl p-6" id="student-recommendation-panel">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="modern-section-title">Your Recommendation</h2>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                {recommendation.primary_path || "Career Path"}
              </span>
            </div>

            <p className="text-sm text-slate-700 mt-3">{recommendation.recommendation_summary}</p>
            {recommendation.generated_at && (
              <p className="text-xs text-slate-500 mt-2">
                Generated at {new Date(recommendation.generated_at).toLocaleString()}
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                <p className="text-sm font-semibold text-emerald-800">Why this path</p>
                <ul className="mt-2 space-y-1 text-sm text-emerald-700">
                  {(recommendation.reasons || []).map((reason, index) => (
                    <li key={`reason-${index}`}>• {reason}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4">

      {/* Chatbot Icon - Fixed Position */}
      <button
        type="button"
        onClick={() => setIsMessageModalOpen(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-br from-orange-600 to-orange-500 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center text-white z-40"
        title="Chat with admin"
      >
        <img src="/Images/message.png" alt="Chat" className="w-7 h-7 object-contain" />
        {studentUnreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
            {studentUnreadCount > 9 ? "9+" : studentUnreadCount}
          </span>
        )}
      </button>

      {/* Message Modal */}
      <MessageModal isOpen={isMessageModalOpen} onClose={() => setIsMessageModalOpen(false)} user={profile} />
                <p className="text-sm font-semibold text-sky-800">Next steps</p>
                <ol className="mt-2 space-y-1 text-sm text-sky-700 list-decimal list-inside">
                  {(recommendation.next_steps || []).map((step, index) => (
                    <li key={`step-${index}`}>{step}</li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="mt-5">
              <p className="text-sm font-semibold text-slate-800">Alternative fits</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(recommendation.alternatives || []).map((item, index) => (
                  <span
                    key={`alt-${item.career_path || index}`}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700"
                  >
                    {item.career_path} • {item.fit_label}
                  </span>
                ))}
              </div>
            </div>
          </section>
        )}
          </>
        )}
      </div>

      {/* Chatbot Icon - Fixed Position */}
      <button
        type="button"
        onClick={() => setIsMessageModalOpen(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-br from-orange-600 to-orange-500 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center text-white z-40"
        title="Chat with admin"
      >
        <img src="/Images/message.png" alt="Chat" className="w-7 h-7 object-contain" />
        {studentUnreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
            {studentUnreadCount > 9 ? "9+" : studentUnreadCount}
          </span>
        )}
      </button>

      {/* Message Modal */}
      <MessageModal isOpen={isMessageModalOpen} onClose={() => setIsMessageModalOpen(false)} user={profile} />
    </div>
  );
}
