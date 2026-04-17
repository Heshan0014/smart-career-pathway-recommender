import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import CommonHeader from "../components/CommonHeader";
import { StudentBanner, StudentInlineSpinner } from "../components/student/StudentStates";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8001";

const normalizeRole = (value) => (typeof value === "string" ? value.trim().toUpperCase() : "");

const getUserRole = (user) => normalizeRole(user?.user_role || user?.userRole);

export default function Login() {
  const location = useLocation();
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    if (location.state?.errorMessage) {
      setError(location.state.errorMessage);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  const getPasswordChecks = (value) => ({
    minLength: value.length >= 8,
    hasUpper: /[A-Z]/.test(value),
    hasLower: /[a-z]/.test(value),
    hasNumber: /\d/.test(value),
    hasSpecial: /[^A-Za-z0-9\s]/.test(value),
    noSpaces: !/\s/.test(value),
  });

  const isValidPassword = (value) => {
    const checks = getPasswordChecks(value);
    return Object.values(checks).every(Boolean) && value.length <= 128;
  };

  const getFieldErrors = (emailValue, passwordValue) => {
    const errors = {};
    if (!isValidEmail(emailValue)) {
      errors.email = "Please enter a valid email address.";
    }
    if (!isValidPassword(passwordValue)) {
      errors.password = "Password must be 8 to 128 characters.";
    }
    return errors;
  };

  const isFormReady = Object.keys(getFieldErrors(email, password)).length === 0;
  const passwordChecks = getPasswordChecks(password);
  const isPasswordValid = Object.values(passwordChecks).every(Boolean) && password.length <= 128;
  const showPasswordRules = isPasswordFocused && !isPasswordValid;

  const markTouched = (fieldName) => {
    setTouchedFields((prev) => ({ ...prev, [fieldName]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const currentErrors = getFieldErrors(email, password);
    setFieldErrors(currentErrors);
    if (Object.keys(currentErrors).length > 0) {
      setError("Please fix the highlighted fields.");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          user_role: isAdminMode ? "ADMIN" : "STUDENT",
        }),
      });

      if (response.ok) {
        const data = await response.json();

        const returnedRole = getUserRole(data?.user);
        if (!isAdminMode && returnedRole === "ADMIN") {
          sessionStorage.removeItem("token");
          sessionStorage.removeItem("user");
          setError("Admins must sign in using Admin Login only.");
          return;
        }

        if (isAdminMode && returnedRole !== "ADMIN") {
          sessionStorage.removeItem("token");
          sessionStorage.removeItem("user");
          setError("This account is not an admin account.");
          return;
        }

        sessionStorage.setItem("token", data.access_token);
        sessionStorage.setItem("user", JSON.stringify(data.user));
        navigate(returnedRole === "ADMIN" ? "/admin/dashboard" : "/dashboard", {
          replace: true,
          state: { showAppLoader: true },
        });
      } else {
        const payload = await response.json().catch(() => ({}));
        setError(payload.detail || "Invalid email or password");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-100">
      <CommonHeader alwaysVisible />
      
      {/* Top Tab Navigation */}
      <div className="flex justify-center gap-3 pt-6 px-4">
        <button
          type="button"
          onClick={() => {
            setIsAdminMode(false);
            setError("");
            setEmail("");
            setPassword("");
            setFieldErrors({});
            setTouchedFields({});
          }}
          className={`px-8 py-3 rounded-full font-semibold transition-all ${
            !isAdminMode
              ? "bg-emerald-600 text-white shadow-lg scale-105"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Student Login
        </button>
        <button
          type="button"
          onClick={() => {
            setIsAdminMode(true);
            setError("");
            setEmail("");
            setPassword("");
            setFieldErrors({});
            setTouchedFields({});
          }}
          className={`px-8 py-3 rounded-full font-semibold transition-all ${
            isAdminMode
              ? "bg-red-600 text-white shadow-lg scale-105"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Admin Login
        </button>
      </div>

      <div className="flex items-center justify-center py-10 px-4">
        {/* ===== STUDENT LOGIN VIEW ===== */}
        {!isAdminMode && (
          <div className="flex bg-white/95 backdrop-blur shadow-2xl rounded-3xl overflow-hidden w-full max-w-4xl border border-emerald-100">
            {/* Left Side - Welcome Section */}
            <div className="w-1/2 flex items-center justify-center bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-10">
              <div className="max-w-xs">
                <p className="uppercase tracking-[0.2em] text-xs text-emerald-100 mb-3">Smart Career</p>
                <h3 className="text-3xl font-bold leading-tight mb-3">Welcome Back to Your Career Hub</h3>
                <p className="text-sm text-emerald-100 mb-6">
                  Sign in to continue with personalized recommendations, quiz progress, and career insights.
                </p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-white/15 rounded-xl p-3">Personal Dashboard</div>
                  <div className="bg-white/15 rounded-xl p-3">Saved Roadmaps</div>
                  <div className="bg-white/15 rounded-xl p-3">Skill Growth</div>
                  <div className="bg-white/15 rounded-xl p-3">Action Goals</div>
                </div>
              </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-1/2 p-10 md:p-12">
              <div className="w-12 h-1 rounded-full bg-emerald-500 mb-5" />

              <h2 className="text-left text-2xl font-bold text-gray-800 mb-2">
                Sign in to your account
              </h2>

              <p className="text-left text-sm text-gray-500 mb-6">
                Please login to continue
              </p>

              <div className="mb-4">
                <StudentBanner type="error" message={error} />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
                <input
                  type="email"
                  name="student_email"
                  autoComplete="off"
                  placeholder="Enter Email"
                  value={email}
                  onChange={(e) => {
                    setError("");
                    const value = e.target.value;
                    setEmail(value);
                    setFieldErrors(getFieldErrors(value, password));
                  }}
                  onFocus={() => markTouched("email")}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  required
                />
                {touchedFields.email && fieldErrors.email && <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>}

                <input
                  type="password"
                  name="student_password"
                  autoComplete="new-password"
                  placeholder="Enter Password"
                  value={password}
                  onChange={(e) => {
                    setError("");
                    const value = e.target.value;
                    setPassword(value);
                    setFieldErrors(getFieldErrors(email, value));
                  }}
                  onFocus={() => {
                    markTouched("password");
                    setIsPasswordFocused(true);
                  }}
                  onBlur={() => setIsPasswordFocused(false)}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  required
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

                <div className="text-right text-xs text-gray-500 cursor-pointer">
                  Forgot Password
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !isFormReady}
                  className={`w-full py-3 rounded-xl text-white font-semibold transition-colors disabled:opacity-60 ${
                    isFormReady ? "bg-emerald-600 hover:bg-emerald-700" : "bg-gray-400"
                  }`}
                >
                  {isSubmitting ? <StudentInlineSpinner label="Logging in..." /> : "Login"}
                </button>
              </form>
              <div className="text-left mt-4 text-sm text-gray-500">
                Don't have an account?{" "}
                <Link to="/signup" className="text-emerald-700 font-semibold hover:underline">
                  Sign up
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ===== ADMIN LOGIN VIEW ===== */}
        {isAdminMode && (
          <div className="flex bg-white/95 backdrop-blur shadow-2xl rounded-3xl overflow-hidden w-full max-w-4xl border-2 border-red-300">
            {/* Left Side - Admin Info */}
            <div className="w-1/2 flex items-center justify-center bg-gradient-to-br from-red-600 to-orange-600 text-white p-10 relative">
              <div className="absolute top-6 right-6 bg-red-800 px-4 py-2 rounded-lg text-xs font-bold border border-red-400">
                🔒 RESTRICTED ACCESS
              </div>
              <div className="max-w-xs">
                <p className="uppercase tracking-[0.2em] text-xs text-red-100 mb-3">Administrator Portal</p>
                <h3 className="text-3xl font-bold leading-tight mb-3">Secure Admin Access</h3>
                <p className="text-sm text-red-100 mb-6">
                  Authorized administrators only. All access attempts are monitored and logged for security.
                </p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-white/15 rounded-xl p-3">User Management</div>
                  <div className="bg-white/15 rounded-xl p-3">Analytics</div>
                  <div className="bg-white/15 rounded-xl p-3">System Settings</div>
                  <div className="bg-white/15 rounded-xl p-3">Audit Logs</div>
                </div>
              </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-1/2 p-10 md:p-12">
              <div className="w-12 h-1 rounded-full bg-red-600 mb-5" />

              <h2 className="text-left text-2xl font-bold text-gray-800 mb-2">
                Administrator Login
              </h2>

              <p className="text-left text-sm text-gray-500 mb-6">
                Enter your admin credentials to access the control panel
              </p>

              {/* Security Warning */}
              <div className="bg-orange-50 border-l-4 border-orange-500 rounded-lg p-4 mb-6">
                <p className="text-xs font-semibold text-orange-800 flex items-center gap-2">
                  <span className="text-lg">⚠️</span> AUTHORIZED PERSONNEL ONLY
                </p>
                <p className="text-xs text-orange-700 mt-2">
                  Unauthorized access attempts are logged and subject to legal action.
                </p>
              </div>

              <div className="mb-4">
                <StudentBanner type="error" message={error} />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
                <input
                  type="email"
                  name="admin_email"
                  autoComplete="off"
                  placeholder="Admin Email"
                  value={email}
                  onChange={(e) => {
                    setError("");
                    const value = e.target.value;
                    setEmail(value);
                    setFieldErrors(getFieldErrors(value, password));
                  }}
                  onFocus={() => markTouched("email")}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400"
                  required
                />
                {touchedFields.email && fieldErrors.email && <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>}

                <input
                  type="password"
                  name="admin_password"
                  autoComplete="new-password"
                  placeholder="Admin Password"
                  value={password}
                  onChange={(e) => {
                    setError("");
                    const value = e.target.value;
                    setPassword(value);
                    setFieldErrors(getFieldErrors(email, value));
                  }}
                  onFocus={() => {
                    markTouched("password");
                    setIsPasswordFocused(true);
                  }}
                  onBlur={() => setIsPasswordFocused(false)}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400"
                  required
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

                <button
                  type="submit"
                  disabled={isSubmitting || !isFormReady}
                  className={`w-full py-3 rounded-xl text-white font-semibold transition-colors disabled:opacity-60 ${
                    isFormReady ? "bg-red-600 hover:bg-red-700" : "bg-gray-400"
                  }`}
                >
                  {isSubmitting ? <StudentInlineSpinner label="Authenticating..." /> : "Access Admin Panel"}
                </button>
              </form>
              <div className="text-center mt-4 text-xs text-gray-500 w-full">
                All login attempts are recorded for security auditing purposes.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}