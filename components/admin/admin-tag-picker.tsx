"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface PickedMember {
  id: string;
  name: string;
  avatar_url?: string | null;
  abg_class?: string | null;
}

interface AdminTagPickerProps {
  taggedIds: string[];
  onChange: (ids: string[]) => void;
}

export function AdminTagPicker({ taggedIds, onChange }: AdminTagPickerProps) {
  // Cache of member data keyed by id. Chips render from taggedIds + this cache.
  const [memberCache, setMemberCache] = useState<Record<string, PickedMember>>({});
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PickedMember[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Hydrate missing member data from API (e.g. on edit load).
  useEffect(() => {
    const missing = taggedIds.filter(id => !memberCache[id]);
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/members/by-ids?ids=${missing.join(",")}`);
        if (!res.ok) return;
        const json = await res.json();
        const fetched: PickedMember[] = json.data?.members || json.members || [];
        if (cancelled) return;
        setMemberCache(prev => {
          const next = { ...prev };
          for (const m of fetched) next[m.id] = m;
          return next;
        });
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [taggedIds, memberCache]);

  const tagged: PickedMember[] = taggedIds.map(
    id => memberCache[id] || { id, name: id.slice(0, 8) + '…' }
  );

  const searchMembers = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 1) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/members/search-mention?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.members || []);
        }
      } catch {
        // ignore
      }
      setLoading(false);
    }, 200);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function addMember(m: PickedMember) {
    if (taggedIds.includes(m.id)) return;
    setMemberCache(prev => ({ ...prev, [m.id]: m }));
    onChange([...taggedIds, m.id]);
    setQuery("");
    setResults([]);
    setShowDropdown(false);
  }

  function removeMember(id: string) {
    onChange(taggedIds.filter(i => i !== id));
  }

  const filteredResults = results.filter(r => !taggedIds.includes(r.id));

  return (
    <div ref={containerRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Tag members
        <span className="text-gray-400 font-normal ml-1">
          (tagged members are notified when tagged and when anyone comments)
        </span>
      </label>

      {/* Chips */}
      {tagged.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tagged.map(m => (
            <span
              key={m.id}
              className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs text-blue-800"
            >
              {m.avatar_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.avatar_url} alt="" className="w-4 h-4 rounded-full object-cover" />
              )}
              <span>{m.name}</span>
              {m.abg_class && (
                <span className="text-blue-500">· {m.abg_class}</span>
              )}
              <button
                type="button"
                onClick={() => removeMember(m.id)}
                className="w-4 h-4 rounded-full bg-blue-100 hover:bg-red-200 hover:text-red-700 text-blue-600 flex items-center justify-center text-[10px]"
                aria-label={`Remove ${m.name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            searchMembers(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => query && setShowDropdown(true)}
          placeholder="Search members by name…"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {showDropdown && query.length > 0 && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
            {loading && (
              <div className="px-3 py-2 text-xs text-gray-500">Searching…</div>
            )}
            {!loading && filteredResults.length === 0 && (
              <div className="px-3 py-2 text-xs text-gray-500">No members found.</div>
            )}
            {!loading && filteredResults.map(m => (
              <button
                type="button"
                key={m.id}
                onClick={() => addMember(m)}
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
                <span className="text-sm text-gray-900">{m.name}</span>
                {m.abg_class && (
                  <span className="text-xs text-gray-500">· {m.abg_class}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
