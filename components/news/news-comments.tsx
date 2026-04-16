'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { NewsArticleComment } from '@/types';
import { CommentReactions } from '@/components/ui/comment-reactions';
import {
  MentionTextarea,
  renderMentions,
  encodementions,
  decodeMentions,
} from '@/components/ui/mention-textarea';

const AVATAR_COLORS = [
  'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
  'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-cyan-500', 'bg-emerald-500',
  'bg-violet-500', 'bg-rose-500', 'bg-amber-500', 'bg-sky-500', 'bg-fuchsia-500',
  'bg-lime-600', 'bg-yellow-600',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function timeAgo(dateStr: string, lang: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (lang === 'vi') {
    if (months > 0) return `${months} tháng trước`;
    if (weeks > 0) return `${weeks} tuần trước`;
    if (days > 0) return `${days} ngày trước`;
    if (hours > 0) return `${hours} giờ trước`;
    if (minutes > 0) return `${minutes} phút trước`;
    return 'vừa xong';
  }
  if (months > 0) return `${months}mo ago`;
  if (weeks > 0) return `${weeks}w ago`;
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

const EMOJI_LIST = ['😀','😂','😍','🥰','😎','🤔','👍','👏','🎉','🔥','❤️','💯','🙏','😢','😮','✅','⭐','💪','🤝','👀'];

interface Props {
  slug: string;
}

export function NewsComments({ slug }: Props) {
  const { locale } = useTranslation();
  const { data: session } = useSession();

  const [comments, setComments] = useState<NewsArticleComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const [editMentions, setEditMentions] = useState<{ name: string; id: string }[]>([]);
  const [commentImageFile, setCommentImageFile] = useState<File | null>(null);
  const [commentImagePreview, setCommentImagePreview] = useState<string | null>(null);
  const [replyImageFile, setReplyImageFile] = useState<File | null>(null);
  const [replyImagePreview, setReplyImagePreview] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);

  const commentImageRef = useRef<HTMLInputElement>(null);
  const replyImageRef = useRef<HTMLInputElement>(null);
  const commentMentionsRef = useRef<{ name: string; id: string }[]>([]);
  const replyMentionsRef = useRef<{ name: string; id: string }[]>([]);

  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, session]);

  async function fetchComments(silent = false) {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/news/${slug}/comments`);
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        setComments(data.comments || []);
        if (data.currentMemberId) setCurrentMemberId(data.currentMemberId);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  function insertEmoji(emoji: string, isReply?: boolean) {
    if (isReply) setReplyBody(prev => prev + emoji);
    else setCommentText(prev => prev + emoji);
    setShowEmojiPicker(null);
  }

  function handleCommentImageSelect(e: React.ChangeEvent<HTMLInputElement>, isReply?: boolean) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) return;
    const url = URL.createObjectURL(file);
    if (isReply) {
      setReplyImageFile(file);
      setReplyImagePreview(url);
    } else {
      setCommentImageFile(file);
      setCommentImagePreview(url);
    }
  }

  function clearCommentImage(isReply?: boolean) {
    if (isReply) {
      if (replyImagePreview) URL.revokeObjectURL(replyImagePreview);
      setReplyImageFile(null);
      setReplyImagePreview(null);
      if (replyImageRef.current) replyImageRef.current.value = '';
    } else {
      if (commentImagePreview) URL.revokeObjectURL(commentImagePreview);
      setCommentImageFile(null);
      setCommentImagePreview(null);
      if (commentImageRef.current) commentImageRef.current.value = '';
    }
  }

  async function uploadCommentImage(file: File): Promise<string | null> {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/community/comments/upload-image', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        return data.data?.url || data.url;
      }
    } catch (err) {
      console.error('Image upload failed:', err);
    }
    return null;
  }

  async function handleComment(e: React.FormEvent, parentCommentId?: string) {
    e.preventDefault();
    const rawBody = parentCommentId ? replyBody.trim() : commentText.trim();
    const mentions = parentCommentId ? replyMentionsRef.current : commentMentionsRef.current;
    const body = mentions.length > 0 ? encodementions(rawBody, mentions) : rawBody;
    const imageFile = parentCommentId ? replyImageFile : commentImageFile;
    if (!body && !imageFile) return;

    setSubmittingComment(true);
    try {
      let image_url: string | undefined;
      if (imageFile) {
        const url = await uploadCommentImage(imageFile);
        if (url) image_url = url;
        else {
          setSubmittingComment(false);
          return;
        }
      }

      const res = await fetch(`/api/news/${slug}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: body || '',
          parent_comment_id: parentCommentId,
          image_url,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        const newComment: NewsArticleComment = {
          ...data.comment,
          member_name: session?.user?.name || 'Me',
          member_avatar_url: session?.user?.image || undefined,
          reactions: {
            like: 0, heart: 0, haha: 0, wow: 0, sad: 0, cold: 0, fire: 0, hug: 0, highfive: 0,
          },
          replies: [],
        };
        if (!currentMemberId && newComment.member_id) setCurrentMemberId(newComment.member_id);

        if (parentCommentId) {
          setReplyBody('');
          setReplyingTo(null);
          clearCommentImage(true);
          replyMentionsRef.current = [];
          setComments(prev => prev.map(c =>
            c.id === parentCommentId
              ? { ...c, replies: [...(c.replies || []), newComment] }
              : c
          ));
        } else {
          setCommentText('');
          clearCommentImage(false);
          commentMentionsRef.current = [];
          setComments(prev => [...prev, newComment]);
        }
      }
    } catch {
      // ignore
    } finally {
      setSubmittingComment(false);
    }
  }

  async function handleEditComment(commentId: string) {
    if (!editBody.trim()) return;
    const newBody = encodementions(editBody.trim(), editMentions);
    setEditingComment(null);
    setEditBody('');
    setEditMentions([]);

    const updateBody = (list: NewsArticleComment[]): NewsArticleComment[] =>
      list.map(c =>
        c.id === commentId
          ? { ...c, body: newBody }
          : { ...c, replies: c.replies ? updateBody(c.replies) : [] }
      );
    setComments(prev => updateBody(prev));

    try {
      await fetch(`/api/news/${slug}/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: newBody }),
      });
    } catch {}
  }

  async function handleDeleteComment(commentId: string) {
    setComments(prev =>
      prev
        .filter(c => c.id !== commentId)
        .map(c => ({ ...c, replies: (c.replies || []).filter(r => r.id !== commentId) }))
    );

    try {
      await fetch(`/api/news/${slug}/comments/${commentId}`, { method: 'DELETE' });
    } catch {}
  }

  return (
    <section className="max-w-3xl mx-auto px-4 mt-12 border-t border-gray-200 pt-10">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {locale === 'vi' ? 'Bình luận' : 'Comments'} ({comments.length})
      </h2>

      {session ? (
        <form onSubmit={handleComment} className="mb-6">
          <div className="rounded-lg border border-gray-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500">
            <MentionTextarea
              value={commentText}
              onChange={setCommentText}
              placeholder={locale === 'vi' ? 'Viết bình luận... (gõ @ để tag thành viên)' : 'Write a comment... (type @ to mention)'}
              className="w-full px-4 py-2.5 border-0 rounded-t-lg focus:ring-0 focus:outline-none min-h-[80px]"
              maxLength={2000}
              mentionsRef={commentMentionsRef}
            />
            {commentImagePreview && (
              <div className="relative mx-4 mb-2 inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={commentImagePreview} alt="Preview" className="max-h-32 rounded-lg border border-gray-200 object-cover" />
                <button type="button" onClick={() => clearCommentImage(false)} className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white shadow hover:bg-red-600">&times;</button>
              </div>
            )}
            <div className="flex justify-between items-center border-t border-gray-100 px-3 py-1.5">
              <div className="relative flex items-center gap-0.5">
                <input ref={commentImageRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => handleCommentImageSelect(e)} />
                <button type="button" onClick={() => commentImageRef.current?.click()} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title={locale === 'vi' ? 'Đính kèm ảnh' : 'Attach image'}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Zm16.5-13.5h.008v.008h-.008V7.5Zm0 0a1.125 1.125 0 1 0-2.25 0 1.125 1.125 0 0 0 2.25 0Z" /></svg>
                </button>
                <button type="button" onClick={() => setShowEmojiPicker(showEmojiPicker === 'main' ? null : 'main')} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title="Emoji">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" /></svg>
                </button>
                {showEmojiPicker === 'main' && (
                  <div className="absolute bottom-full left-0 z-10 mb-1 grid w-64 grid-cols-10 gap-0.5 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
                    {EMOJI_LIST.map((e) => (
                      <button key={e} type="button" onClick={() => insertEmoji(e)} className="rounded p-1 text-lg hover:bg-gray-100">{e}</button>
                    ))}
                  </div>
                )}
                <span className="ml-1 text-xs text-gray-400">{commentText.length}/2000</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 hidden sm:inline">⌘/Ctrl ↵</span>
                <button
                  type="submit"
                  disabled={(!commentText.trim() && !commentImageFile) || submittingComment}
                  className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {submittingComment ? '...' : (locale === 'vi' ? 'Gửi' : 'Post')}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <Link
          href="/login"
          className="mb-6 block w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors text-sm text-center"
        >
          {locale === 'vi' ? '💬 Đăng nhập để bình luận' : '💬 Sign in to comment'}
        </Link>
      )}

      {loading && session ? (
        <p className="text-gray-500 text-sm">{locale === 'vi' ? 'Đang tải...' : 'Loading...'}</p>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => (
            <div key={c.id}>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  {c.member_avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.member_avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white ${getAvatarColor(c.member_name || '?')}`}>
                      {(c.member_name || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="font-medium text-sm text-gray-900">{c.member_name || 'Unknown'}</span>
                  <span className="text-xs text-gray-500">{timeAgo(c.created_at, locale || 'vi')}</span>
                </div>
                {editingComment === c.id ? (
                  <div className="mt-1">
                    <textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      maxLength={2000}
                      autoFocus
                    />
                    <div className="mt-2 flex gap-2 justify-end">
                      <button onClick={() => setEditingComment(null)} className="text-xs text-gray-500 px-3 py-1">
                        {locale === 'vi' ? 'Hủy' : 'Cancel'}
                      </button>
                      <button
                        onClick={() => handleEditComment(c.id)}
                        disabled={!editBody.trim()}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {locale === 'vi' ? 'Lưu' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">{renderMentions(c.body)}</p>
                    {c.image_url && (
                      <a href={c.image_url} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={c.image_url} alt="" className="max-h-60 rounded-lg border border-gray-200 object-cover" />
                      </a>
                    )}
                  </>
                )}
                <div className="mt-2 flex items-center gap-3">
                  <CommentReactions
                    commentId={c.id}
                    commentType="news"
                    entityId={slug}
                    reactions={c.reactions}
                    onReactionChange={() => void fetchComments(true)}
                  />
                  {session && (
                    <button
                      onClick={() => {
                        if (replyingTo === c.id) {
                          setReplyingTo(null);
                          setReplyBody('');
                        } else {
                          setReplyingTo(c.id);
                          if (c.member_id !== currentMemberId) {
                            const authorName = c.member_name || 'Member';
                            setReplyBody(`@${authorName} `);
                            replyMentionsRef.current = [{ name: authorName, id: c.member_id }];
                          } else {
                            setReplyBody('');
                            replyMentionsRef.current = [];
                          }
                        }
                      }}
                      className="text-xs text-gray-500 hover:text-blue-600 transition-colors"
                    >
                      {locale === 'vi' ? 'Trả lời' : 'Reply'}
                    </button>
                  )}
                  {currentMemberId === c.member_id && (
                    <>
                      <button
                        onClick={() => {
                          const { displayText, mentions } = decodeMentions(c.body);
                          setEditingComment(c.id);
                          setEditBody(displayText);
                          setEditMentions(mentions);
                        }}
                        className="text-xs text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        {locale === 'vi' ? 'Sửa' : 'Edit'}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(locale === 'vi' ? 'Xóa bình luận này?' : 'Delete this comment?')) {
                            handleDeleteComment(c.id);
                          }
                        }}
                        className="text-xs text-gray-400 hover:text-red-600 transition-colors"
                      >
                        {locale === 'vi' ? 'Xóa' : 'Delete'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Replies */}
              {c.replies && c.replies.length > 0 && (
                <div className="ml-8 mt-2 space-y-2 border-l-2 border-gray-200 pl-4">
                  {c.replies.map((reply) => (
                    <div key={reply.id} className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        {reply.member_avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={reply.member_avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold text-white ${getAvatarColor(reply.member_name || '?')}`}>
                            {(reply.member_name || '?')[0].toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium text-sm text-gray-900">{reply.member_name || 'Unknown'}</span>
                        <span className="text-xs text-gray-500">{timeAgo(reply.created_at, locale || 'vi')}</span>
                      </div>
                      {editingComment === reply.id ? (
                        <div className="mt-1">
                          <textarea
                            value={editBody}
                            onChange={(e) => setEditBody(e.target.value)}
                            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={2}
                            maxLength={2000}
                            autoFocus
                          />
                          <div className="mt-1 flex gap-2 justify-end">
                            <button onClick={() => setEditingComment(null)} className="text-xs text-gray-500 px-2 py-1">
                              {locale === 'vi' ? 'Hủy' : 'Cancel'}
                            </button>
                            <button
                              onClick={() => handleEditComment(reply.id)}
                              disabled={!editBody.trim()}
                              className="rounded-lg bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                              {locale === 'vi' ? 'Lưu' : 'Save'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-gray-700 text-sm whitespace-pre-wrap">{renderMentions(reply.body)}</p>
                          {reply.image_url && (
                            <a href={reply.image_url} target="_blank" rel="noopener noreferrer" className="mt-1.5 block">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={reply.image_url} alt="" className="max-h-48 rounded-lg border border-gray-200 object-cover" />
                            </a>
                          )}
                        </>
                      )}
                      <div className="mt-1 flex items-center gap-3">
                        <CommentReactions
                          commentId={reply.id}
                          commentType="news"
                          entityId={slug}
                          reactions={reply.reactions}
                        />
                        {currentMemberId === reply.member_id && (
                          <>
                            <button
                              onClick={() => {
                                const { displayText, mentions } = decodeMentions(reply.body);
                                setEditingComment(reply.id);
                                setEditBody(displayText);
                                setEditMentions(mentions);
                              }}
                              className="text-xs text-gray-400 hover:text-blue-600 transition-colors"
                            >
                              {locale === 'vi' ? 'Sửa' : 'Edit'}
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(locale === 'vi' ? 'Xóa bình luận này?' : 'Delete this comment?')) {
                                  handleDeleteComment(reply.id);
                                }
                              }}
                              className="text-xs text-gray-400 hover:text-red-600 transition-colors"
                            >
                              {locale === 'vi' ? 'Xóa' : 'Delete'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply form */}
              {replyingTo === c.id && (
                <form onSubmit={(e) => handleComment(e, c.id)} className="ml-8 mt-2 pl-4">
                  <div className="rounded-lg border border-gray-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500">
                    <MentionTextarea
                      value={replyBody}
                      onChange={setReplyBody}
                      placeholder={locale === 'vi' ? 'Viết trả lời... (gõ @ để tag)' : 'Write a reply... (type @ to mention)'}
                      className="w-full px-3 py-2 border-0 rounded-t-lg text-sm focus:ring-0 focus:outline-none min-h-[60px]"
                      maxLength={2000}
                      mentionsRef={replyMentionsRef}
                    />
                    {replyImagePreview && (
                      <div className="relative mx-3 mb-2 inline-block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={replyImagePreview} alt="Preview" className="max-h-24 rounded-lg border border-gray-200 object-cover" />
                        <button type="button" onClick={() => clearCommentImage(true)} className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white shadow hover:bg-red-600">&times;</button>
                      </div>
                    )}
                    <div className="flex items-center justify-between border-t border-gray-100 px-2 py-1">
                      <div className="relative flex items-center gap-0.5">
                        <input ref={replyImageRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => handleCommentImageSelect(e, true)} />
                        <button type="button" onClick={() => replyImageRef.current?.click()} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title={locale === 'vi' ? 'Đính kèm ảnh' : 'Attach image'}>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Zm16.5-13.5h.008v.008h-.008V7.5Zm0 0a1.125 1.125 0 1 0-2.25 0 1.125 1.125 0 0 0 2.25 0Z" /></svg>
                        </button>
                        <button type="button" onClick={() => setShowEmojiPicker(showEmojiPicker === 'reply' ? null : 'reply')} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title="Emoji">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" /></svg>
                        </button>
                        {showEmojiPicker === 'reply' && (
                          <div className="absolute bottom-full left-0 z-10 mb-1 grid w-56 grid-cols-10 gap-0.5 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
                            {EMOJI_LIST.map((e) => (
                              <button key={e} type="button" onClick={() => insertEmoji(e, true)} className="rounded p-0.5 text-base hover:bg-gray-100">{e}</button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => { setReplyingTo(null); setReplyBody(''); clearCommentImage(true); setShowEmojiPicker(null); }}
                          className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
                        >
                          {locale === 'vi' ? 'Hủy' : 'Cancel'}
                        </button>
                        <span className="text-[10px] text-gray-400 hidden sm:inline">⌘/Ctrl ↵</span>
                        <button
                          type="submit"
                          disabled={(!replyBody.trim() && !replyImageFile) || submittingComment}
                          className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs hover:bg-blue-700 disabled:opacity-50"
                        >
                          {locale === 'vi' ? 'Gửi' : 'Reply'}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              )}
            </div>
          ))}
          {!loading && comments.length === 0 && (
            <p className="text-gray-500 text-sm">
              {locale === 'vi' ? 'Chưa có bình luận.' : 'No comments yet.'}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
