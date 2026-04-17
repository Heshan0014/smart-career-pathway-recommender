import React from "react";
import { Navigate } from "react-router-dom";

const normalizeRole = (value) => (typeof value === "string" ? value.trim().toUpperCase() : "");

function parseUser() {
  const raw = sessionStorage.getItem("user");
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

export default function AdminRoute({ children }) {
  const token = sessionStorage.getItem("token");
  const user = parseUser();
  const role = normalizeRole(user?.user_role || user?.userRole);

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ errorMessage: "Please login as admin to continue." }} />;
  }

  if (role !== "ADMIN") {
    return <Navigate to="/dashboard" replace state={{ errorMessage: "Admin access only." }} />;
  }

  return children;
}
