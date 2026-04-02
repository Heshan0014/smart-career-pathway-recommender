import React from "react";
import { Navigate } from "react-router-dom";

function parseUser() {
  const raw = localStorage.getItem("user");
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
  const token = localStorage.getItem("token");
  const user = parseUser();

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ errorMessage: "Please login as admin to continue." }} />;
  }

  if (user.user_role !== "ADMIN") {
    return <Navigate to="/dashboard" replace state={{ errorMessage: "Admin access only." }} />;
  }

  return children;
}
