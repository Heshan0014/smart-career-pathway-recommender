import React from "react";

export default function AppLoader() {
  return (
    <div className="app-loader-screen" role="status" aria-live="polite" aria-label="Loading screen">
      <div className="app-loader-card">
        <div className="app-loader-brand-chip" aria-label="NextStep IT brand">
          <div className="app-loader-brand-logo" aria-hidden="true">N</div>
          <p className="app-loader-brand-text">NextStep IT</p>
        </div>
        <div className="app-loader-spinner" aria-hidden="true" />
      </div>
    </div>
  );
}
