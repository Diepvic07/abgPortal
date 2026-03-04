'use client';

export type AvatarMemberStatus = 'basic' | 'pro' | 'admin';

interface MemberAvatarProps {
  name: string;
  avatarUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  memberStatus?: AvatarMemberStatus;
  className?: string;
}

// Generate consistent background color from name
function getColorFromName(name: string): string {
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
    'bg-rose-500',
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Get initials from name (max 2 letters)
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

const statusConfig: Record<AvatarMemberStatus, { bg: string; text: string; label: string }> = {
  basic: { bg: 'bg-gray-500', text: 'text-white', label: 'Basic' },
  pro: { bg: 'bg-emerald-500', text: 'text-white', label: 'Pro' },
  admin: { bg: 'bg-purple-600', text: 'text-white', label: 'Admin' },
};

// Text badge sizes relative to avatar size
const badgeSizeClasses = {
  sm: 'text-[8px] leading-none px-1 py-px -bottom-1 left-1/2 -translate-x-1/2',
  md: 'text-[9px] leading-none px-1 py-px -bottom-1 left-1/2 -translate-x-1/2',
  lg: 'text-[10px] leading-none px-1.5 py-0.5 -bottom-1.5 left-1/2 -translate-x-1/2',
  xl: 'text-xs leading-none px-2 py-0.5 -bottom-1.5 left-1/2 -translate-x-1/2',
};

export function MemberAvatar({ name, avatarUrl, size = 'md', memberStatus, className = '' }: MemberAvatarProps) {
  const sizeClass = sizeClasses[size];

  const avatarContent = avatarUrl ? (
    <img
      src={avatarUrl}
      alt={name}
      className={`${sizeClass} rounded-full object-cover ${className}`}
    />
  ) : (
    <div
      className={`${sizeClass} ${getColorFromName(name)} rounded-full flex items-center justify-center text-white font-semibold ${className}`}
      title={name}
    >
      {getInitials(name)}
    </div>
  );

  if (!memberStatus) return avatarContent;

  const { bg, text, label } = statusConfig[memberStatus];
  const badgeSize = badgeSizeClasses[size];

  return (
    <div className="relative inline-flex flex-shrink-0 mb-1">
      {avatarContent}
      <span
        className={`absolute ${badgeSize} ${bg} ${text} font-semibold rounded-full whitespace-nowrap`}
      >
        {label}
      </span>
    </div>
  );
}
