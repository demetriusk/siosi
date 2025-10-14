import '../globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { Toaster } from '@/components/ui/sonner';
import { MobileBottomNav } from '@/components/siosi/mobile-bottom-nav';
import { AppShell } from '@/components/siosi/app-shell';
import { RegisterSW } from '@/components/register-sw';
import { cn } from '@/lib/utils';
import type { ParamsWithLocale } from '@/lib/types';

// Import messages statically
import enMessages from '../../messages/en.json';
import esMessages from '../../messages/es.json';
import ruMessages from '../../messages/ru.json';
import ptMessages from '../../messages/pt.json';
import frMessages from '../../messages/fr.json';
import deMessages from '../../messages/de.json';
import itMessages from '../../messages/it.json';
import uaMessages from '../../messages/ua.json';

// Helper function to get messages for locale
function getMessages(locale: string) {
  switch (locale) {
    case 'en':
      return enMessages;
    case 'es':
      return esMessages;
    case 'ru':
      return ruMessages;
    case 'pt':
      return ptMessages;
    case 'fr':
      return frMessages;
    case 'de':
      return deMessages;
    case 'it':
      return itMessages;
    case 'ua':
      return uaMessages;
    default:
      return enMessages;
  }
}

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'siOsi — AI Makeup Analysis',
  description: 'Get instant AI makeup analysis with confidence scores',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon.ico', type: 'image/x-icon' }
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180' }
    ],
    shortcut: '/favicon.ico'
  },
  manifest: '/site.webmanifest',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' }
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'siOsi'
  }
};

export function generateStaticParams() {
  return [
    { locale: 'en' },
    { locale: 'es' },
    { locale: 'ru' },
    { locale: 'pt' },
    { locale: 'fr' },
    { locale: 'de' },
    { locale: 'it' },
    { locale: 'ua' }
  ];
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: ParamsWithLocale['params'];
}) {
  // Layout params come from the router and can be a Promise; await for safety
  const { locale } = await params as { locale: string };

  return (
    <html lang={locale}>
      <body className={cn(inter.className, 'pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0')}>
        <NextIntlClientProvider locale={locale} messages={getMessages(locale)}>
          <AppShell locale={locale}>{children}</AppShell>
          <Toaster />
          <MobileBottomNav locale={locale} />
        </NextIntlClientProvider>
        <RegisterSW />
      </body>
    </html>
  );
}
