'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslation, type Locale } from '@/lib/i18n';

// Language switcher dropdown for dark header navigation
export function LanguageSwitcherDropdown() {
  const { locale, setLanguage, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleSelect = (newLocale: Locale) => {
    setLanguage(newLocale);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1 text-sm text-white/80 hover:text-white transition-colors rounded-md hover:bg-white/10"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Select language"
      >
        <span className="font-medium">{locale.toUpperCase()}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50"
          role="listbox"
          aria-label="Language options"
        >
          <button
            type="button"
            onClick={() => handleSelect('en')}
            className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
              locale === 'en' ? 'text-brand font-medium' : 'text-gray-700'
            }`}
            role="option"
            aria-selected={locale === 'en'}
          >
            {t.language.en}
            {locale === 'en' && (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={() => handleSelect('vi')}
            className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
              locale === 'vi' ? 'text-brand font-medium' : 'text-gray-700'
            }`}
            role="option"
            aria-selected={locale === 'vi'}
          >
            {t.language.vi}
            {locale === 'vi' && (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
