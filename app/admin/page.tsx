"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from '@/lib/i18n';
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminMemberDirectory } from "@/components/admin/admin-member-directory";
import { AdminNewsManager } from "@/components/admin/admin-news-manager";
import { AdminPaymentReport } from "@/components/admin/admin-payment-report";
import { AdminClassManager } from "@/components/admin/admin-class-manager";
import { AdminProposalManager } from "@/components/admin/admin-proposal-manager";
import { AdminReferenceManager } from "@/components/admin/admin-reference-manager";
import { AdminEventManager } from "@/components/admin/admin-event-manager";
import { AdminFinanceDashboard } from "@/components/admin/admin-finance-dashboard";
import { AdminPremiumManager } from "@/components/admin/admin-premium-manager";
import { PaymentUpgradeModal } from "@/components/admin/payment-upgrade-modal";
import { DuplicateReviewCard } from "@/components/admin/duplicate-review-card";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { ToastNotification, useToasts } from "@/components/ui/toast-notification";
import { Member } from "@/types";

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
  potential_duplicate_of?: string;
  duplicate_note?: string;
  phone?: string;
  expertise?: string;
  bio?: string;
  country?: string;
  gender?: string;
  birth_year?: string;
  nickname?: string;
  facebook_url?: string;
  linkedin_url?: string;
  company_website?: string;
  can_help_with?: string;
  looking_for?: string;
  relationship_status?: string;
}

