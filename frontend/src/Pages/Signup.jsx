import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import CommonHeader from "../components/CommonHeader";
import { StudentBanner, StudentInlineSpinner } from "../components/student/StudentStates";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8001";

export default function Signup() {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    confirm_password: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const navigate = useNavigate();

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

  const getFieldErrors = (data) => {
    const errors = {};

    if (data.full_name.trim().length < 2) {
      errors.full_name = "Full name must be at least 2 characters.";
    }
    if (!isValidEmail(data.email)) {
      errors.email = "Please enter a valid email address.";
    }
    if (!isValidPassword(data.password)) {
      errors.password = "Password must be 8 to 128 characters.";
    }
    if (!data.confirm_password) {
      errors.confirm_password = "Please confirm your password.";
    } else if (data.password !== data.confirm_password) {
      errors.confirm_password = "Passwords do not match.";
    }

    return errors;
  };

  const isFormReady = Object.keys(getFieldErrors(formData)).length === 0;
  const passwordChecks = getPasswordChecks(formData.password);
  const isPasswordValid = Object.values(passwordChecks).every(Boolean) && formData.password.length <= 128;
  const showPasswordRules = isPasswordFocused && !isPasswordValid;

  const updateField = (nextData) => {
    setError("");
    setFormData(nextData);
    setFieldErrors(getFieldErrors(nextData));
  };

  const markTouched = (fieldName) => {
    setTouchedFields((prev) => ({ ...prev, [fieldName]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const currentErrors = getFieldErrors(formData);
    setFieldErrors(currentErrors);
    if (Object.keys(currentErrors).length > 0) {
      setError("Please fix the highlighted fields.");
      return;
    }

    const payload = {
      full_name: formData.full_name.trim(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
      user_role: "STUDENT",
    };

    try {
      setIsSubmitting(true);
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        navigate("/login");
      } else {
        const errorPayload = await response.json().catch(() => ({}));
        setError(
          errorPayload.detail ||
            errorPayload.message ||
            errorPayload.error ||
            "Signup failed"
        );
      }
    } catch (err) {
      setError("Cannot connect to server. Please ensure backend is running.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-100">
      <CommonHeader alwaysVisible />
      <div className="flex items-center justify-center py-10 px-4">
        <div className="flex bg-white/95 backdrop-blur shadow-2xl rounded-3xl overflow-hidden w-[980px] border border-emerald-100">
          <div className="w-1/2 bg-gradient-to-br from-emerald-600 to-teal-700">
            <img
              src="/Images/signup.png"
              alt="Signup"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="w-1/2 p-10 md:p-12">
            <div className="w-12 h-1 rounded-full bg-emerald-500 mb-5" />

            <h2 className="text-left text-2xl font-bold text-gray-800 mb-2">Create your account</h2>

            <p className="text-left text-sm text-gray-500 mb-6">
              Register to start your smart career journey
            </p>

            <div className="mb-4">
              <StudentBanner type="error" message={error} />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Enter Full Name"
                value={formData.full_name}
                onChange={(e) => updateField({ ...formData, full_name: e.target.value })}
                onFocus={() => markTouched("full_name")}
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
                required
              />
              {touchedFields.full_name && fieldErrors.full_name && <p className="text-xs text-red-600 mt-1">{fieldErrors.full_name}</p>}

              <input
                type="email"
                placeholder="Enter Email"
                value={formData.email}
                onChange={(e) => updateField({ ...formData, email: e.target.value })}
                onFocus={() => markTouched("email")}
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
                required
              />
              {touchedFields.email && fieldErrors.email && <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>}

              <input
                type="password"
                placeholder="Enter Password"
                value={formData.password}
                onChange={(e) => updateField({ ...formData, password: e.target.value })}
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

              <input
                type="password"
                placeholder="Confirm Password"
                value={formData.confirm_password}
                onChange={(e) => updateField({ ...formData, confirm_password: e.target.value })}
                onFocus={() => markTouched("confirm_password")}
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
                required
              />
              {touchedFields.confirm_password && fieldErrors.confirm_password && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.confirm_password}</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !isFormReady}
                className={`w-full py-3 rounded-xl text-white font-semibold transition-colors disabled:opacity-60 ${
                  isFormReady ? "bg-emerald-600 hover:bg-emerald-700" : "bg-gray-400"
                }`}
              >
                {isSubmitting ? <StudentInlineSpinner label="Registering..." /> : "Register"}
              </button>
            </form>

            <p className="text-left mt-4 text-sm text-gray-500">
              Already have an account?{" "}
              <Link to="/login" className="text-emerald-700 font-semibold hover:underline">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
