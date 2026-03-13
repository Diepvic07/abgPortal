import { cookies, headers } from 'next/headers';
import { type Locale, DEFAULT_LOCALE } from './utils';

// Read locale from cookie, or detect from browser Accept-Language header
export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const locale = cookieStore.get('locale')?.value;
  if (locale === 'vi' || locale === 'en') return locale;

  // Detect from browser language
  const headerStore = await headers();
  const acceptLang = headerStore.get('accept-language') || '';
  if (acceptLang.match(/\ben\b/i)) return 'en';

  return DEFAULT_LOCALE;
}
