import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminAsync } from "@/lib/admin-utils-server";
import { translateNewsArticle } from "@/lib/gemini";
import { z } from "zod";

const TranslateSchema = z.object({
  title_vi: z.string().min(1, "Vietnamese title required"),
  excerpt_vi: z.string().min(1, "Vietnamese excerpt required"),
  content_vi: z.string().min(1, "Vietnamese content required"),
  instructions: z.string().optional().default(""),
});

// POST: Translate Vietnamese article to English via Gemini
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!(await isAdminAsync(session?.user?.email))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = TranslateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const result = await translateNewsArticle({
      title_vi: parsed.data.title_vi,
      excerpt_vi: parsed.data.excerpt_vi,
      content_vi: parsed.data.content_vi,
      instructions: parsed.data.instructions,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("Admin translate error:", error);
    const message = error instanceof Error ? error.message : "Translation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
