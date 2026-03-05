import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getContactRequestsByMemberId, getMemberById } from "@/lib/supabase-db";

export async function GET(request: NextRequest) {
  try {
    const member = await requireAuth(request);
    const requests = await getContactRequestsByMemberId(member.id);

    const enriched = await Promise.all(
      requests.map(async (r) => {
        const otherId = r.requester_id === member.id ? r.target_id : r.requester_id;
        const other = await getMemberById(otherId);
        return {
          ...r,
          direction: r.requester_id === member.id ? "sent" : "received",
          other_name: other?.name || "Unknown",
          other_avatar: other?.avatar_url,
        };
      })
    );

    return NextResponse.json({ requests: enriched });
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    console.error("Contact list error:", error);
    return NextResponse.json({ error: "Failed to load contact requests" }, { status: 500 });
  }
}
