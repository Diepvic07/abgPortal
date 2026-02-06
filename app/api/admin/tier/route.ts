import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMemberById, updateMember } from "@/lib/google-sheets";
import { isAdmin } from "@/lib/admin-utils";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!isAdmin(session?.user?.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { memberId, tier } = await request.json();

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

    // Update paid status based on tier
    await updateMember(memberId, {
      paid: tier === "premium",
      payment_status: tier === "premium" ? "paid" : "unpaid",
    });

    return NextResponse.json({ success: true, tier });
  } catch (error) {
    console.error("Admin tier error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
