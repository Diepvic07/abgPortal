import type { Translations } from '@/lib/i18n';
import type { HomepageStats } from '@/lib/homepage-stats';

interface StatsSectionProps {
  stats: HomepageStats;
  labels: Translations['homepage']['stats'];
}

export function StatsSection({ stats, labels }: StatsSectionProps) {
  const items = [
    { value: stats.alumniCount, label: labels.alumni, suffix: '+' },
    { value: stats.countriesCount, label: labels.countries, suffix: '+' },
    { value: stats.expertiseCount, label: labels.industries, suffix: '+' },
    { value: 100, label: labels.trusted, suffix: '%' },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {items.map((item, i) => (
            <div key={i} className="stat-item text-center md:px-6">
              <div className="text-4xl lg:text-5xl font-extrabold text-brand-light mb-2">
                {item.value > 0 ? `${item.value}${item.suffix}` : '\u2014'}
              </div>
              <div className="text-slate-500 font-semibold uppercase tracking-widest text-xs">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
