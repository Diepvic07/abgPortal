import { NextRequest, NextResponse } from "next/server";
import { getContactRequestByToken, updateContactRequestStatus, getMemberById, addConnection } from "@/lib/supabase-db";
import { sendContactAcceptedEmail, sendContactDeclinedEmail } from "@/lib/resend";
import { generateId, formatDate } from "@/lib/utils";
import { captureServerEvent } from "@/lib/posthog-server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const action = searchParams.get("action");

    if (!token || !action || !["accept", "decline"].includes(action)) {
      return htmlResponse("Link không hợp lệ", "error");
    }

    const contactRequest = await getContactRequestByToken(token);
    if (!contactRequest) {
      return htmlResponse("Không tìm thấy yêu cầu", "error");
    }
    if (contactRequest.status !== "pending") {
      return htmlResponse("Yêu cầu này đã được phản hồi trước đó", "info");
    }

    const requester = await getMemberById(contactRequest.requester_id);
    const target = await getMemberById(contactRequest.target_id);
    if (!requester || !target) {
      return htmlResponse("Không tìm thấy thành viên", "error");
    }

    if (action === "accept") {
      await updateContactRequestStatus(contactRequest.id, "accepted");

      // For AI match requests, also create a Connection record
      if (contactRequest.source === 'ai_match' && contactRequest.connection_request_id) {
        try {
          await addConnection({
            id: generateId(),
            request_id: contactRequest.connection_request_id,
            from_id: contactRequest.requester_id,
            to_id: contactRequest.target_id,
            intro_sent: true,
            created_at: formatDate(),
          });
        } catch (connError) {
          console.error("Failed to create connection record for AI match:", connError);
        }
      }

      // Track contact request accepted
      captureServerEvent(target.id, 'contact_request_accepted');

      await sendContactAcceptedEmail({
        requester: {
          id: requester.id,
          email: requester.email,
          name: requester.name,
          role: requester.role || "",
          company: requester.company || "",
          phone: requester.phone,
          facebook_url: requester.facebook_url,
          linkedin_url: requester.linkedin_url,
        },
        target: {
          id: target.id,
          email: target.email,
          name: target.name,
          role: target.role || "",
          company: target.company || "",
          phone: target.phone,
          facebook_url: target.facebook_url,
          linkedin_url: target.linkedin_url,
        },
        requesterLocale: requester.locale || 'vi',
        targetLocale: target.locale || 'vi',
      });
      return htmlResponse("Cảm ơn bạn! Thông tin liên hệ của bạn đã được chia sẻ.", "success");
    }

    // Decline
    await updateContactRequestStatus(contactRequest.id, "declined");

    // Track contact request declined
    captureServerEvent(target.id, 'contact_request_declined');

    await sendContactDeclinedEmail({
      requester_email: requester.email,
      requester_name: requester.name,
      target_name: target.name,
      locale: requester.locale || 'vi',
    });
    return htmlResponse("Yêu cầu đã được từ chối. Cảm ơn bạn đã phản hồi.", "info");
  } catch (error) {
    console.error("Contact respond error:", error);
    return htmlResponse("Đã xảy ra lỗi", "error");
  }
}

function htmlResponse(message: string, type: "success" | "error" | "info") {
  const colors = { success: "#22c55e", error: "#ef4444", info: "#007bff" };
  const icons = { success: "✓", error: "✕", info: "ℹ" };
  return new NextResponse(
    `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ABG Connect</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f8f9fa; }
    .card { background: white; border-radius: 12px; padding: 40px; max-width: 400px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .icon { width: 48px; height: 48px; border-radius: 50%; background: ${colors[type]}; color: white; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 16px; }
    .message { color: #333; font-size: 16px; line-height: 1.5; }
    .brand { margin-top: 24px; font-size: 13px; color: #999; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icons[type]}</div>
    <p class="message">${message}</p>
    <p class="brand">ABG Alumni Connect</p>
  </div>
</body>
</html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}
