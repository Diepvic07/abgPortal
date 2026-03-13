import type { Translations } from '@/lib/i18n';

interface WhyJoinSectionProps {
  whyJoin: Translations['homepage']['whyJoin'];
}

function UsersIcon() {
  return (
    <svg className="w-8 h-8 text-brand-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg className="w-8 h-8 text-brand-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 9l3 3m0 0l3 3m-3-3l3-3m-3 3l-3 3" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg className="w-8 h-8 text-brand-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

export function WhyJoinSection({ whyJoin }: WhyJoinSectionProps) {
  const benefits = [
    { icon: <UsersIcon />, title: whyJoin.connect, desc: whyJoin.connectDesc },
    { icon: <CompassIcon />, title: whyJoin.discover, desc: whyJoin.discoverDesc },
    { icon: <BellIcon />, title: whyJoin.stayEngaged, desc: whyJoin.stayEngagedDesc },
  ];

  return (
    <section className="py-16 md:py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-text-primary text-center mb-12">
          {whyJoin.title}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {benefits.map((b, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-8 border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="mb-5">{b.icon}</div>
              <h3 className="text-lg font-semibold text-text-primary mb-3">{b.title}</h3>
              <p className="text-text-secondary text-sm leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
