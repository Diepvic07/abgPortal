"use client";

import { useEffect, useState } from "react";

interface EnrichedPayment {
  id: string;
  member_id: string;
  member_name: string;
  member_email: string;
  amount_vnd: number;
  admin_id: string;
  notes?: string;
  created_at: string;
}

interface PendingPaymentMember {
  id: string;
  name: string;
  email: string;
  abg_class?: string;
  phone?: string;
}

interface PaymentsResponse {
  payments: EnrichedPayment[];
  total_cash_in: number;
  count: number;
  pending_payments: PendingPaymentMember[];
}

const vndFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
});

export function AdminPaymentReport() {
  const [data, setData] = useState<PaymentsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPayments = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/payments");
        if (!res.ok) throw new Error("Failed to fetch payments");
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Payment report error:", err);
        setError("Failed to load payment records");
      } finally {
        setIsLoading(false);
      }
    };
    fetchPayments();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center text-red-600">{error}</div>
    );
  }

  if (!data) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Report</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-green-50 rounded-lg p-4 border border-green-100">
          <p className="text-sm text-green-700 font-medium">Total Cash-in</p>
          <p className="text-2xl font-bold text-green-800 mt-1">
            {vndFormatter.format(data.total_cash_in)}
          </p>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
          <p className="text-sm text-blue-700 font-medium">Payment Count</p>
          <p className="text-2xl font-bold text-blue-800 mt-1">{data.count}</p>
        </div>
      </div>

      {/* Pending payment verifications */}
      {data.pending_payments.length > 0 && (
        <div className="mb-6">
          <h3 className="text-base font-semibold text-orange-700 mb-3">
            Pending Verification ({data.pending_payments.length})
          </h3>
          <div className="overflow-auto rounded-lg border border-orange-200 bg-orange-50">
            <table className="w-full min-w-[500px] text-sm">
              <thead>
                <tr className="border-b border-orange-200">
                  <th className="px-4 py-3 text-left font-medium text-orange-700">Member</th>
                  <th className="px-4 py-3 text-left font-medium text-orange-700">Class</th>
                  <th className="px-4 py-3 text-left font-medium text-orange-700">Phone</th>
                  <th className="px-4 py-3 text-left font-medium text-orange-700">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-100">
                {data.pending_payments.map((m) => (
                  <tr key={m.id} className="hover:bg-orange-100/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{m.name}</p>
                      <p className="text-xs text-gray-500">{m.email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{m.abg_class || "-"}</td>
                    <td className="px-4 py-3 text-gray-600">{m.phone || "-"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-orange-200 text-orange-800">
                        Awaiting verification
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payments table */}
      {data.payments.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No payment records found</div>
      ) : (
        <div className="overflow-auto rounded-lg border border-gray-200">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-3 text-left font-medium text-gray-600">Member</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Amount (VND)</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Admin</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{payment.member_name}</p>
                    <p className="text-xs text-gray-500">{payment.member_email}</p>
                  </td>
                  <td className="px-4 py-3 font-medium text-green-700">
                    {vndFormatter.format(payment.amount_vnd)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(payment.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{payment.admin_id}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{payment.notes || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
