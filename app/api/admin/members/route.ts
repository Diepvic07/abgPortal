import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMembers } from "@/lib/supabase-db";
import { isAdminAsync } from "@/lib/admin-utils-server";
import { isAdmin } from "@/lib/admin-utils";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!(await isAdminAsync(session?.user?.email))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const members = await getMembers();

    // Return simplified member data for admin view
    // is_admin checks both database field AND ADMIN_EMAILS env var
    const adminMembers = members.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      role: m.role,
      company: m.company,
      approval_status: m.approval_status || "approved",
      paid: m.paid,
      is_csv_imported: m.is_csv_imported || false,
      is_admin: isAdmin(m),
      created_at: m.created_at,
      abg_class: m.abg_class,
      membership_expiry: m.membership_expiry,
    }));

    // Deduplicate by email, keeping the entry with most recent created_at
    // This prevents duplicate rows from appearing in the admin dashboard
    const emailMap = new Map<string, (typeof adminMembers)[0]>();
    for (const member of adminMembers) {
      const normalizedEmail = member.email.toLowerCase();
      const existing = emailMap.get(normalizedEmail);
      if (!existing || new Date(member.created_at) > new Date(existing.created_at)) {
        emailMap.set(normalizedEmail, member);
      }
    }
    const deduplicatedMembers = Array.from(emailMap.values());

    return NextResponse.json({ members: deduplicatedMembers });
  } catch (error) {
    console.error("Admin members error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
