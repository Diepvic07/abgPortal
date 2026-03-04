"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminMemberDirectory } from "@/components/admin/admin-member-directory";

interface AdminMember {
  id: string;
  name: string;
  email: string;
  role: string;
  company: string;
  approval_status: "pending" | "approved" | "rejected";
  paid: boolean;
  is_csv_imported: boolean;
  is_admin: boolean;
  created_at: string;
  abg_class?: string;
  membership_expiry?: string;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [activeTab, setActiveTab] = useState<"pending" | "status" | "directory">("pending");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingExpiry, setEditingExpiry] = useState<string | null>(null);
  const [expiryValue, setExpiryValue] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchMembers();
    }
  }, [status, router]);

  const fetchMembers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/members");
      if (!res.ok) {
        if (res.status === 401) {
          setError("Unauthorized. Admin access required.");
          return;
        }
        throw new Error("Failed to fetch members");
      }
      const data = await res.json();
      setMembers(data.members || []);
    } catch {
      setError("Failed to load members");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch("/api/admin/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: id }),
      });
      if (!res.ok) throw new Error("Failed to approve");
      await fetchMembers();
    } catch {
      alert("Failed to approve member");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Are you sure you want to reject and remove this member? This action cannot be undone.")) {
      return;
    }
    setActionLoading(id);
    try {
      const res = await fetch("/api/admin/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: id }),
      });
      if (!res.ok) throw new Error("Failed to reject");
      await fetchMembers();
    } catch {
      alert("Failed to reject member");
    } finally {
      setActionLoading(null);
    }
  };

  const handleTierChange = async (id: string, currentPaid: boolean) => {
    const newTier = currentPaid ? "basic" : "premium";
    setActionLoading(id);
    try {
      const res = await fetch("/api/admin/tier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: id, tier: newTier }),
      });
      if (!res.ok) throw new Error("Failed to change tier");
      await fetchMembers();
    } catch {
      alert("Failed to change tier");
    } finally {
      setActionLoading(null);
    }
  };

  const handleExpiryUpdate = async (id: string) => {
    if (!expiryValue) return;
    setActionLoading(id);
    try {
      const res = await fetch("/api/admin/tier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: id, tier: "premium", membershipExpiry: expiryValue }),
      });
      if (!res.ok) throw new Error("Failed to update expiry");
      setEditingExpiry(null);
      setExpiryValue("");
      await fetchMembers();
    } catch {
      alert("Failed to update expiry date");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleAdmin = async (id: string, currentIsAdmin: boolean) => {
    const action = currentIsAdmin ? "remove admin privileges from" : "grant admin privileges to";
    if (!confirm(`Are you sure you want to ${action} this member?`)) {
      return;
    }
    setActionLoading(id);
    try {
      const res = await fetch("/api/admin/toggle-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: id, isAdmin: !currentIsAdmin }),
      });
      if (!res.ok) throw new Error("Failed to toggle admin");
      await fetchMembers();
    } catch {
      alert("Failed to toggle admin status");
    } finally {
      setActionLoading(null);
    }
  };

  const pendingMembers = members.filter((m) => m.approval_status === "pending");
  const displayMembers = activeTab === "pending" ? pendingMembers : activeTab === "status" ? members : [];

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link href="/" className="text-blue-600 hover:underline">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
              Back to App
            </Link>
          </div>
        </div>

        {/* Tab buttons */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "pending"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            Pending ({pendingMembers.length})
          </button>
          <button
            onClick={() => setActiveTab("status")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "status"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            Member Status ({members.length})
          </button>
          <button
            onClick={() => setActiveTab("directory")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "directory"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            Member Directory
          </button>
        </div>

        {activeTab === "directory" ? (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <AdminMemberDirectory />
          </div>
        ) : (
        <>
        {/* Members table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                    Tier
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                    Admin
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayMembers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      {activeTab === "pending"
                        ? "No pending applications"
                        : "No members found"}
                    </td>
                  </tr>
                ) : (
                  displayMembers.map((member, index) => (
                    <tr key={`${member.id}-${member.email}-${index}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{member.name}</p>
                          {member.abg_class && (
                            <p className="text-xs text-gray-500">{member.abg_class}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {member.email}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {member.role || "-"}
                        {member.company && (
                          <span className="text-gray-400"> at {member.company}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            member.approval_status === "approved"
                              ? "bg-green-100 text-green-800"
                              : member.approval_status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {member.approval_status}
                        </span>
                        {member.is_csv_imported && (
                          <span className="ml-1 inline-flex px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                            CSV
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            member.paid
                              ? "bg-purple-100 text-purple-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {member.paid ? "Premium" : "Basic"}
                        </span>
                        {member.paid && member.membership_expiry && (
                          <div className="mt-1">
                            {editingExpiry === member.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="date"
                                  value={expiryValue}
                                  onChange={(e) => setExpiryValue(e.target.value)}
                                  className="text-xs border rounded px-1 py-0.5 w-28"
                                />
                                <button
                                  onClick={() => handleExpiryUpdate(member.id)}
                                  disabled={actionLoading === member.id}
                                  className="text-xs text-green-600 hover:text-green-800"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingExpiry(null)}
                                  className="text-xs text-gray-400 hover:text-gray-600"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingExpiry(member.id);
                                  setExpiryValue(new Date(member.membership_expiry!).toISOString().split("T")[0]);
                                }}
                                className="text-xs text-gray-400 hover:text-gray-600"
                                title="Click to edit expiry date"
                              >
                                Exp: {new Date(member.membership_expiry).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {member.is_admin ? (
                          <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Admin
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {member.approval_status === "pending" && (
                            <>
                              <button
                                onClick={() => handleApprove(member.id)}
                                disabled={actionLoading === member.id}
                                className="text-sm text-green-600 hover:text-green-800 disabled:opacity-50"
                              >
                                {actionLoading === member.id ? "..." : "Approve"}
                              </button>
                              <button
                                onClick={() => handleReject(member.id)}
                                disabled={actionLoading === member.id}
                                className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {member.approval_status === "approved" && (
                            <>
                              <button
                                onClick={() => handleTierChange(member.id, member.paid)}
                                disabled={actionLoading === member.id}
                                className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                              >
                                {actionLoading === member.id
                                  ? "..."
                                  : member.paid
                                  ? "Downgrade"
                                  : "Upgrade"}
                              </button>
                              <button
                                onClick={() => handleToggleAdmin(member.id, member.is_admin)}
                                disabled={actionLoading === member.id}
                                className={`text-sm disabled:opacity-50 ${
                                  member.is_admin
                                    ? "text-orange-600 hover:text-orange-800"
                                    : "text-purple-600 hover:text-purple-800"
                                }`}
                              >
                                {actionLoading === member.id
                                  ? "..."
                                  : member.is_admin
                                  ? "Remove Admin"
                                  : "Make Admin"}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stats summary */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-2xl font-bold text-gray-900">{members.length}</p>
            <p className="text-sm text-gray-500">Total Members</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-2xl font-bold text-yellow-600">{pendingMembers.length}</p>
            <p className="text-sm text-gray-500">Pending Approval</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-2xl font-bold text-purple-600">
              {members.filter((m) => m.paid).length}
            </p>
            <p className="text-sm text-gray-500">Premium Members</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-2xl font-bold text-red-600">
              {members.filter((m) => m.is_admin).length}
            </p>
            <p className="text-sm text-gray-500">Admins</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-2xl font-bold text-gray-600">
              {members.filter((m) => m.is_csv_imported).length}
            </p>
            <p className="text-sm text-gray-500">CSV Imported</p>
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
}
