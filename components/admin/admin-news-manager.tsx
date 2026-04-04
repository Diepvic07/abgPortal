"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslation } from '@/lib/i18n';
import { NewsArticle } from "@/types";
import { AdminNewsList } from "./admin-news-list";
import { AdminArticleEditor } from "./admin-article-editor";

export function AdminNewsManager() {
  const { t } = useTranslation();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);

  const fetchArticles = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== "All") params.set("category", categoryFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/admin/news?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const { data } = await res.json();
      setArticles(data || []);
    } catch (err) {
      console.error("Failed to fetch articles:", err);
    } finally {
      setIsLoading(false);
    }
  }, [categoryFilter, searchQuery]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const handleDelete = async (id: string) => {
    if (!confirm(t.admin.news.deleteConfirm)) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/news/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      await fetchArticles();
    } catch {
      alert(t.admin.news.deleteFailed);
    } finally {
      setActionLoading(null);
    }
  };

  const handleTogglePublish = async (
    id: string,
    field: "is_published_vi" | "is_published_en",
    currentValue: boolean
  ) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/news/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: !currentValue }),
      });
      if (!res.ok) throw new Error("Failed to update");
      await fetchArticles();
    } catch {
      alert(t.admin.news.togglePublishFailed);
    } finally {
      setActionLoading(null);
    }
  };

  const handleEdit = (id: string) => {
    setEditingArticleId(id);
    setShowEditor(true);
  };

  const handleCreate = () => {
    setEditingArticleId(null);
    setShowEditor(true);
  };

  const handleEditorBack = () => {
    setShowEditor(false);
    setEditingArticleId(null);
    fetchArticles();
  };

  if (showEditor) {
    return <AdminArticleEditor articleId={editingArticleId} onBack={handleEditorBack} />;
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder={t.admin.news.searchPlaceholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="All">{t.admin.news.allCategories}</option>
          <option value="Edu">Edu</option>
          <option value="Business">Business</option>
          <option value="Event">Event</option>
          <option value="Course">Course</option>
          <option value="Announcement">Announcement</option>
        </select>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          {t.admin.news.newArticle}
        </button>
      </div>

      {/* Article list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <AdminNewsList
          articles={articles}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onTogglePublish={handleTogglePublish}
          actionLoading={actionLoading}
        />
      )}
    </div>
  );
}
