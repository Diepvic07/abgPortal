import type { Translations } from '@/lib/i18n';

interface WhyJoinSectionProps {
  whyJoin: Translations['homepage']['whyJoin'];
}

function UsersIcon() {
  return (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

export function WhyJoinSection({ whyJoin }: WhyJoinSectionProps) {
  const benefits = [
    { icon: <UsersIcon />, title: whyJoin.connect, desc: whyJoin.connectDesc },
    { icon: <SearchIcon />, title: whyJoin.discover, desc: whyJoin.discoverDesc },
    { icon: <BellIcon />, title: whyJoin.stayEngaged, desc: whyJoin.stayEngagedDesc },
  ];

  return (
    <section className="homepage-full-bleed py-24 bg-slate-50 border-y border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
            {whyJoin.title}
          </h2>
          <p className="mt-4 text-lg text-slate-600">{whyJoin.subtitle}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {benefits.map((b, i) => (
            <div key={i} className="premium-card p-10 rounded-3xl">
              <div className="w-14 h-14 feature-icon rounded-2xl flex items-center justify-center mb-6">
                {b.icon}
              </div>
              <h3 className="text-xl font-bold mb-4">{b.title}</h3>
              <p className="text-slate-600 leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
