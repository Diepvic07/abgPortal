import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMemberById, updateMember } from "@/lib/supabase-db";
import { isAdminAsync } from "@/lib/admin-utils-server";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!(await isAdminAsync(session?.user?.email))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { memberId, tier, membershipExpiry } = await request.json();

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

    // Update paid status and set expiry for premium (default: +1 year, or admin-specified date)
    const updates: Record<string, unknown> = {
      paid: tier === "premium",
      payment_status: tier === "premium" ? "paid" : "unpaid",
    };
    if (tier === "premium") {
      if (membershipExpiry) {
        updates.membership_expiry = new Date(membershipExpiry).toISOString();
      } else {
        const expiry = new Date();
        expiry.setFullYear(expiry.getFullYear() + 1);
        updates.membership_expiry = expiry.toISOString();
      }
    }
    await updateMember(memberId, updates);

    return NextResponse.json({ success: true, tier });
  } catch (error) {
    console.error("Admin tier error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
