'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { CommunityProposal, ProposalStatus, PROJECT_STATUSES, isProjectStatus } from '@/types';
import { ConfirmModal } from '@/components/ui/confirm-modal';

interface ProjectMember {
  member_id: string;
  joined_at: string;
  name: string | null;
  avatar_url: string | null;
  public_profile_slug: string | null;
}

interface StatusLogEntry {
  id: string;
  from_status: string | null;
  to_status: string;
  note: string | null;
  changed_at: string;
  changed_by_name: string | null;
}

interface Props {
  proposal: CommunityProposal;
  currentMemberId: string | null;
  isCreator: boolean;
  isAdmin: boolean;
  locale: string;
  onRefresh: () => void;
}

const STATUS_LABEL_VI: Record<string, string> = {
  project_active: 'Đang hoạt động',
  project_completed: 'Đã hoàn thành',
  project_discontinued: 'Đã dừng',
  project_closed: 'Chuyển giai đoạn',
};

const STATUS_LABEL_EN: Record<string, string> = {
  project_active: 'Active',
  project_completed: 'Completed',
  project_discontinued: 'Discontinued',
  project_closed: 'Closed Phase',
};

const STATUS_TONE: Record<string, { bg: string; text: string; ring: string }> = {
  project_active: { bg: 'bg-indigo-50', text: 'text-indigo-800', ring: 'ring-indigo-200' },
  project_completed: { bg: 'bg-emerald-50', text: 'text-emerald-800', ring: 'ring-emerald-200' },
  project_discontinued: { bg: 'bg-orange-50', text: 'text-orange-800', ring: 'ring-orange-200' },
  project_closed: { bg: 'bg-amber-50', text: 'text-amber-800', ring: 'ring-amber-200' },
};

