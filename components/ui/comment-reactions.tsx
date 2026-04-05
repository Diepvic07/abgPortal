'use client';

import { useState, useRef, useEffect } from 'react';
import { ReactionSummary, ReactionType, REACTION_EMOJI, CommentType } from '@/types';

interface CommentReactionsProps {
  commentId: string;
  commentType: CommentType;
  entityId: string; // event or proposal ID
  reactions?: ReactionSummary;
  onReactionChange: () => void;
}

export function CommentReactions({ commentId, commentType, entityId, reactions, onReactionChange }: CommentReactionsProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
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
        >
          <span>{REACTION_EMOJI[type]}</span>
          <span>{reactions![type]}</span>
        </button>
      ))}

      {/* Add reaction button */}
      <div ref={pickerRef} className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="inline-flex items-center justify-center w-6 h-6 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors text-xs"
          disabled={loading}
          title="React"
        >
          {reactions?.my_reaction ? REACTION_EMOJI[reactions.my_reaction] : '😀'}
        </button>

        {showPicker && (
          <div className="absolute bottom-full left-0 mb-1 flex items-center gap-0.5 bg-white rounded-full shadow-lg border border-gray-200 px-2 py-1 z-10">
            {reactionTypes.map(type => (
              <button
                key={type}
                onClick={() => handleReaction(type)}
                className={`w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-transform hover:scale-125 text-lg ${
                  reactions?.my_reaction === type ? 'bg-blue-50' : ''
                }`}
              >
                {REACTION_EMOJI[type]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
