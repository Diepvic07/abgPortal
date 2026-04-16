"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ArticleMarkdown } from "@/components/news/article-markdown";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

interface AdminMarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: number;
}

type Mode = "edit" | "live" | "preview";

interface PickerMember {
  id: string;
  name: string;
  avatar_url?: string | null;
  abg_class?: string | null;
  public_profile_slug?: string | null;
}

export function AdminMarkdownEditor({ value, onChange, height = 300 }: AdminMarkdownEditorProps) {
  const [mode, setMode] = useState<Mode>("edit");

  // Tag-in-content state
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [showTagPopover, setShowTagPopover] = useState(false);
  const [tagQuery, setTagQuery] = useState("");
  const [tagResults, setTagResults] = useState<PickerMember[]>([]);
  const [tagLoading, setTagLoading] = useState(false);
  const tagDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const searchMembers = useCallback((q: string) => {
    if (tagDebounceRef.current) clearTimeout(tagDebounceRef.current);
    if (q.length < 1) {
      setTagResults([]);
      setTagLoading(false);
      return;
    }
    setTagLoading(true);
    tagDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/members/search-mention?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          setTagResults(data.members || []);
        }
      } catch {
        // ignore
      }
      setTagLoading(false);
    }, 200);
  }, []);

  // Close popover on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowTagPopover(false);
      }
    }
    if (showTagPopover) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [showTagPopover]);

  function insertMention(m: PickerMember) {
    // Always link via the member UUID — it's stable (never changes if the
    // admin renames a member) and /profile/[id] resolves UUIDs directly.
    const mention = `[@${m.name}](/profile/${m.id})`;
    const textarea = containerRef.current?.querySelector<HTMLTextAreaElement>(".w-md-editor-text-input");

    if (!textarea) {
      onChange(value + mention);
    } else {
      const start = textarea.selectionStart ?? value.length;
      const end = textarea.selectionEnd ?? value.length;
      const newValue = value.slice(0, start) + mention + value.slice(end);
      onChange(newValue);
      queueMicrotask(() => {
        textarea.focus();
        const pos = start + mention.length;
        textarea.setSelectionRange(pos, pos);
      });
    }

    setShowTagPopover(false);
    setTagQuery("");
    setTagResults([]);
  }

  return (
    <div data-color-mode="light" ref={containerRef}>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
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

        {/* Tag member button */}
        <div className="relative" ref={popoverRef}>
          <button
            type="button"
            onClick={() => {
              setShowTagPopover((v) => !v);
              setTagQuery("");
              setTagResults([]);
            }}
            disabled={mode === "preview"}
            className="flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Insert a link to a member at the cursor"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Tag member
          </button>

          {showTagPopover && (
            <div className="absolute z-30 left-0 top-full mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg">
              <div className="p-2 border-b border-gray-100">
                <input
                  type="text"
                  autoFocus
                  value={tagQuery}
                  onChange={(e) => {
                    setTagQuery(e.target.value);
                    searchMembers(e.target.value);
                  }}
                  placeholder="Search members by name…"
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="max-h-64 overflow-y-auto">
                {tagLoading && (
                  <div className="px-3 py-2 text-xs text-gray-500">Searching…</div>
                )}
                {!tagLoading && tagQuery && tagResults.length === 0 && (
                  <div className="px-3 py-2 text-xs text-gray-500">No members found.</div>
                )}
                {!tagLoading && !tagQuery && (
                  <div className="px-3 py-2 text-xs text-gray-400">Type to search.</div>
                )}
                {!tagLoading && tagResults.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => insertMention(m)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 text-left"
                  >
                    {m.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-semibold text-gray-600">
                        {m.name[0]?.toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm text-gray-900 flex-1 truncate">{m.name}</span>
                    {m.abg_class && (
                      <span className="text-xs text-gray-500">· {m.abg_class}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <span className="text-xs text-gray-400">
          Preview uses the same renderer as the live article.
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
