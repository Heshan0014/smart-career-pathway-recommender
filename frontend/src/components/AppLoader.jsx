import React from "react";

export default function AppLoader() {
  return (
    <div className="app-loader-screen" role="status" aria-live="polite" aria-label="Loading screen">
      <div className="app-loader-content">
        <div className="app-loader-brand-chip-large" aria-label="NextStep IT brand">
          <div className="app-loader-brand-logo-large" aria-hidden="true">N</div>
          <p className="app-loader-brand-text-large">NextStep IT</p>
        </div>
        <div className="app-loader-spinner-large" aria-hidden="true" />
      </div>
    </div>
  );
}
