"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "@/lib/i18n";
import { PaymentUpgradeModal } from "./payment-upgrade-modal";

interface PaymentRecord {
  id: string;
  member_id: string;
  amount_vnd: number;
  admin_id: string;
  notes?: string;
  created_at: string;
}

interface PremiumMember {
  id: string;
  name: string;
  email: string;
  abg_class?: string;
  phone?: string;
  role?: string;
  company?: string;
  paid: boolean;
  payment_status: string;
  membership_expiry?: string;
  created_at: string;
  public_profile_slug?: string;
  avatar_url?: string;
  payments: PaymentRecord[];
  total_paid: number;
  payment_count: number;
}

interface DuplicateGroup {
  member_id: string;
  member_name: string;
  member_email: string;
  amount_vnd: number;
  payments: PaymentRecord[];
}

interface PremiumResponse {
  members: PremiumMember[];
  duplicate_transactions: DuplicateGroup[];
  stats: {
    total_premium: number;
    total_revenue: number;
    total_payments: number;
    expiring_soon: number;
  };
}

const vndFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
});

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function daysUntilExpiry(expiryStr?: string): number | null {
  if (!expiryStr) return null;
  const now = new Date();
  const expiry = new Date(expiryStr);
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function AdminPremiumManager() {
  const { t } = useTranslation();
  const [data, setData] = useState<PremiumResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "expiry" | "total_paid" | "payment_count">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [editingExpiry, setEditingExpiry] = useState<string | null>(null);
  const [expiryValue, setExpiryValue] = useState("");
  const [editingAmount, setEditingAmount] = useState<{ id: string; name: string } | null>(null);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/premium-members");
      if (!res.ok) throw new Error("Failed to fetch");
      setData(await res.json());
    } catch {
      setError(t.admin.premiumManager.loadFailed);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDowngrade = async (memberId: string, memberName: string) => {
    if (!confirm(t.admin.premiumManager.downgradeConfirm.replace("{name}", memberName))) return;
    setProcessingId(memberId);
    try {
      const res = await fetch("/api/admin/tier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, tier: "basic" }),
      });
      if (!res.ok) throw new Error("Failed");
      await fetchData();
    } catch {
      alert(t.admin.premiumManager.downgradeFailed);
    } finally {
      setProcessingId(null);
    }
  };

  const handleExpiryUpdate = async (memberId: string) => {
    if (!expiryValue) return;
    setProcessingId(memberId);
    try {
      const res = await fetch("/api/admin/tier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, tier: "premium", membershipExpiry: expiryValue }),
      });
      if (!res.ok) throw new Error("Failed");
      setEditingExpiry(null);
      setExpiryValue("");
      await fetchData();
    } catch {
      alert(t.admin.premiumManager.expiryUpdateFailed);
    } finally {
      setProcessingId(null);
    }
  };

  const handleAddPayment = async (amount: number, notes: string) => {
    if (!editingAmount) return;
    setProcessingId(editingAmount.id);
    try {
      const res = await fetch("/api/admin/tier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: editingAmount.id,
          tier: "premium",
          amount_vnd: amount,
          notes,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      await fetchData();
    } catch {
      alert(t.admin.premiumManager.addPaymentFailed);
    } finally {
      setProcessingId(null);
      setEditingAmount(null);
    }
  };

  const filteredMembers = useMemo(() => {
    if (!data) return [];
    let list = data.members;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (m) =>
          m.name?.toLowerCase().includes(q) ||
          m.email?.toLowerCase().includes(q) ||
          m.abg_class?.toLowerCase().includes(q) ||
          m.phone?.includes(q)
      );
    }
    return [...list].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortBy) {
        case "name":
          return dir * (a.name || "").localeCompare(b.name || "");
        case "expiry": {
          const ae = a.membership_expiry ? new Date(a.membership_expiry).getTime() : 0;
          const be = b.membership_expiry ? new Date(b.membership_expiry).getTime() : 0;
          return dir * (ae - be);
        }
        case "total_paid":
          return dir * (a.total_paid - b.total_paid);
        case "payment_count":
          return dir * (a.payment_count - b.payment_count);
        default:
          return 0;
      }
    });
  }, [data, searchQuery, sortBy, sortDir]);

  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir(col === "name" ? "asc" : "desc");
    }
  };

  const SortIcon = ({ col }: { col: typeof sortBy }) => {
    if (sortBy !== col) return <span className="text-gray-300 ml-1">⇅</span>;
    return <span className="ml-1">{sortDir === "asc" ? "▲" : "▼"}</span>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return <div className="py-8 text-center text-red-600">{error}</div>;
  }

  if (!data) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {t.admin.premiumManager.title}
      </h2>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
          <p className="text-sm text-purple-700 font-medium">{t.admin.premiumManager.totalPremium}</p>
          <p className="text-2xl font-bold text-purple-800 mt-1">{data.stats.total_premium}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-100">
          <p className="text-sm text-green-700 font-medium">{t.admin.premiumManager.totalRevenue}</p>
          <p className="text-2xl font-bold text-green-800 mt-1">
            {vndFormatter.format(data.stats.total_revenue)}
          </p>
        </div>
        <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
          <p className="text-sm text-orange-700 font-medium">{t.admin.premiumManager.expiringSoon}</p>
          <p className="text-2xl font-bold text-orange-800 mt-1">{data.stats.expiring_soon}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-4 border border-red-100">
          <p className="text-sm text-red-700 font-medium">{t.admin.premiumManager.duplicateTransactions}</p>
          <p className="text-2xl font-bold text-red-800 mt-1">{data.duplicate_transactions.length}</p>
        </div>
      </div>

      {/* Duplicate Transactions Alert */}
      {data.duplicate_transactions.length > 0 && (
        <div className="mb-6">
          <button
            onClick={() => setShowDuplicates(!showDuplicates)}
            className="flex items-center gap-2 text-sm font-semibold text-red-700 hover:text-red-800"
          >
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-700 text-xs font-bold">
              !
            </span>
            {t.admin.premiumManager.duplicateAlert} ({data.duplicate_transactions.length})
            <span className="text-xs">{showDuplicates ? "▲" : "▼"}</span>
          </button>
          {showDuplicates && (
            <div className="mt-3 space-y-3">
              {data.duplicate_transactions.map((dup, idx) => (
                <div key={idx} className="border border-red-200 bg-red-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium text-gray-900">{dup.member_name}</span>
                      <span className="text-sm text-gray-500 ml-2">{dup.member_email}</span>
                    </div>
                    <span className="text-sm font-medium text-red-700">
                      {vndFormatter.format(dup.amount_vnd)} x{dup.payments.length}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {dup.payments.map((p) => (
                      <div key={p.id} className="text-xs text-gray-600 flex items-center gap-3">
                        <span>{new Date(p.created_at).toLocaleString()}</span>
                        <span className="text-gray-400">{p.admin_id}</span>
                        {p.notes && <span className="italic text-gray-500">{p.notes}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search bar */}
      <div className="mb-4">
        <input
          type="text"
          placeholder={t.admin.premiumManager.searchPlaceholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {/* Members table */}
      {filteredMembers.length === 0 ? (
        <div className="text-center py-12 text-gray-500">{t.admin.premiumManager.noMembers}</div>
      ) : (
        <div className="overflow-auto rounded-lg border border-gray-200">
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-[28%]" />
              <col className="w-[18%]" />
              <col className="w-[20%]" />
              <col className="w-[16%]" />
              <col className="w-[18%]" />
            </colgroup>
            <thead>
              <tr className="bg-gray-50 border-b">
                <th
                  className="px-3 py-3 text-left font-medium text-gray-600 cursor-pointer select-none"
                  onClick={() => handleSort("name")}
                >
                  {t.admin.labels.name} <SortIcon col="name" />
                </th>
                <th className="px-3 py-3 text-left font-medium text-gray-600">
                  {t.admin.premiumManager.classAndContact}
                </th>
                <th
                  className="px-3 py-3 text-left font-medium text-gray-600 cursor-pointer select-none"
                  onClick={() => handleSort("total_paid")}
                >
                  {t.admin.premiumManager.contributed} <SortIcon col="total_paid" />
                </th>
                <th
                  className="px-3 py-3 text-left font-medium text-gray-600 cursor-pointer select-none"
                  onClick={() => handleSort("expiry")}
                >
                  {t.admin.premiumManager.expiryDate} <SortIcon col="expiry" />
                </th>
                <th className="px-3 py-3 text-left font-medium text-gray-600">
                  {t.admin.labels.actions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredMembers.map((member) => {
                const days = daysUntilExpiry(member.membership_expiry);
                const isExpiringSoon = days !== null && days > 0 && days <= 30;
                const isExpired = days !== null && days <= 0;
                const isExpanded = expandedMember === member.id;

                return (
                  <tr key={member.id} className="hover:bg-gray-50 group">
                    {/* Name */}
                    <td className="px-3 py-3">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{member.name}</p>
                        <p className="text-xs text-gray-500 truncate">{member.email}</p>
                        {member.role && (
                          <p className="text-xs text-gray-400 truncate">
                            {member.role}
                            {member.company && ` @ ${member.company}`}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Class & Contact */}
                    <td className="px-3 py-3">
                      {member.abg_class && (
                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 mb-1">
                          {member.abg_class}
                        </span>
                      )}
                      {member.phone && (
                        <p className="text-xs text-gray-600">
                          <a href={`tel:${member.phone}`} className="text-blue-600 hover:underline">
                            {member.phone}
                          </a>
                        </p>
                      )}
                    </td>

                    {/* Contributed */}
                    <td className="px-3 py-3">
                      <div>
                        <p className="font-medium text-green-700">
                          {vndFormatter.format(member.total_paid)}
                        </p>
                        <button
                          onClick={() => setExpandedMember(isExpanded ? null : member.id)}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          {member.payment_count} {t.admin.premiumManager.payments}
                          <span className="ml-1">{isExpanded ? "▲" : "▼"}</span>
                        </button>
                        {isExpanded && member.payments.length > 0 && (
                          <div className="mt-2 space-y-1 border-t pt-2">
                            {member.payments.map((p) => (
                              <div key={p.id} className="text-xs text-gray-500 flex gap-2">
                                <span className="text-green-600 font-medium">
                                  {vndFormatter.format(p.amount_vnd)}
                                </span>
                                <span>{formatDate(p.created_at)}</span>
                                {p.notes && <span className="italic">{p.notes}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Expiry */}
                    <td className="px-3 py-3">
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
                            disabled={processingId === member.id}
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
                            setExpiryValue(
                              member.membership_expiry
                                ? new Date(member.membership_expiry).toISOString().split("T")[0]
                                : ""
                            );
                          }}
                          className={`text-xs hover:underline ${
                            isExpired
                              ? "text-red-600 font-medium"
                              : isExpiringSoon
                              ? "text-orange-600 font-medium"
                              : "text-gray-600"
                          }`}
                        >
                          {member.membership_expiry ? formatDate(member.membership_expiry) : "—"}
                          {days !== null && (
                            <span className="ml-1">
                              ({isExpired
                                ? t.admin.premiumManager.expired
                                : `${days}d`})
                            </span>
                          )}
                        </button>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-1">
                        {/* Profile link */}
                        <a
                          href={`/profile/${member.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {t.admin.premiumManager.viewProfile}
                        </a>
                        {/* Add payment */}
                        <button
                          onClick={() => setEditingAmount({ id: member.id, name: member.name })}
                          disabled={processingId === member.id}
                          className="text-xs text-green-600 hover:text-green-800 text-left disabled:opacity-50"
                        >
                          {t.admin.premiumManager.addPayment}
                        </button>
                        {/* Downgrade */}
                        <button
                          onClick={() => handleDowngrade(member.id, member.name)}
                          disabled={processingId === member.id}
                          className="text-xs text-red-600 hover:text-red-800 text-left disabled:opacity-50"
                        >
                          {processingId === member.id
                            ? "..."
                            : t.admin.premiumManager.downgradeToBasic}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Payment modal for adding new payment */}
      <PaymentUpgradeModal
        isOpen={!!editingAmount}
        memberName={editingAmount?.name || ""}
        onClose={() => setEditingAmount(null)}
        onConfirm={handleAddPayment}
      />
    </div>
  );
}
