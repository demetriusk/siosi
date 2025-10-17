"use client";
import { usePathname } from 'next/navigation';
import { Footer } from './footer';

const FOOTER_WHITELIST = [
  '', // home
  'about',
  'privacy',
  'support',
  'terms',
];

export default function ShowFooter({ isLoggedIn, locale }: { isLoggedIn: boolean; locale: string }) {
  const pathname = usePathname();
  // Remove leading /[locale]/
  const path = pathname?.split('/').slice(2).join('/') || '';
  const first = path.split('/')[0] || '';
  const allowed = FOOTER_WHITELIST.includes(first);
  if (!isLoggedIn || allowed) {
    return <Footer locale={locale} />;
  }
  return null;
}