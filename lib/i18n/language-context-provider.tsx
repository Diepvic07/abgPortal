'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { Translations } from './translations/en';
import { type Locale, translations } from './utils';

// Storage key for localStorage
const LOCALE_STORAGE_KEY = 'abg-locale';

// Context type
interface LanguageContextType {
  locale: Locale;
  setLanguage: (locale: Locale) => void;
  t: Translations;
}

// Create context
const LanguageContext = createContext<LanguageContextType | null>(null);

// Provider props
interface LanguageProviderProps {
  children: ReactNode;
  defaultLocale?: Locale;
}

// Get initial locale from localStorage or default
function getInitialLocale(defaultLocale: Locale): Locale {
  if (typeof window === 'undefined') return defaultLocale;

  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === 'en' || stored === 'vi') {
      return stored;
    }
  } catch {
    // localStorage not available
  }

  return defaultLocale;
}

// Language Provider Component
export function LanguageProvider({ children, defaultLocale = 'en' }: LanguageProviderProps) {
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const [mounted, setMounted] = useState(false);

  // Initialize locale from localStorage on mount
  useEffect(() => {
    setLocale(getInitialLocale(defaultLocale));
    setMounted(true);
  }, [defaultLocale]);

  // Update localStorage and HTML lang when locale changes
  useEffect(() => {
    if (!mounted) return;

    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // localStorage not available
    }

    // Set cookie for server-side locale access
    const secure = window.location.protocol === 'https:' ? ';Secure' : '';
    document.cookie = `locale=${locale};path=/;max-age=31536000;SameSite=Lax${secure}`;

    // Update HTML lang attribute
    document.documentElement.lang = locale;
  }, [locale, mounted]);

  // Language setter
  const setLanguage = useCallback((newLocale: Locale) => {
    setLocale(newLocale);
  }, []);

  // Get translations for current locale
  const t = translations[locale];

  return (
    <LanguageContext.Provider value={{ locale, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

// Hook to use translations
export function useTranslation() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }

  return context;
}

// Server-side translation helper (for emails/API)

