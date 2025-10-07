import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

export const locales = ['en', 'es', 'ru', 'pt', 'fr', 'de', 'it', 'ua'] as const;
export type Locale = (typeof locales)[number];

export default getRequestConfig(async (ctx) => {
  // If locale is missing, fall back to the configured default ('en')
  const resolvedLocale = ctx.locale ?? 'en';

  // Temporary EN-only mode: always return English messages regardless of requested locale.
  // This keeps locale routes working but ensures all upcoming strings are only in English.
  // To revert, restore the original messages import using `resolvedLocale`.
  if (!resolvedLocale || !locales.includes(resolvedLocale as any)) notFound();

  return {
    // Keep the resolved locale so routing still shows the correct path (e.g., /ru)
    locale: resolvedLocale!,
    // Force English messages for now
    messages: (await import(`./messages/en.json`)).default
  };
});