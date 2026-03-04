"use client";

import { useState } from "react";

interface AdminTranslatePanelProps {
  titleVi: string;
  excerptVi: string;
  contentVi: string;
  onTranslated: (result: { title: string; excerpt: string; content: string }) => void;
}

export function AdminTranslatePanel({ titleVi, excerptVi, contentVi, onTranslated }: AdminTranslatePanelProps) {
  const [instructions, setInstructions] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const canTranslate = titleVi.trim() && excerptVi.trim() && contentVi.trim();

  const handleTranslate = async () => {
    if (!canTranslate) return;
    setIsTranslating(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/news/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title_vi: titleVi,
          excerpt_vi: excerptVi,
          content_vi: contentVi,
          instructions,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Translation failed");
      }

      const { data } = await res.json();
      onTranslated(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Translation failed");
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="border border-indigo-200 rounded-lg bg-indigo-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
      >
        <span className="text-sm font-medium text-indigo-700">AI Translation (VI → EN)</span>
        <span className="text-indigo-400">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-3">
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Add context: e.g., 'keep formal tone', 'education topic'"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            onClick={handleTranslate}
            disabled={!canTranslate || isTranslating}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isTranslating && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            )}
            {isTranslating ? "Translating..." : "Translate to English"}
          </button>
        </div>
      )}
    </div>
  );
}
