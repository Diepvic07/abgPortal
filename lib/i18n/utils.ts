import { en, type Translations } from './translations/en';
import { vi } from './translations/vi';

// Supported locales
export type Locale = 'en' | 'vi';

// Translation dictionaries
export const translations: Record<Locale, Translations> = { en, vi };

// Server-side translation helper (for emails/API)
export const DEFAULT_LOCALE: Locale = 'vi';

export function getTranslations(locale: Locale = DEFAULT_LOCALE): Translations {
    return translations[locale] || translations.vi;
}

// Interpolate variables in translation strings
// Usage: interpolate('Hello {name}!', { name: 'John' }) => 'Hello John!'
export function interpolate(template: string, values: Record<string, string | number>): string {
    return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? `{${key}}`));
}
