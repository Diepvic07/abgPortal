import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getMemberTier } from "@/lib/tier-utils";
import { getMemberById, createContactRequest, getContactRequestsByRequesterAndTarget, countTodayContactRequests } from "@/lib/supabase-db";
import { sendContactRequestEmail } from "@/lib/resend";

export async function POST(request: NextRequest) {
  try {
    const member = await requireAuth(request);

    // Pro-only check
    const tier = getMemberTier(member);
    if (tier !== "premium") {
      return NextResponse.json({ error: "Premium membership required to send contact requests" }, { status: 403 });
    }

    const { targetId, message } = await request.json();
    if (!targetId) {
      return NextResponse.json({ error: "Target member ID required" }, { status: 400 });
    }

    // Daily limit: 10 contact requests/day (unlimited for test mode emails)
    const TEST_MODE_EMAILS = ['diep@ejoylearning.com', 'ttvietduc@gmail.com', 'quephc@gmail.com', 'diu.tran@abg.edu.vn'];
    const isTestUser = TEST_MODE_EMAILS.includes(member.email);
    if (!isTestUser) {
      const todayCount = await countTodayContactRequests(member.id);
      if (todayCount >= 10) {
        return NextResponse.json({ error: "Daily contact request limit reached (10/day)" }, { status: 429 });
      }
    }

    // Verify target exists and is active/approved
    const target = await getMemberById(targetId);
    if (!target || target.status !== "active" || target.approval_status !== "approved") {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Prevent self-request
    if (target.id === member.id) {
      return NextResponse.json({ error: "Cannot send request to yourself" }, { status: 400 });
    }

    // Check for existing pending request OR 30-day cooldown after decline
    const existingRequests = await getContactRequestsByRequesterAndTarget(member.id, target.id);
    const pendingExists = existingRequests.some(r => r.status === "pending");
    if (pendingExists) {
      return NextResponse.json({ error: "You already have a pending request to this member" }, { status: 409 });
    }

    const recentDecline = existingRequests.find(r =>
      r.status === "declined" &&
      r.responded_at &&
      (Date.now() - new Date(r.responded_at).getTime()) < 30 * 24 * 60 * 60 * 1000
    );
    if (recentDecline) {
      return NextResponse.json({ error: "Please wait 30 days before re-requesting this member" }, { status: 429 });
    }

    const token = crypto.randomUUID();
    const id = crypto.randomUUID();
    const finalMessage = message?.trim() || "Xin chào! Tôi muốn kết nối với bạn qua ABG Alumni Connect.";
    const baseUrl = process.env.NEXTAUTH_URL || "https://abg-connect.vercel.app";

    await createContactRequest({
      id,
      requester_id: member.id,
      target_id: target.id,
      message: finalMessage,
      status: "pending",
      token,
      created_at: new Date().toISOString(),
    });

    // Send email non-blocking — don't let email failure block the contact request
    try {
      await sendContactRequestEmail({
        target_email: target.email,
        target_name: target.name,
        requester_name: member.name,
        requester_email: member.email,
        requester_role: member.role || "",
        requester_company: member.company || "",
        message: finalMessage,
        accept_url: `${baseUrl}/api/contact/respond?token=${token}&action=accept`,
        decline_url: `${baseUrl}/api/contact/respond?token=${token}&action=decline`,
        locale: target.locale || 'vi',
      });
    } catch (emailError) {
      console.error("Contact request email failed (request still created):", emailError);
    }

    return NextResponse.json({ success: true, requestId: id });
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    console.error("Contact request error:", error);
    return NextResponse.json({ error: "Failed to send contact request" }, { status: 500 });
  }
}
