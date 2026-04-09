import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CommonHeader from "../components/CommonHeader";
import { StudentBanner, StudentEmptyState, StudentPageLoader } from "../components/student/StudentStates";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8001";

export default function PersonalizedAssessment() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [uploadedCertificates, setUploadedCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startingAssessment, setStartingAssessment] = useState(false);
  const [submittingAssessment, setSubmittingAssessment] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionStartedAt, setQuestionStartedAt] = useState(Date.now());
  const [answerMap, setAnswerMap] = useState({});
  const [remainingTimeSec, setRemainingTimeSec] = useState(0);

  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [copyPasteAttempts, setCopyPasteAttempts] = useState(0);
  const [windowBlurCount, setWindowBlurCount] = useState(0);
  const [unusuallyFastCount, setUnusuallyFastCount] = useState(0);
  const [unusuallySlowCount, setUnusuallySlowCount] = useState(0);

  const token = localStorage.getItem("token");

  const loadPage = async () => {
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [meRes, statusRes, latestResultRes, certificatesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/api/v1/skill-verification/me`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/api/v1/skill-verification/assessment/latest-result`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/api/v1/skill-verification/certifications/my`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!meRes.ok || !statusRes.ok) {
        if (meRes.status === 401 || meRes.status === 403 || statusRes.status === 401 || statusRes.status === 403) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
          return;
        }
        throw new Error("Failed to load personalized assessment page.");
      }

      setProfile(await meRes.json());
      const statusPayload = await statusRes.json();
      setStatus(statusPayload);

      if (latestResultRes.ok) {
        const latestResultPayload = await latestResultRes.json();
        setSubmissionResult(latestResultPayload);
      } else {
        setSubmissionResult(null);
      }

      if (certificatesRes.ok) {
        const certificatePayload = await certificatesRes.json();
        setUploadedCertificates(Array.isArray(certificatePayload) ? certificatePayload : []);
      } else {
        setUploadedCertificates([]);
      }
    } catch (err) {
      setError(err.message || "Failed to load personalized assessment page.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!assessment || remainingTimeSec <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setRemainingTimeSec((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [assessment, remainingTimeSec]);

  useEffect(() => {
    if (!assessment) {
      return;
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        setTabSwitchCount((prev) => prev + 1);
      }
    };

    const onWindowBlur = () => {
      setWindowBlurCount((prev) => prev + 1);
    };

    const onPaste = () => {
      setCopyPasteAttempts((prev) => prev + 1);
    };

    const onCopy = () => {
      setCopyPasteAttempts((prev) => prev + 1);
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onWindowBlur);
    window.addEventListener("paste", onPaste);
    window.addEventListener("copy", onCopy);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onWindowBlur);
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("copy", onCopy);
    };
  }, [assessment]);

  const currentQuestion = useMemo(() => {
    if (!assessment || !Array.isArray(assessment.questions)) {
      return null;
    }
    return assessment.questions[currentQuestionIndex] || null;
  }, [assessment, currentQuestionIndex]);

  const handleStartAssessment = async () => {
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setStartingAssessment(true);
      setError("");
      setSuccess("");

      const response = await fetch(`${API_BASE_URL}/api/v1/skill-verification/assessment/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.detail || "Failed to start assessment.");
      }

      setAssessment(payload);
      setSubmissionResult(null);
      setCurrentQuestionIndex(0);
      setQuestionStartedAt(Date.now());
      setRemainingTimeSec(payload.total_time_limit_sec || 0);
      setAnswerMap({});

      setTabSwitchCount(0);
      setCopyPasteAttempts(0);
      setWindowBlurCount(0);
      setUnusuallyFastCount(0);
      setUnusuallySlowCount(0);
    } catch (err) {
      setError(err.message || "Failed to start assessment.");
    } finally {
      setStartingAssessment(false);
    }
  };

  const recordQuestionTiming = (questionId) => {
    const elapsedSec = Math.max(0, Math.round((Date.now() - questionStartedAt) / 1000));

    if (elapsedSec < 5) {
      setUnusuallyFastCount((prev) => prev + 1);
    }
    if (elapsedSec > 150) {
      setUnusuallySlowCount((prev) => prev + 1);
    }

    setAnswerMap((prev) => {
      const current = prev[questionId];
      if (!current) {
        return prev;
      }
      return {
        ...prev,
        [questionId]: {
          ...current,
          time_spent_sec: (current.time_spent_sec || 0) + elapsedSec,
        },
      };
    });

    setQuestionStartedAt(Date.now());
  };

  const handleSelectOption = (questionId, optionIndex) => {
    setAnswerMap((prev) => ({
      ...prev,
      [questionId]: {
        question_id: questionId,
        selected_option_index: optionIndex,
        text_answer: prev[questionId]?.text_answer || "",
        time_spent_sec: prev[questionId]?.time_spent_sec || 0,
      },
    }));
  };

  const handleWrittenAnswerChange = (questionId, value) => {
    setAnswerMap((prev) => ({
      ...prev,
      [questionId]: {
        question_id: questionId,
        selected_option_index: prev[questionId]?.selected_option_index ?? null,
        text_answer: value,
        time_spent_sec: prev[questionId]?.time_spent_sec || 0,
      },
    }));
  };

  const handleNextQuestion = () => {
    if (!currentQuestion) {
      return;
    }

    const answer = answerMap[currentQuestion.question_id];
    if (!answer) {
      setError("Please answer this question before continuing.");
      return;
    }

    if (currentQuestion.question_type === "written" && !(answer.text_answer || "").trim()) {
      setError("Please provide a written answer before continuing.");
      return;
    }

    if (currentQuestion.question_type !== "written" && typeof answer.selected_option_index !== "number") {
      setError("Please select an option before continuing.");
      return;
    }

    setError("");
    recordQuestionTiming(currentQuestion.question_id);
    setCurrentQuestionIndex((prev) => Math.min(prev + 1, (assessment?.questions?.length || 1) - 1));
  };

  const handlePrevQuestion = () => {
    if (!currentQuestion || currentQuestionIndex === 0) {
      return;
    }

    recordQuestionTiming(currentQuestion.question_id);
    setCurrentQuestionIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmitAssessment = async () => {
    if (!token || !assessment) {
      return;
    }

    if (currentQuestion) {
      recordQuestionTiming(currentQuestion.question_id);
    }

    const answers = Object.values(answerMap);
    if (answers.length !== (assessment.questions || []).length) {
      setError("Please answer all questions before submitting.");
      return;
    }

    const hasUnanswered = (assessment.questions || []).some((question) => {
      const answer = answerMap[question.question_id];
      if (!answer) return true;
      if (question.question_type === "written") {
        return !(answer.text_answer || "").trim();
      }
      return typeof answer.selected_option_index !== "number";
    });

    if (hasUnanswered) {
      setError("Please answer all questions before submitting.");
      return;
    }

    try {
      setSubmittingAssessment(true);
      setError("");

      const response = await fetch(`${API_BASE_URL}/api/v1/skill-verification/assessment/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          session_id: assessment.session_id,
          answers,
          behaviour_metrics: {
            tab_switch_count: tabSwitchCount,
            copy_paste_attempts: copyPasteAttempts,
            window_blur_count: windowBlurCount,
            unusually_fast_count: unusuallyFastCount,
            unusually_slow_count: unusuallySlowCount,
          },
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.detail || "Failed to submit assessment.");
      }

      if (payload.certificate_trust_reduced) {
        setSuccess("Assessment submitted. Mismatches detected, so assessed levels are trusted as final verified skills.");
      } else {
        setSuccess("Assessment submitted. Certificate claims match your demonstrated skills.");
      }

      setSubmissionResult(payload);
      setAssessment(null);
      await loadPage();
    } catch (err) {
      setError(err.message || "Failed to submit assessment.");
    } finally {
      setSubmittingAssessment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen app-shell-bg professional-page-font">
        <CommonHeader alwaysVisible />
        <div className="max-w-7xl mx-auto p-6 md:p-10">
          <StudentPageLoader message="Loading personalized assessment..." />
        </div>
      </div>
    );
  }

  if (!status?.ready_for_assessment && !status?.assessment_stage_completed) {
    return (
      <div className="min-h-screen app-shell-bg professional-page-font">
        <CommonHeader user={profile} alwaysVisible />
        <div className="max-w-7xl mx-auto p-6 md:p-10">
          <StudentEmptyState
            title="Final stage is locked"
            description="Complete Stage 2 certification analysis first, then return to start Personalized Assessment."
            action={
              <button type="button" onClick={() => navigate("/skill-verification")} className="modern-btn-primary px-4 py-2 rounded-xl">
                Back to Skill Verification
              </button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-shell-bg professional-page-font">
      <CommonHeader user={profile} alwaysVisible />

      <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-6">
        <StudentBanner type="error" message={error} />
        <StudentBanner type="success" message={success} />

        <section className="glass-panel rounded-2xl p-6 md:p-8">
          <p className="text-xs uppercase tracking-wide text-emerald-700 font-semibold">Final Stage</p>
          <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 mt-2">Personalized Assessment</h1>
          <p className="text-sm text-slate-600 mt-3">
            This assessment is generated only from your detected certificate skill areas and monitors behavior for fairness.
          </p>
        </section>

        {uploadedCertificates.length > 0 && (
          <section className="glass-panel rounded-2xl p-6 space-y-3">
            <h2 className="modern-section-title">Uploaded Certifications</h2>
            <div className="space-y-2 max-h-[240px] overflow-auto pr-1">
              {uploadedCertificates.map((item, idx) => (
                <div key={`${item.id || "cert"}-${idx}`} className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-sm font-semibold text-slate-900">{item.title || "Untitled Certificate"}</p>
                  <p className="text-xs text-slate-600 mt-1">Provider: {item.provider || "-"}</p>
                  <p className="text-xs text-slate-600 mt-1">{item.description || "No description"}</p>
                  {item.created_at && (
                    <p className="text-[11px] text-slate-500 mt-1">Uploaded: {new Date(item.created_at).toLocaleString()}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {submissionResult ? (
          <section className="glass-panel rounded-2xl p-6 space-y-5">
            <h2 className="modern-section-title">Assessment Results</h2>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <p>
                Overall Knowledge Level: <span className="font-bold">{submissionResult.overall_knowledge_level || "Not available"}</span>
              </p>
              <p className="mt-1">Total questions reviewed: {(submissionResult.question_results || []).length}</p>
            </div>

            <div className="space-y-3 max-h-[420px] overflow-auto pr-1">
              {(submissionResult.question_results || []).map((result, idx) => (
                <div
                  key={`${result.question_id || idx}`}
                  className={`rounded-xl border p-4 ${result.correct ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Q{idx + 1} • {result.skill_area} • {result.question_type?.toUpperCase()}
                  </p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">{result.question}</p>
                  <p className="text-sm mt-2 text-slate-700">
                    Your answer: {result.question_type === "written" ? (result.text_answer || "-") : (result.selected_option_text || "-")}
                  </p>
                  <p className="text-sm mt-1 text-slate-700">Correct answer: {result.correct_answer || "-"}</p>
                  <p className={`text-xs font-semibold mt-2 ${result.correct ? "text-emerald-700" : "text-rose-700"}`}>
                    {result.correct ? "Correct" : "Wrong"}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate("/dashboard", { replace: true })}
                className="modern-btn-primary px-4 py-2 rounded-xl"
              >
                Go To Dashboard
              </button>
            </div>
          </section>
        ) : !assessment ? (
          <section className="glass-panel rounded-2xl p-6">
            <button
              type="button"
              onClick={handleStartAssessment}
              disabled={startingAssessment}
              className="modern-btn-primary px-5 py-2.5 rounded-xl disabled:opacity-60"
            >
              {startingAssessment ? "Preparing assessment..." : "Start Final Assessment (20 Questions)"}
            </button>
          </section>
        ) : (
          currentQuestion && (
            <section className="glass-panel rounded-2xl p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="modern-section-title">Live Assessment</h2>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                  Time Left: {Math.floor(remainingTimeSec / 60)}m {remainingTimeSec % 60}s
                </span>
              </div>

              <p className="text-xs text-slate-500">
                Question {currentQuestionIndex + 1} of {assessment.questions.length} • Skill: {currentQuestion.skill_area}
              </p>
              <p className="text-sm font-semibold text-slate-900">{currentQuestion.question}</p>

              {currentQuestion.question_type === "written" ? (
                <div className="space-y-2">
                  <label htmlFor={`written-${currentQuestion.question_id}`} className="text-sm font-medium text-slate-700">
                    Write your answer
                  </label>
                  <textarea
                    id={`written-${currentQuestion.question_id}`}
                    rows={6}
                    value={answerMap[currentQuestion.question_id]?.text_answer || ""}
                    onChange={(event) => handleWrittenAnswerChange(currentQuestion.question_id, event.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Explain your reasoning clearly using practical steps..."
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  {(currentQuestion.options || []).map((option, optionIdx) => (
                    <label key={`${currentQuestion.question_id}-opt-${optionIdx}`} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="radio"
                        name={currentQuestion.question_id}
                        checked={answerMap[currentQuestion.question_id]?.selected_option_index === optionIdx}
                        onChange={() => handleSelectOption(currentQuestion.question_id, optionIdx)}
                        className="accent-emerald-600"
                      />
                      {option}
                    </label>
                  ))}
                </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                Monitored behavior: tab switches {tabSwitchCount}, copy/paste {copyPasteAttempts}, blur events {windowBlurCount}
              </div>

              <div className="flex flex-wrap gap-3 justify-end">
                <button
                  type="button"
                  onClick={handlePrevQuestion}
                  className="modern-btn-secondary px-4 py-2 rounded-xl"
                  disabled={currentQuestionIndex === 0}
                >
                  Previous
                </button>
                {currentQuestionIndex < assessment.questions.length - 1 ? (
                  <button type="button" onClick={handleNextQuestion} className="modern-btn-primary px-4 py-2 rounded-xl">
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmitAssessment}
                    disabled={submittingAssessment}
                    className="modern-btn-primary px-4 py-2 rounded-xl disabled:opacity-60"
                  >
                    {submittingAssessment ? "Submitting..." : "Submit Assessment"}
                  </button>
                )}
              </div>
            </section>
          )
        )}
      </div>
    </div>
  );
}
