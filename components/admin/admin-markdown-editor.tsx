"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

interface AdminMarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: number;
}

export function AdminMarkdownEditor({ value, onChange, height = 300 }: AdminMarkdownEditorProps) {
  const [preview, setPreview] = useState<"edit" | "live" | "preview">("edit");

  return (
    <div data-color-mode="light">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex rounded-md border border-gray-300 text-xs overflow-hidden">
          <button
            type="button"
            onClick={() => setPreview("edit")}
            className={`px-3 py-1.5 ${preview === "edit" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            title="Full-screen writing area"
          >
            Write
          </button>
          <button
            type="button"
            onClick={() => setPreview("live")}
            className={`px-3 py-1.5 border-x border-gray-300 ${preview === "live" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            title="Write on the left, see formatted result on the right"
          >
            Write + Preview
          </button>
          <button
            type="button"
            onClick={() => setPreview("preview")}
            className={`px-3 py-1.5 ${preview === "preview" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            title="See how the article will look to readers"
          >
            Preview
          </button>
        </div>
        <span className="text-xs text-gray-400">
          Tip: Use the toolbar above the editor for formatting (bold, headings, links, etc.)
        </span>
      </div>
      <MDEditor value={value} onChange={(val) => onChange(val || "")} height={height} preview={preview} />
    </div>
  );
}
