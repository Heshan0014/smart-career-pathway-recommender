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
    title: "",
    provider: "",
    description: "",
    certificate_content: "",
    certificate_image_base64: "",
    extracted_ocr_text: "",
    ocr_status: "idle",
    file_name: "",
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
            title: item.title || "",
            provider: item.provider || "",
            description: item.description || "",
            certificate_content: item.certificate_content || "",
            certificate_image_base64: item.certificate_image_base64 || "",
            extracted_ocr_text: "",
            ocr_status: "idle",
            file_name: "",
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
    setCertificates((prev) => [...prev, emptyCertificate()]);
  };

  const removeCertificateRow = (idx) => {
    setCertificates((prev) => {
      const next = prev.filter((_, index) => index !== idx);
      return next.length > 0 ? next : [emptyCertificate()];
    });
  };

  const updateCertificate = (idx, field, value) => {
    setCertificates((prev) => prev.map((item, index) => (index === idx ? { ...item, [field]: value } : item)));
  };

  const handleImageUpload = (idx, file) => {
    if (!file) {
      return;
    }

    setCertificates((prev) => prev.map((item, index) => (
      index === idx
        ? {
            ...item,
            ocr_status: "processing",
            extracted_ocr_text: "",
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

  const validCertificates = certificates
    .map((item) => ({
      title: item.title.trim(),
      provider: item.provider.trim(),
      description: item.description.trim(),
      certificate_content: [item.certificate_content.trim(), item.extracted_ocr_text.trim()].filter(Boolean).join("\n"),
      certificate_image_base64: item.certificate_image_base64,
    }))
    .filter((item) => item.title && item.description);

  const canSubmitStage2 = stage1Done && validCertificates.length >= 1;

  const handleSubmitStage2 = async () => {
    if (!token) {
      navigate("/login");
      return;
    }

    if (!canSubmitStage2) {
      setError("Please add at least one certificate with title and description.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const response = await fetch(`${API_BASE_URL}/api/v1/skill-verification/certifications/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ certificates: validCertificates }),
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
          throw new Error("Failed to submit certificates: upload is too large. Try smaller images.");
        }
        const detail = payload.detail || payload.message || rawBody;
        throw new Error(detail || `Failed to submit certificates (HTTP ${response.status}).`);
      }

      setSuccess(payload.analysis_summary || "Stage 2 submitted successfully.");
      await loadStatus();
    } catch (err) {
      setError(err.message || "Failed to submit certificates.");
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
            <h2 className="modern-section-title">Stage 2: Upload Certificates and Experiences</h2>
            <p className="text-sm text-slate-600">
              Upload certificate image(s) and add short descriptions. You can add any number of certificates.
            </p>

            {certificates.map((item, idx) => (
              <div key={`cert-${idx}`} className="rounded-xl border border-slate-200 bg-white/70 p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  className="modern-input"
                  placeholder="Certificate title"
                  value={item.title}
                  onChange={(e) => updateCertificate(idx, "title", e.target.value)}
                />
                <input
                  className="modern-input"
                  placeholder="Provider"
                  value={item.provider}
                  onChange={(e) => updateCertificate(idx, "provider", e.target.value)}
                />

                <textarea
                  className="modern-input md:col-span-2"
                  placeholder="Short description about this course/certificate"
                  value={item.description}
                  onChange={(e) => updateCertificate(idx, "description", e.target.value)}
                />

                <textarea
                  className="modern-input md:col-span-2"
                  placeholder="Optional certificate text details"
                  value={item.certificate_content}
                  onChange={(e) => updateCertificate(idx, "certificate_content", e.target.value)}
                />

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
                onClick={handleSubmitStage2}
                disabled={submitting || !canSubmitStage2}
                className={`px-4 py-2 rounded-xl ${canSubmitStage2 ? "modern-btn-primary" : "bg-slate-300 text-slate-600 cursor-not-allowed"}`}
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>

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
                      <p className="text-xs text-slate-600 mt-1">Provider: {item.provider || "-"}</p>
                      <p className="text-xs text-slate-600 mt-1">{item.description || "No description"}</p>
                      {item.created_at && (
                        <p className="text-[11px] text-slate-500 mt-1">
                          Uploaded: {new Date(item.created_at).toLocaleString()}
                        </p>
                      )}
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
