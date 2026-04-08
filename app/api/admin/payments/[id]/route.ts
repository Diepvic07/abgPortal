import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminAsync } from "@/lib/admin-utils-server";
import { deletePaymentRecord, updatePaymentRecord } from "@/lib/supabase-db";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!(await isAdminAsync(session?.user?.email))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Payment record ID required" }, { status: 400 });
    }

    await deletePaymentRecord(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete payment record error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!(await isAdminAsync(session?.user?.email))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Payment record ID required" }, { status: 400 });
    }

    const { amount_vnd, notes } = await request.json();
    const updates: { amount_vnd?: number; notes?: string } = {};
    if (amount_vnd !== undefined) {
      if (typeof amount_vnd !== "number" || amount_vnd <= 0) {
        return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
      }
      updates.amount_vnd = amount_vnd;
    }
    if (notes !== undefined) updates.notes = notes;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    await updatePaymentRecord(id, updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update payment record error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
