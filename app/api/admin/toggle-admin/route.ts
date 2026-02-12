import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateMember, getMemberById } from "@/lib/google-sheets";
import { isAdminAsync } from "@/lib/admin-utils-server";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!(await isAdminAsync(session?.user?.email))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { memberId, isAdmin: newAdminStatus } = await request.json();

    if (!memberId || typeof newAdminStatus !== "boolean") {
      return NextResponse.json(
        { error: "Missing memberId or isAdmin status" },
        { status: 400 }
      );
    }

    // Verify member exists
    const member = await getMemberById(memberId);
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Update admin status
    await updateMember(memberId, { is_admin: newAdminStatus });

    return NextResponse.json({
      success: true,
      message: newAdminStatus
        ? `${member.name} is now an admin`
        : `${member.name} is no longer an admin`,
    });
  } catch (error) {
    console.error("Toggle admin error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
