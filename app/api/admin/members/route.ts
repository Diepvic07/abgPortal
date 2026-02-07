import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMembers } from "@/lib/google-sheets";
import { isAdmin } from "@/lib/admin-utils";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!isAdmin(session?.user?.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const members = await getMembers();

    // Return simplified member data for admin view
    const adminMembers = members.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      role: m.role,
      company: m.company,
      approval_status: m.approval_status || "approved",
      paid: m.paid,
      is_csv_imported: m.is_csv_imported || false,
      is_admin: m.is_admin || false,
      created_at: m.created_at,
      abg_class: m.abg_class,
    }));

    return NextResponse.json({ members: adminMembers });
  } catch (error) {
    console.error("Admin members error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
