import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CommonHeader from "../components/CommonHeader";
import MessageModal from "../components/MessageModal";
import { StudentBanner, StudentEmptyState, StudentPageLoader } from "../components/student/StudentStates";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8001";

const QUIZ_QUESTIONS = [
  {
    id: "q1",
    category: "Interests",
    label: "1. Which subjects do you enjoy the most?",
    multiSelect: true,
    options: [
      "IT / Programming",
      "Project Management",
      "Business Analysis",
      "Design",
      "Software Development",
      "Data Science / AI",
      "UI/UX Design",
      "Cybersecurity",
      "Networking",
    ],
  },
  {
    id: "q2",
    category: "Interests",
    label: "2. What do you like doing in your free time?",
    multiSelect: true,
    options: [
      "Coding / Building apps",
      "Designing / Drawing",
      "Watching educational content",
      "Playing games / entertainment",
      "Coding applications",
      "Analyzing data",
      "Designing interfaces",
      "Securing systems",
      "Managing networks",
    ],
  },
  {
    id: "q3",
    category: "Interests",
    label: "3. Which activity sounds most interesting to you?",
    multiSelect: true,
    options: [
      "Solving logical problems",
      "Creating visual designs",
      "Managing people or projects",
      "Researching new topics",
      "Building websites or apps",
      "Creating machine learning models",
      "Designing user interfaces",
      "Finding security vulnerabilities",
      "Setting up servers/networks",
    ],
  },
  {
    id: "q4",
    category: "Interests",
    label: "4. Which field attracts you the most?",
    multiSelect: true,
    options: [
      "Software Development",
      "Data Science",
      "UI/UX Design",
      "Cybersecurity",
      "Web/mobile apps",
      "AI/ML projects",
      "Design prototypes",
      "Ethical hacking projects",
      "Network systems",
    ],
  },
  {
    id: "q5",
    category: "Interests",
    label: "5. Do you enjoy learning new technologies?",
    options: ["Yes", "Sometimes", "No"],
  },
  {
    id: "q6",
    category: "Skills Assessment",
    label: "6. How would you rate your programming skills?",
    options: ["Beginner", "Intermediate", "Advanced"],
  },
  {
    id: "q7",
    category: "Skills Assessment",
    label: "7. Are you familiar with any programming languages?",
    options: ["Yes", "No"],
  },
  {
    id: "q8",
    category: "Skills Assessment",
    label: "8. How strong are your problem-solving skills?",
    options: ["Low", "Medium", "High"],
  },
  {
    id: "q9",
    category: "Skills Assessment",
    label: "9. Do you have experience in any of the following?",
    options: ["Web Development", "Data Analysis", "Graphic Design", "None"],
  },
  {
    id: "q10",
    category: "Personality & Learning Style",
    label: "10. Do you prefer working:",
    options: ["Alone", "In a team", "Both"],
  },
  {
    id: "q11",
    category: "Personality & Learning Style",
    label: "11. Which describes you best?",
    options: ["Creative", "Analytical", "Balanced"],
  },
  {
    id: "q12",
    category: "Personality & Learning Style",
    label: "12. How do you prefer to learn?",
    options: ["Watching videos", "Reading materials", "Hands-on practice"],
  },
  {
    id: "q13",
    category: "Personality & Learning Style",
    label: "13. How do you handle challenges?",
    options: ["Keep trying until solved", "Ask for help", "Avoid difficult tasks"],
  },
  {
    id: "q14",
    category: "Career Preferences",
    label: "14. What is your main career goal?",
    options: ["High salary", "Passion-based career", "Work-life balance"],
  },
  {
    id: "q15",
    category: "Career Preferences",
    label: "15. What type of job environment do you prefer?",
    options: ["Office", "Remote", "Hybrid"],
  },
  {
    id: "q16",
    category: "Career Preferences",
    label: "16. Do you prefer:",
    options: ["Technical careers", "Non-technical careers", "Not sure"],
  },
  {
    id: "q17",
    category: "Career Preferences",
    label: "17. Are you interested in leadership roles?",
    options: ["Yes", "No", "Maybe"],
  },
];

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidPhoneNumber(value) {
  return /^\d{10}$/.test(value.trim());
}

function getPasswordChecks(value) {
  return {
    minLength: value.length >= 8,
    hasUpper: /[A-Z]/.test(value),
    hasLower: /[a-z]/.test(value),
    hasNumber: /\d/.test(value),
    hasSpecial: /[^A-Za-z0-9\s]/.test(value),
    noSpaces: !/\s/.test(value),
  };
}

