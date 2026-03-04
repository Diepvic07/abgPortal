import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminAsync } from "@/lib/admin-utils-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import crypto from "crypto";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// POST: Upload image to Supabase Storage
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!(await isAdminAsync(session?.user?.email))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate MIME type server-side
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum 5MB." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const ext = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "jpg";
    const filePath = `${year}/${month}/${crypto.randomUUID()}.${ext}`;

    const supabase = createServerSupabaseClient();
    const { error: uploadError } = await supabase.storage
      .from("news-images")
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("Supabase storage upload error:", uploadError);
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage
      .from("news-images")
      .getPublicUrl(filePath);

    return NextResponse.json({ data: { url: urlData.publicUrl } });
  } catch (error) {
    console.error("Admin image upload error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
