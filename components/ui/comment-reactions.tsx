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

interface CommentReactionsProps {
  commentId: string;
  commentType: CommentType;
  entityId: string;
  reactions?: ReactionSummary;
  onReactionChange: () => void;
}

export function CommentReactions({ commentId, commentType, entityId, reactions, onReactionChange }: CommentReactionsProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hoveredReaction, setHoveredReaction] = useState<ReactionType | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

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
    setLoading(true);
    setShowPicker(false);

    try {
      const url = `/api/community/${commentType === 'event' ? 'events' : 'proposals'}/${entityId}/comments/${commentId}/reactions`;

      if (reactions?.my_reaction === type) {
        await fetch(url, { method: 'DELETE' });
      } else {
        await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reaction_type: type }),
        });
      }
      onReactionChange();
    } finally {
      setLoading(false);
    }
  };

  const reactionTypes: ReactionType[] = ['like', 'heart', 'haha', 'wow', 'sad', 'cold', 'fire', 'hug', 'highfive'];
  const activeReactions = reactionTypes.filter(t => reactions && reactions[t] > 0);

  return (
    <div className="flex items-center gap-1 relative">
      {/* Existing reaction badges */}
      {activeReactions.map(type => (
        <button
          key={type}
          onClick={() => handleReaction(type)}
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-colors ${
            reactions?.my_reaction === type
              ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          disabled={loading}
          title={REACTION_LABELS[type]}
        >
          <span>{REACTION_EMOJI[type]}</span>
          <span>{reactions![type]}</span>
        </button>
      ))}

      {/* Add reaction button */}
      <div ref={pickerRef} className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className={`inline-flex items-center justify-center w-7 h-7 rounded-full transition-all text-sm ${
            showPicker
              ? 'bg-blue-100 scale-110'
              : reactions?.my_reaction
                ? 'hover:scale-125 hover:bg-gray-100'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 hover:scale-110 animate-pulse hover:animate-none'
          }`}
          disabled={loading}
          title="React"
        >
          {reactions?.my_reaction ? REACTION_EMOJI[reactions.my_reaction] : '🫠'}
        </button>

        {showPicker && (
          <div className="absolute bottom-full left-0 mb-2 bg-white rounded-2xl shadow-xl border border-gray-200 px-2 py-2 z-10">
            {/* Label tooltip */}
            {hoveredReaction && (
              <div className="text-center mb-1">
                <span className="text-[10px] font-medium text-gray-600 bg-gray-800 text-white px-2 py-0.5 rounded-full">
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
                    reactions?.my_reaction === type
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
