'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { ProposalCategory, PROPOSAL_CATEGORY_LABELS } from '@/types';

const CATEGORIES: ProposalCategory[] = ['charity', 'event', 'learning', 'community_support', 'other'];

const TEMPLATES: Record<ProposalCategory, { title: string; description: string }> = {
  charity: {
    title: '',
    description: 'What: Describe the charity initiative\nWhy: Who benefits and how\nWhen: Target timeline\nResources needed: Budget, volunteers, materials',
  },
  event: {
    title: '',
    description: 'What: Describe the event\nWhen: Proposed date and time\nWhere: Location or online\nExpected participants: How many people\nBudget: Estimated costs',
  },
  learning: {
    title: '',
    description: 'Topic: What will participants learn\nFormat: Workshop, seminar, mentoring, etc.\nDuration: How long\nTarget audience: Who should attend\nSpeaker/facilitator: Who will lead',
  },
  community_support: {
    title: '',
    description: 'What: Describe the support initiative\nWho: Who needs support\nHow: How the community can help\nTimeline: When is support needed',
  },
  other: {
    title: '',
    description: 'Describe your idea:\n- What do you want to do?\n- Why is this valuable for ABG?\n- Who benefits?\n- What resources are needed?\n- What is the timeline?',
  },
};

export function NewProposalForm() {
  const router = useRouter();
  const { locale } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ProposalCategory>('other');
  const [targetDate, setTargetDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function applyTemplate(cat: ProposalCategory) {
    setCategory(cat);
    if (!description || description === TEMPLATES[category]?.description) {
      setDescription(TEMPLATES[cat].description);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/community/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, category, target_date: targetDate || undefined }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create proposal');
        return;
      }

      router.push(`/proposals/${data.proposal.id}`);
    } catch {
      setError('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        {locale === 'vi' ? 'Đề xuất ý tưởng mới' : 'Propose a New Idea'}
      </h1>
      <p className="text-gray-600 mb-8">
        {locale === 'vi'
          ? 'Bạn sẽ tự động trở thành trưởng nhóm thực hiện khi đề xuất.'
          : 'You will automatically become the taskforce lead when you propose.'}
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Category selector with templates */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {locale === 'vi' ? 'Loại đề xuất' : 'Category'}
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => applyTemplate(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                  category === cat
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {PROPOSAL_CATEGORY_LABELS[cat][locale === 'vi' ? 'vi' : 'en']}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            {locale === 'vi' ? 'Tiêu đề' : 'Title'} *
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={locale === 'vi' ? 'Tên ý tưởng của bạn' : 'Name your idea'}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            minLength={5}
            maxLength={200}
            required
          />
          <p className="text-xs text-gray-500 mt-1">{title.length}/200</p>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            {locale === 'vi' ? 'Mô tả chi tiết' : 'Description'} *
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={locale === 'vi' ? 'Mô tả ý tưởng của bạn...' : 'Describe your idea...'}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[200px]"
            minLength={20}
            maxLength={5000}
            required
          />
          <p className="text-xs text-gray-500 mt-1">{description.length}/5000</p>
        </div>

        {/* Target Date */}
        <div>
          <label htmlFor="targetDate" className="block text-sm font-medium text-gray-700 mb-1">
            {locale === 'vi' ? 'Ngày mục tiêu (tùy chọn)' : 'Target Date (optional)'}
          </label>
          <input
            id="targetDate"
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Commitment notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            {locale === 'vi'
              ? 'Khi bạn đề xuất, bạn cam kết là trưởng nhóm thực hiện (mức cam kết: Sẽ dẫn dắt)'
              : 'By proposing, you commit as taskforce lead (commitment: Will Lead)'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-600 text-white px-8 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
          >
            {submitting
              ? (locale === 'vi' ? 'Đang gửi...' : 'Submitting...')
              : (locale === 'vi' ? 'Đề xuất' : 'Submit Proposal')}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-8 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {locale === 'vi' ? 'Hủy' : 'Cancel'}
          </button>
        </div>
      </form>
    </div>
  );
}
