import Link from 'next/link';

export interface TaggedMember {
  id: string;
  name: string;
  avatar_url?: string | null;
  abg_class?: string | null;
  public_profile_slug?: string | null;
}

function profileHref(m: TaggedMember): string {
  // Prefer the friendly slug when available; otherwise fall back to the id.
  // /profile/[id] handles both and gates contact details by viewer tier.
  return `/profile/${m.public_profile_slug || m.id}`;
}

const AVATAR_COLORS = [
  'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
  'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-cyan-500', 'bg-emerald-500',
  'bg-violet-500', 'bg-rose-500', 'bg-amber-500', 'bg-sky-500', 'bg-fuchsia-500',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

interface Props {
  members: TaggedMember[];
  locale: string;
}

export function ArticleTaggedMembers({ members, locale }: Props) {
  if (members.length === 0) return null;
  const label = locale === 'vi' ? 'Gắn thẻ' : 'Tagged';

  return (
    <div className="mt-5 flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-gray-500 mr-1">{label}:</span>
      {members.map((m) => {
        const href = profileHref(m);
        const chip = (
          <span className="inline-flex items-center gap-1.5 pl-0.5 pr-2.5 py-0.5 rounded-full bg-gray-100 border border-gray-200 text-xs text-gray-800 hover:bg-blue-50 hover:border-blue-200 transition-colors">
            {m.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
            ) : (
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold text-white ${getAvatarColor(m.name || '?')}`}
              >
                {(m.name || '?')[0].toUpperCase()}
              </span>
            )}
            <span className="font-medium">{m.name}</span>
            {m.abg_class && (
              <span className="text-gray-500">· {m.abg_class}</span>
            )}
          </span>
        );
        return (
          <Link key={m.id} href={href}>{chip}</Link>
        );
      })}
    </div>
  );
}
