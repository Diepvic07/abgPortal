"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ArticleMarkdown } from "@/components/news/article-markdown";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

interface AdminMarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: number;
}

type Mode = "edit" | "live" | "preview";

export function AdminMarkdownEditor({ value, onChange, height = 300 }: AdminMarkdownEditorProps) {
  const [mode, setMode] = useState<Mode>("edit");

  return (
    <div data-color-mode="light">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex rounded-md border border-gray-300 text-xs overflow-hidden">
          <button
            type="button"
            onClick={() => setMode("edit")}
            className={`px-3 py-1.5 ${mode === "edit" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            title="Full-screen writing area"
          >
            Write
          </button>
          <button
            type="button"
            onClick={() => setMode("live")}
            className={`px-3 py-1.5 border-x border-gray-300 ${mode === "live" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            title="Write on the left, see how it will look on the right"
          >
            Write + Preview
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={`px-3 py-1.5 ${mode === "preview" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            title="Exact preview of the published article"
          >
            Preview
          </button>
        </div>
        <span className="text-xs text-gray-400">
          Preview uses the exact same renderer as the live article.
        </span>
      </div>

      {mode === "preview" ? (
        <div
          className="border border-gray-200 rounded-md bg-white p-6 overflow-y-auto"
          style={{ minHeight: height }}
        >
          {value.trim() ? (
            <ArticleMarkdown content={value} />
          ) : (
            <p className="text-sm text-gray-400 italic">Nothing to preview yet.</p>
          )}
        </div>
      ) : mode === "live" ? (
        <div className="grid grid-cols-2 gap-3" style={{ minHeight: height }}>
          <MDEditor
            value={value}
            onChange={(val) => onChange(val || "")}
            height={height}
            preview="edit"
            hideToolbar={false}
          />
          <div
            className="border border-gray-200 rounded-md bg-white p-6 overflow-y-auto"
            style={{ height }}
          >
            {value.trim() ? (
              <ArticleMarkdown content={value} />
            ) : (
              <p className="text-sm text-gray-400 italic">Preview appears here.</p>
            )}
          </div>
        </div>
      ) : (
        <MDEditor
          value={value}
          onChange={(val) => onChange(val || "")}
          height={height}
          preview="edit"
        />
      )}
    </div>
  );
}
