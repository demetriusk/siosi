import createMiddleware from 'next-intl/middleware';
import { NextRequest } from 'next/server';

const intlMiddleware = createMiddleware({
  locales: ['en', 'es', 'ru', 'pt', 'fr', 'de', 'it', 'ua'],
  defaultLocale: 'en'
});

export default function middleware(request: NextRequest) {
  // Skip i18n for static assets and model files
  const { pathname } = request.nextUrl;
  
  if (
    pathname.startsWith('/models/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.')
  ) {
    return;
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!_next|api|.*\\..*).*)']
};