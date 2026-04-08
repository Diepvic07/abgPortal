import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMemberById, updateMember, createPaymentRecord } from "@/lib/supabase-db";
import { isAdminAsync } from "@/lib/admin-utils-server";
import { sendPremiumUpgradeEmail } from "@/lib/resend";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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
    // Guard: skip if an identical payment (same member + amount) was recorded in the last 5 minutes
    if (tier === "premium" && amount_vnd && amount_vnd > 0) {
      const db = createServerSupabaseClient();
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: recentDup } = await db
        .from("payment_records")
        .select("id")
        .eq("member_id", memberId)
        .eq("amount_vnd", amount_vnd)
        .gte("created_at", fiveMinutesAgo)
        .limit(1);

      if (recentDup && recentDup.length > 0) {
        // Payment already recorded recently — skip duplicate but still succeed
        console.warn(`[AdminTier] Skipped duplicate payment: member=${memberId} amount=${amount_vnd}`);
      } else {
        await createPaymentRecord({
          id: crypto.randomUUID(),
          member_id: memberId,
          amount_vnd,
          admin_id: session?.user?.email || "unknown",
          notes: notes || undefined,
          created_at: new Date().toISOString(),
        });
      }
    }

    // Send premium upgrade notification email
    if (tier === "premium" && isNewUpgrade) {
      try {
        await sendPremiumUpgradeEmail(member.email, member.name, member.locale || 'vi');
      } catch (emailError) {
        console.error("Failed to send premium upgrade email:", emailError);
        // Don't fail the tier update if email fails
      }

      // Background: trigger AI match email (separate serverless function)
      // Use VERCEL_PROJECT_PRODUCTION_URL (www.abgalumni.vn) to avoid non-www redirect stripping headers
      const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : process.env.NEXTAUTH_URL || 'http://localhost:3000';
      fetch(`${baseUrl}/api/premium-match-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': process.env.CRON_SECRET || '',
        },
        body: JSON.stringify({ memberId }),
      }).catch(err => console.error('[PremiumMatch] Failed to trigger background job:', err));
    }

    return NextResponse.json({ success: true, tier });
  } catch (error) {
    console.error("Admin tier error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
