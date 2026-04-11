'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';

interface MentionMember {
  id: string;
  name: string;
  avatar_url: string | null;
  abg_class: string | null;
}

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
  disabled?: boolean;
}

export function MentionTextarea({
  value,
  onChange,
  placeholder,
  maxLength = 2000,
  className = '',
  disabled = false,
}: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [query, setQuery] = useState('');
  const [members, setMembers] = useState<MentionMember[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1);
  const [loading, setLoading] = useState(false);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced member search
  const searchMembers = useCallback((q: string) => {
    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);

    if (q.length < 1) {
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/members/search-mention?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          setMembers(data.members || []);
        }
      } catch {
        // Silently fail
      }
      setLoading(false);
    }, 200);
  }, []);

  // Detect @ trigger
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = newValue.slice(0, cursorPos);

    // Find the last @ that starts a mention (not inside an existing mention)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex >= 0) {
      // Check it's at start or preceded by whitespace
      const charBefore = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
      if (charBefore === ' ' || charBefore === '\n' || lastAtIndex === 0) {
        const mentionQuery = textBeforeCursor.slice(lastAtIndex + 1);
        // Only show dropdown if no space/newline after @, and not too long
        if (mentionQuery.length <= 30 && !/[\n]/.test(mentionQuery)) {
          setMentionStart(lastAtIndex);
          setQuery(mentionQuery);
          setShowDropdown(true);
          setSelectedIndex(0);
          searchMembers(mentionQuery);
          return;
        }
      }
    }

    setShowDropdown(false);
  };

  // Insert mention
  const insertMention = useCallback((member: MentionMember) => {
    const textarea = textareaRef.current;
    if (!textarea || mentionStart < 0) return;

    const before = value.slice(0, mentionStart);
    const cursorPos = textarea.selectionStart;
    const after = value.slice(cursorPos);
    const mentionText = `@[${member.name}](${member.id}) `;
    const newValue = before + mentionText + after;

    onChange(newValue);
    setShowDropdown(false);
    setQuery('');

    // Restore cursor position after the mention
    requestAnimationFrame(() => {
      const newCursorPos = before.length + mentionText.length;
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    });
  }, [value, mentionStart, onChange]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showDropdown || members.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % members.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + members.length) % members.length);
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      insertMention(members[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    if (!showDropdown) return;
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        textareaRef.current && !textareaRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showDropdown]);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        className={className}
      />

      {/* Mention dropdown */}
      {showDropdown && (members.length > 0 || loading) && (
        <div
          ref={dropdownRef}
          className="absolute left-0 bottom-full mb-1 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden"
        >
          {loading && members.length === 0 ? (
            <div className="p-3 text-sm text-gray-400 text-center">...</div>
          ) : (
            <div className="max-h-48 overflow-y-auto py-1">
              {members.map((member, i) => (
                <button
                  key={member.id}
                  type="button"
                  className={`flex items-center gap-2.5 w-full px-3 py-2 text-left text-sm transition-colors ${
                    i === selectedIndex ? 'bg-blue-50 text-blue-900' : 'hover:bg-gray-50 text-gray-700'
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent textarea blur
                    insertMention(member);
                  }}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  {member.avatar_url ? (
                    <Image
                      src={member.avatar_url}
                      alt=""
                      width={28}
                      height={28}
                      className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 text-xs font-medium text-gray-500">
                      {member.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{member.name}</p>
                    {member.abg_class && (
                      <p className="text-xs text-gray-400">{member.abg_class}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Parse mention markers in comment text and return React elements.
 * Converts @[Name](member_id) to styled spans.
 */
export function renderMentions(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    // Text before mention
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    // Mention span
    const name = match[1];
    parts.push(
      <span key={match.index} className="text-blue-600 font-medium">
        @{name}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

/**
 * Extract mentioned member IDs from comment text.
 */
export function extractMentionedIds(text: string): string[] {
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const ids: string[] = [];
  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    ids.push(match[2]);
  }
  return [...new Set(ids)];
}