function isValidPassword(value) {
  const checks = getPasswordChecks(value);
  return Object.values(checks).every(Boolean) && value.length <= 128;
}

function mapUserToFormData(data) {
  return {
    full_name: data.full_name || "",
    email: data.email || "",
    password: "",
    age: data.age || "",
    gender: data.gender || "",
    education_level: data.education_level || "",
    address: data.address || "",
    phone_number: data.phone_number || "",
    favorite_subject: data.favorite_subject || "",
    favorite_field: data.favorite_field || "",
    profile_image: data.profile_image || "",
  };
}

function getFieldErrors(data) {
  const errors = {};

  if (data.full_name && data.full_name.trim().length > 0 && data.full_name.trim().length < 2) {
    errors.full_name = "Full name must be at least 2 characters.";
  }

  if (data.email && !isValidEmail(data.email)) {
    errors.email = "Please enter a valid email address.";
  }

  if (data.password && !isValidPassword(data.password)) {
    errors.password = "Password must be 8 to 128 characters.";
  }

  if (data.phone_number && !isValidPhoneNumber(data.phone_number)) {
    errors.phone_number = "Phone number must have exactly 10 digits.";
  }

  return errors;
}

function getChangedFieldErrors(data, baseline) {
  const errors = {};

  if (data.full_name !== baseline.full_name) {
    const fullName = data.full_name.trim();
    if (fullName.length < 2) {
      errors.full_name = "Full name must be at least 2 characters.";
    }
  }

  if (data.email !== baseline.email) {
    if (!isValidEmail(data.email)) {
      errors.email = "Please enter a valid email address.";
    }
  }

  if (data.password && !isValidPassword(data.password)) {
    errors.password = "Password must be 8 to 128 characters.";
  }

  if (data.phone_number !== baseline.phone_number && data.phone_number.trim() !== "") {
    if (!isValidPhoneNumber(data.phone_number)) {
      errors.phone_number = "Phone number must have exactly 10 digits.";
    }
  }

  return errors;
}

function normalizeChecklistField(fieldName) {
  if (typeof fieldName !== "string") {
    return "";
  }
  return fieldName.trim().toLowerCase();
}

function getCompletionData(profile, formData) {
  if (profile && typeof profile.profile_completion_percentage === "number") {
    return {
      percentage: profile.profile_completion_percentage,
      completed: Array.isArray(profile.completed_fields) ? profile.completed_fields : [],
      missing: Array.isArray(profile.missing_fields) ? profile.missing_fields : [],
    };
  }

  const checks = [
    ["Full Name", Boolean(formData?.full_name?.trim())],
    ["Email", Boolean(formData?.email?.trim())],
    ["Age", Boolean(formData?.age?.trim())],
    ["Gender", Boolean(formData?.gender?.trim())],
    ["Education Level", Boolean(formData?.education_level?.trim())],
    ["Address", Boolean(formData?.address?.trim())],
    ["Phone Number", Boolean(formData?.phone_number?.trim())],
    ["Favorite Subject", Boolean(formData?.favorite_subject?.trim())],
    ["Profile Image", Boolean(formData?.profile_image?.trim())],
  ];

  const completed = checks.filter((item) => item[1]).map((item) => item[0]);
  const missing = checks.filter((item) => !item[1]).map((item) => item[0]);
  const total = checks.length;
  const percentage = total === 0 ? 0 : Math.round((completed.length * 100) / total);

  return { percentage, completed, missing };
}

