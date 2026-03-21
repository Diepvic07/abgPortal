import { Member, getAvatarMemberStatus, isMemberVerified } from '@/types';
import { MemberAvatar } from '@/components/ui/member-avatar';
import { getCountryFlag } from '@/lib/country-flags';

export interface MemberProfileCardProps {
    member: Member;
}

function DetailBlock({
    label,
    value,
    variant = 'default'
}: {
    label: string;
    value?: string;
    variant?: 'default' | 'brand' | 'emerald'
}) {
    if (!value) return null;

    const styles = {
        default: 'py-2',
        brand: 'bg-brand/5 p-3.5 rounded-xl border border-brand/10',
        emerald: 'bg-emerald-50 p-3.5 rounded-xl border border-emerald-100'
    };

    const labelStyles = {
        default: 'text-brand opacity-70',
        brand: 'text-brand opacity-80',
        emerald: 'text-emerald-800 opacity-80'
    };

    const textStyles = {
        default: 'text-gray-800',
        brand: 'text-brand font-medium',
        emerald: 'text-emerald-900 font-medium'
    };

    return (
        <div className={`flex flex-col gap-1.5 w-full ${styles[variant]}`}>
            <dt className={`text-[11px] font-bold uppercase tracking-widest ${labelStyles[variant]}`}>{label}</dt>
            <dd className={`text-sm leading-relaxed whitespace-pre-line ${textStyles[variant]}`}>
                {value}
            </dd>
        </div>
    );
}

function LinkButton({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
    return (
        <a href={href} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-brand hover:border-brand/30 transition-all shadow-sm">
            {icon}
            {label}
        </a>
    );
}

const Icons = {
    LinkedIn: (
        <svg className="w-3.5 h-3.5 text-[#0A66C2]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
    ),
    Facebook: (
        <svg className="w-3.5 h-3.5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
    ),
    Website: (
        <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
    ),
    Email: (
        <svg className="w-4 h-4 text-brand/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
    ),
    Phone: (
        <svg className="w-4 h-4 text-brand/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
    )
};

export function MemberProfileCard({ member }: MemberProfileCardProps) {
    if (!member) return null;

    const flag = getCountryFlag(member.country);
    const verified = isMemberVerified(member);

    return (
        <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-xl overflow-hidden w-full max-w-3xl mx-auto flex flex-col border border-border border-t-4 border-t-brand">
            <div className="flex-1 pb-10">
                <div className="px-6 sm:px-10">
                    <div className="pt-8 sm:pt-10 flex flex-col sm:flex-row gap-4 sm:gap-6 sm:items-start mb-8">
                        <div className="inline-block rounded-full p-1 bg-white shadow-md self-start flex-shrink-0">
                            <MemberAvatar
                                name={member.name}
                                avatarUrl={member.avatar_url}
                                size="xl"
                                memberStatus={getAvatarMemberStatus(member)}
                                className="!w-20 !h-20 sm:!w-24 sm:!h-24 text-2xl sm:text-3xl"
                            />
                        </div>

                        <div className="flex-1 min-w-0">
                            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 flex flex-wrap items-center gap-2 sm:gap-3">
                                {member.name}
                                {verified && (
                                    <span title="Verified" className="inline-flex items-center">
                                        <svg className="w-5 h-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                                        </svg>
                                    </span>
                                )}
                                {member.abg_class && (
                                    <span className="text-xs sm:text-sm bg-brand/10 text-brand px-3 py-1 rounded-full font-semibold tracking-wide border border-brand/20">
                                        {member.abg_class}
                                    </span>
                                )}
                            </h2>
                            {member.country && (
                                <p className="text-sm font-medium text-text-secondary mt-1.5 flex items-center gap-1.5">
                                    <span className="text-base">{flag}</span> {member.country}
                                </p>
                            )}

                            <div className="flex flex-wrap gap-2 pt-3 sm:hidden">
                                {member.linkedin_url && <LinkButton href={member.linkedin_url} label="LinkedIn" icon={Icons.LinkedIn} />}
                                {member.facebook_url && <LinkButton href={member.facebook_url} label="Facebook" icon={Icons.Facebook} />}
                                {member.company_website && <LinkButton href={member.company_website} label="Website" icon={Icons.Website} />}
                            </div>
                        </div>

                        <div className="hidden sm:flex flex-wrap gap-2 justify-end flex-shrink-0">
                            {member.linkedin_url && <LinkButton href={member.linkedin_url} label="LinkedIn" icon={Icons.LinkedIn} />}
                            {member.facebook_url && <LinkButton href={member.facebook_url} label="Facebook" icon={Icons.Facebook} />}
                            {member.company_website && <LinkButton href={member.company_website} label="Website" icon={Icons.Website} />}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">

                        <div className="space-y-8">
                            <div>
                                <h3 className="text-xs font-bold tracking-widest uppercase text-brand border-b border-border pb-2.5 mb-4 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-brand/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                    Professional
                                </h3>
                                <div className="space-y-2">
                                    <DetailBlock label="Role" value={member.role} />
                                    <DetailBlock label="Company" value={member.company} />
                                    <DetailBlock label="Industry" value={member.expertise} />
                                </div>
                            </div>

                            <div>
                                <h3 className="text-xs font-bold tracking-widest uppercase text-brand border-b border-border pb-2.5 mb-4 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-brand/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                    Contact Info
                                </h3>
                                <div className="space-y-3 bg-gray-50/80 p-4 rounded-xl border border-gray-100">
                                    {member.email && (
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
                                                {Icons.Email}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Email</p>
                                                <a href={`mailto:${member.email}`} className="text-sm font-medium text-brand hover:underline truncate block w-full">{member.email}</a>
                                            </div>
                                        </div>
                                    )}
                                    {member.phone && (
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
                                                {Icons.Phone}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Phone</p>
                                                <a href={`tel:${member.phone}`} className="text-sm font-medium text-brand hover:underline truncate block w-full">{member.phone}</a>
                                            </div>
                                        </div>
                                    )}
                                    {!member.email && !member.phone && (
                                        <p className="text-sm text-gray-500 italic">No contact information provided.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div>
                                <h3 className="text-xs font-bold tracking-widest uppercase text-emerald-800 border-b border-border pb-2.5 mb-4 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                    Networking Goals
                                </h3>
                                <div className="space-y-4">
                                    <DetailBlock label="Can Help With" value={member.can_help_with} variant="emerald" />
                                    <DetailBlock label="Looking For" value={member.looking_for} variant="brand" />
                                </div>
                            </div>

                            {member.bio && (
                                <div>
                                    <h3 className="text-xs font-bold tracking-widest uppercase text-brand border-b border-border pb-2.5 mb-4 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-brand/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
                                        About
                                    </h3>
                                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line bg-white/50 border border-gray-100 p-4 rounded-xl shadow-sm">
                                        {member.bio}
                                    </p>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
