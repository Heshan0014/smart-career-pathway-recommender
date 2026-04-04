import React from "react";

/**
 * CertificateDisplay Component
 * Shows completed certificates in an attractive grid layout with status badges
 */
export function CertificateDisplay({ certificates = [] }) {
  const verificationStatusBadge = (status) => {
    const badges = {
      verified: {
        bg: "bg-emerald-100",
        text: "text-emerald-700",
        icon: "✓",
        label: "Verified",
      },
      pending: {
        bg: "bg-amber-100",
        text: "text-amber-700",
        icon: "⏳",
        label: "Pending Review",
      },
      rejected: {
        bg: "bg-red-100",
        text: "text-red-700",
        icon: "✗",
        label: "Rejected",
      },
    };
    return badges[status] || badges.pending;
  };

  if (!certificates || certificates.length === 0) {
    return (
      <div className="student-empty-state">
        <svg
          className="w-12 h-12 mx-auto text-gray-300 mb-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h4 className="student-empty-state-title">No Certificates Yet</h4>
        <p className="student-empty-state-desc">
          Complete courses and submit certificates to track your learning journey
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {certificates.map((cert, idx) => {
          const badge = verificationStatusBadge(cert.status || "pending");
          const issuedDate = new Date(cert.issued_date).toLocaleDateString();
          const expiryDate = cert.expiry_date ? new Date(cert.expiry_date).toLocaleDateString() : null;

          return (
            <div
              key={idx}
              className="border border-slate-200 rounded-xl p-5 bg-white hover:shadow-lg transition-shadow duration-300"
            >
              {/* Certificate Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900 text-sm">{cert.title}</h4>
                  <p className="text-xs text-slate-500 mt-1">{cert.provider}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 whitespace-nowrap ${badge.bg} ${badge.text}`}>
                  <span>{badge.icon}</span>
                  <span>{badge.label}</span>
                </span>
              </div>

              {/* Certificate Thumbnail/Icon */}
              {cert.certificate_url ? (
                <div className="relative w-full h-32 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg mb-3 overflow-hidden flex items-center justify-center border border-amber-200">
                  <img
                    src={cert.certificate_url}
                    alt={cert.title}
                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
                </div>
              ) : (
                <div className="relative w-full h-32 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg mb-3 flex items-center justify-center border border-blue-200">
                  <svg className="w-12 h-12 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
                  </svg>
                </div>
              )}

              {/* Certificate Details */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Issued:</span>
                  <span className="text-slate-900 font-medium">{issuedDate}</span>
                </div>
                {expiryDate && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Expires:</span>
                    <span className="text-slate-900 font-medium">{expiryDate}</span>
                  </div>
                )}
                {cert.score && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Score:</span>
                    <span className="text-emerald-600 font-semibold">{cert.score}%</span>
                  </div>
                )}
              </div>

              {/* View Certificate Link */}
              {cert.certificate_url && (
                <a
                  href={cert.certificate_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 block w-full text-center py-2 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-xs font-semibold"
                >
                  View Certificate →
                </a>
              )}
            </div>
          );
        })}
      </div>

      {/* Certificate Stats */}
      <div className="grid grid-cols-3 gap-3 mt-6 pt-4 border-t border-slate-200">
        <div className="text-center">
          <p className="text-2xl font-bold text-emerald-600">
            {certificates.filter((c) => c.status === "verified").length}
          </p>
          <p className="text-xs text-slate-600 mt-1">Verified</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-amber-600">
            {certificates.filter((c) => c.status === "pending").length}
          </p>
          <p className="text-xs text-slate-600 mt-1">Pending</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-slate-600">{certificates.length}</p>
          <p className="text-xs text-slate-600 mt-1">Total</p>
        </div>
      </div>
    </div>
  );
}
