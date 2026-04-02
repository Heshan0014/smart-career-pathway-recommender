import React, { useCallback, useEffect, useState } from "react";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8001";

export default function MessageModal({ isOpen, onClose, user }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [token, setToken] = useState("");
  const [activeTab, setActiveTab] = useState("inbox");
  const [messages, setMessages] = useState([]);
  const [messagesLoaded, setMessagesLoaded] = useState(false);

  useEffect(() => {
    const authToken = localStorage.getItem("token");
    setToken(authToken || "");
  }, []);

  const parseErrorMessage = useCallback(async (response) => {
    const responseText = await response.text();
    try {
      const errorData = JSON.parse(responseText);
      return errorData.error || errorData.message || `Failed (${response.status})`;
    } catch {
      return responseText || `Failed (${response.status})`;
    }
  }, []);

  const markRepliesAsRead = useCallback(async () => {
    if (!token) return;

    try {
      await fetch(`${API_BASE_URL}/api/v1/messages/my-mark-read`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error("Error marking student replies as read:", error);
    }
  }, [token]);

  const loadMessages = useCallback(async () => {
    if (!token) return;

    setLoadingMessages(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/messages/my-messages?page=0&size=20`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.content || []);
        setMessagesLoaded(true);
        await markRepliesAsRead();
      } else if (response.status === 401) {
        setError("Please login to system to view messages");
      } else {
        setError(await parseErrorMessage(response));
      }
    } catch (err) {
      setError(err.message || "Error loading messages");
    } finally {
      setLoadingMessages(false);
    }
  }, [token, markRepliesAsRead, parseErrorMessage]);

  useEffect(() => {
    if (!isOpen) return;

    setError("");
    setSuccess("");
    setMessage("");
    setActiveTab("inbox");

    if (token) {
      loadMessages();
    }
  }, [isOpen, token, loadMessages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!message.trim()) {
      setError("Please enter a message");
      return;
    }

    if (!token) {
      setError("Please login to system to send message");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/messages/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: message.trim() }),
      });

      if (response.ok) {
        setSuccess("Message sent successfully!");
        setMessage("");
        await loadMessages();
        setActiveTab("inbox");
      } else if (response.status === 401) {
        setError("Please login to system to send message");
      } else {
        setError(await parseErrorMessage(response));
      }
    } catch (err) {
      setError(err.message || "Error sending message");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getStatusLabel = (item) => {
    if (item.adminReply) {
      return "Replied";
    }
    if (item.isRead) {
      return "Seen";
    }
    return "Pending";
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
      ></div>

      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-3xl px-4">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Messages</h2>
              <p className="text-sm text-emerald-50">View replies from admin and send a new message</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-white hover:text-emerald-100 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="border-b border-slate-200 px-6 pt-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("inbox")}
                className={`px-4 py-2 rounded-t-lg text-sm font-semibold transition ${activeTab === "inbox" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                My Messages
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("send")}
                className={`px-4 py-2 rounded-t-lg text-sm font-semibold transition ${activeTab === "send" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                Send New Message
              </button>
            </div>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                ✓ {success}
              </div>
            )}

            {activeTab === "inbox" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Your Messages</h3>
                    <p className="text-sm text-slate-500">Replies from admin will appear here</p>
                  </div>
                  <button
                    type="button"
                    onClick={loadMessages}
                    disabled={loadingMessages || !token}
                    className="px-3 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition disabled:opacity-50"
                  >
                    {loadingMessages ? "Loading..." : "Refresh"}
                  </button>
                </div>

                {!token ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-600">
                    Please login to system to view messages.
                  </div>
                ) : loadingMessages && !messagesLoaded ? (
                  <div className="py-10 text-center text-slate-600">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-600">
                    No messages found yet. Send your first message to admin.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[46vh] overflow-y-auto pr-1">
                    {messages.map((item) => (
                      <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-slate-900">Message #{item.id}</p>
                              <span className={`text-xs px-2 py-1 rounded-full ${item.adminReply ? "bg-emerald-100 text-emerald-700" : item.isRead ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-700"}`}>
                                {getStatusLabel(item)}
                              </span>
                            </div>
                            <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{item.studentMessage}</p>
                            <p className="text-xs text-slate-500 mt-2">Sent on {new Date(item.createdAt).toLocaleString()}</p>
                          </div>
                        </div>

                        {item.adminReply ? (
                          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Admin reply</p>
                            <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{item.adminReply}</p>
                            <p className="text-xs text-slate-500 mt-2">Replied on {new Date(item.repliedAt).toLocaleString()}</p>
                          </div>
                        ) : (
                          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">
                            No reply yet.
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Your Message
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message here..."
                    rows={6}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                    disabled={loading}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending...
                      </>
                    ) : (
                      "Send Message"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
