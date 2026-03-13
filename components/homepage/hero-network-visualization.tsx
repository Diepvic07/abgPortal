/* eslint-disable @next/next/no-img-element */
import type { FeaturedMember } from '@/lib/homepage-stats';

interface HeroNetworkVisualizationProps {
  members: FeaturedMember[];
  alumniCount: number;
}

/** Decorative network visualization for hero section with real member avatars */
export function HeroNetworkVisualization({ members, alumniCount }: HeroNetworkVisualizationProps) {
  const cardMembers = members.slice(0, 3);
  const stackMembers = members.slice(0, 4);
  const remainingCount = Math.max(0, alumniCount - stackMembers.length);

  return (
    <div className="flex-1 w-full max-w-xl animate-fade-in-up delay-200">
      <div className="relative">
        {/* Background blur circles */}
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />
        <div className="absolute -bottom-10 -right-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />

        {/* Card with members */}
        <div className="relative bg-white p-8 rounded-3xl border border-slate-200 shadow-2xl overflow-hidden group">
          <div className="space-y-4">
            {cardMembers.length > 0
              ? cardMembers.map((member, i) => (
                  <MemberRow key={i} member={member} variant={i} />
                ))
              : /* Placeholder rows when no member data available */
                [0, 1, 2].map((i) => <PlaceholderRow key={i} variant={i} />)
            }
          </div>

          {/* Bottom bar with avatar stack */}
          <div className="mt-8 pt-8 border-t border-slate-100 flex justify-between items-center">
            <div className="flex -space-x-2">
              {stackMembers.length > 0
                ? stackMembers.map((member, i) => (
                    <img
                      key={i}
                      src={member.avatar_url}
                      alt={member.name}
                      className="w-8 h-8 rounded-full border-2 border-white object-cover"
                    />
                  ))
                : [0, 1, 2].map((i) => (
                    <div key={i} className={`w-8 h-8 rounded-full border-2 border-white ${['bg-slate-200', 'bg-slate-300', 'bg-slate-400'][i]}`} />
                  ))
              }
              {remainingCount > 0 && (
                <div className="w-8 h-8 rounded-full border-2 border-white bg-blue-600 flex items-center justify-center text-[10px] text-white font-bold">
                  +{remainingCount}
                </div>
              )}
            </div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
              Global Community
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const rowStyles = [
  'bg-slate-50 border-slate-100 -rotate-1 group-hover:rotate-0',
  'bg-white border-slate-200 rotate-2 group-hover:rotate-0 shadow-md',
  'bg-slate-50 border-slate-100 -rotate-2 group-hover:rotate-0',
];

function MemberRow({ member, variant }: { member: FeaturedMember; variant: number }) {
  const style = rowStyles[variant % rowStyles.length];
  const isHighlighted = variant === 1;

  return (
    <div className={`flex items-center p-4 rounded-2xl border transform transition-transform ${style}`}>
      <img
        src={member.avatar_url}
        alt={member.name}
        className={`w-12 h-12 rounded-full mr-4 shrink-0 object-cover ${isHighlighted ? 'border-2 border-blue-600' : ''}`}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">{member.name}</p>
        <p className="text-xs text-slate-500 truncate">{member.role}{member.company ? ` · ${member.company}` : ''}</p>
      </div>
      {variant === 0 && (
        <div className="w-16 h-6 bg-blue-600/10 rounded-full text-[10px] font-bold text-blue-600 flex items-center justify-center uppercase tracking-tighter shrink-0">
          Verified
        </div>
      )}
      {variant === 1 && (
        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
          </svg>
        </div>
      )}
    </div>
  );
}

function PlaceholderRow({ variant }: { variant: number }) {
  const style = rowStyles[variant % rowStyles.length];
  return (
    <div className={`flex items-center p-4 rounded-2xl border transform transition-transform ${style}`}>
      <div className={`w-12 h-12 rounded-full mr-4 shrink-0 ${variant === 1 ? 'bg-slate-200 border-2 border-blue-600' : 'bg-blue-200'}`} />
      <div className="flex-1">
        <div className="h-4 bg-slate-200 rounded w-1/3 mb-2" />
        <div className="h-3 bg-slate-100 rounded w-2/3" />
      </div>
    </div>
  );
}