const AVATAR_COLORS = [
  'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
  'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-cyan-500', 'bg-emerald-500',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function statusLabel(status: string, vi: boolean): string {
  const map = vi ? STATUS_LABEL_VI : STATUS_LABEL_EN;
  return map[status] || status;
}

export function ProposalProjectSection({
  proposal,
  currentMemberId,
  isCreator,
  isAdmin,
  locale,
  onRefresh,
}: Props) {
  const vi = locale === 'vi';
  const canManage = isCreator || isAdmin;
  const inProjectPhase = isProjectStatus(proposal.status);
  const preDecisionPhase = proposal.status === 'published' || proposal.status === 'upcoming';

  // Render nothing for archived / completed / removed / etc.
  if (!inProjectPhase && !(preDecisionPhase && canManage)) {
    return null;
  }

  return (
    <div className="mt-8">
      {preDecisionPhase && canManage && !inProjectPhase && (
        <ManageProposalBlock proposal={proposal} vi={vi} onRefresh={onRefresh} />
      )}
      {inProjectPhase && (
        <ProjectInfoBlock
          proposal={proposal}
          currentMemberId={currentMemberId}
          canManage={canManage}
          vi={vi}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}

// ==================== Manage Proposal (pre-decision) ====================

function ManageProposalBlock({
  proposal,
  vi,
  onRefresh,
}: {
  proposal: CommunityProposal;
  vi: boolean;
  onRefresh: () => void;
}) {
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleMarkComplete() {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/community/proposals/${proposal.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || (vi ? 'Không thể đánh dấu hoàn thành' : 'Failed to mark complete'));
        return;
      }
      setShowCompleteConfirm(false);
      onRefresh();
    } catch {
      setError(vi ? 'Có lỗi xảy ra' : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white border-2 border-blue-100 rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xl">⚙️</span>
        <h3 className="text-base font-bold text-gray-900">
          {vi ? 'Quản lý đề xuất' : 'Manage Proposal'}
        </h3>
      </div>
      <p className="text-sm text-gray-600">
        {vi
          ? 'Đề xuất này đang ở giai đoạn nào tiếp theo?'
          : 'What is the next phase for this proposal?'}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <button
          onClick={() => setShowCompleteConfirm(true)}
          disabled={submitting}
          className="text-left bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl p-4 transition-colors disabled:opacity-50"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">✅</span>
            <span className="font-semibold text-gray-900 text-sm">
              {vi ? 'Đánh dấu hoàn thành' : 'Mark Complete'}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            {vi
              ? 'Không có giai đoạn dự án — kết thúc tại đây.'
              : 'No project phase — wrap up here.'}
          </p>
        </button>

        <button
          onClick={() => setShowProjectModal(true)}
          disabled={submitting}
          className="text-left bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl p-4 transition-colors disabled:opacity-50"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🚀</span>
            <span className="font-semibold text-indigo-900 text-sm">
              {vi ? 'Chuyển sang giai đoạn dự án' : 'Move to Project Phase'}
            </span>
          </div>
          <p className="text-xs text-indigo-700">
            {vi
              ? 'Hình thành dự án, có nhóm thành viên + group chat.'
              : 'Form a project with members and a group chat.'}
          </p>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <ConfirmModal
        open={showCompleteConfirm}
        title={vi ? 'Đánh dấu đề xuất hoàn thành?' : 'Mark proposal as completed?'}
        message={
          vi
            ? 'Sau khi đánh dấu hoàn thành, đề xuất sẽ không thể tiếp tục nhận cam kết mới và không còn ở giai đoạn dự án.'
            : 'After marking complete, the proposal will stop accepting new commitments and cannot transition to a project phase.'
        }
        confirmLabel={vi ? 'Đánh dấu hoàn thành' : 'Mark Complete'}
        cancelLabel={vi ? 'Hủy' : 'Cancel'}
        variant="warning"
        onConfirm={handleMarkComplete}
        onCancel={() => setShowCompleteConfirm(false)}
      />

      {showProjectModal && (
        <ProjectFormModal
          proposalId={proposal.id}
          vi={vi}
          onClose={() => setShowProjectModal(false)}
          onCreated={() => {
            setShowProjectModal(false);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

// ==================== Project Info (active project) ====================

function ProjectInfoBlock({
  proposal,
  currentMemberId,
  canManage,
  vi,
  onRefresh,
}: {
  proposal: CommunityProposal;
  currentMemberId: string | null;
  canManage: boolean;
  vi: boolean;
  onRefresh: () => void;
}) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [statusLog, setStatusLog] = useState<StatusLogEntry[]>([]);
  const [iJoined, setIJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [showStatusChange, setShowStatusChange] = useState(false);

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/community/proposals/${proposal.id}/project`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
        setStatusLog(data.status_log || []);
        setIJoined(!!data.i_joined);
      }
    } catch {
      // ignore — empty state still renders
    } finally {
      setLoading(false);
    }
  }, [proposal.id]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject, proposal.status, proposal.project_status_note]);

  async function handleJoin() {
    if (!currentMemberId) {
      window.location.href = '/login';
      return;
    }
    setJoining(true);
    setError('');
    try {
      const res = await fetch(`/api/community/proposals/${proposal.id}/project/join`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || (vi ? 'Không thể tham gia' : 'Failed to join'));
        return;
      }
      await fetchProject();
    } catch {
      setError(vi ? 'Có lỗi xảy ra' : 'Something went wrong');
    } finally {
      setJoining(false);
    }
  }

  async function handleLeave() {
    setJoining(true);
    setError('');
    try {
      const res = await fetch(`/api/community/proposals/${proposal.id}/project/join`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || (vi ? 'Không thể rời dự án' : 'Failed to leave'));
        return;
      }
      setShowLeaveConfirm(false);
      await fetchProject();
    } catch {
      setError(vi ? 'Có lỗi xảy ra' : 'Something went wrong');
    } finally {
      setJoining(false);
    }
  }

  const tone = STATUS_TONE[proposal.status] || STATUS_TONE.project_active;
  const visibleMembers = showAllMembers ? members : members.slice(0, 8);

  return (
    <div className={`border ${tone.ring} ring-1 rounded-2xl overflow-hidden`}>
      {/* Header */}
      <div className={`${tone.bg} px-5 py-4 flex items-start justify-between gap-3`}>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🚀</span>
            <h3 className={`text-base font-bold ${tone.text}`}>
              {vi ? 'Dự án' : 'Project'}
            </h3>
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full bg-white ${tone.text}`}>
              {statusLabel(proposal.status, vi)}
            </span>
          </div>
          {proposal.project_started_at && (
            <p className="text-xs text-gray-600">
              {vi ? 'Bắt đầu' : 'Started'}:{' '}
              {new Date(proposal.project_started_at).toLocaleDateString(vi ? 'vi-VN' : 'en-US')}
            </p>
          )}
        </div>
      </div>

      <div className="p-5 space-y-4 bg-white">
        {/* Public note */}
        {proposal.project_status_note && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              {vi ? 'Ghi chú công khai' : 'Public note'}
            </p>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{proposal.project_status_note}</p>
          </div>
        )}

        {/* Members */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-700">
              {vi ? 'Thành viên' : 'Members'}{' '}
              <span className="text-gray-400 font-normal">({members.length})</span>
            </p>
            {!loading && members.length === 0 && (
              <span className="text-xs text-gray-400">{vi ? 'Chưa có ai tham gia' : 'No members yet'}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {visibleMembers.map((m) => {
              const name = m.name || (vi ? 'Thành viên' : 'Member');
              const initial = name.charAt(0).toUpperCase();
              const avatar = m.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.avatar_url} alt={name} className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <span className={`w-7 h-7 rounded-full ${getAvatarColor(name)} text-white text-xs font-medium flex items-center justify-center`}>
                  {initial}
                </span>
              );
              const content = (
                <span className="inline-flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full pl-0.5 pr-2.5 py-0.5 text-xs text-gray-700">
                  {avatar}
                  <span className="truncate max-w-[100px]">{name}</span>
                </span>
              );
              return m.public_profile_slug ? (
                <Link key={m.member_id} href={`/members/${m.public_profile_slug}`}>{content}</Link>
              ) : (
                <span key={m.member_id}>{content}</span>
              );
            })}
            {members.length > 8 && !showAllMembers && (
              <button
                onClick={() => setShowAllMembers(true)}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1"
              >
                +{members.length - 8} {vi ? 'thêm' : 'more'}
              </button>
            )}
          </div>
        </div>

        {/* Chat URL — visible only to joined members. */}
        {iJoined && proposal.project_chat_url && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1">
              {vi ? 'Group chat' : 'Group chat'}
            </p>
            <a
              href={proposal.project_chat_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-emerald-800 hover:underline break-all"
            >
              {proposal.project_chat_url}
            </a>
          </div>
        )}

        {/* Join / Leave */}
        {proposal.status === 'project_active' && (
          <div className="flex flex-wrap items-center gap-2">
            {iJoined ? (
              <>
                <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
                  <span>✓</span>
                  {vi ? 'Bạn đã tham gia' : 'You joined'}
                </span>
                <button
                  onClick={() => setShowLeaveConfirm(true)}
                  disabled={joining}
                  className="text-sm text-red-600 hover:text-red-700 px-3 py-1.5 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
                >
                  {vi ? 'Rời dự án' : 'Leave project'}
                </button>
              </>
            ) : (
              <button
                onClick={handleJoin}
                disabled={joining}
                className="text-sm font-medium px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {joining
                  ? (vi ? 'Đang tham gia...' : 'Joining...')
                  : (vi ? 'Tham gia dự án' : 'Join project')}
              </button>
            )}
          </div>
        )}

        {!iJoined && proposal.project_chat_url && proposal.status === 'project_active' && (
          <p className="text-xs text-gray-500 italic">
            {vi
              ? 'Tham gia dự án để xem link group chat.'
              : 'Join the project to see the group chat link.'}
          </p>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Status history */}
        {statusLog.length > 0 && (
          <div className="border-t border-gray-100 pt-3">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-xs text-gray-500 hover:text-gray-700 font-medium flex items-center gap-1"
            >
              {showHistory ? '▼' : '▶'} {vi ? 'Lịch sử trạng thái' : 'Status history'} ({statusLog.length})
            </button>
            {showHistory && (
              <div className="mt-3 space-y-3">
                {statusLog.map((l) => (
                  <div key={l.id} className="text-sm border-l-2 border-gray-200 pl-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-400">
                        {new Date(l.changed_at).toLocaleString(vi ? 'vi-VN' : 'en-US')}
                      </span>
                      {l.changed_by_name && (
                        <span className="text-xs text-gray-500">· {l.changed_by_name}</span>
                      )}
                      <span className="text-xs font-medium text-gray-700">
                        {l.from_status ? `${statusLabel(l.from_status, vi)} → ` : ''}{statusLabel(l.to_status, vi)}
                      </span>
                    </div>
                    {l.note && (
                      <p className="text-gray-700 mt-1 whitespace-pre-wrap">{l.note}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Status change controls (creator/admin) */}
        {canManage && (
          <div className="border-t border-gray-100 pt-3">
            {!showStatusChange ? (
              <button
                onClick={() => setShowStatusChange(true)}
                className="text-sm px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                {vi ? '✏️ Đổi trạng thái dự án' : '✏️ Change project status'}
              </button>
            ) : (
              <StatusChangeForm
                proposalId={proposal.id}
                currentStatus={proposal.status}
                vi={vi}
                onCancel={() => setShowStatusChange(false)}
                onSaved={() => {
                  setShowStatusChange(false);
                  onRefresh();
                }}
              />
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        open={showLeaveConfirm}
        title={vi ? 'Rời dự án?' : 'Leave project?'}
        message={
          vi
            ? 'Bạn sẽ không còn thấy link group chat và sẽ không nhận thông báo cập nhật từ dự án này.'
            : 'You will no longer see the group chat link and will stop receiving updates from this project.'
        }
        confirmLabel={vi ? 'Rời dự án' : 'Leave'}
        cancelLabel={vi ? 'Hủy' : 'Cancel'}
        variant="danger"
        onConfirm={handleLeave}
        onCancel={() => setShowLeaveConfirm(false)}
      />
    </div>
  );
}

// ==================== Chat URL modal (form project) ====================

function ProjectFormModal({
  proposalId,
  vi,
  onClose,
  onCreated,
}: {
  proposalId: string;
  vi: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [chatUrl, setChatUrl] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = !!(chatUrl.trim() || note.trim());

  async function handleSubmit() {
    if (!canSubmit) {
      setError(
        vi
          ? 'Vui lòng nhập link group chat hoặc ghi chú công khai.'
          : 'Please provide a chat link or a public note.',
      );
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/community/proposals/${proposalId}/project`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_url: chatUrl.trim() || undefined,
          note: note.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || (vi ? 'Không thể tạo dự án' : 'Failed to create project'));
        return;
      }
      onCreated();
    } catch {
      setError(vi ? 'Có lỗi xảy ra' : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {vi ? '🚀 Chuyển sang giai đoạn dự án' : '🚀 Move to Project Phase'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {vi
                ? 'Cần ít nhất một trong hai: link group chat hoặc ghi chú công khai.'
                : 'At least one is required: a group chat link or a public note.'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {vi ? 'Link group chat (Zalo / Telegram / Discord …)' : 'Group chat link (Zalo / Telegram / Discord …)'}
            </label>
            <input
              type="url"
              value={chatUrl}
              onChange={(e) => setChatUrl(e.target.value)}
              maxLength={500}
              placeholder="https://zalo.me/g/..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              {vi
                ? 'Thành viên sẽ thấy link này sau khi nhấn "Tham gia dự án".'
                : 'Members will see this link after they click "Join project".'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {vi ? 'Ghi chú công khai' : 'Public note'}
              {!chatUrl.trim() && <span className="text-red-500"> *</span>}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1000}
              rows={4}
              placeholder={vi ? 'VD: Họp định kỳ thứ 3 hàng tuần, link group chat sẽ chia sẻ sau.' : 'e.g. Weekly sync on Tuesdays; chat link coming soon.'}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-400 text-right">{note.length}/1000</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {vi ? 'Hủy' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !canSubmit}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting
                ? (vi ? 'Đang tạo...' : 'Creating...')
                : (vi ? 'Tạo dự án' : 'Create project')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== Status change form (creator/admin) ====================

function StatusChangeForm({
  proposalId,
  currentStatus,
  vi,
  onCancel,
  onSaved,
}: {
  proposalId: string;
  currentStatus: ProposalStatus;
  vi: boolean;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [newStatus, setNewStatus] = useState<ProposalStatus>(currentStatus);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const targetOptions: ProposalStatus[] = PROJECT_STATUSES.filter((s) => s !== currentStatus);

  async function handleSubmit() {
    if (newStatus === currentStatus) {
      setError(vi ? 'Vui lòng chọn trạng thái khác.' : 'Please choose a different status.');
      return;
    }
    if (!note.trim()) {
      setError(vi ? 'Vui lòng nhập ghi chú công khai.' : 'A public note is required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/community/proposals/${proposalId}/project`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, note: note.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || (vi ? 'Không thể đổi trạng thái' : 'Failed to change status'));
        return;
      }
      onSaved();
    } catch {
      setError(vi ? 'Có lỗi xảy ra' : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
      <p className="text-sm font-semibold text-gray-800">
        {vi ? 'Đổi trạng thái dự án' : 'Change project status'}
      </p>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          {vi ? 'Trạng thái mới' : 'New status'}
        </label>
        <select
          value={newStatus}
          onChange={(e) => setNewStatus(e.target.value as ProposalStatus)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value={currentStatus} disabled>
            {statusLabel(currentStatus, vi)} ({vi ? 'hiện tại' : 'current'})
          </option>
          {targetOptions.map((s) => (
            <option key={s} value={s}>{statusLabel(s, vi)}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          {vi ? 'Ghi chú công khai *' : 'Public note *'}
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={1000}
          rows={4}
          placeholder={vi ? 'Lý do thay đổi, hướng đi tiếp theo...' : 'Why the change, what comes next...'}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="mt-1 text-xs text-gray-400 text-right">{note.length}/1000</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="text-sm px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting
            ? (vi ? 'Đang lưu...' : 'Saving...')
            : (vi ? 'Xác nhận đổi' : 'Confirm change')}
        </button>
        <button
          onClick={onCancel}
          disabled={submitting}
          className="text-sm px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          {vi ? 'Hủy' : 'Cancel'}
        </button>
      </div>
    </div>
  );
}
