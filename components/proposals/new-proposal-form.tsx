'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { ProposalCategory, CommitmentLevel, PROPOSAL_CATEGORY_LABELS } from '@/types';

const CATEGORIES: ProposalCategory[] = ['charity', 'event', 'learning', 'community_support', 'other'];

const CATEGORY_ICONS: Record<ProposalCategory, string> = {
  charity: '❤️', event: '🎉', learning: '📚', community_support: '🤝', other: '💡',
};

export function NewProposalForm() {
  const router = useRouter();
  const { locale } = useTranslation();
  const vi = locale === 'vi';

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ProposalCategory>('event');
  const [what, setWhat] = useState('');
  const [why, setWhy] = useState('');
  const [who, setWho] = useState('');
  const [howMany, setHowMany] = useState('');
  const [resources, setResources] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [commitmentLevel, setCommitmentLevel] = useState<CommitmentLevel>('will_lead');
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState('');

  function buildDescription(): string {
    const parts: string[] = [];
    if (what) parts.push(what);
    if (why) parts.push(`\n${vi ? 'Tại sao' : 'Why'}: ${why}`);
    if (who) parts.push(`${vi ? 'Đối tượng' : 'Who'}: ${who}`);
    if (howMany) parts.push(`${vi ? 'Số lượng dự kiến' : 'Expected participants'}: ${howMany}`);
    if (resources) parts.push(`${vi ? 'Cần hỗ trợ' : 'Resources needed'}: ${resources}`);
    return parts.join('\n');
  }

  async function handleGenerate() {
    if (!title || !what) {
      setError(vi ? 'Vui lòng điền tên và mô tả trước' : 'Please fill in the name and description first');
      return;
    }
    setError('');
    setGenerating(true);
    try {
      const res = await fetch('/api/community/proposals/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, category, what, why, who, howMany, resources, targetDate, locale }),
      });
      const data = await res.json();
      if (res.ok && data.description) {
        setPreview(data.description);
        setShowPreview(true);
      } else {
        // Fallback to manual description
        setPreview(buildDescription());
        setShowPreview(true);
      }
    } catch {
      // Fallback to manual description
      setPreview(buildDescription());
      setShowPreview(true);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const description = showPreview ? preview : buildDescription();
    if (description.length < 20) {
      setError(vi ? 'Vui lòng điền thêm thông tin (ít nhất 20 ký tự)' : 'Please provide more details (at least 20 characters)');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/community/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, category, target_date: targetDate || undefined, commitment_level: commitmentLevel }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create proposal');
        return;
      }

      router.push(`/proposals/${data.proposal.id}`);
    } catch {
      setError(vi ? 'Có lỗi xảy ra' : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        {vi ? 'Đề xuất hoạt động mới' : 'Propose a New Activity'}
      </h1>
      <p className="text-gray-600 mb-8">
        {vi ? 'Trả lời vài câu hỏi ngắn để tạo đề xuất rõ ràng và hấp dẫn.' : 'Answer a few short questions to create a clear, engaging proposal.'}
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Step 1: Category */}
        <div className="bg-gray-50 rounded-xl p-5">
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            1. {vi ? 'Loại hoạt động' : 'Activity type'}
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                  category === cat
                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300'
                }`}
              >
                {CATEGORY_ICONS[cat]} {PROPOSAL_CATEGORY_LABELS[cat][vi ? 'vi' : 'en']}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Title */}
        <div className="bg-gray-50 rounded-xl p-5">
          <label htmlFor="title" className="block text-sm font-semibold text-gray-900 mb-1">
            2. {vi ? 'Tên hoạt động' : 'Activity name'} *
          </label>
          <p className="text-xs text-gray-500 mb-2">{vi ? 'Đặt tên ngắn gọn, dễ hiểu' : 'Short, clear name'}</p>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={vi ? 'VD: Gây quỹ từ thiện Tết 2026' : 'e.g. Charity Fund for Tet 2026'}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            maxLength={200}
            required
          />
        </div>

        {/* Step 3: What — the main description */}
        <div className="bg-gray-50 rounded-xl p-5">
          <label htmlFor="what" className="block text-sm font-semibold text-gray-900 mb-1">
            3. {vi ? 'Bạn muốn làm gì?' : 'What do you want to do?'} *
          </label>
          <p className="text-xs text-gray-500 mb-2">{vi ? 'Mô tả ngắn gọn ý tưởng (2-3 câu là đủ)' : 'Brief description (2-3 sentences is enough)'}</p>
          <textarea
            id="what"
            value={what}
            onChange={(e) => setWhat(e.target.value)}
            placeholder={vi
              ? 'VD: Tổ chức buổi gây quỹ để tặng quà Tết cho 100 em nhỏ vùng cao Sapa. Dự kiến gây quỹ 50 triệu VNĐ qua đóng góp của thành viên ABG.'
              : 'e.g. Organize a fundraiser to gift Tet presents to 100 children in Sapa highlands.'}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-h-[80px]"
            required
          />
        </div>

        {/* Step 4: Why */}
        <div className="bg-gray-50 rounded-xl p-5">
          <label htmlFor="why" className="block text-sm font-semibold text-gray-900 mb-1">
            4. {vi ? 'Tại sao hoạt động này quan trọng?' : 'Why does this matter?'}
          </label>
          <p className="text-xs text-gray-500 mb-2">{vi ? 'Giúp mọi người hiểu giá trị của hoạt động' : 'Help people understand the value'}</p>
          <input
            id="why"
            type="text"
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            placeholder={vi
              ? 'VD: Nhiều em nhỏ vùng cao không có quà Tết, chúng ta có thể mang niềm vui đến cho các em.'
              : 'e.g. Many children in the highlands have no Tet gifts.'}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          />
        </div>

        {/* Step 5: Who + How many */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-xl p-5">
            <label htmlFor="who" className="block text-sm font-semibold text-gray-900 mb-1">
              5. {vi ? 'Ai nên tham gia?' : 'Who should join?'}
            </label>
            <input
              id="who"
              type="text"
              value={who}
              onChange={(e) => setWho(e.target.value)}
              placeholder={vi ? 'VD: Tất cả thành viên ABG' : 'e.g. All ABG members'}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
          </div>
          <div className="bg-gray-50 rounded-xl p-5">
            <label htmlFor="howMany" className="block text-sm font-semibold text-gray-900 mb-1">
              {vi ? 'Cần bao nhiêu người?' : 'How many people needed?'}
            </label>
            <input
              id="howMany"
              type="text"
              value={howMany}
              onChange={(e) => setHowMany(e.target.value)}
              placeholder={vi ? 'VD: 10-20 tình nguyện viên' : 'e.g. 10-20 volunteers'}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
          </div>
        </div>

        {/* Step 6: Resources + Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-xl p-5">
            <label htmlFor="resources" className="block text-sm font-semibold text-gray-900 mb-1">
              6. {vi ? 'Cần hỗ trợ gì?' : 'What support is needed?'}
            </label>
            <input
              id="resources"
              type="text"
              value={resources}
              onChange={(e) => setResources(e.target.value)}
              placeholder={vi ? 'VD: Ngân sách 50 triệu, 5 tình nguyện viên' : 'e.g. 50M budget, 5 volunteers'}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
          </div>
          <div className="bg-gray-50 rounded-xl p-5">
            <label htmlFor="targetDate" className="block text-sm font-semibold text-gray-900 mb-1">
              {vi ? 'Dự kiến khi nào?' : 'Target date'}
            </label>
            <input
              id="targetDate"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
          </div>
        </div>

        {/* Step 7: Commitment level */}
        <div className="bg-gray-50 rounded-xl p-5">
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            7. {vi ? 'Bạn sẽ tham gia ở mức nào?' : 'How will you participate?'} *
          </label>
          <div className="grid grid-cols-3 gap-3">
            {([
              { level: 'will_lead' as CommitmentLevel, icon: '🚀', label: vi ? 'Sẽ dẫn dắt' : 'Will Lead', pts: '+5', desc: vi ? 'Dẫn dắt nhóm thực hiện' : 'Lead the taskforce' },
              { level: 'will_participate' as CommitmentLevel, icon: '🙌', label: vi ? 'Sẽ tham gia' : 'Will Join', pts: '+3', desc: vi ? 'Tích cực tham gia' : 'Actively participate' },
              { level: 'interested' as CommitmentLevel, icon: '❤️', label: vi ? 'Quan tâm' : 'Interested', pts: '', desc: vi ? 'Theo dõi và ủng hộ' : 'Follow and support' },
            ]).map(({ level, icon, label, pts, desc }) => (
              <button
                key={level}
                type="button"
                onClick={() => setCommitmentLevel(level)}
                className={`flex flex-col items-center gap-1 p-4 rounded-xl border-2 transition-all ${
                  commitmentLevel === level
                    ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                    : 'border-gray-200 text-gray-600 hover:border-blue-300 bg-white'
                }`}
              >
                <span className="text-2xl">{icon}</span>
                <span className="font-medium text-sm">{label}</span>
                {pts && <span className="text-xs text-gray-400">{pts} {vi ? 'điểm' : 'pts'}</span>}
                <span className="text-xs text-gray-500 text-center">{desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* AI Preview Panel */}
        {showPreview && (
          <div className="bg-white border-2 border-blue-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                ✨ {vi ? 'Xem trước bài viết (AI đã tạo)' : 'Preview (AI generated)'}
              </h3>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
              >
                🔄 {vi ? 'Tạo lại' : 'Regenerate'}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              {vi ? 'Chỉnh sửa nội dung bên dưới trước khi đăng. Bạn có thể sửa thoải mái!' : 'Edit the content below before posting. Feel free to modify!'}
            </p>
            <textarea
              value={preview}
              onChange={(e) => setPreview(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-h-[200px] text-sm leading-relaxed"
            />
            <p className="text-xs text-gray-400">{preview.length} {vi ? 'ký tự' : 'characters'}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          {!showPreview ? (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || !title || !what}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 text-base flex items-center gap-2"
            >
              {generating ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  {vi ? 'AI đang viết...' : 'AI writing...'}
                </>
              ) : (
                <>✨ {vi ? 'Xem trước & Đăng' : 'Preview & Post'}</>
              )}
            </button>
          ) : (
            <>
              <button
                type="submit"
                disabled={submitting || !preview}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 text-base"
              >
                {submitting
                  ? (vi ? 'Đang đăng...' : 'Posting...')
                  : (vi ? 'Đăng đề xuất' : 'Post Proposal')}
              </button>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="px-8 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {vi ? 'Quay lại sửa' : 'Back to edit'}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 text-gray-500 hover:text-gray-700 transition-colors"
          >
            {vi ? 'Hủy' : 'Cancel'}
          </button>
        </div>
      </form>
    </div>
  );
}
