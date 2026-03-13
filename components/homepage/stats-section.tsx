import type { Translations } from '@/lib/i18n';
import type { HomepageStats } from '@/lib/homepage-stats';

interface StatsSectionProps {
  stats: HomepageStats;
  labels: Translations['homepage']['stats'];
}

export function StatsSection({ stats, labels }: StatsSectionProps) {
  const items = [
    { value: stats.alumniCount, label: labels.alumni },
    { value: stats.countriesCount, label: labels.countries },
    { value: stats.expertiseCount, label: labels.industries },
  ];

  return (
    <section className="homepage-full-bleed bg-brand text-white py-16 md:py-20">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
          {labels.title}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          {items.map((item, i) => (
            <div key={i}>
              <div className="text-4xl md:text-5xl font-bold mb-2">
                {item.value > 0 ? `${item.value}+` : '—'}
              </div>
              <div className="text-blue-200 text-sm font-medium uppercase tracking-wide">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
