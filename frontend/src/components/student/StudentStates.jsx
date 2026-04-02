import React from "react";

function StudentInlineSpinner({ label = "Loading..." }) {
  return (
    <span className="student-inline-spinner-wrap" role="status" aria-live="polite">
      <span className="student-inline-spinner" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

function StudentPageLoader({ message = "Loading..." }) {
  return (
    <div className="student-page-loader" role="status" aria-live="polite">
      <span className="student-page-loader-spinner" aria-hidden="true" />
      <p className="student-page-loader-text">{message}</p>
    </div>
  );
}

function StudentBanner({ type = "info", message }) {
  if (!message) {
    return null;
  }

  const typeToClass = {
    info: "student-banner student-banner-info",
    error: "student-banner student-banner-error",
    success: "student-banner student-banner-success",
    warning: "student-banner student-banner-warning",
  };

  return <div className={typeToClass[type] || typeToClass.info}>{message}</div>;
}

function StudentEmptyState({ title, description, action }) {
  return (
    <div className="student-empty-state">
      <h3 className="student-empty-state-title">{title}</h3>
      <p className="student-empty-state-desc">{description}</p>
      {action ? <div className="student-empty-state-action">{action}</div> : null}
    </div>
  );
}

export { StudentInlineSpinner, StudentPageLoader, StudentBanner, StudentEmptyState };
