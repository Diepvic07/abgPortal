import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminAsync } from "@/lib/admin-utils-server";
import {
  getNewsArticleById,
  updateNewsArticle,
  deleteNewsArticle,
} from "@/lib/supabase-db";
import { z } from "zod";
import { notifyTaggedMembers } from "@/lib/news-tag-notify";

const UpdateArticleSchema = z.object({
  title_vi: z.string().min(1).optional(),
  excerpt_vi: z.string().min(1).optional(),
  content_vi: z.string().min(1).optional(),
  title: z.string().optional(),
  excerpt: z.string().optional(),
  content: z.string().optional(),
  category: z.enum(["Edu", "Business", "Event", "Course", "Announcement"]).optional(),
  author_name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  image_url: z.string().optional(),
  is_published_vi: z.boolean().optional(),
  is_published_en: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  tagged_member_ids: z.array(z.string()).optional(),
});

// GET: Single article by id
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!(await isAdminAsync(session?.user?.email))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const article = await getNewsArticleById(id);
    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    return NextResponse.json({ data: article });
  } catch (error) {
    console.error("Admin news get error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// PUT: Update article
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!(await isAdminAsync(session?.user?.email))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = UpdateArticleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await getNewsArticleById(id);
    if (!existing) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    const article = await updateNewsArticle(id, parsed.data);

    // Detect newly-added tags and notify those members
    if (parsed.data.tagged_member_ids) {
      const prevIds = new Set(existing.tagged_member_ids || []);
      const newlyAdded = parsed.data.tagged_member_ids.filter(mid => !prevIds.has(mid));
      if (newlyAdded.length > 0) {
        await notifyTaggedMembers({
          memberIds: newlyAdded,
          articleSlug: article.slug,
          articleTitle: article.title,
          articleTitleVi: article.title_vi || null,
          actorName: session?.user?.name || 'Admin',
        });
      }
    }

    return NextResponse.json({ data: article });
  } catch (error) {
    console.error("Admin news update error:", error);
    return NextResponse.json({ error: "Failed to update article" }, { status: 500 });
  }
}

// DELETE: Delete article
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!(await isAdminAsync(session?.user?.email))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await getNewsArticleById(id);
    if (!existing) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    await deleteNewsArticle(id);
    return NextResponse.json({ message: "Article deleted" });
  } catch (error) {
    console.error("Admin news delete error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
