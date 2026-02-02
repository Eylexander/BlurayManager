import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export const locales = ['en-US', 'fr-FR'] as const;
export type Locale = (typeof locales)[number];

export default getRequestConfig(async () => {
  // Get locale from cookie or default to 'en-US'
  const cookieStore = await cookies();
  const locale = cookieStore.get('locale')?.value || 'en-US';

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
