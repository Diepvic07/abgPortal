import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMemberById, updateMember } from "@/lib/supabase-db";
import { isAdminAsync } from "@/lib/admin-utils-server";
import { sendApprovalEmail } from "@/lib/resend";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!(await isAdminAsync(session?.user?.email))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { memberId } = await request.json();

    if (!memberId) {
      return NextResponse.json({ error: "Member ID required" }, { status: 400 });
    }

    const member = await getMemberById(memberId);
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Update approval status and ensure member is active so they appear in search
    await updateMember(memberId, { approval_status: "approved", status: "active" });

    // Send approval email in member's preferred locale
    await sendApprovalEmail(member.email, member.name, member.locale || 'vi');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin approve error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
