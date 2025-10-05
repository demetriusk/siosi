/**
 * next-intl configuration for App Router
 * See: https://next-intl.dev/docs/getting-started/app-router
 */
const locales = ['en', 'es', 'ru', 'pt', 'fr', 'de', 'it', 'ua'] as const;

export default {
  locales: Array.from(locales),
  defaultLocale: 'en'
};

export type Locale = (typeof locales)[number];
