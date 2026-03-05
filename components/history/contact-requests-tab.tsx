"use client";

import { useEffect, useState } from "react";
import { MemberAvatar } from "@/components/ui/member-avatar";

interface ContactRequestItem {
  id: string;
  requester_id: string;
  target_id: string;
  message: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  responded_at?: string;
  direction: "sent" | "received";
  other_name: string;
  other_avatar?: string;
}

const statusConfig = {
  pending: { label: "Pending", classes: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  accepted: { label: "Accepted", classes: "bg-green-100 text-green-800 border-green-200" },
  declined: { label: "Declined", classes: "bg-red-100 text-red-800 border-red-200" },
};

export function ContactRequestsTab() {
  const [requests, setRequests] = useState<ContactRequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/contact/list")
      .then((res) => res.json())
      .then((data) => setRequests(data.requests || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="py-8 text-center text-gray-400 text-sm">Loading...</div>;
  }

  const sent = requests.filter((r) => r.direction === "sent");
  const received = requests.filter((r) => r.direction === "received");

  if (requests.length === 0) {
    return (
      <div className="py-8 text-center text-gray-400">
        <p className="text-sm">No contact requests yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sent.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            Sent
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {sent.length}
            </span>
          </h3>
          <div className="space-y-3">
            {sent.map((r) => (
              <RequestCard key={r.id} request={r} />
            ))}
          </div>
        </div>
      )}
      {received.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            Received
            <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {received.length}
            </span>
          </h3>
          <div className="space-y-3">
            {received.map((r) => (
              <RequestCard key={r.id} request={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RequestCard({ request }: { request: ContactRequestItem }) {
  const { label, classes } = statusConfig[request.status];

  return (
    <div className={`border border-gray-100 rounded-xl p-4 shadow-sm ${
      request.status !== "pending" ? "opacity-60 bg-gray-50" : "bg-white hover:shadow-md transition-shadow"
    }`}>
      <div className="flex items-center gap-3">
        <MemberAvatar
          name={request.other_name}
          avatarUrl={request.other_avatar}
          size="sm"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 truncate">
              {request.other_name}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${classes}`}>
              {label}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 line-clamp-1">{request.message}</p>
          <p className="text-xs text-gray-400 mt-1">
            {new Date(request.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
