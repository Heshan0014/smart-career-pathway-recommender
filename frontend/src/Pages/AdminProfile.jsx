import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../components/admin/AdminLayout";
import AdminToast from "../components/admin/AdminToast";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8001";

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

export default function AdminProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ type: "error", message: "" });

  const currentUser = useMemo(() => parseUser(), []);

  const forceLogout = useCallback((message) => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    navigate("/login", { replace: true, state: { errorMessage: message || "Session expired." } });
  }, [navigate]);

  const buildHeaders = useCallback((includeJson = false) => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      forceLogout("Please login again.");
      return null;
    }

    return includeJson
      ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
      : { Authorization: `Bearer ${token}` };
  }, [forceLogout]);

  const getValidationErrors = (data) => {
    const next = {};

    if (!data.full_name || data.full_name.trim().length < 2) {
      next.full_name = "Full name must be at least 2 characters.";
    }

    if (!isValidEmail(data.email || "")) {
      next.email = "Please enter a valid email address.";
    }

    if (data.phone_number && !isValidPhoneNumber(data.phone_number)) {
      next.phone_number = "Phone number must have exactly 10 digits.";
    }

    if (data.password && !isValidPassword(data.password)) {
      next.password = "Password must be 8-128 chars with upper, lower, number, special and no spaces.";
    }

    return next;
  };

  const loadProfile = useCallback(async () => {
    const headers = buildHeaders();
    if (!headers) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/me`, { headers });

      if (response.status === 401 || response.status === 403) {
        forceLogout("Your admin session has expired.");
        return;
      }

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.detail || "Failed to load admin profile.");
      }

      const mapped = {
        full_name: payload.full_name || "",
        email: payload.email || "",
        phone_number: payload.phone_number || "",
        address: payload.address || "",
        profile_image: payload.profile_image || "",
        password: "",
      };

      setProfile(payload);
      setFormData(mapped);
      setErrors({});
    } catch (err) {
      setToast({ type: "error", message: err.message || "Failed to load admin profile." });
    } finally {
      setLoading(false);
    }
  }, [buildHeaders, forceLogout]);

  useEffect(() => {
    if (currentUser?.user_role !== "ADMIN") {
      forceLogout("Admin access is required.");
      return;
    }

    loadProfile();
  }, [currentUser?.user_role, forceLogout, loadProfile]);

  const handleImageUpload = (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file || !formData) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setFormData((prev) => ({ ...prev, profile_image: reader.result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    const validationErrors = getValidationErrors(formData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setToast({ type: "error", message: "Please fix validation errors before saving." });
      return;
    }

    const headers = buildHeaders(true);
    if (!headers) {
      return;
    }

    const baseline = {
      full_name: profile?.full_name || "",
      email: profile?.email || "",
      phone_number: profile?.phone_number || "",
      address: profile?.address || "",
      profile_image: profile?.profile_image || "",
    };

    const payload = {};

    if (formData.full_name.trim() !== baseline.full_name) {
      payload.full_name = formData.full_name.trim();
    }
    if (formData.email.trim().toLowerCase() !== baseline.email) {
      payload.email = formData.email.trim().toLowerCase();
    }
    if (formData.phone_number.trim() !== baseline.phone_number) {
      payload.phone_number = formData.phone_number.trim();
    }
    if (formData.address !== baseline.address) {
      payload.address = formData.address;
    }
    if (formData.profile_image !== baseline.profile_image) {
      payload.profile_image = formData.profile_image;
    }

    if (formData.password) {
      payload.password = formData.password;
    }

    if (Object.keys(payload).length === 0) {
      setToast({ type: "success", message: "No changes detected." });
      setIsEditMode(false);
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/me`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(payload),
      });

      if (response.status === 401 || response.status === 403) {
        forceLogout("Your admin session has expired.");
        return;
      }

      const responseData = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(responseData.detail || responseData.message || "Failed to update admin profile.");
      }

      const updatedUser = {
        ...(parseUser() || {}),
        full_name: responseData.full_name,
        email: responseData.email,
        phone_number: responseData.phone_number,
        profile_image: responseData.profile_image,
      };
      try {
        localStorage.setItem("user", JSON.stringify(updatedUser));
      } catch (storageError) {
        // Ignore storage quota errors so successful API updates are not shown as failed saves.
      }

      setProfile(responseData);
      setFormData((prev) => ({
        ...prev,
        full_name: responseData.full_name || "",
        email: responseData.email || "",
        phone_number: responseData.phone_number || "",
        address: responseData.address || "",
        profile_image: responseData.profile_image || "",
        password: "",
      }));
      setIsEditMode(false);
      setToast({ type: "success", message: "Admin profile updated successfully." });
    } catch (err) {
      setToast({ type: "error", message: err.message || "Failed to update admin profile." });
    } finally {
      setSaving(false);
    }
  };

  const passwordChecks = getPasswordChecks(formData?.password || "");

  return (
    <AdminLayout
      user={parseUser()}
      title="My Profile"
      subtitle="Manage your admin identity, contact information, and security settings."
      actions={
        <button
          type="button"
          className="admin-lite-btn admin-lite-btn-primary"
          onClick={() => {
            if (isEditMode && profile) {
              setFormData({
                full_name: profile.full_name || "",
                email: profile.email || "",
                phone_number: profile.phone_number || "",
                address: profile.address || "",
                profile_image: profile.profile_image || "",
                password: "",
              });
              setErrors({});
            }
            setIsEditMode((prev) => !prev);
          }}
          disabled={loading}
        >
          {isEditMode ? "Cancel" : "Edit Profile"}
        </button>
      }
    >
      <AdminToast type={toast.type} message={toast.message} onClose={() => setToast({ type: "error", message: "" })} />

      <section className="admin-lite-card rounded-2xl p-5 md:p-6">
        {loading || !formData ? (
          <p className="text-sm text-slate-600">Loading admin profile...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-1 space-y-3">
              <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-slate-200 bg-slate-100 flex items-center justify-center text-2xl font-bold text-slate-700">
                {formData.profile_image ? (
                  <img src={formData.profile_image} alt="Admin" className="w-full h-full object-cover" />
                ) : (
                  (formData.full_name || "A").charAt(0).toUpperCase()
                )}
              </div>

              {isEditMode && (
                <div>
                  <label className="block text-xs text-slate-500 mb-2">Profile Picture</label>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="block w-full text-sm text-slate-600" />
                </div>
              )}
            </div>

            <div className="md:col-span-2 space-y-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.full_name}
                  disabled={!isEditMode}
                  onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))}
                  className="admin-lite-input"
                />
                {errors.full_name && <p className="text-xs text-rose-600 mt-1">{errors.full_name}</p>}
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  disabled={!isEditMode}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className="admin-lite-input"
                />
                {errors.email && <p className="text-xs text-rose-600 mt-1">{errors.email}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone_number}
                    disabled={!isEditMode}
                    maxLength={10}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone_number: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                    className="admin-lite-input"
                  />
                  {errors.phone_number && <p className="text-xs text-rose-600 mt-1">{errors.phone_number}</p>}
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">New Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    disabled={!isEditMode}
                    placeholder="Leave blank to keep current"
                    onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                    className="admin-lite-input"
                  />
                  {errors.password && <p className="text-xs text-rose-600 mt-1">{errors.password}</p>}
                  {isEditMode && formData.password && (
                    <div className="text-[11px] text-slate-500 mt-2 grid grid-cols-2 gap-1">
                      <span className={passwordChecks.minLength ? "text-emerald-600" : "text-rose-600"}>8+ chars</span>
                      <span className={passwordChecks.hasUpper ? "text-emerald-600" : "text-rose-600"}>Uppercase</span>
                      <span className={passwordChecks.hasLower ? "text-emerald-600" : "text-rose-600"}>Lowercase</span>
                      <span className={passwordChecks.hasNumber ? "text-emerald-600" : "text-rose-600"}>Number</span>
                      <span className={passwordChecks.hasSpecial ? "text-emerald-600" : "text-rose-600"}>Special</span>
                      <span className={passwordChecks.noSpaces ? "text-emerald-600" : "text-rose-600"}>No spaces</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">Address</label>
                <textarea
                  value={formData.address}
                  disabled={!isEditMode}
                  onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                  className="admin-lite-input min-h-[92px]"
                />
              </div>

              {isEditMode && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="admin-lite-btn admin-lite-btn-primary disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </AdminLayout>
  );
}
