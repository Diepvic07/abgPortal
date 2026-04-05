'use client';

import { useState, useRef, useEffect } from 'react';
import { ReactionSummary, ReactionType, REACTION_EMOJI, CommentType } from '@/types';

const REACTION_LABELS: Record<ReactionType, string> = {
  like: 'Thích',
  heart: 'Yêu',
  haha: 'Haha',
  wow: 'Wow',
  sad: 'Buồn',
  cold: 'Bình tĩnh',
  fire: 'Quá đỉnh',
  hug: 'Thương',
  highfive: 'Yeah',
};

const EMPTY_REACTIONS: ReactionSummary = { like: 0, heart: 0, haha: 0, wow: 0, sad: 0, cold: 0, fire: 0, hug: 0, highfive: 0 };

interface CommentReactionsProps {
  commentId: string;
  commentType: CommentType;
  entityId: string;
  reactions?: ReactionSummary;
  onReactionChange?: () => void;
}

export function CommentReactions({ commentId, commentType, entityId, reactions: initialReactions, onReactionChange }: CommentReactionsProps) {
  const [localReactions, setLocalReactions] = useState<ReactionSummary>(initialReactions || EMPTY_REACTIONS);
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hoveredReaction, setHoveredReaction] = useState<ReactionType | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Sync with props when they change (e.g. after a full refetch)
  useEffect(() => {
    if (initialReactions) setLocalReactions(initialReactions);
  }, [initialReactions]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleReaction = async (type: ReactionType) => {
    if (loading) return;
    setShowPicker(false);
    setHoveredReaction(null);

    // Optimistic update
    const prev = localReactions;
    const isRemoving = prev.my_reaction === type;
    const updated = { ...prev };

    if (isRemoving) {
      updated[type] = Math.max(0, updated[type] - 1);
      updated.my_reaction = undefined;
    } else {
      // Remove old reaction if switching
      if (prev.my_reaction) {
        updated[prev.my_reaction] = Math.max(0, updated[prev.my_reaction] - 1);
      }
      updated[type] = updated[type] + 1;
      updated.my_reaction = type;
    }
    setLocalReactions(updated);

    // Fire API in background
    setLoading(true);
    try {
      const url = `/api/community/${commentType === 'event' ? 'events' : 'proposals'}/${entityId}/comments/${commentId}/reactions`;

      const res = isRemoving
        ? await fetch(url, { method: 'DELETE' })
        : await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reaction_type: type }),
          });

      if (!res.ok) {
        console.error('Reaction failed:', res.status);
        setLocalReactions(prev); // rollback
      }
    } catch {
      setLocalReactions(prev); // rollback
    } finally {
      setLoading(false);
    }
  };

  const reactionTypes: ReactionType[] = ['like', 'heart', 'haha', 'wow', 'sad', 'cold', 'fire', 'hug', 'highfive'];
  const activeReactions = reactionTypes.filter(t => localReactions[t] > 0);

  return (
    <div className="flex items-center gap-1 relative">
      {activeReactions.map(type => (
        <button
          key={type}
          onClick={() => handleReaction(type)}
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-colors ${
            localReactions.my_reaction === type
              ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          disabled={loading}
          title={REACTION_LABELS[type]}
        >
          <span>{REACTION_EMOJI[type]}</span>
          <span>{localReactions[type]}</span>
        </button>
      ))}

      <div ref={pickerRef} className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className={`inline-flex items-center justify-center w-7 h-7 rounded-full transition-all text-sm ${
            showPicker
              ? 'bg-blue-100 scale-110'
              : localReactions.my_reaction
                ? 'hover:scale-125 hover:bg-gray-100'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 hover:scale-110 animate-pulse hover:animate-none'
          }`}
          disabled={loading}
          title="React"
        >
          {localReactions.my_reaction ? REACTION_EMOJI[localReactions.my_reaction] : '🫠'}
        </button>

        {showPicker && (
          <div className="absolute bottom-full left-0 mb-2 bg-white rounded-2xl shadow-xl border border-gray-200 px-2 py-2 z-10">
            {hoveredReaction && (
              <div className="text-center mb-1">
                <span className="text-[10px] font-medium bg-gray-800 text-white px-2 py-0.5 rounded-full">
                  {REACTION_LABELS[hoveredReaction]}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1">
              {reactionTypes.map(type => (
                <button
                  key={type}
                  onClick={() => handleReaction(type)}
                  onMouseEnter={() => setHoveredReaction(type)}
                  onMouseLeave={() => setHoveredReaction(null)}
                  className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-150 text-xl ${
                    localReactions.my_reaction === type
                      ? 'bg-blue-50 scale-110'
                      : 'hover:bg-gray-100'
                  } ${hoveredReaction === type ? 'scale-[1.4] -translate-y-1' : 'hover:scale-125'}`}
                >
                  {REACTION_EMOJI[type]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
