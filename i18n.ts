import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

export const locales = ['en', 'es', 'ru', 'pt', 'fr', 'de', 'it', 'ua'] as const;
export type Locale = (typeof locales)[number];

export default getRequestConfig(async (ctx) => {
  // If locale is missing, fall back to the configured default ('en')
  const resolvedLocale = ctx.locale ?? 'en';

  if (!resolvedLocale || !locales.includes(resolvedLocale as any)) notFound();

  return {
    locale: resolvedLocale!,
    messages: (await import(`./messages/${resolvedLocale!}.json`)).default
  };
});