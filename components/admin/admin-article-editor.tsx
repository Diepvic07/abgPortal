"use client";

import { useEffect, useState, useCallback } from "react";
import { NewsArticle, NewsCategory } from "@/types";
import { generateSlug } from "@/lib/news-utils";
import { AdminMarkdownEditor } from "./admin-markdown-editor";
import { AdminImageUpload } from "./admin-article-image-upload";
import { AdminTranslatePanel } from "./admin-translate-panel";
import { AdminTagPicker } from "./admin-tag-picker";

interface AdminArticleEditorProps {
  articleId: string | null;
  onBack: () => void;
}

const CATEGORIES: NewsCategory[] = ["Edu", "Business", "Event", "Course", "Announcement"];

interface FormData {
  title_vi: string;
  excerpt_vi: string;
  content_vi: string;
  title: string;
  excerpt: string;
  content: string;
  category: NewsCategory;
  author_name: string;
  slug: string;
  image_url: string;
  is_published_vi: boolean;
  is_published_en: boolean;
  is_featured: boolean;
  tagged_member_ids: string[];
}

const EMPTY_FORM: FormData = {
  title_vi: "",
  excerpt_vi: "",
  content_vi: "",
  title: "",
  excerpt: "",
  content: "",
  category: "Announcement",
  author_name: "",
  slug: "",
  image_url: "",
  is_published_vi: false,
  is_published_en: false,
  is_featured: false,
  tagged_member_ids: [],
};

