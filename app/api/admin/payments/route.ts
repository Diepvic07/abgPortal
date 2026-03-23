import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminAsync } from "@/lib/admin-utils-server";
import { getPaymentRecords, getMemberById } from "@/lib/supabase-db";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!(await isAdminAsync(session?.user?.email))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const records = await getPaymentRecords();
    const enriched = await Promise.all(
      records.map(async (r) => {
        const member = await getMemberById(r.member_id);
        return {
          ...r,
          member_name: member?.name || "Unknown",
          member_email: member?.email || "",
        };
      })
    );
    const total_cash_in = records.reduce((sum, r) => sum + r.amount_vnd, 0);

    // Members with payment_status = 'pending' (awaiting admin verification)
    const db = createServerSupabaseClient();
    const { data: pendingRows } = await db.from("members").select("id, name, email, abg_class, phone").eq("payment_status", "pending");
    const pendingPayments = (pendingRows || []).map((m) => ({ id: m.id, name: m.name, email: m.email, abg_class: m.abg_class, phone: m.phone }));

    return NextResponse.json({ payments: enriched, total_cash_in, count: records.length, pending_payments: pendingPayments });
  } catch (error) {
    console.error("Admin payments error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
