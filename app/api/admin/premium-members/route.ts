import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminAsync } from "@/lib/admin-utils-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface PaymentRow {
  id: string;
  member_id: string;
  amount_vnd: number;
  admin_id: string;
  notes?: string;
  created_at: string;
}

interface DuplicateGroup {
  member_id: string;
  member_name: string;
  member_email: string;
  amount_vnd: number;
  payments: PaymentRow[];
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!(await isAdminAsync(session?.user?.email))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = createServerSupabaseClient();

    // Fetch all premium members (paid = true OR payment_status = 'paid')
    const { data: premiumMembers, error: membersError } = await db
      .from("members")
      .select("id, name, email, abg_class, phone, role, company, paid, payment_status, membership_expiry, created_at, public_profile_slug, avatar_url")
      .or("paid.eq.true,payment_status.eq.paid")
      .order("name", { ascending: true });

    if (membersError) throw membersError;

    // Fetch all payment records
    const { data: allPayments, error: paymentsError } = await db
      .from("payment_records")
      .select("*")
      .order("created_at", { ascending: false });

    if (paymentsError) throw paymentsError;

    const payments = (allPayments || []) as PaymentRow[];

    // Build a map of member_id -> payments
    const paymentsByMember = new Map<string, PaymentRow[]>();
    for (const p of payments) {
      const list = paymentsByMember.get(p.member_id) || [];
      list.push(p);
      paymentsByMember.set(p.member_id, list);
    }

    // Enrich premium members with their payment info
    const enrichedMembers = (premiumMembers || []).map((m) => {
      const memberPayments = paymentsByMember.get(m.id) || [];
      const totalPaid = memberPayments.reduce((sum, p) => sum + p.amount_vnd, 0);
      return {
        ...m,
        payments: memberPayments,
        total_paid: totalPaid,
        payment_count: memberPayments.length,
      };
    });

    // Detect duplicate transactions:
    // Same member + same amount within 24 hours
    const duplicateGroups: DuplicateGroup[] = [];
    const seen = new Set<string>();

    for (const [memberId, memberPayments] of paymentsByMember.entries()) {
      if (memberPayments.length < 2) continue;

      // Group by amount
      const byAmount = new Map<number, PaymentRow[]>();
      for (const p of memberPayments) {
        const list = byAmount.get(p.amount_vnd) || [];
        list.push(p);
        byAmount.set(p.amount_vnd, list);
      }

      for (const [amount, sameAmountPayments] of byAmount.entries()) {
        if (sameAmountPayments.length < 2) continue;

        // Check for payments within 24h of each other
        const sorted = [...sameAmountPayments].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        for (let i = 0; i < sorted.length - 1; i++) {
          const diff =
            new Date(sorted[i + 1].created_at).getTime() -
            new Date(sorted[i].created_at).getTime();
          const hours24 = 24 * 60 * 60 * 1000;

          if (diff <= hours24) {
            const key = `${memberId}-${amount}`;
            if (!seen.has(key)) {
              seen.add(key);
              const member = (premiumMembers || []).find((m) => m.id === memberId);
              duplicateGroups.push({
                member_id: memberId,
                member_name: member?.name || "Unknown",
                member_email: member?.email || "",
                amount_vnd: amount,
                payments: sorted.filter((p, idx) => {
                  if (idx === 0) return true;
                  const d = new Date(p.created_at).getTime() - new Date(sorted[idx - 1].created_at).getTime();
                  return d <= hours24;
                }),
              });
            }
          }
        }
      }
    }

    // Summary stats
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount_vnd, 0);
    const expiringWithin30Days = (premiumMembers || []).filter((m) => {
      if (!m.membership_expiry) return false;
      const expiry = new Date(m.membership_expiry);
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      return expiry > now && expiry <= thirtyDaysFromNow;
    });

    return NextResponse.json({
      members: enrichedMembers,
      duplicate_transactions: duplicateGroups,
      stats: {
        total_premium: (premiumMembers || []).length,
        total_revenue: totalRevenue,
        total_payments: payments.length,
        expiring_soon: expiringWithin30Days.length,
      },
    });
  } catch (error) {
    console.error("Admin premium members error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
