'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { ProposalCategory, ProposalGenre, CommitmentLevel, ParticipationFormat, PROPOSAL_CATEGORY_LABELS, PROPOSAL_GENRE_LABELS, PROPOSAL_GENRES, PARTICIPATION_FORMAT_LABELS } from '@/types';

const CATEGORIES: ProposalCategory[] = ['talk', 'learning', 'fieldtrip', 'meeting', 'sports', 'community_support'];

const LOCATION_PRESETS = [
  { value: 'Hà Nội', label: 'Hà Nội' },
  { value: 'HCM', label: 'HCM' },
];

const FORMATS: ParticipationFormat[] = ['offline', 'online', 'hybrid'];

export function NewProposalForm() {
  const router = useRouter();
  const { locale } = useTranslation();
  const vi = locale === 'vi';

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ProposalCategory>('talk');
  const [genre, setGenre] = useState<ProposalGenre>('other');
  const [location, setLocation] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [participationFormat, setParticipationFormat] = useState<ParticipationFormat>('offline');
  const [what, setWhat] = useState('');
  const [why, setWhy] = useState('');
  const [who, setWho] = useState('');
  const [howMany, setHowMany] = useState('');
  const [resources, setResources] = useState('');
  const [extra, setExtra] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [commitmentLevel, setCommitmentLevel] = useState<CommitmentLevel>('will_lead');
  const [tags, setTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewIsAI, setPreviewIsAI] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [hasDiscussion, setHasDiscussion] = useState(false);
  const [discussionOptions, setDiscussionOptions] = useState<{date: string; startTime: string; endTime: string}[]>([
    { date: '', startTime: '', endTime: '' },
    { date: '', startTime: '', endTime: '' },
  ]);

  function buildDescription(): string {
    const parts: string[] = [];
    if (what) parts.push(what);
    if (why) parts.push(`\n${vi ? 'Tại sao' : 'Why'}: ${why}`);
    if (who) parts.push(`${vi ? 'Đối tượng' : 'Who'}: ${who}`);
    if (howMany) parts.push(`${vi ? 'Số lượng dự kiến' : 'Expected participants'}: ${howMany}`);
    if (resources) parts.push(`${vi ? 'Cần hỗ trợ' : 'Resources needed'}: ${resources}`);
    if (extra) parts.push(`\n${extra}`);
    return parts.join('\n');
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError(vi ? 'Ảnh quá lớn. Tối đa 5MB.' : 'Image too large. Maximum 5MB.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/community/proposals/upload-image', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.url) {
        setImageUrl(data.url);
      } else {
        setError(data.error || (vi ? 'Không thể tải ảnh lên' : 'Failed to upload image'));
      }
    } catch {
      setError(vi ? 'Lỗi tải ảnh' : 'Image upload error');
    } finally {
      setUploading(false);
    }
  }

  function handleManualPreview() {
    if (!title || !what) {
      setError(vi ? 'Vui lòng điền tên và mô tả trước' : 'Please fill in the name and description first');
      return;
    }
    setError('');
    setPreview(buildDescription());
    setPreviewIsAI(false);
    setShowPreview(true);
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
        body: JSON.stringify({ title, category, what, why, who, howMany, resources, extra, targetDate, locale }),
      });
      const data = await res.json();
      if (res.ok && data.description) {
        setPreview(data.description);
        if (Array.isArray(data.tags)) setTags(data.tags);
        if (data.category && ['talk', 'learning', 'fieldtrip', 'meeting', 'sports', 'community_support'].includes(data.category)) setCategory(data.category);
        if (data.genre && ['education', 'health', 'finance', 'technology', 'business', 'culture', 'environment', 'other'].includes(data.genre)) setGenre(data.genre);
        if (data.location) {
          if (data.location === 'Hà Nội' || data.location === 'HCM') {
            setLocation(data.location);
            setCustomLocation('');
          } else {
            setLocation('__custom__');
            setCustomLocation(data.location);
          }
        }
        if (data.participation_format && ['online', 'offline', 'hybrid'].includes(data.participation_format)) setParticipationFormat(data.participation_format);
        if (data.why && !why) setWhy(data.why);
        if (data.who && !who) setWho(data.who);
        if (data.how_many && !howMany) setHowMany(data.how_many);
        if (data.resources && !resources) setResources(data.resources);
        if (data.target_date && !targetDate) setTargetDate(data.target_date);
        setPreviewIsAI(true);
        setShowPreview(true);
      } else {
        setPreview(buildDescription());
        setPreviewIsAI(false);
        setShowPreview(true);
      }
    } catch {
      setPreview(buildDescription());
      setPreviewIsAI(false);
      setShowPreview(true);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
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
        body: JSON.stringify({
          title, description, category, genre,
          target_date: targetDate || undefined,
          commitment_level: commitmentLevel,
          image_url: imageUrl || undefined,
          tags,
          location: location === '__custom__' ? customLocation.trim() : location || undefined,
          participation_format: participationFormat,
          has_discussion: hasDiscussion,
          discussion_date_options: hasDiscussion ? discussionOptions
            .filter(o => o.date)
            .map(o => o.startTime && o.endTime ? `${o.date}T${o.startTime}-${o.endTime}` : o.date)
            : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || (vi ? 'Không thể tạo đề xuất' : 'Failed to create proposal'));
        return;
      }

      router.push(`/proposals/${data.proposal.slug}`);
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

        {/* Step 1: Title */}
        <div className="bg-gray-50 rounded-xl p-5">
          <label htmlFor="title" className="block text-base font-semibold text-gray-900 mb-1">
            1. {vi ? 'Tên hoạt động' : 'Activity name'} *
          </label>
          <p className="text-sm text-gray-500 mb-2">{vi ? 'Đặt tên ngắn gọn, dễ hiểu' : 'Short, clear name'}</p>
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

        {/* Step 2: What — the main description */}
        <div className="bg-gray-50 rounded-xl p-5">
          <label htmlFor="what" className="block text-base font-semibold text-gray-900 mb-1">
            2. {vi ? 'Bạn muốn làm gì?' : 'What do you want to do?'} *
          </label>
          <p className="text-sm text-gray-500 mb-2">{vi ? 'Mô tả ngắn gọn ý tưởng (2-3 câu là đủ)' : 'Brief description (2-3 sentences is enough)'}</p>
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

        {/* Step 3: Category */}
        <div className="bg-gray-50 rounded-xl p-5">
          <label className="block text-base font-semibold text-gray-900 mb-3">
            3. {vi ? 'Loại hoạt động' : 'Activity type'}
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
                {PROPOSAL_CATEGORY_LABELS[cat].icon} {PROPOSAL_CATEGORY_LABELS[cat][vi ? 'vi' : 'en']}
              </button>
            ))}
          </div>
        </div>

        {/* Step 4: Genre / Topic */}
        <div className="bg-gray-50 rounded-xl p-5">
          <label className="block text-base font-semibold text-gray-900 mb-3">
            4. {vi ? 'Chủ đề' : 'Topic'}
          </label>
          <div className="flex flex-wrap gap-2">
            {PROPOSAL_GENRES.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGenre(g)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                  genre === g
                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300'
                }`}
              >
                {PROPOSAL_GENRE_LABELS[g].icon} {PROPOSAL_GENRE_LABELS[g][vi ? 'vi' : 'en']}
              </button>
            ))}
          </div>
        </div>

        {/* Step 5: Location + Participation Format */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-xl p-5">
            <label className="block text-base font-semibold text-gray-900 mb-3">
              5. {vi ? 'Địa điểm' : 'Location'}
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {LOCATION_PRESETS.map((loc) => (
                <button
                  key={loc.value}
                  type="button"
                  onClick={() => { setLocation(loc.value); setCustomLocation(''); }}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                    location === loc.value
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300'
                  }`}
                >
                  {loc.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setLocation('__custom__')}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                  location === '__custom__'
                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300'
                }`}
              >
                ✏️ {vi ? 'Khác' : 'Other'}
              </button>
            </div>
            {location === '__custom__' && (
              <input
                type="text"
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
                placeholder={vi ? 'Nhập địa điểm...' : 'Enter location...'}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm mt-2"
                maxLength={100}
              />
            )}
          </div>

          <div className="bg-gray-50 rounded-xl p-5">
            <label className="block text-base font-semibold text-gray-900 mb-3">
              {vi ? 'Hình thức tham gia' : 'Participation format'}
            </label>
            <div className="flex flex-wrap gap-2">
              {FORMATS.map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setParticipationFormat(fmt)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                    participationFormat === fmt
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300'
                  }`}
                >
                  {PARTICIPATION_FORMAT_LABELS[fmt].icon} {PARTICIPATION_FORMAT_LABELS[fmt][vi ? 'vi' : 'en']}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Step 6: Why */}
        <div className="bg-gray-50 rounded-xl p-5">
          <label htmlFor="why" className="block text-base font-semibold text-gray-900 mb-1">
            6. {vi ? 'Tại sao hoạt động này quan trọng?' : 'Why does this matter?'}
          </label>
          <p className="text-sm text-gray-500 mb-2">{vi ? 'Giúp mọi người hiểu giá trị của hoạt động' : 'Help people understand the value'}</p>
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

        {/* Step 7: Who + How many */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-xl p-5">
            <label htmlFor="who" className="block text-base font-semibold text-gray-900 mb-1">
              7. {vi ? 'Ai nên tham gia?' : 'Who should join?'}
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
            <label htmlFor="howMany" className="block text-base font-semibold text-gray-900 mb-1">
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

        {/* Step 8: Resources + Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-xl p-5">
            <label htmlFor="resources" className="block text-base font-semibold text-gray-900 mb-1">
              8. {vi ? 'Cần hỗ trợ gì?' : 'What support is needed?'}
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
            <label htmlFor="targetDate" className="block text-base font-semibold text-gray-900 mb-1">
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

        {/* Step 9: Extra / paste anything */}
        <div className="bg-gray-50 rounded-xl p-5">
          <label htmlFor="extra" className="block text-base font-semibold text-gray-900 mb-1">
            9. {vi ? 'Thông tin thêm (tùy chọn)' : 'Additional info (optional)'}
          </label>
          <p className="text-sm text-gray-500 mb-2">
            {vi ? 'Paste nội dung có sẵn, thêm chi tiết, link tham khảo, hoặc bất cứ gì bạn muốn chia sẻ' : 'Paste existing content, add details, reference links, or anything else you want to share'}
          </p>
          <textarea
            id="extra"
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            placeholder={vi
              ? 'VD: Chi tiết chương trình, link tham khảo, thông tin liên hệ, ghi chú thêm...'
              : 'e.g. Program details, reference links, contact info, additional notes...'}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-h-[100px]"
          />
        </div>

        {/* Step 10: Image upload */}
        <div className="bg-gray-50 rounded-xl p-5">
          <label className="block text-base font-semibold text-gray-900 mb-1">
            10. {vi ? 'Ảnh minh họa (tùy chọn)' : 'Cover image (optional)'}
          </label>
          <p className="text-xs text-gray-500 mb-3">{vi ? 'Thêm ảnh để đề xuất hấp dẫn hơn. Tối đa 5MB.' : 'Add an image to make your proposal more engaging. Max 5MB.'}</p>
          {imageUrl ? (
            <div className="relative">
              <img src={imageUrl} alt="Preview" className="w-full max-h-48 object-cover rounded-lg" />
              <button
                type="button"
                onClick={() => setImageUrl('')}
                className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-black/80"
              >
                ✕
              </button>
            </div>
          ) : (
            <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${uploading ? 'border-blue-300 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-100'}`}>
              <div className="flex flex-col items-center gap-1 text-gray-500">
                {uploading ? (
                  <>
                    <svg className="animate-spin h-6 w-6 text-blue-500" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    <span className="text-sm text-blue-600">{vi ? 'Đang tải...' : 'Uploading...'}</span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl">📷</span>
                    <span className="text-sm">{vi ? 'Nhấn để chọn ảnh' : 'Click to select image'}</span>
                    <span className="text-xs text-gray-400">JPG, PNG, WebP, GIF</span>
                  </>
                )}
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Step 9: Commitment level */}
        <div className="bg-gray-50 rounded-xl p-5">
          <label className="block text-base font-semibold text-gray-900 mb-3">
            11. {vi ? 'Bạn sẽ tham gia ở mức nào?' : 'How will you participate?'} *
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

        {/* Step 12: Online Discussion */}
        <div className="bg-gray-50 rounded-xl p-5">
          <label className="block text-base font-semibold text-gray-900 mb-3">
            12. {vi ? 'Thảo luận trực tuyến (tùy chọn)' : 'Online Discussion (optional)'}
          </label>
          <p className="text-sm text-gray-500 mb-3">
            {vi
              ? 'Bật tính năng này để tổ chức buổi thảo luận trực tuyến. Thành viên có thể bỏ phiếu ngày tham gia và đặt câu hỏi trước.'
              : 'Enable this to host an online discussion. Members can vote on dates and submit questions beforehand.'}
          </p>

          <div className="flex items-center gap-3 mb-4">
            <button
              type="button"
              onClick={() => setHasDiscussion(!hasDiscussion)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                hasDiscussion ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  hasDiscussion ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm font-medium text-gray-700">
              {hasDiscussion
                ? (vi ? 'Có thảo luận trực tuyến' : 'Online discussion enabled')
                : (vi ? 'Không có thảo luận' : 'No discussion')}
            </span>
          </div>

          {hasDiscussion && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">
                {vi ? 'Đề xuất 2-10 lựa chọn ngày/giờ để thành viên bỏ phiếu:' : 'Propose 2-10 date/time options for members to vote:'}
              </p>
              {discussionOptions.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2 flex-wrap">
                  <input
                    type="date"
                    value={opt.date}
                    onChange={(e) => {
                      const updated = [...discussionOptions];
                      updated[idx] = { ...updated[idx], date: e.target.value };
                      setDiscussionOptions(updated);
                    }}
                    min={new Date().toISOString().split('T')[0]}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                  />
                  <input
                    type="time"
                    value={opt.startTime}
                    onChange={(e) => {
                      const updated = [...discussionOptions];
                      updated[idx] = { ...updated[idx], startTime: e.target.value };
                      setDiscussionOptions(updated);
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                    placeholder="Từ"
                  />
                  <span className="text-gray-400 text-sm">-</span>
                  <input
                    type="time"
                    value={opt.endTime}
                    onChange={(e) => {
                      const updated = [...discussionOptions];
                      updated[idx] = { ...updated[idx], endTime: e.target.value };
                      setDiscussionOptions(updated);
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                    placeholder="Đến"
                  />
                  {discussionOptions.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setDiscussionOptions(discussionOptions.filter((_, i) => i !== idx))}
                      className="text-red-500 hover:text-red-700 text-sm font-medium px-2"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {discussionOptions.length < 10 && (
                <button
                  type="button"
                  onClick={() => setDiscussionOptions([...discussionOptions, { date: '', startTime: '', endTime: '' }])}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  + {vi ? 'Thêm lựa chọn' : 'Add option'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* AI Preview Panel */}
        {showPreview && (
          <div className="bg-white border-2 border-blue-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                {previewIsAI
                ? <>✨ {vi ? 'Xem trước bài viết (AI đã tạo)' : 'Preview (AI generated)'}</>
                : <>{vi ? '📝 Xem trước bài viết' : '📝 Preview'}</>
              }
              </h3>
            </div>

            {/* AI-filled metadata summary */}
            {previewIsAI && (
              <div className="bg-blue-50 rounded-lg p-3 space-y-2">
                <p className="text-xs font-medium text-blue-700 mb-2">{vi ? 'AI đã tự động chọn:' : 'AI auto-selected:'}</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 rounded-full bg-white text-gray-700 font-medium">
                    {PROPOSAL_CATEGORY_LABELS[category]?.icon} {PROPOSAL_CATEGORY_LABELS[category]?.[vi ? 'vi' : 'en']}
                  </span>
                  <span className="px-2 py-1 rounded-full bg-white text-gray-700 font-medium">
                    {PROPOSAL_GENRE_LABELS[genre]?.icon} {PROPOSAL_GENRE_LABELS[genre]?.[vi ? 'vi' : 'en']}
                  </span>
                  {(location || customLocation) && (
                    <span className="px-2 py-1 rounded-full bg-white text-gray-700 font-medium">
                      📍 {location === '__custom__' ? customLocation : location}
                    </span>
                  )}
                  <span className="px-2 py-1 rounded-full bg-white text-gray-700 font-medium">
                    {PARTICIPATION_FORMAT_LABELS[participationFormat]?.icon} {PARTICIPATION_FORMAT_LABELS[participationFormat]?.[vi ? 'vi' : 'en']}
                  </span>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  {vi ? 'Bạn có thể chỉnh sửa ở các mục phía trên nếu cần.' : 'You can adjust these in the fields above if needed.'}
                </p>
              </div>
            )}

            <div className="flex items-center justify-end">
              <div className="flex gap-2">
                {!previewIsAI && (
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={generating}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                  >
                    {generating ? '⏳...' : <>✨ {vi ? 'Viết lại bằng AI' : 'Rewrite with AI'}</>}
                  </button>
                )}
                {previewIsAI && (
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={generating}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                  >
                    {generating ? '⏳...' : <>🔄 {vi ? 'Tạo lại' : 'Regenerate'}</>}
                  </button>
                )}
              </div>
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

        {!showPreview && (
          <div className="flex flex-wrap gap-3">
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
                <>✨ {vi ? 'Xem trước với AI' : 'Preview with AI'}</>
              )}
            </button>
            <button
              type="button"
              onClick={handleManualPreview}
              disabled={!title || !what}
              className="px-8 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
            >
              {vi ? '📝 Xem trước & Đăng' : '📝 Preview & Post'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 text-gray-500 hover:text-gray-700 transition-colors"
            >
              {vi ? 'Hủy' : 'Cancel'}
            </button>
          </div>
        )}
      </form>

      {/* Preview actions — OUTSIDE the form to prevent accidental submit */}
      {showPreview && (
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => handleSubmit()}
            disabled={submitting || !preview}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 text-base"
          >
            {submitting
              ? (vi ? 'Đang đăng...' : 'Posting...')
              : (vi ? 'Đăng đề xuất' : 'Post Proposal')}
          </button>
          <button
            onClick={() => setShowPreview(false)}
            className="px-8 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {vi ? 'Quay lại sửa' : 'Back to edit'}
          </button>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 text-gray-500 hover:text-gray-700 transition-colors"
          >
            {vi ? 'Hủy' : 'Cancel'}
          </button>
        </div>
      )}
    </div>
  );
}
