import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMemberById, deleteMember } from "@/lib/supabase-db";
import { isAdminAsync } from "@/lib/admin-utils-server";
import { sendRejectionEmail } from "@/lib/resend";

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

    // Send rejection email first (before deletion)
    await sendRejectionEmail(member.email, member.name);

    // Delete member from sheet
    await deleteMember(memberId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin reject error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
