import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMembers } from "@/lib/google-sheets";
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
    }));

    return NextResponse.json({ members: adminMembers });
  } catch (error) {
    console.error("Admin members error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
