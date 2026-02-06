import { NextRequest, NextResponse } from "next/server";
import { getMemberByEmail } from "@/lib/google-sheets";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const member = await getMemberByEmail(email.trim().toLowerCase());

    if (!member) {
      return NextResponse.json({ exists: false, status: null });
    }

    return NextResponse.json({
      exists: true,
      status: member.approval_status || "approved",
      accountStatus: member.account_status,
    });
  } catch (error) {
    console.error("Check email error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
