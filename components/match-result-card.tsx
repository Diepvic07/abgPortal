'use client';

import { MatchResult, Member } from '@/types';
import { useTranslation, interpolate } from '@/lib/i18n';

interface MatchWithMember extends MatchResult {
  member: Member;
}

interface MatchResultCardProps {
  match: MatchWithMember;
  isSelected: boolean;
  isLove: boolean;
  onSelect: (id: string) => void;
  onRequestIntro: (id: string) => void;
}

/** Get initials from a name: "Nguyen Van An" -> "NA" */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/** Mask name for love matches: "Nguyen Van An" -> "N*** V*** A***" */
function maskName(member: Member, anonymousLabel: string): string {
  const name = member.nickname || member.name || '';
  if (!name) return anonymousLabel;
  return name.split(/\s+/).map(part => part.charAt(0) + '***').join(' ');
}

function genderLabel(member: Member): string | null {
  if (member.gender === 'Male') return '\u2642';
  if (member.gender === 'Female') return '\u2640';
  return null;
}

/** Score-based color: 90+= emerald, 70+= blue, else= slate */
function scoreColor(score: number): string {
  if (score >= 90) return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
  if (score >= 70) return 'bg-blue-50 text-blue-700 ring-blue-600/20';
  return 'bg-slate-50 text-slate-600 ring-slate-500/20';
}

export function MatchResultCard({ match, isSelected, isLove, onSelect, onRequestIntro }: MatchResultCardProps) {
  const { t } = useTranslation();
  const displayName = isLove ? maskName(match.member, t.matches.anonymous) : match.member.name;
  const initials = getInitials(match.member.name);
  const gender = isLove ? genderLabel(match.member) : null;

  return (
    <div
      onClick={() => onSelect(match.id)}
      className={`group relative rounded-2xl border bg-white transition-all duration-200 cursor-pointer overflow-hidden
        ${isSelected
          ? isLove
            ? 'border-pink-400 ring-2 ring-pink-400/30 shadow-lg shadow-pink-500/10'
            : 'border-brand-light ring-2 ring-brand-light/30 shadow-lg shadow-brand/10'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
        }`}
    >
      {/* Card body */}
      <div className="p-5">
        {/* Top row: avatar + name + score */}
        <div className="flex items-start gap-3.5">
          {/* Avatar circle */}
          <div className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold
            ${isLove ? 'bg-pink-100 text-pink-700' : 'bg-brand/10 text-brand'}`}>
            {isLove && gender ? <span className="text-lg">{gender}</span> : initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900 truncate">{displayName}</h3>
              {match.match_score != null && (
                <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ring-1 ring-inset ${scoreColor(match.match_score)}`}>
                  {interpolate(t.matches.matchScore, { score: match.match_score })}
                </span>
              )}
            </div>
            {!isLove && (
              <p className="text-sm text-gray-500 mt-0.5 truncate">
                {interpolate(t.matches.roleAt, { role: match.member.role, company: match.member.company })}
              </p>
            )}
          </div>
        </div>

        {/* Love match: profile details */}
        {isLove ? (
          <div className="mt-3 space-y-1.5 text-sm pl-[3.375rem]">
            {match.member.self_description && (
              <p className="text-gray-600"><span className="font-medium text-gray-800">{t.matches.aboutLabel}</span> {match.member.self_description}</p>
            )}
            {match.member.interests && (
              <p className="text-gray-600"><span className="font-medium text-gray-800">{t.matches.interestsLabel}</span> {match.member.interests}</p>
            )}
            {match.member.core_values && (
              <p className="text-gray-600"><span className="font-medium text-gray-800">{t.matches.valuesLabel}</span> {match.member.core_values}</p>
            )}
            {match.member.ideal_day && (
              <p className="text-gray-600"><span className="font-medium text-gray-800">{t.matches.idealDayLabel}</span> {match.member.ideal_day}</p>
            )}
            {match.member.qualities_looking_for && (
              <p className="text-gray-600"><span className="font-medium text-gray-800">{t.matches.lookingForLabel}</span> {match.member.qualities_looking_for}</p>
            )}
          </div>
        ) : (
          /* Bio for non-love matches */
          match.member.bio && (
            <p className="mt-2.5 text-sm text-gray-600 line-clamp-2 pl-[3.375rem]">
              {match.member.bio}
            </p>
          )
        )}

        {/* Why matched - accent left border */}
        <div className={`mt-3.5 ml-[3.375rem] p-3 rounded-lg border-l-3
          ${isLove ? 'bg-pink-50/60 border-l-pink-400' : 'bg-brand/5 border-l-brand-light'}`}>
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{t.matches.whyMatched}</p>
          <p className="text-sm text-gray-600 mt-1 leading-relaxed">{match.reason}</p>
        </div>

        {/* Expertise tags */}
        {!isLove && match.member.expertise && (
          <div className="mt-3 flex flex-wrap gap-1.5 pl-[3.375rem]">
            {match.member.expertise.split(',').slice(0, 3).map((skill, i) => (
              <span key={i} className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                {skill.trim()}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* CTA button */}
      <div className="px-5 pb-5 pt-1">
        <button
          onClick={(e) => { e.stopPropagation(); onRequestIntro(match.id); }}
          className={`w-full py-2.5 text-sm font-semibold rounded-xl transition-all duration-200
            ${isLove
              ? 'bg-pink-500 hover:bg-pink-600 text-white shadow-sm shadow-pink-500/20'
              : 'bg-brand hover:bg-brand-light text-white shadow-sm shadow-brand/20'
            }`}
        >
          {isLove ? t.matches.sendLoveMatch : t.matches.requestIntro}
        </button>
      </div>
    </div>
  );
}
