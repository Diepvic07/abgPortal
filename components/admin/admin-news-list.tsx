"use client";

import { NewsArticle } from "@/types";
import { getCategoryColor } from "@/lib/news-utils";
import { NewsStatusBadge } from "./admin-news-status-badge";

interface AdminNewsListProps {
  articles: NewsArticle[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onTogglePublish: (id: string, field: "is_published_vi" | "is_published_en", value: boolean) => void;
  actionLoading: string | null;
}

export function AdminNewsList({ articles, onEdit, onDelete, onTogglePublish, actionLoading }: AdminNewsListProps) {
  if (articles.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg mb-2">No articles yet</p>
        <p className="text-sm">Create your first article to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-auto max-h-[60vh]">
      <table className="w-full min-w-[800px]">
        <thead>
          <tr className="bg-gray-50 border-b sticky top-0 z-10">
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Title</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Category</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Publish</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {articles.map((article) => (
            <tr key={article.id} className="hover:bg-gray-50">
              {/* Title */}
              <td className="px-4 py-3">
                <p className="font-medium text-gray-900 line-clamp-1">
                  {article.title_vi || article.title || "Untitled"}
                </p>
                {article.title && article.title_vi && (
                  <p className="text-xs text-gray-400 line-clamp-1">{article.title}</p>
                )}
                <p className="text-xs text-gray-400 mt-0.5">
                  {article.author_name} · {new Date(article.created_at).toLocaleDateString()}
                </p>
              </td>
              {/* Category */}
              <td className="px-4 py-3">
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(article.category)}`}>
                  {article.category}
                </span>
              </td>
              {/* Status badges */}
              <td className="px-4 py-3">
                <NewsStatusBadge
                  isPublishedVi={article.is_published_vi}
                  isPublishedEn={article.is_published_en}
                  isFeatured={article.is_featured}
                />
              </td>
              {/* Publish toggles */}
              <td className="px-4 py-3">
                <div className="flex flex-col gap-1">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={article.is_published_vi}
                      onChange={() => onTogglePublish(article.id, "is_published_vi", article.is_published_vi)}
                      disabled={actionLoading === article.id}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-xs text-gray-600">VI</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={article.is_published_en}
                      onChange={() => onTogglePublish(article.id, "is_published_en", article.is_published_en)}
                      disabled={actionLoading === article.id}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs text-gray-600">EN</span>
                  </label>
                </div>
              </td>
              {/* Actions */}
              <td className="px-4 py-3">
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => onEdit(article.id)}
                    className="text-sm text-blue-600 hover:text-blue-800 text-left"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(article.id)}
                    disabled={actionLoading === article.id}
                    className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50 text-left"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
