import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminAsync } from "@/lib/admin-utils-server";
import { getAllNewsArticles, createNewsArticle } from "@/lib/supabase-db";
import { generateSlug } from "@/lib/news-utils";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { notifyTaggedMembers } from "@/lib/news-tag-notify";

const CreateArticleSchema = z.object({
  title_vi: z.string().min(1, "Vietnamese title required"),
  excerpt_vi: z.string().min(1, "Vietnamese excerpt required"),
  content_vi: z.string().min(1, "Vietnamese content required"),
  title: z.string().optional().default(""),
  excerpt: z.string().optional().default(""),
  content: z.string().optional().default(""),
  category: z.enum(["Edu", "Business", "Event", "Course", "Announcement"]),
  author_name: z.string().min(1, "Author required"),
  image_url: z.string().optional().default(""),
  is_published_vi: z.boolean().optional().default(false),
  is_published_en: z.boolean().optional().default(false),
  is_featured: z.boolean().optional().default(false),
  tagged_member_ids: z.array(z.string()).optional().default([]),
});

// GET: List all articles (admin sees drafts too)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!(await isAdminAsync(session?.user?.email))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;
    const search = searchParams.get("search") || undefined;

    const articles = await getAllNewsArticles({ category, search });
    return NextResponse.json({ data: articles });
  } catch (error) {
    console.error("Admin news list error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// POST: Create new article
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!(await isAdminAsync(session?.user?.email))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = CreateArticleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const now = new Date().toISOString();
    const baseSlug = generateSlug(data.title_vi) || `article-${Date.now()}`;
    // Append short suffix to avoid slug collision
    const slug = `${baseSlug}-${uuid().slice(0, 6)}`;

    const article = await createNewsArticle({
      id: uuid(),
      title: data.title,
      slug,
      category: data.category,
      excerpt: data.excerpt,
      content: data.content,
      image_url: data.image_url || undefined,
      author_name: data.author_name,
      published_date: now,
      is_published_vi: data.is_published_vi,
      is_published_en: data.is_published_en,
      is_featured: data.is_featured,
      title_vi: data.title_vi,
      excerpt_vi: data.excerpt_vi,
      content_vi: data.content_vi,
      tagged_member_ids: data.tagged_member_ids,
    });

    // Notify newly tagged members (all members on create are "new")
    if (data.tagged_member_ids.length > 0) {
      await notifyTaggedMembers({
        memberIds: data.tagged_member_ids,
        articleSlug: slug,
        articleTitle: data.title,
        articleTitleVi: data.title_vi,
        actorName: session?.user?.name || 'Admin',
      });
    }

    return NextResponse.json({ data: article }, { status: 201 });
  } catch (error) {
    console.error("Admin news create error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create article";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
