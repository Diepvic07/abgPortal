import { cookies } from 'next/headers';
import type { Locale } from './utils';

// Read locale from cookie — server components only
export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const locale = cookieStore.get('locale')?.value;
  return (locale === 'vi' || locale === 'en') ? locale : 'en';
}