export function AdminArticleEditor({ articleId, onBack }: AdminArticleEditorProps) {
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(!!articleId);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditMode = !!articleId;

  // Load article for edit mode
  useEffect(() => {
    if (!articleId) return;
    (async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/admin/news/${articleId}`);
        if (!res.ok) throw new Error("Failed to load article");
        const { data }: { data: NewsArticle } = await res.json();
        setForm({
          title_vi: data.title_vi || "",
          excerpt_vi: data.excerpt_vi || "",
          content_vi: data.content_vi || "",
          title: data.title || "",
          excerpt: data.excerpt || "",
          content: data.content || "",
          category: data.category,
          author_name: data.author_name,
          slug: data.slug,
          image_url: data.image_url || "",
          is_published_vi: data.is_published_vi,
          is_published_en: data.is_published_en,
          is_featured: data.is_featured,
          tagged_member_ids: data.tagged_member_ids || [],
        });
      } catch {
        alert("Failed to load article");
        onBack();
      } finally {
        setIsLoading(false);
      }
    })();
  }, [articleId, onBack]);

  const updateTaggedIds = useCallback((ids: string[]) => {
    setForm((prev) => ({ ...prev, tagged_member_ids: ids }));
    setIsDirty(true);
  }, []);

  // Auto-generate slug from Vietnamese title
  const updateField = useCallback(
    (field: keyof FormData, value: string | boolean) => {
      setForm((prev) => {
        const next = { ...prev, [field]: value };
        // Auto-generate slug when title_vi changes (only in create mode or if slug matches auto-generated)
        if (field === "title_vi" && typeof value === "string") {
          const autoSlug = generateSlug(value);
          const prevAutoSlug = generateSlug(prev.title_vi);
          if (!isEditMode || prev.slug === prevAutoSlug) {
            next.slug = autoSlug;
          }
        }
        return next;
      });
      setIsDirty(true);
    },
    [isEditMode]
  );

  // Unsaved changes warning
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.title_vi.trim()) newErrors.title_vi = "Vietnamese title required";
    if (!form.excerpt_vi.trim()) newErrors.excerpt_vi = "Vietnamese excerpt required";
    if (!form.content_vi.trim()) newErrors.content_vi = "Vietnamese content required";
    if (!form.author_name.trim()) newErrors.author_name = "Author required";
    if (!form.slug.trim()) newErrors.slug = "Slug required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);

    try {
      const url = isEditMode ? `/api/admin/news/${articleId}` : "/api/admin/news";
      const method = isEditMode ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Save failed");
      }

      setIsDirty(false);
      onBack();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    if (isDirty && !confirm("You have unsaved changes. Leave anyway?")) return;
    onBack();
  };

  const handleTranslated = (result: { title: string; excerpt: string; content: string }) => {
    setForm((prev) => ({ ...prev, title: result.title, excerpt: result.excerpt, content: result.content }));
    setIsDirty(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="text-gray-500 hover:text-gray-700 text-sm">
            ← Back
          </button>
          <h2 className="text-lg font-bold text-gray-900">
            {isEditMode ? "Edit Article" : "New Article"}
          </h2>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>

      {/* Metadata row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            value={form.category}
            onChange={(e) => updateField("category", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
          <input
            type="text"
            value={form.author_name}
            onChange={(e) => updateField("author_name", e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.author_name ? "border-red-300" : "border-gray-300"}`}
            placeholder="Author name"
          />
          {errors.author_name && <p className="text-xs text-red-500 mt-1">{errors.author_name}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">URL Path <span className="text-gray-400 font-normal">(auto-generated)</span></label>
          <input
            type="text"
            value={form.slug}
            onChange={(e) => updateField("slug", e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.slug ? "border-red-300" : "border-gray-300"}`}
            placeholder="auto-generated-from-title"
          />
          {errors.slug && <p className="text-xs text-red-500 mt-1">{errors.slug}</p>}
        </div>
      </div>

      {/* Cover image */}
      <AdminImageUpload imageUrl={form.image_url} onImageChange={(url) => updateField("image_url", url)} />

      {/* Tag members */}
      <AdminTagPicker taggedIds={form.tagged_member_ids} onChange={updateTaggedIds} />

      {/* Vietnamese section */}
      <div className="border border-green-200 rounded-lg p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-green-700">Vietnamese (Primary)</h3>
          <p className="text-xs text-gray-500 mt-1">Write the article in Vietnamese first. You can translate to English later using AI.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            type="text"
            value={form.title_vi}
            onChange={(e) => updateField("title_vi", e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.title_vi ? "border-red-300" : "border-gray-300"}`}
            placeholder="Enter article title in Vietnamese"
          />
          {errors.title_vi && <p className="text-xs text-red-500 mt-1">{errors.title_vi}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
          <textarea
            value={form.excerpt_vi}
            onChange={(e) => updateField("excerpt_vi", e.target.value)}
            rows={3}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.excerpt_vi ? "border-red-300" : "border-gray-300"}`}
            placeholder="A short description of this article (shown in article list)"
          />
          {errors.excerpt_vi && <p className="text-xs text-red-500 mt-1">{errors.excerpt_vi}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Article Content</label>
          {errors.content_vi && <p className="text-xs text-red-500 mb-1">{errors.content_vi}</p>}
          <AdminMarkdownEditor
            value={form.content_vi}
            onChange={(val) => updateField("content_vi", val)}
            height={400}
          />
        </div>
      </div>

      {/* AI Translation */}
      <AdminTranslatePanel
        titleVi={form.title_vi}
        excerptVi={form.excerpt_vi}
        contentVi={form.content_vi}
        onTranslated={handleTranslated}
      />

      {/* English section */}
      <div className="border border-blue-200 rounded-lg p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-blue-700">English Translation</h3>
          <p className="text-xs text-gray-500 mt-1">Auto-filled by AI translation above, or edit manually. Leave empty if not publishing in English.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => updateField("title", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Will be filled by AI translation"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
          <textarea
            value={form.excerpt}
            onChange={(e) => updateField("excerpt", e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Will be filled by AI translation"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Article Content</label>
          <AdminMarkdownEditor
            value={form.content}
            onChange={(val) => updateField("content", val)}
            height={300}
          />
        </div>
      </div>

      {/* Publishing controls */}
      <div className="p-4 bg-gray-50 rounded-lg space-y-3">
        <p className="text-xs text-gray-500">Check the boxes below to make the article visible to users. You can publish in one or both languages.</p>
        <div className="flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_published_vi}
            onChange={(e) => updateField("is_published_vi", e.target.checked)}
            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          <span className="text-sm text-gray-700">Publish Vietnamese</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_published_en}
            onChange={(e) => updateField("is_published_en", e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Publish English</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_featured}
            onChange={(e) => updateField("is_featured", e.target.checked)}
            className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
          />
          <span className="text-sm text-gray-700">Featured</span>
        </label>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={handleBack}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isSaving ? "Saving..." : "Save Article"}
        </button>
      </div>
    </div>
  );
}
