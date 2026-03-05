"use client";

import { useState } from "react";

interface ContactRequestModalProps {
  targetId: string;
  targetName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DEFAULT_MESSAGE = "Xin chào! Tôi muốn kết nối với bạn qua ABG Alumni Connect.";

export function ContactRequestModal({ targetId, targetName, isOpen, onClose, onSuccess }: ContactRequestModalProps) {
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/contact/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send request");
        return;
      }
      setSuccess(true);
      setTimeout(() => onSuccess(), 1500);
    } catch {
      setError("Failed to send request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          Contact {targetName}
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Your contact info will only be shared if they accept.
        </p>

        {success ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-700">
            Request sent! They will receive an email notification.
          </div>
        ) : (
          <>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Write a message..."
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{message.length}/500</p>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600 mt-2">
                {error}
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !message.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? "Sending..." : "Send Request"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
