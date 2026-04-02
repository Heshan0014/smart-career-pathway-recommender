import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../components/admin/AdminLayout";
import AdminToast from "../components/admin/AdminToast";

export default function AdminMessages() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [token, setToken] = useState("");
  const [toast, setToast] = useState({ visible: false, message: "", type: "info" });
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyModal, setReplyModal] = useState({ open: false, messageId: null });
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, message: null });

  const showToast = useCallback((message, type = "info") => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: "", type: "info" }), 3000);
  }, []);

  const loadMessages = useCallback(async (authToken, page) => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8001/api/v1/messages/admin/all?page=${page}&size=10`,
        {
          headers: {
            "Authorization": `Bearer ${authToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMessages(data.content || []);
        setTotalPages(data.totalPages || 1);
        setCurrentPage(page);
      } else {
        showToast("Failed to load messages", "error");
      }
    } catch (err) {
      showToast("Error loading messages: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadUnreadCount = useCallback(async (authToken) => {
    try {
      const response = await fetch(
        "http://localhost:8001/api/v1/messages/admin/unread-count",
        {
          headers: {
            "Authorization": `Bearer ${authToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const count = data.unreadCount || 0;
        setUnreadCount(count);
      }
    } catch (err) {
      console.error("Error loading unread count:", err);
    }
  }, []);

  useEffect(() => {
    const authToken = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    if (!authToken || user.user_role !== "ADMIN") {
      navigate("/login");
      return;
    }

    setToken(authToken);
    loadMessages(authToken, 0);
    loadUnreadCount(authToken);
  }, [navigate, loadMessages, loadUnreadCount]);

  const handleMarkAsRead = async (messageId) => {
    try {
      const response = await fetch(
        `http://localhost:8001/api/v1/messages/${messageId}/mark-read`,
        {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        // Update the message in the list
        setMessages(
          messages.map((m) =>
            m.id === messageId ? { ...m, isRead: true } : m
          )
        );
        loadUnreadCount(token);
        showToast("Message marked as read", "success");
      } else {
        showToast("Failed to mark as read", "error");
      }
    } catch (err) {
      showToast("Error: " + err.message, "error");
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      const response = await fetch(
        `http://localhost:8001/api/v1/messages/${messageId}`,
        {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setMessages(messages.filter((m) => m.id !== messageId));
        setSelectedMessage(null);
        setDeleteConfirm({ open: false, message: null });
        showToast("Message deleted", "success");
      } else {
        showToast("Failed to delete message", "error");
      }
    } catch (err) {
      showToast("Error: " + err.message, "error");
    }
  };

  const handleOpenReplyModal = async (messageId) => {
    setReplyModal({ open: true, messageId });
    setReplyText("");
    // Mark as read when opening reply modal
    await handleMarkAsRead(messageId);
  };

  const handleSendReply = async () => {
    if (!replyText.trim()) {
      showToast("Reply cannot be empty", "error");
      return;
    }

    setReplying(true);
    try {
      const response = await fetch(
        `http://localhost:8001/api/v1/messages/${replyModal.messageId}/reply`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({ reply: replyText.trim() }),
        }
      );

      if (response.ok) {
        const updatedMessage = await response.json();
        setMessages(
          messages.map((m) =>
            m.id === replyModal.messageId ? updatedMessage : m
          )
        );
        setReplyModal({ open: false, messageId: null });
        setReplyText("");
        showToast("Reply sent successfully", "success");
      } else {
        showToast("Failed to send reply", "error");
      }
    } catch (err) {
      showToast("Error: " + err.message, "error");
    } finally {
      setReplying(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Messages</h1>
            <p className="text-slate-600 mt-1">Manage student messages and support queries</p>
          </div>
          {unreadCount > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-red-700 font-semibold">{unreadCount} Unread Message{unreadCount !== 1 ? "s" : ""}</p>
            </div>
          )}
        </div>

        {/* Messages List */}
        <div className="bg-white rounded-lg border border-slate-200">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-slate-600">Loading messages...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-12 h-12 text-slate-400 mx-auto mb-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.5 5.5a7.5 7.5 0 0010.5 10.5z"
                />
              </svg>
              <p className="text-slate-600 font-medium">No messages yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-4 hover:bg-slate-50 transition cursor-pointer ${
                    !message.isRead ? "bg-blue-50" : ""
                  }`}
                  onClick={() => setSelectedMessage(message)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900 truncate">
                          {message.studentName}
                        </h3>
                        {!message.isRead && (
                          <span className="inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                        )}
                        {message.hasReply && (
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">
                            Replied
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">{message.studentEmail}</p>
                      <p className="text-sm text-slate-700 mt-2 line-clamp-2">
                        {message.studentMessage}
                      </p>
                      <p className="text-xs text-slate-500 mt-2">
                        {formatDate(message.createdAt)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenReplyModal(message.id);
                        }}
                        className="px-3 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 transition"
                      >
                        Reply
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm({ open: true, message });
                        }}
                        className="px-3 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition flex items-center gap-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166M18.16 5.789l-.114 1.508m-13.252 0c.34-.059.68-.114 1.022-.166m0 0l.114 1.508m0 0A48.39 48.39 0 0112 7.5c2.33 0 4.59.23 6.744.664M4.908 5.789a48.39 48.39 0 00-1.022.166m1.022-.166L5.02 7.297m0 0A48.37 48.37 0 0112 7.5c2.33 0 4.59.23 6.744.664m0 0l.114-1.508M9.26 9v9m5.48 0V9m-7.5-4.5h9A2.25 2.25 0 0119.5 6v.75m-15 0V6A2.25 2.25 0 016.75 3.75h10.5A2.25 2.25 0 0119.5 6v.75" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => loadMessages(token, currentPage - 1)}
              disabled={currentPage === 0}
              className="px-3 py-2 border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition"
            >
              Previous
            </button>
            <span className="text-sm text-slate-600">
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => loadMessages(token, currentPage + 1)}
              disabled={currentPage >= totalPages - 1}
              className="px-3 py-2 border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Message Detail Modal */}
      {selectedMessage && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={() => setSelectedMessage(null)}
          ></div>
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="bg-white rounded-lg shadow-2xl">
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Message Details</h2>
                <button
                  type="button"
                  onClick={() => setSelectedMessage(null)}
                  className="text-white hover:text-gray-200 transition"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-6 h-6"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                {/* Student Info */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <h3 className="font-semibold text-slate-900 mb-2">From Student</h3>
                  <p className="text-slate-700">{selectedMessage.studentName}</p>
                  <p className="text-sm text-slate-600">{selectedMessage.studentEmail}</p>
                </div>

                {/* Original Message */}
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Message</h3>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-slate-700 whitespace-pre-wrap">{selectedMessage.studentMessage}</p>
                    <p className="text-xs text-slate-500 mt-2">
                      Sent on {formatDate(selectedMessage.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Admin Reply (if exists) */}
                {selectedMessage.adminReply && (
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">Your Reply</h3>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                      <p className="text-slate-700 whitespace-pre-wrap">{selectedMessage.adminReply}</p>
                      <p className="text-xs text-slate-500 mt-2">
                        Replied on {formatDate(selectedMessage.repliedAt)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Reply Form (if not already replied) */}
                {!selectedMessage.adminReply && (
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">Send Reply</h3>
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your reply here..."
                      rows={4}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                      disabled={replying}
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setSelectedMessage(null)}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition"
                  >
                    Close
                  </button>
                  {!selectedMessage.adminReply && (
                    <button
                      type="button"
                      onClick={handleSendReply}
                      disabled={replying || !replyText.trim()}
                      className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {replying ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Sending...
                        </>
                      ) : (
                        "Send Reply"
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {deleteConfirm.open && deleteConfirm.message && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={() => setDeleteConfirm({ open: false, message: null })}
          ></div>
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[60] w-full max-w-md px-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900">Confirm Delete</h3>
              <p className="text-sm text-slate-600 mt-2">Are you sure want to delete message?</p>
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Student</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">{deleteConfirm.message.studentName}</p>
                <p className="text-xs text-slate-500">{deleteConfirm.message.studentEmail}</p>
                <p className="text-sm text-slate-700 mt-3 line-clamp-3">{deleteConfirm.message.studentMessage}</p>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm({ open: false, message: null })}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteMessage(deleteConfirm.message.id)}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Toast Notification */}
      <AdminToast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
      />
    </AdminLayout>
  );
}