export default function AdminPage() {
  const { status } = useSession();
  const { t } = useTranslation();
  const router = useRouter();
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [activeTab, setActiveTab] = useState<"pending" | "duplicates" | "status" | "directory" | "news" | "payments" | "premium" | "classes" | "proposals" | "references" | "events" | "finance">("pending");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingExpiry, setEditingExpiry] = useState<string | null>(null);
  const [expiryValue, setExpiryValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [upgradeTarget, setUpgradeTarget] = useState<{ id: string; name: string } | null>(null);
  const [editingMember, setEditingMember] = useState<AdminMember | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const { toasts, showToast, dismissToast } = useToasts();
  const [pendingPaymentCount, setPendingPaymentCount] = useState(0);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string; message: string; variant: 'danger' | 'warning' | 'info';
    confirmLabel: string; onConfirm: () => void;
  } | null>(null);

  const showConfirm = useCallback((opts: typeof confirmDialog) => setConfirmDialog(opts), []);
  const closeConfirm = useCallback(() => setConfirmDialog(null), []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchMembers();
      fetch("/api/admin/payments").then(r => r.ok ? r.json() : null).then(d => {
        if (d?.pending_payments) setPendingPaymentCount(d.pending_payments.length);
      }).catch(() => {});
    }
  }, [status, router]);

  const fetchMembers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/members");
      if (!res.ok) {
        if (res.status === 401) {
          setError(t.admin.unauthorized);
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
      showToast(t.admin.pending.approveSuccess, "success");
      await fetchMembers();
    } catch {
      showToast(t.admin.pending.approveFailed);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = (id: string) => {
    showConfirm({
      title: t.admin.pending.rejectTitle,
      message: t.admin.pending.rejectConfirm,
      variant: "danger",
      confirmLabel: t.admin.actions.reject,
      onConfirm: async () => {
        closeConfirm();
        setActionLoading(id);
        try {
          const res = await fetch("/api/admin/reject", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ memberId: id }),
          });
          if (!res.ok) throw new Error("Failed to reject");
          showToast(t.admin.pending.rejectSuccess, "success");
          await fetchMembers();
        } catch {
          showToast(t.admin.pending.rejectFailed);
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const handleTierChange = (id: string, currentPaid: boolean, memberName: string) => {
    const newTier = currentPaid ? "basic" : "premium";

    if (newTier === "premium") {
      setUpgradeTarget({ id, name: memberName });
      return;
    }

    executeTierChange(id, newTier);
  };

  const executeTierChange = async (
    id: string,
    tier: string,
    amount_vnd?: number,
    notes?: string
  ) => {
    setActionLoading(id);
    try {
      const res = await fetch("/api/admin/tier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: id, tier, amount_vnd, notes }),
      });
      if (!res.ok) throw new Error("Failed to change tier");
      await fetchMembers();
    } catch {
      showToast(t.admin.members.tierChangeFailed);
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
      showToast(t.admin.members.expiryUpdateFailed);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleAdmin = (id: string, currentIsAdmin: boolean) => {
    showConfirm({
      title: currentIsAdmin ? t.admin.members.removeAdmin : t.admin.members.grantAdmin,
      message: currentIsAdmin ? t.admin.members.removeAdminConfirm : t.admin.members.grantAdminConfirm,
      variant: currentIsAdmin ? "warning" : "info",
      confirmLabel: currentIsAdmin ? t.admin.actions.remove : t.admin.actions.confirm,
      onConfirm: async () => {
        closeConfirm();
        setActionLoading(id);
        try {
          const res = await fetch("/api/admin/toggle-admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ memberId: id, isAdmin: !currentIsAdmin }),
          });
          if (!res.ok) throw new Error("Failed to toggle admin");
          showToast(currentIsAdmin ? t.admin.members.adminRemoved : t.admin.members.adminGranted, "success");
          await fetchMembers();
        } catch {
          showToast(t.admin.members.adminToggleFailed);
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const handleClearDuplicateFlag = async (memberId: string) => {
    try {
      const res = await fetch("/api/admin/clear-duplicate-flag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });
      if (!res.ok) throw new Error("Failed to clear flag");
      await fetchMembers();
    } catch {
      showToast(t.admin.duplicates.clearFailed);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    try {
      const res = await fetch("/api/admin/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      showToast(t.admin.members.memberDeleted, "success");
      await fetchMembers();
    } catch {
      showToast(t.admin.members.deleteFailed);
    }
  };

  const handleEditMember = (member: AdminMember) => {
    setEditingMember(member);
    setEditForm({
      email: member.email || "",
      name: member.name || "",
      role: member.role || "",
      company: member.company || "",
      abg_class: member.abg_class || "",
      phone: member.phone || "",
      expertise: member.expertise || "",
      bio: member.bio || "",
      country: member.country || "",
      gender: member.gender || "",
      birth_year: member.birth_year || "",
      nickname: member.nickname || "",
      facebook_url: member.facebook_url || "",
      linkedin_url: member.linkedin_url || "",
      company_website: member.company_website || "",
      can_help_with: member.can_help_with || "",
      looking_for: member.looking_for || "",
      relationship_status: member.relationship_status || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingMember) return;
    try {
      const res = await fetch("/api/admin/update-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: editingMember.id, updates: editForm }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }
      setEditingMember(null);
      showToast(t.admin.members.memberUpdated, "success");
      await fetchMembers();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.admin.members.updateFailed);
    }
  };

  const pendingMembers = members.filter((m) => m.approval_status === "pending");
  const duplicateMembers = members.filter((m) => m.potential_duplicate_of);
  const filterBySearch = (list: AdminMember[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((m) =>
      m.name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.role?.toLowerCase().includes(q) ||
      m.company?.toLowerCase().includes(q) ||
      m.abg_class?.toLowerCase().includes(q)
    );
  };
  const displayMembers = filterBySearch(
    activeTab === "pending" ? pendingMembers : activeTab === "status" ? members : []
  );

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
          <h1 className="text-2xl font-bold text-red-600 mb-4">{t.admin.accessDenied}</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link href="/" className="text-blue-600 hover:underline">
            {t.admin.backToHome}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1400px] mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{t.admin.title}</h1>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
              {t.admin.backToApp}
            </Link>
          </div>
        </div>

        {/* Tab buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "pending"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
          >
            {t.admin.tabs.pending} ({pendingMembers.length})
          </button>
          <button
            onClick={() => setActiveTab("duplicates")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "duplicates"
              ? "bg-red-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
          >
            {t.admin.tabs.duplicates} {duplicateMembers.length > 0 && (
              <span className={`ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${activeTab === "duplicates" ? "bg-white text-red-600" : "bg-red-100 text-red-700"}`}>
                {duplicateMembers.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("status")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "status"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
          >
            {t.admin.tabs.memberStatus} ({members.length})
          </button>
          <button
            onClick={() => setActiveTab("directory")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "directory"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
          >
            {t.admin.tabs.directory}
          </button>
          <button
            onClick={() => setActiveTab("news")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "news"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
          >
            {t.admin.tabs.news}
          </button>
          <button
            onClick={() => setActiveTab("payments")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "payments"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
          >
            {t.admin.tabs.payments} ({pendingPaymentCount})
          </button>
          <button
            onClick={() => setActiveTab("premium")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "premium"
              ? "bg-purple-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
          >
            {t.admin.tabs.premium}
          </button>
          <button
            onClick={() => setActiveTab("proposals")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "proposals"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
          >
            {t.admin.tabs.proposals}
          </button>
          <button
            onClick={() => setActiveTab("references")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "references"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
          >
            {t.admin.tabs.references}
          </button>
          <button
            onClick={() => setActiveTab("events")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "events"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
          >
            {t.admin.tabs.events}
          </button>
          <button
            onClick={() => setActiveTab("finance")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "finance"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
          >
            {t.admin.tabs.finance}
          </button>
          <button
            onClick={() => setActiveTab("classes")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "classes"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
          >
            {t.admin.tabs.classes}
          </button>
        </div>

        {activeTab !== "directory" && activeTab !== "news" && activeTab !== "payments" && activeTab !== "premium" && activeTab !== "classes" && activeTab !== "duplicates" && activeTab !== "proposals" && activeTab !== "references" && activeTab !== "events" && (
          <div className="mb-4">
            <input
              type="text"
              placeholder={t.admin.members.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        {activeTab === "duplicates" ? (
          <div className="space-y-4">
            {duplicateMembers.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
                {t.admin.duplicates.noDuplicates}
              </div>
            ) : (
              duplicateMembers.map((dm) => {
                const existingMember = dm.potential_duplicate_of
                  ? members.find((m) => m.id === dm.potential_duplicate_of) || null
                  : null;
                return (
                  <DuplicateReviewCard
                    key={dm.id}
                    newMember={dm as unknown as Member}
                    existingMember={existingMember as unknown as Member | null}
                    onClearFlag={handleClearDuplicateFlag}
                    onDelete={handleDeleteMember}
                    onEdit={(m) => handleEditMember(m as unknown as AdminMember)}
                    onConfirmDelete={(member, proceed) => {
                      showConfirm({
                        title: t.admin.members.deleteMember,
                        message: t.admin.members.deleteConfirm.replace('{name}', member.name).replace('{email}', member.email),
                        variant: "danger",
                        confirmLabel: t.admin.actions.delete,
                        onConfirm: () => { closeConfirm(); proceed(); },
                      });
                    }}
                  />
                );
              })
            )}
          </div>
        ) : activeTab === "classes" ? (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <AdminClassManager />
          </div>
        ) : activeTab === "proposals" ? (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <AdminProposalManager />
          </div>
        ) : activeTab === "references" ? (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <AdminReferenceManager />
          </div>
        ) : activeTab === "events" ? (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <AdminEventManager />
          </div>
        ) : activeTab === "finance" ? (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <AdminFinanceDashboard />
          </div>
        ) : activeTab === "payments" ? (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <AdminPaymentReport />
          </div>
        ) : activeTab === "premium" ? (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <AdminPremiumManager />
          </div>
        ) : activeTab === "news" ? (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <AdminNewsManager />
          </div>
        ) : activeTab === "directory" ? (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <AdminMemberDirectory />
          </div>
        ) : (
          <>
            {/* Members table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-auto max-h-[70vh]">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="bg-gray-50 border-b sticky top-0 z-10">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                        {t.admin.labels.name}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                        {t.admin.labels.actions}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                        {t.admin.labels.tier}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                        {t.admin.labels.role}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                        {t.admin.labels.status}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                        {t.admin.labels.email}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                        {t.admin.labels.phone}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {displayMembers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                          {activeTab === "pending"
                            ? t.admin.pending.noApps
                            : t.admin.members.noMembers}
                        </td>
                      </tr>
                    ) : (
                      displayMembers.map((member, index) => (
                        <tr key={`${member.id}-${member.email}-${index}`} className="hover:bg-gray-50">
                          {/* Name */}
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900">{member.name}</p>
                              {member.abg_class && (
                                <p className="text-xs text-gray-500">{member.abg_class}</p>
                              )}
                            </div>
                          </td>
                          {/* Actions - stacked vertically */}
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={() => handleEditMember(member)}
                                className="text-sm text-gray-600 hover:text-gray-800"
                              >
                                {t.admin.actions.edit}
                              </button>
                              {member.approval_status === "pending" && (
                                <>
                                  <button
                                    onClick={() => handleApprove(member.id)}
                                    disabled={actionLoading === member.id}
                                    className="text-sm text-green-600 hover:text-green-800 disabled:opacity-50"
                                  >
                                    {actionLoading === member.id ? "..." : t.admin.actions.approve}
                                  </button>
                                  <button
                                    onClick={() => handleReject(member.id)}
                                    disabled={actionLoading === member.id}
                                    className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                                  >
                                    {t.admin.actions.reject}
                                  </button>
                                </>
                              )}
                              {member.approval_status === "approved" && (
                                <>
                                  <button
                                    onClick={() => handleTierChange(member.id, member.paid, member.name)}
                                    disabled={actionLoading === member.id}
                                    className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                                  >
                                    {actionLoading === member.id
                                      ? "..."
                                      : member.paid
                                        ? t.admin.members.downgrade
                                        : t.admin.members.upgrade}
                                  </button>
                                  <button
                                    onClick={() => handleToggleAdmin(member.id, member.is_admin)}
                                    disabled={actionLoading === member.id}
                                    className={`text-sm disabled:opacity-50 ${member.is_admin
                                      ? "text-orange-600 hover:text-orange-800"
                                      : "text-purple-600 hover:text-purple-800"
                                      }`}
                                  >
                                    {actionLoading === member.id
                                      ? "..."
                                      : member.is_admin
                                        ? t.admin.members.removeAdmin
                                        : t.admin.members.makeAdmin}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                          {/* Tier + Admin merged */}
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-1">
                              <span
                                className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${member.approval_status === "pending"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : member.paid
                                      ? "bg-purple-100 text-purple-800"
                                      : "bg-gray-100 text-gray-600"
                                  }`}
                              >
                                {member.approval_status === "pending" ? t.admin.tabs.pending : member.paid ? t.admin.labels.premium : t.admin.labels.basic}
                              </span>
                              {member.is_admin && member.approval_status === "approved" && (
                                <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  {t.admin.labels.admin}
                                </span>
                              )}
                            </div>
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
                                      {t.admin.actions.save}
                                    </button>
                                    <button
                                      onClick={() => setEditingExpiry(null)}
                                      className="text-xs text-gray-400 hover:text-gray-600"
                                    >
                                      {t.admin.actions.cancel}
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
                                    {t.admin.members.expiry} {new Date(member.membership_expiry).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                          {/* Role */}
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {member.role || "-"}
                            {member.company && (
                              <span className="text-gray-400"> at {member.company}</span>
                            )}
                          </td>
                          {/* Status */}
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${member.approval_status === "approved"
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
                                {t.admin.members.csv}
                              </span>
                            )}
                          </td>
                          {/* Email */}
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {member.email}
                          </td>
                          {/* Phone */}
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {member.phone ? (
                              <a href={`tel:${member.phone}`} className="text-blue-600 hover:underline">
                                {member.phone}
                              </a>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Stats summary */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-2xl font-bold text-gray-900">{members.length}</p>
                <p className="text-sm text-gray-500">{t.admin.members.totalMembers}</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-2xl font-bold text-yellow-600">{pendingMembers.length}</p>
                <p className="text-sm text-gray-500">{t.admin.members.pendingApproval}</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-2xl font-bold text-purple-600">
                  {members.filter((m) => m.paid).length}
                </p>
                <p className="text-sm text-gray-500">{t.admin.members.premiumMembers}</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-2xl font-bold text-red-600">
                  {members.filter((m) => m.is_admin).length}
                </p>
                <p className="text-sm text-gray-500">{t.admin.members.admins}</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-2xl font-bold text-orange-600">
                  {duplicateMembers.length}
                </p>
                <p className="text-sm text-gray-500">{t.admin.members.duplicates}</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-2xl font-bold text-gray-600">
                  {members.filter((m) => m.is_csv_imported).length}
                </p>
                <p className="text-sm text-gray-500">{t.admin.members.csvImported}</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">{t.admin.members.editMember}</h2>
              <p className="text-sm text-gray-500">{editingMember.name}</p>
            </div>
            <div className="px-6 py-4 space-y-3 overflow-y-auto">
              {/* Email field with warning */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.admin.labels.email}</label>
                <input
                  type="email"
                  value={editForm.email || ""}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {editForm.email && editForm.email !== editingMember?.email && (
                  <p className="mt-1 text-xs text-amber-600">
                    Member must log in with this new email after the change.
                  </p>
                )}
              </div>
              {([
                { key: "name", label: t.admin.labels.name },
                { key: "nickname", label: t.admin.form.nickname },
                { key: "role", label: t.admin.labels.role },
                { key: "company", label: t.admin.form.company },
                { key: "abg_class", label: t.admin.form.abgClass },
                { key: "phone", label: t.admin.labels.phone },
                { key: "expertise", label: t.admin.form.expertise },
                { key: "country", label: t.admin.form.country },
                { key: "gender", label: t.admin.form.gender },
                { key: "birth_year", label: t.admin.form.birthYear },
                { key: "relationship_status", label: t.admin.form.relationshipStatus },
                { key: "facebook_url", label: t.admin.form.facebookUrl },
                { key: "linkedin_url", label: t.admin.form.linkedinUrl },
                { key: "company_website", label: t.admin.form.companyWebsite },
              ] as const).map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    type="text"
                    value={editForm[key] || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              {/* Textarea fields */}
              {([
                { key: "bio", label: t.admin.form.bio },
                { key: "can_help_with", label: t.admin.form.canHelpWith },
                { key: "looking_for", label: t.admin.form.lookingFor },
              ] as const).map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <textarea
                    value={editForm[key] || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, [key]: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
                  />
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-2 shrink-0">
              <button
                onClick={() => setEditingMember(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                {t.admin.actions.cancel}
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                {t.admin.actions.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Upgrade Modal */}
      <PaymentUpgradeModal
        isOpen={!!upgradeTarget}
        memberName={upgradeTarget?.name || ""}
        onClose={() => setUpgradeTarget(null)}
        onConfirm={(amount, notes) => {
          if (upgradeTarget) {
            setUpgradeTarget(null);
            executeTierChange(upgradeTarget.id, "premium", amount, notes);
          }
        }}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        open={!!confirmDialog}
        title={confirmDialog?.title || ""}
        message={confirmDialog?.message || ""}
        variant={confirmDialog?.variant || "danger"}
        confirmLabel={confirmDialog?.confirmLabel || "Confirm"}
        onConfirm={() => confirmDialog?.onConfirm()}
        onCancel={closeConfirm}
      />

      {/* Toast Notifications */}
      <ToastNotification toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