function getCompletionTheme(percentage) {
  if (percentage >= 100) {
    return {
      container: "bg-emerald-50 border-emerald-200",
      label: "text-emerald-700",
      value: "text-emerald-800",
      badge: "bg-emerald-200 text-emerald-800",
      progressTrack: "bg-emerald-100",
      progressBar: "bg-emerald-600",
      statusText: "Complete",
    };
  }

  if (percentage >= 50) {
    return {
      container: "bg-amber-50 border-amber-200",
      label: "text-amber-700",
      value: "text-amber-800",
      badge: "bg-amber-200 text-amber-800",
      progressTrack: "bg-amber-100",
      progressBar: "bg-amber-500",
      statusText: "In Progress",
    };
  }

  return {
    container: "bg-red-50 border-red-200",
    label: "text-red-700",
    value: "text-red-800",
    badge: "bg-red-200 text-red-800",
    progressTrack: "bg-red-100",
    progressBar: "bg-red-500",
    statusText: "Low",
  };
}

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizErrors, setQuizErrors] = useState({});
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [isQuizSummaryOpen, setIsQuizSummaryOpen] = useState(false);
  const [quizSubmittedAt, setQuizSubmittedAt] = useState("");
  const [isQuizSubmitted, setIsQuizSubmitted] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [isQuizSubmitting, setIsQuizSubmitting] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [studentUnreadCount, setStudentUnreadCount] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const passwordValue = formData?.password || "";
  const passwordChecks = getPasswordChecks(passwordValue);
  const isPasswordValid = Object.values(passwordChecks).every(Boolean) && passwordValue.length <= 128;
  const showPasswordRules = isPasswordFocused && !isPasswordValid;
  const completionData = getCompletionData(profile, formData);
  const completionPercentage = completionData.percentage;
  const isProfileReady = completionPercentage >= 100;
  const completionTheme = getCompletionTheme(completionPercentage);
  const isQuizSubmittedForGate = Boolean(profile?.quiz_submitted) || isQuizSubmitted;
  const isStage2Done = Boolean(verificationStatus?.certification_stage_completed) || Boolean(verificationStatus?.assessment_stage_completed);
  const isStage3Done = Boolean(verificationStatus?.assessment_stage_completed);
  const stageProgress = [
    { id: 1, label: "Stage 1", done: isQuizSubmittedForGate },
    { id: 2, label: "Stage 2", done: isStage2Done },
    { id: 3, label: "Stage 3", done: isStage3Done },
  ];

  const markTouched = (fieldName) => {
    setTouchedFields((prev) => ({ ...prev, [fieldName]: true }));
  };

  const updateField = (nextData) => {
    setFormData(nextData);
    setFieldErrors(getFieldErrors(nextData));
    setError("");
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const loadProfile = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const responseData = await response.json().catch(() => ({}));
          if (response.status === 401 || response.status === 403 || response.status === 404) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            navigate("/login");
            return;
          }
          throw new Error(responseData.detail || "Unable to load profile");
        }

        const data = await response.json();
        setProfile(data);
        const mapped = mapUserToFormData(data);
        setFormData(mapped);
        setFieldErrors(getFieldErrors(mapped));
        localStorage.setItem("user", JSON.stringify(data));

        try {
          const quizResponse = await fetch(`${API_BASE_URL}/api/v1/quiz/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (quizResponse.ok) {
            const quizData = await quizResponse.json();
            setQuizAnswers(quizData.answers || {});
            setQuizSubmittedAt(quizData.submitted_at || "");
            setIsQuizSubmitted(Boolean(quizData.answers));
          } else if (quizResponse.status === 404) {
            setQuizAnswers({});
            setQuizSubmittedAt("");
            setIsQuizSubmitted(false);
          } else if (quizResponse.status === 401 || quizResponse.status === 403) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            navigate("/login");
            return;
          }
        } catch (quizErr) {
          console.error("Failed to load quiz details:", quizErr);
        }

        try {
          const verificationResponse = await fetch(`${API_BASE_URL}/api/v1/skill-verification/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (verificationResponse.ok) {
            const verificationData = await verificationResponse.json();
            setVerificationStatus(verificationData);
          }
        } catch (verificationErr) {
          console.error("Failed to load verification status:", verificationErr);
        }
      } catch (err) {
        setError("Failed to load profile details.");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [navigate]);

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

  useEffect(() => {
    const onScroll = () => {
      setShowScrollTop(window.scrollY > 220);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleImageUpload = (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file || !formData) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        updateField({ ...formData, profile_image: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  const confirmStudentLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsLogoutDialogOpen(false);
    navigate("/login", { replace: true });
  };

  const handleSave = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    setError("");
    setSuccess("");

    const baseline = mapUserToFormData(profile || {});
    const validationErrors = getChangedFieldErrors(formData, baseline);
    setFieldErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setError("Please fix the highlighted fields.");
      return;
    }

    const payload = {};

    if (formData.full_name !== baseline.full_name) {
      payload.full_name = formData.full_name.trim();
    }
    if (formData.email !== baseline.email) {
      payload.email = formData.email.trim().toLowerCase();
    }
    if (formData.password) {
      payload.password = formData.password;
    }
    if (formData.age !== baseline.age) {
      payload.age = formData.age;
    }
    if (formData.gender !== baseline.gender) {
      payload.gender = formData.gender;
    }
    if (formData.education_level !== baseline.education_level) {
      payload.education_level = formData.education_level;
    }
    if (formData.address !== baseline.address) {
      payload.address = formData.address;
    }
    if (formData.phone_number !== baseline.phone_number) {
      payload.phone_number = formData.phone_number;
    }
    if (formData.favorite_subject !== baseline.favorite_subject) {
      payload.favorite_subject = formData.favorite_subject;
    }
    if (formData.favorite_field !== baseline.favorite_field) {
      payload.favorite_field = formData.favorite_field;
    }
    if (formData.profile_image !== baseline.profile_image) {
      payload.profile_image = formData.profile_image;
    }

    if (Object.keys(payload).length === 0) {
      setSuccess("No changes detected.");
      setIsEditMode(false);
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401 || response.status === 403 || response.status === 404) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
          return;
        }
        throw new Error(responseData.detail || "Failed to update profile.");
      }

      setProfile(responseData);
      const mapped = mapUserToFormData(responseData);
      setFormData(mapped);
      setFieldErrors(getFieldErrors(mapped));
      setTouchedFields({});
      localStorage.setItem("user", JSON.stringify(responseData));

      if (payload.email) {
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }

      setSuccess("Profile updated successfully.");
      setIsEditMode(false);
    } catch (err) {
      setError(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleQuizAnswerChange = (questionId, answer) => {
    const question = QUIZ_QUESTIONS.find((item) => item.id === questionId);

    setQuizAnswers((prev) => {
      if (question?.multiSelect) {
        const current = Array.isArray(prev[questionId]?.answers) ? prev[questionId].answers : [];
        const nextAnswers = current.includes(answer)
          ? current.filter((item) => item !== answer)
          : [...current, answer];

        const next = { ...prev };
        if (nextAnswers.length > 0) {
          next[questionId] = { answers: nextAnswers };
        } else {
          delete next[questionId];
        }
        return next;
      }

      const current = prev[questionId] || {};
      const next = { ...prev, [questionId]: { ...current, answer } };
      if (answer !== "Other") {
        next[questionId] = { answer };
      }
      return next;
    });
    setQuizErrors((prev) => {
      const next = { ...prev };
      delete next[questionId];
      delete next[`${questionId}_other`];
      return next;
    });
  };

  const handleQuizOtherChoice = (questionId, otherChoice) => {
    setQuizAnswers((prev) => ({
      ...prev,
      [questionId]: { ...(prev[questionId] || {}), answer: "Other", otherChoice },
    }));
    setQuizErrors((prev) => {
      const next = { ...prev };
      delete next[`${questionId}_other`];
      return next;
    });
  };

  const validateQuiz = () => {
    const nextErrors = {};

    QUIZ_QUESTIONS.forEach((question) => {
      const entry = quizAnswers[question.id];
      if (question.multiSelect) {
        if (!entry || !Array.isArray(entry.answers) || entry.answers.length === 0) {
          nextErrors[question.id] = "Please select at least one option.";
        }
        return;
      }

      if (!entry || !entry.answer) {
        nextErrors[question.id] = "Please select an answer.";
      }
    });

    return nextErrors;
  };

  const handleQuizSubmit = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const nextErrors = validateQuiz();
    setQuizErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      setIsQuizSubmitting(true);
      setError("");

      const response = await fetch(`${API_BASE_URL}/api/v1/quiz/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ answers: quizAnswers }),
      });

      const responseData = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
          return;
        }
        throw new Error(responseData.detail || "Failed to submit quiz.");
      }

      setQuizAnswers(responseData.answers || quizAnswers);
      setQuizSubmittedAt(responseData.submitted_at || "");
      setIsQuizSubmitted(true);

      setProfile((prev) => (prev ? { ...prev, quiz_submitted: true } : prev));
      setVerificationStatus((prev) => ({ ...(prev || {}), quiz_completed: true }));

      setIsQuizOpen(false);
      setIsQuizSummaryOpen(true);
      setSuccess("Quiz completed successfully. You can review or edit it anytime.");
    } catch (err) {
      setError(err.message || "Failed to submit quiz.");
    } finally {
      setIsQuizSubmitting(false);
    }
  };

  const getQuizAnswerDisplay = (question) => {
    const answer = quizAnswers[question.id];
    if (!answer) {
      return "Not answered";
    }
    if (question.multiSelect) {
      return Array.isArray(answer.answers) && answer.answers.length > 0 ? answer.answers.join(", ") : "Not answered";
    }
    return answer.answer || "Not answered";
  };

  if (loading) {
    return (
      <div className="min-h-screen app-shell-bg student-profile-premium professional-page-font">
        <CommonHeader alwaysVisible />
        <div className="max-w-7xl mx-auto p-6 md:p-10">
          <StudentPageLoader message="Loading profile..." />
        </div>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="min-h-screen app-shell-bg student-profile-premium professional-page-font">
        <CommonHeader user={profile} alwaysVisible />
        <div className="max-w-7xl mx-auto p-6 md:p-10">
          <StudentEmptyState
            title="Profile data is unavailable"
            description="Your profile could not be loaded. Try refreshing or logging in again."
            action={
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem("token");
                  localStorage.removeItem("user");
                  navigate("/login", { replace: true });
                }}
                className="modern-btn-primary px-4 py-2 rounded-xl"
              >
                Back to Login
              </button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-shell-bg student-profile-premium professional-page-font">
      <CommonHeader user={profile} alwaysVisible />

      <div className="max-w-7xl mx-auto p-6 md:p-10 grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="glass-panel p-6 rounded-2xl text-center lg:col-span-1">
          <div className="w-28 h-28 mx-auto bg-emerald-100 rounded-full mb-4 flex items-center justify-center text-2xl font-bold text-emerald-700 overflow-hidden ring-4 ring-emerald-50">
            {formData?.profile_image ? (
              <img src={formData.profile_image} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              (profile?.full_name || "U").charAt(0).toUpperCase()
            )}
          </div>

          {isEditMode && (
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-2">Update Profile Picture</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200"
              />
            </div>
          )}

          <h2 className="text-xl font-semibold">{profile?.full_name || "User"}</h2>
          <p className="text-sm text-gray-500 mb-4">{profile?.email || ""}</p>

          <div className={`text-left border rounded-xl p-4 mb-4 ${completionTheme.container}`}>
            <p className={`text-xs uppercase tracking-wide font-semibold ${completionTheme.label}`}>Profile Completion</p>
            <div className="mt-2 flex items-center justify-between">
              <p className={`text-2xl font-bold ${completionTheme.value}`}>{completionPercentage}%</p>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${completionTheme.badge}`}>
                {completionTheme.statusText}
              </span>
            </div>
            <div className={`w-full rounded-full h-2 mt-3 overflow-hidden ${completionTheme.progressTrack}`}>
              <div className={`h-2 rounded-full transition-all duration-500 ${completionTheme.progressBar}`} style={{ width: `${completionPercentage}%` }} />
            </div>
            <p className="text-xs text-gray-600 mt-2">
              {completionData.completed.length} completed • {completionData.missing.length} missing
            </p>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                setSuccess("");
                setError("");
                if (isEditMode && profile) {
                  const mapped = mapUserToFormData(profile);
                  setFormData(mapped);
                  setFieldErrors(getFieldErrors(mapped));
                  setTouchedFields({});
                }
                setIsEditMode((prev) => !prev);
              }}
              className="w-full modern-btn-secondary py-2.5 rounded-xl transition-colors"
            >
              {isEditMode ? "Cancel" : "Edit Profile"}
            </button>

            {isEditMode && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="w-full modern-btn-primary py-2.5 rounded-xl disabled:opacity-60 transition-colors"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsLogoutDialogOpen(true)}
              className="w-full modern-btn-warn py-2.5 rounded-xl transition-colors"
            >
              Logout
            </button>

            {isQuizSubmitted && (
              <button
                type="button"
                onClick={() => setIsQuizSummaryOpen(true)}
                className="w-full border border-emerald-300 text-emerald-700 py-2.5 rounded-xl hover:bg-emerald-50/80 transition-colors flex items-center justify-center gap-2 bg-white/60"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
                  <path d="M12 5C6.5 5 2 12 2 12s4.5 7 10 7 10-7 10-7-4.5-7-10-7zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" />
                </svg>
                Quiz Summary
              </button>
            )}

          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <StudentBanner type="error" message={error} />
          <StudentBanner type="success" message={success} />

          <section className="glass-panel p-6 rounded-2xl">
            <h3 className="modern-section-title border-l-4 border-green-600 pl-3">Profile Completion Tracker</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4">
                <p className="text-sm font-semibold text-emerald-800">Completed Fields</p>
                <ul className="mt-2 space-y-1 text-sm text-emerald-700">
                  {completionData.completed.map((fieldName) => (
                    <li key={`done-${normalizeChecklistField(fieldName)}`}>• {fieldName}</li>
                  ))}
                  {completionData.completed.length === 0 && <li className="text-gray-500">No fields completed yet.</li>}
                </ul>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4">
                <p className="text-sm font-semibold text-amber-800">Missing Fields</p>
                <ul className="mt-2 space-y-1 text-sm text-amber-700">
                  {completionData.missing.map((fieldName) => (
                    <li key={`missing-${normalizeChecklistField(fieldName)}`}>• {fieldName}</li>
                  ))}
                  {completionData.missing.length === 0 && <li className="text-gray-500">All tracked fields are completed.</li>}
                </ul>
              </div>
            </div>
          </section>

          <section className="glass-panel p-6 rounded-2xl space-y-4">
            <h3 className="modern-section-title border-l-4 border-green-600 pl-3">Basic Information</h3>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Full Name</label>
              <input
                className="w-full modern-input"
                value={formData?.full_name || ""}
                disabled={!isEditMode}
                onFocus={() => markTouched("full_name")}
                onChange={(e) => updateField({ ...formData, full_name: e.target.value })}
              />
              {touchedFields.full_name && fieldErrors.full_name && <p className="text-xs text-red-600 mt-1">{fieldErrors.full_name}</p>}
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Email</label>
              <input
                className="w-full modern-input"
                value={formData?.email || ""}
                disabled={!isEditMode}
                onFocus={() => markTouched("email")}
                onChange={(e) => updateField({ ...formData, email: e.target.value })}
              />
              {touchedFields.email && fieldErrors.email && <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>}
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Password</label>
              <input
                type="password"
                className="w-full modern-input"
                value={formData?.password || ""}
                disabled={!isEditMode}
                placeholder={isEditMode ? "Enter new password" : "********"}
                onFocus={() => {
                  markTouched("password");
                  setIsPasswordFocused(true);
                }}
                onBlur={() => setIsPasswordFocused(false)}
                onChange={(e) => updateField({ ...formData, password: e.target.value })}
              />
              <div className={`text-xs mt-1 grid grid-cols-2 gap-x-4 gap-y-1 ${showPasswordRules ? "" : "hidden"}`}>
                <p className={showPasswordRules ? (passwordChecks.minLength ? "text-green-600" : "text-red-600") : "text-gray-500"}>At least 8 characters needed</p>
                <p className={showPasswordRules ? (passwordChecks.hasUpper ? "text-green-600" : "text-red-600") : "text-gray-500"}>Uppercase letters</p>
                <p className={showPasswordRules ? (passwordChecks.hasLower ? "text-green-600" : "text-red-600") : "text-gray-500"}>Lowercase letters</p>
                <p className={showPasswordRules ? (passwordChecks.hasNumber ? "text-green-600" : "text-red-600") : "text-gray-500"}>Numbers</p>
                <p className={showPasswordRules ? (passwordChecks.hasSpecial ? "text-green-600" : "text-red-600") : "text-gray-500"}>Special characters</p>
                <p className={showPasswordRules ? (passwordChecks.noSpaces ? "text-green-600" : "text-red-600") : "text-gray-500"}>No spaces</p>
              </div>
              {touchedFields.password && fieldErrors.password && <p className="text-xs text-red-600 mt-1">{fieldErrors.password}</p>}
            </div>
          </section>

          <section className="glass-panel p-6 rounded-2xl space-y-4">
            <h3 className="modern-section-title border-l-4 border-green-600 pl-3">Profile Management</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Age</label>
                <select
                  className="w-full modern-input"
                  value={formData?.age || ""}
                  disabled={!isEditMode}
                  onChange={(e) => updateField({ ...formData, age: e.target.value })}
                >
                  <option value="">Select age</option>
                  <option value="18-25">18-25</option>
                  <option value="26-35">26-35</option>
                  <option value="36-45">36-45</option>
                  <option value="46-55">46-55</option>
                  <option value="56+">56+</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Gender</label>
                <select
                  className="w-full modern-input"
                  value={formData?.gender || ""}
                  disabled={!isEditMode}
                  onChange={(e) => updateField({ ...formData, gender: e.target.value })}
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Education Level</label>
                <select
                  className="w-full modern-input"
                  value={formData?.education_level || ""}
                  disabled={!isEditMode}
                  onChange={(e) => updateField({ ...formData, education_level: e.target.value })}
                >
                  <option value="">Select education level</option>
                  <option value="High school">High school</option>
                  <option value="Diploma">Diploma</option>
                  <option value="Bachelor's degree">Bachelor's degree</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Phone Number</label>
                <input
                  className="w-full modern-input"
                  value={formData?.phone_number || ""}
                  disabled={!isEditMode}
                  placeholder="Enter 10-digit phone number"
                  maxLength={10}
                  onFocus={() => markTouched("phone_number")}
                  onChange={(e) => {
                    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
                    updateField({ ...formData, phone_number: digitsOnly });
                  }}
                />
                {touchedFields.phone_number && fieldErrors.phone_number && <p className="text-xs text-red-600 mt-1">{fieldErrors.phone_number}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Address</label>
              <textarea
                className="w-full modern-input"
                value={formData?.address || ""}
                disabled={!isEditMode}
                placeholder="Enter address"
                onChange={(e) => updateField({ ...formData, address: e.target.value })}
              />
            </div>
          </section>

          <section className="glass-panel p-6 rounded-2xl space-y-4">
            <h3 className="modern-section-title border-l-4 border-green-600 pl-3">Skills and Preferences</h3>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Categories</label>
                <select
                  className="w-full modern-input"
                  value={formData?.favorite_subject || ""}
                  disabled={!isEditMode}
                  onChange={(e) => updateField({ ...formData, favorite_subject: e.target.value })}
                >
                  <option value="">Select category</option>
                  <option value="Software Engineering">Software Engineering</option>
                  <option value="Data Science / AI">Data Science / AI</option>
                  <option value="UI/UX Design">UI/UX Design</option>
                  <option value="Cybersecurity">Cybersecurity</option>
                  <option value="Networking & Cloud">Networking & Cloud</option>
                </select>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => {
                  if (!isProfileReady) {
                    setSuccess("");
                    setError("Please fully complete the profile to take quiz.");
                    return;
                  }
                  setQuizErrors({});
                  setIsQuizOpen(true);
                }}
                className="modern-btn-primary px-4 py-2.5 rounded-xl transition-colors"
              >
                {isQuizSubmitted ? "Edit Quiz" : "Take the quiz"}
              </button>
              {!isProfileReady && (
                <p className="text-xs text-red-600 mt-2">
                  Please fully complete the profile to take quiz.
                </p>
              )}
              {isQuizSubmitted && (
                <button
                  type="button"
                  onClick={() => setIsQuizSummaryOpen(true)}
                  className="ml-3 bg-white/70 border border-emerald-300 text-emerald-700 px-4 py-2.5 rounded-xl hover:bg-emerald-50 transition-colors"
                >
                  View Quiz Summary
                </button>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white/70 p-4">
              <p className="text-sm font-semibold text-slate-800 mb-3">Verification Stages</p>
              <div className="flex items-center justify-between gap-2">
                {stageProgress.map((stage, index) => (
                  <React.Fragment key={stage.id}>
                    <div className="flex flex-col items-center min-w-[60px]">
                      <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-semibold ${stage.done ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white border-slate-300 text-slate-600"}`}>
                        {stage.id}
                      </div>
                      <span className="text-[10px] text-slate-600 mt-1">{stage.label}</span>
                    </div>
                    {index < stageProgress.length - 1 && (
                      <div className={`flex-1 h-[2px] ${stageProgress[index].done ? "bg-emerald-500" : "bg-slate-300"}`} />
                    )}
                  </React.Fragment>
                ))}
              </div>

              {isQuizSubmittedForGate && (
                <button
                  type="button"
                  onClick={() => navigate("/skill-verification")}
                  className="mt-4 w-full modern-btn-primary py-2 rounded-xl"
                >
                  Step 2
                </button>
              )}
            </div>
          </section>
        </div>
      </div>

      {isQuizOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto glass-panel rounded-2xl">
            <div className="sticky top-0 bg-white/90 backdrop-blur border-b border-emerald-100 p-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Career Quiz</h3>
                <p className="text-sm italic text-gray-600 mt-1">"This quiz is designed to assess your skills, interests, and preferences in order to recommend the most suitable IT career path for you."</p>
              </div>
              <button
                type="button"
                onClick={() => setIsQuizOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100/80"
              >
                Close
              </button>
            </div>

            <div className="p-5 space-y-6">
              {QUIZ_QUESTIONS.map((question) => {
                const currentAnswer = quizAnswers[question.id] || {};
                const selectedValues = Array.isArray(currentAnswer.answers) ? currentAnswer.answers : [];

                return (
                  <div key={question.id} className="p-4 rounded-xl border border-emerald-100 bg-white/80">
                    <p className="text-xs font-semibold tracking-wide text-emerald-700 mb-1">{question.category}</p>
                    <p className="text-sm font-semibold text-gray-800 mb-3">{question.label}</p>
                    {question.multiSelect && (
                      <p className="text-xs text-gray-500 mb-3">You can choose multiple selections.</p>
                    )}

                    <div className="space-y-2">
                      {question.options.map((option) => {
                        const isChecked = question.multiSelect
                          ? selectedValues.includes(option)
                          : currentAnswer.answer === option;

                        return (
                          <label key={option} className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type={question.multiSelect ? "checkbox" : "radio"}
                              name={question.id}
                              value={option}
                              checked={isChecked}
                              onChange={() => handleQuizAnswerChange(question.id, option)}
                              className="accent-emerald-600"
                            />
                            {option}
                          </label>
                        );
                      })}
                    </div>

                    {currentAnswer.answer === "Other" && question.otherOptions && (
                      <div className="mt-3">
                        <label className="block text-xs text-gray-600 mb-1">Select one option</label>
                        <select
                          value={currentAnswer.otherChoice || ""}
                          onChange={(e) => handleQuizOtherChoice(question.id, e.target.value)}
                          className="w-full modern-input"
                        >
                          <option value="">Choose an option</option>
                          {question.otherOptions.map((otherOption) => (
                            <option key={otherOption} value={otherOption}>
                              {otherOption}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {quizErrors[question.id] && <p className="text-xs text-red-600 mt-2">{quizErrors[question.id]}</p>}
                    {quizErrors[`${question.id}_other`] && <p className="text-xs text-red-600 mt-2">{quizErrors[`${question.id}_other`]}</p>}
                  </div>
                );
              })}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleQuizSubmit}
                  disabled={isQuizSubmitting}
                  className="modern-btn-primary px-5 py-2.5 rounded-xl transition-colors"
                >
                  {isQuizSubmitting ? "Submitting..." : "Submit Quiz"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isQuizSummaryOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto glass-panel rounded-2xl">
            <div className="sticky top-0 bg-white/90 backdrop-blur border-b border-emerald-100 p-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Quiz Summary</h3>
                {quizSubmittedAt && (
                  <p className="text-xs text-gray-500 mt-1">Submitted: {new Date(quizSubmittedAt).toLocaleString()}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsQuizSummaryOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100/80"
              >
                Close
              </button>
            </div>

            <div className="p-5 space-y-4">
              {QUIZ_QUESTIONS.map((question) => (
                <div key={question.id} className="p-4 rounded-xl border border-gray-100 bg-white/75">
                  <p className="text-xs font-semibold tracking-wide text-emerald-700 mb-1">{question.category}</p>
                  <p className="text-sm font-semibold text-gray-800">{question.label}</p>
                  <p className="text-sm text-gray-600 mt-2">{getQuizAnswerDisplay(question)}</p>
                </div>
              ))}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (!isProfileReady) {
                      setSuccess("");
                      setError("Please fully complete the profile to take quiz.");
                      setIsQuizSummaryOpen(false);
                      return;
                    }
                    setIsQuizSummaryOpen(false);
                    setQuizErrors({});
                    setIsQuizOpen(true);
                  }}
                  className="modern-btn-primary px-4 py-2 rounded-xl transition-colors"
                >
                  Edit Quiz
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLogoutDialogOpen && (
        <div className="admin-dialog-overlay">
          <div className="admin-dialog-card rounded-2xl">
            <h3 className="text-lg font-bold text-slate-900">Confirm Logout</h3>
            <p className="text-sm text-slate-600 mt-2">Are you sure you want to log out?</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsLogoutDialogOpen(false)}
                className="admin-lite-btn admin-lite-btn-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmStudentLogout}
                className="admin-lite-btn admin-lite-btn-danger"
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chatbot Icon - Fixed Position */}
      {showScrollTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-24 right-8 w-12 h-12 rounded-full transition-all flex items-center justify-center z-40 scroll-top-fab"
          title="Go to top"
          aria-label="Go to top"
        >
          <span className="scroll-top-fab-icon">&#8593;</span>
        </button>
      )}

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
