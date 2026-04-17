import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Tesseract from "tesseract.js";
import CommonHeader from "../components/CommonHeader";
import { StudentBanner, StudentEmptyState, StudentPageLoader } from "../components/student/StudentStates";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8001";

async function fileToCompressedDataUrl(file, maxDimension = 1400, quality = 0.78) {
  const imageUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = imageUrl;
    });

    const width = image.width;
    const height = image.height;
    const scale = Math.min(1, maxDimension / Math.max(width, height));

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

async function extractOcrText(file) {
  const result = await Tesseract.recognize(file, "eng");
  const text = result?.data?.text || "";
  return text.replace(/\s+/g, " ").trim().slice(0, 6000);
}

function emptyCertificate() {
  return {
    id: null,
    certificate_image_base64: "",
    extracted_ocr_text: "",
    ocr_status: "idle",
    file_name: "",
    is_saved: false,
    dirty: false,
  };
}

export default function SkillVerification() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [hasQuizSubmission, setHasQuizSubmission] = useState(false);
  const [savedCertificates, setSavedCertificates] = useState([]);
  const [analysisPreview, setAnalysisPreview] = useState(null);

  const [certificates, setCertificates] = useState([emptyCertificate()]);
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem("token");

  const loadStatus = async () => {
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [meRes, statusRes, quizRes, certificatesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/api/v1/skill-verification/me`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/api/v1/quiz/me`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/api/v1/skill-verification/certifications/my`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!meRes.ok) {
        if (meRes.status === 401 || meRes.status === 403) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
          return;
        }
        throw new Error("Failed to load profile for verification flow.");
      }

      const meData = await meRes.json();
      let statusData = {
        quiz_completed: false,
        certification_stage_completed: false,
        assessment_stage_completed: false,
        ready_for_assessment: false,
        ready_for_recommendation: false,
        detected_skills: [],
        verified_skills: [],
      };

      if (statusRes.ok) {
        statusData = await statusRes.json();
      }

      if (quizRes.ok) {
        setHasQuizSubmission(true);
      } else if (quizRes.status === 404) {
        setHasQuizSubmission(false);
      }

      if (meData?.quiz_submitted) {
        statusData = {
          ...statusData,
          quiz_completed: true,
        };
      }

      setProfile(meData);
      setStatus(statusData);

      if (certificatesRes.ok) {
        const certificateList = await certificatesRes.json();
        const normalizedList = Array.isArray(certificateList) ? certificateList : [];
        setSavedCertificates(normalizedList);

        if (normalizedList.length > 0) {
          setCertificates(normalizedList.map((item) => ({
            id: item.id || null,
            title: item.title || "",
            provider: item.provider || "",
            description: item.description || "",
            certificate_content: item.certificate_content || "",
            certificate_image_base64: item.certificate_image_base64 || "",
            extracted_ocr_text: "",
            ocr_status: "idle",
            file_name: item.title || "",
            is_saved: true,
            dirty: false,
          })));
        }
      }
    } catch (err) {
      setError(err.message || "Failed to load verification status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stage1Done = Boolean(status?.quiz_completed) || hasQuizSubmission || Boolean(profile?.quiz_submitted);
  const stage2Done = Boolean(status?.certification_stage_completed);
  const stage3Done = Boolean(status?.assessment_stage_completed);

  const addCertificateRow = () => {
    setAnalysisPreview(null);
    setCertificates((prev) => [...prev, emptyCertificate()]);
  };

  const removeCertificateRow = (idx) => {
    setAnalysisPreview(null);
    setCertificates((prev) => {
      const next = prev.filter((_, index) => index !== idx);
      return next.length > 0 ? next : [emptyCertificate()];
    });
  };

  const handleImageUpload = (idx, file) => {
    if (!file) {
      return;
    }

    if (!file.type || !file.type.startsWith("image/")) {
      setError("Only image files are allowed for certificate upload.");
      return;
    }

    setAnalysisPreview(null);
    setError("");

    setCertificates((prev) => prev.map((item, index) => (
      index === idx
        ? {
            ...item,
            ocr_status: "processing",
            extracted_ocr_text: "",
            dirty: true,
          }
        : item
    )));

    Promise.all([fileToCompressedDataUrl(file), extractOcrText(file)])
      .then(([base64, ocrText]) => {
        setCertificates((prev) => prev.map((item, index) => (
          index === idx
            ? {
                ...item,
                certificate_image_base64: base64,
                extracted_ocr_text: ocrText,
                ocr_status: "done",
                file_name: file.name,
                is_saved: false,
                dirty: true,
              }
            : item
        )));
      })
      .catch(() => {
        setCertificates((prev) => prev.map((item, index) => (
          index === idx
            ? {
                ...item,
                ocr_status: "failed",
              }
            : item
        )));
        setError("Failed to process certificate image OCR. Please try another image.");
      });
  };

  const toCertificateRequest = (item) => ({
    title: (item.title || item.file_name || "Uploaded Certificate").trim() || "Uploaded Certificate",
    provider: (item.provider || "").trim(),
    description: (item.description || "").trim(),
    certificate_content: (item.certificate_content || item.extracted_ocr_text || "").trim(),
    certificate_image_base64: item.certificate_image_base64 || "",
  });

    const analyzePayload = certificates
      .filter((item) => item.certificate_image_base64 && (!item.is_saved || item.dirty))
      .map((item) => toCertificateRequest(item));

  const certificatePayload = certificates
    .map((item) => toCertificateRequest(item))
    .filter((item) => item.certificate_image_base64);

    const canAnalyzeStage2 = stage1Done && analyzePayload.length >= 1;
  const canSaveStage2 = stage1Done && Boolean(analysisPreview) && analysisPreview.certificates.length >= 1;

  const handleAnalyzeStage2 = async () => {
    if (!token) {
      navigate("/login");
      return;
    }

    if (!canAnalyzeStage2) {
      setError("Please upload a new or changed certificate image before analyzing.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");
      setAnalysisPreview(null);

      const response = await fetch(`${API_BASE_URL}/api/v1/skill-verification/certifications/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ certificates: analyzePayload }),
      });

      const rawBody = await response.text();
      let payload = {};
      if (rawBody) {
        try {
          payload = JSON.parse(rawBody);
        } catch (jsonErr) {
          payload = {};
        }
      }

      if (!response.ok) {
        if (response.status === 413) {
          throw new Error("Failed to analyze certificates: upload is too large. Try smaller images.");
        }
        const detail = payload.detail || payload.message || rawBody;
        throw new Error(detail || `Failed to analyze certificates (HTTP ${response.status}).`);
      }

      setAnalysisPreview({
        certificates: analyzePayload,
        detectedSkills: payload.detected_skills || [],
        summary: payload.analysis_summary || "Skill identification complete.",
      });
      setSuccess("Skills identified. Review the summary, then click Save if correct.");
    } catch (err) {
      setError(err.message || "Failed to analyze certificates.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveStage2 = async () => {
    if (!token) {
      navigate("/login");
      return;
    }

    if (!analysisPreview || analysisPreview.certificates.length === 0) {
      setError("Please analyze certificate images first.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      let response = await fetch(`${API_BASE_URL}/api/v1/skill-verification/certifications/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ certificates: analysisPreview.certificates }),
      });

      // Backward compatibility: older backend saves through /certifications/analyze.
      if (response.status === 404) {
        response = await fetch(`${API_BASE_URL}/api/v1/skill-verification/certifications/analyze`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ certificates: analysisPreview.certificates }),
        });
      }

      const rawBody = await response.text();
      let payload = {};
      if (rawBody) {
        try {
          payload = JSON.parse(rawBody);
        } catch (jsonErr) {
          payload = {};
        }
      }

      if (!response.ok) {
        const detail = payload.detail || payload.message || rawBody;
        throw new Error(detail || `Failed to save certificates (HTTP ${response.status}).`);
      }

      setSuccess(payload.analysis_summary || "Certificates saved and skills updated.");
      setAnalysisPreview(null);
      await loadStatus();
    } catch (err) {
      setError(err.message || "Failed to save certificates.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSavedCertificate = async (certificateId) => {
    if (!token) {
      navigate("/login");
      return;
    }
    if (!certificateId) {
      return;
    }

    const confirmed = window.confirm("Remove this certificate? Related detected skill claims will also be updated.");
    if (!confirmed) {
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      let response = await fetch(`${API_BASE_URL}/api/v1/skill-verification/certifications/${certificateId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Backward compatibility: older backend has no delete endpoint.
      if (response.status === 404) {
        const remainingCertificates = savedCertificates
          .filter((item) => item.id !== certificateId)
          .map((item) => toCertificateRequest(item));

        if (remainingCertificates.length === 0) {
          throw new Error("This backend version does not support deleting the last certificate directly. Please restart backend with latest code.");
        }

        response = await fetch(`${API_BASE_URL}/api/v1/skill-verification/certifications/analyze`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ certificates: remainingCertificates }),
        });
      }

      if (!response.ok) {
        const rawBody = await response.text();
        throw new Error(rawBody || `Failed to delete certificate (HTTP ${response.status}).`);
      }

      setAnalysisPreview(null);
      setSuccess("Certificate removed. Related skills were refreshed.");
      await loadStatus();
    } catch (err) {
      setError(err.message || "Failed to delete certificate.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen app-shell-bg professional-page-font">
        <CommonHeader alwaysVisible />
        <div className="max-w-7xl mx-auto p-6 md:p-10">
          <StudentPageLoader message="Loading skill verification flow..." />
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
          <p className="text-xs uppercase tracking-wide text-emerald-700 font-semibold">Three-Stage Verification</p>
          <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 mt-2">Skill Verification Assessment Flow</h1>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`rounded-2xl p-5 border ${stage1Done ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
            <p className="text-xs uppercase tracking-wide text-slate-500">Stage 1</p>
            <p className="text-lg font-bold mt-1">Quiz Profile</p>
            <p className="text-sm mt-2">{stage1Done ? "Completed" : "Pending"}</p>
          </div>
          <div className={`rounded-2xl p-5 border ${stage2Done ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
            <p className="text-xs uppercase tracking-wide text-slate-500">Stage 2</p>
            <p className="text-lg font-bold mt-1">Certification Analysis</p>
            <p className="text-sm mt-2">{stage2Done ? "Completed" : "Pending"}</p>
          </div>
          <div className={`rounded-2xl p-5 border ${stage3Done ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
            <p className="text-xs uppercase tracking-wide text-slate-500">Stage 3</p>
            <p className="text-lg font-bold mt-1">Personalized Assessment</p>
            <p className="text-sm mt-2">{stage3Done ? "Completed" : "Pending"}</p>
          </div>
        </section>

        {!stage1Done && (
          <StudentEmptyState
            title="Stage 1 quiz is required"
            description="Please complete the Stage 1 quiz in your profile before continuing."
            action={
              <button type="button" className="modern-btn-primary px-4 py-2 rounded-xl" onClick={() => navigate("/profile")}>
                Go to Profile
              </button>
            }
          />
        )}

        {stage1Done && (
          <section className="glass-panel rounded-2xl p-6 space-y-4">
            <h2 className="modern-section-title">Stage 2: Upload Certificate Images</h2>
            <p className="text-sm text-slate-600">
              Upload certificate image(s). The system identifies related skills, shows a summary, and you decide whether to save.
            </p>

            {certificates.map((item, idx) => (
              <div key={`cert-${idx}`} className="rounded-xl border border-slate-200 bg-white/70 p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs text-slate-600 mb-1">Certificate Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(idx, e.target.files && e.target.files[0])}
                    className="w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200"
                  />
                  {item.file_name && <p className="text-xs text-slate-500 mt-1">Uploaded: {item.file_name}</p>}
                  {item.ocr_status === "processing" && (
                    <p className="text-xs text-amber-600 mt-1">Reading text from image (OCR)...</p>
                  )}
                  {item.ocr_status === "done" && (
                    <p className="text-xs text-emerald-700 mt-1">OCR extracted text is ready and will be used in detection.</p>
                  )}
                  {item.ocr_status === "failed" && (
                    <p className="text-xs text-rose-600 mt-1">OCR failed for this image. You can still submit typed details.</p>
                  )}
                  {item.extracted_ocr_text && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-slate-600">View extracted image text</summary>
                      <p className="text-xs text-slate-500 mt-1 max-h-24 overflow-y-auto whitespace-pre-wrap">{item.extracted_ocr_text}</p>
                    </details>
                  )}
                </div>

                <div>
                  <button
                    type="button"
                    className="px-3 py-2 rounded-lg text-sm border border-rose-300 text-rose-700 hover:bg-rose-50"
                    onClick={() => removeCertificateRow(idx)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={addCertificateRow} className="modern-btn-secondary px-4 py-2 rounded-xl">
                Add Certificate
              </button>
              <button
                type="button"
                onClick={handleAnalyzeStage2}
                disabled={submitting || !canAnalyzeStage2}
                className={`px-4 py-2 rounded-xl ${canAnalyzeStage2 ? "modern-btn-primary" : "bg-slate-300 text-slate-600 cursor-not-allowed"}`}
              >
                {submitting ? "Analyzing..." : "Analyze"}
              </button>
              <button
                type="button"
                onClick={handleSaveStage2}
                disabled={submitting || !canSaveStage2}
                className={`px-4 py-2 rounded-xl ${canSaveStage2 ? "modern-btn-primary" : "bg-slate-300 text-slate-600 cursor-not-allowed"}`}
              >
                {submitting ? "Saving..." : "Save Skills"}
              </button>
            </div>

            {analysisPreview && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-semibold text-emerald-900">Identification Summary</p>
                <p className="text-xs text-emerald-800 mt-1">{analysisPreview.summary}</p>
                <p className="text-xs text-emerald-700 mt-2">If this is correct, click Save Skills. If wrong, update/remove images and analyze again.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {analysisPreview.detectedSkills.map((skill) => (
                    <span key={skill.skill_area} className="px-3 py-1 rounded-full text-xs bg-white border border-emerald-300 text-emerald-800">
                      {skill.skill_area} • Claimed: {skill.claimed_level}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-800">Detected skill areas</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(status?.detected_skills || []).map((skill) => (
                  <span key={skill.skill_area} className="px-3 py-1 rounded-full text-xs bg-white border border-slate-300 text-slate-700">
                    {skill.skill_area} • Claimed: {skill.claimed_level}
                  </span>
                ))}
                {(status?.detected_skills || []).length === 0 && <p className="text-xs text-slate-500">No skills detected yet.</p>}
              </div>
            </div>

            {savedCertificates.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-800">Previously Uploaded Certificates</p>
                <div className="mt-3 space-y-3">
                  {savedCertificates.map((item, index) => (
                    <div key={`${item.id || "saved"}-${index}`} className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-sm font-semibold text-slate-900">{item.title || "Untitled Certificate"}</p>
                      {item.certificate_image_base64 && (
                        <img
                          src={item.certificate_image_base64}
                          alt={item.title || "Certificate"}
                          className="mt-2 w-full max-w-sm h-32 object-cover rounded-lg border border-slate-200"
                        />
                      )}
                      {item.created_at && (
                        <p className="text-[11px] text-slate-500 mt-1">
                          Uploaded: {new Date(item.created_at).toLocaleString()}
                        </p>
                      )}
                      <button
                        type="button"
                        className="mt-3 px-3 py-1.5 rounded-lg text-xs border border-rose-300 text-rose-700 hover:bg-rose-50"
                        onClick={() => handleDeleteSavedCertificate(item.id)}
                      >
                        Remove Certificate
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stage2Done && (
              <button
                type="button"
                onClick={() => navigate("/personalized-assessment")}
                className="w-full modern-btn-primary py-2.5 rounded-xl"
              >
                Go to Final Stage
              </button>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
