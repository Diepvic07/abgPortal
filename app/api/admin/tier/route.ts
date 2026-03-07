import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMemberById, updateMember, createPaymentRecord } from "@/lib/supabase-db";
import { isAdminAsync } from "@/lib/admin-utils-server";
import { sendPremiumUpgradeEmail } from "@/lib/resend";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!(await isAdminAsync(session?.user?.email))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { memberId, tier, membershipExpiry, amount_vnd, notes } = await request.json();

    if (!memberId || !tier) {
      return NextResponse.json({ error: "Member ID and tier required" }, { status: 400 });
    }

    if (tier !== "basic" && tier !== "premium") {
      return NextResponse.json({ error: "Invalid tier. Must be 'basic' or 'premium'" }, { status: 400 });
    }

    const member = await getMemberById(memberId);
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Require amount_vnd only when UPGRADING (not already premium)
    const isNewUpgrade = tier === "premium" && !member.paid;
    if (isNewUpgrade && (!amount_vnd || amount_vnd <= 0)) {
      return NextResponse.json({ error: "Payment amount (amount_vnd) is required and must be positive when upgrading to premium" }, { status: 400 });
    }

    // Update paid status and set expiry for premium (default: 2026-12-31, or admin-specified date)
    const updates: Record<string, unknown> = {
      paid: tier === "premium",
      payment_status: tier === "premium" ? "paid" : "unpaid",
    };
    if (tier === "premium") {
      if (membershipExpiry) {
        updates.membership_expiry = new Date(membershipExpiry).toISOString();
      } else {
        updates.membership_expiry = "2026-12-31T23:59:59.000Z";
      }
    }
    await updateMember(memberId, updates);

    // Create payment record when upgrading to premium with amount
    if (tier === "premium" && amount_vnd && amount_vnd > 0) {
      await createPaymentRecord({
        id: crypto.randomUUID(),
        member_id: memberId,
        amount_vnd,
        admin_id: session?.user?.email || "unknown",
        notes: notes || undefined,
        created_at: new Date().toISOString(),
      });
    }

    // Send premium upgrade notification email
    if (tier === "premium" && isNewUpgrade) {
      try {
        await sendPremiumUpgradeEmail(member.email, member.name, member.locale || 'vi');
      } catch (emailError) {
        console.error("Failed to send premium upgrade email:", emailError);
        // Don't fail the tier update if email fails
      }
    }

    return NextResponse.json({ success: true, tier });
  } catch (error) {
    console.error("Admin tier error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
