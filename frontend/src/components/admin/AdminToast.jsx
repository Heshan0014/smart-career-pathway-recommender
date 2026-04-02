import React, { useEffect } from "react";

export default function AdminToast({ type = "error", message = "", onClose }) {
  useEffect(() => {
    if (!message) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      onClose();
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [message, onClose]);

  if (!message) {
    return null;
  }

  const isSuccess = type === "success";
  const containerClass = isSuccess
    ? "bg-emerald-600/95 border-emerald-400"
    : "bg-rose-600/95 border-rose-400";

  return (
    <div className={`fixed top-5 right-5 z-[100] min-w-[280px] max-w-sm border text-white rounded-xl shadow-2xl ${containerClass}`}>
      <div className="px-4 py-3 flex items-start justify-between gap-3">
        <p className="text-sm leading-relaxed">{message}</p>
        <button
          type="button"
          onClick={onClose}
          className="text-white/90 hover:text-white text-lg leading-none"
          aria-label="Close popup"
        >
          ×
        </button>
      </div>
    </div>
  );
}
