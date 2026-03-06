'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';

const FAQ_CATEGORIES = [
  { key: 'basics' as const, questions: [1, 2, 3] },
  { key: 'features' as const, questions: [4, 5, 6, 7, 18, 19, 20] },
  { key: 'privacy' as const, questions: [8, 9, 10, 11] },
  { key: 'premium' as const, questions: [12, 13, 14, 15, 16, 17] },
] as const;

export function FaqPageClient() {
  const { t } = useTranslation();
  const [openItem, setOpenItem] = useState<string | null>(null);

  const toggleItem = (id: string) => {
    setOpenItem(openItem === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-text-primary mb-4">
            {t.faq.pageTitle}
          </h1>
          <p className="text-lg text-text-secondary">
            {t.faq.pageSubtitle}
          </p>
        </div>

        {/* FAQ Categories */}
        <div className="space-y-8">
          {FAQ_CATEGORIES.map((category) => (
            <div key={category.key}>
              <h2 className="text-xl font-semibold text-text-primary mb-4">
                {t.faq.categories[category.key]}
              </h2>
              <div className="space-y-2">
                {category.questions.map((num) => {
                  const id = `q${num}`;
                  const isOpen = openItem === id;
                  const qKey = `q${num}` as keyof typeof t.faq;
                  const aKey = `a${num}` as keyof typeof t.faq;

                  return (
                    <div
                      key={id}
                      className="bg-white rounded-lg shadow-sm border border-gray-200"
                    >
                      <button
                        onClick={() => toggleItem(id)}
                        className="w-full text-left px-6 py-4 flex items-center justify-between gap-4"
                        aria-expanded={isOpen}
                      >
                        <span className="font-medium text-text-primary">
                          {t.faq[qKey] as string}
                        </span>
                        <svg
                          className={`w-5 h-5 text-text-secondary shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''
                            }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>
                      {isOpen && (
                        <div className="px-6 pb-4 text-text-secondary leading-relaxed">
                          {t.faq[aKey] as string}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
