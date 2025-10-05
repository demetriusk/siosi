'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface HeaderProps {
  locale: string;
}

export function Header({ locale }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const t = useTranslations('nav');

  const navigation = [
    { name: t('home'), href: `/${locale}` },
    { name: t('sessions'), href: `/${locale}/sessions` },
    { name: t('profile'), href: `/${locale}/profile` },
    { name: t('about'), href: `/${locale}/about` },
  ];

  const isActive = (href: string) => {
    if (href === `/${locale}`) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const switchLocale = (newLocale: string) => {
    const pathWithoutLocale = pathname.replace(`/${locale}`, '');
    return `/${newLocale}${pathWithoutLocale}`;
  };

  return (
    <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href={`/${locale}`} className="flex items-center">
            <span className="text-2xl font-bold text-[#0A0A0A]">siosi</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? 'text-[#0A0A0A]'
                    : 'text-[#6B7280] hover:text-[#0A0A0A]'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Link
                href={switchLocale('en')}
                className={`font-medium transition-colors ${
                  locale === 'en' ? 'text-[#0A0A0A]' : 'text-[#6B7280] hover:text-[#0A0A0A]'
                }`}
              >
                EN
              </Link>
              <span className="text-[#D1D5DB]">|</span>
              <Link
                href={switchLocale('es')}
                className={`font-medium transition-colors ${
                  locale === 'es' ? 'text-[#0A0A0A]' : 'text-[#6B7280] hover:text-[#0A0A0A]'
                }`}
              >
                ES
              </Link>
            </div>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#0A0A0A]"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E5E7EB] bg-white">
          <nav className="px-4 py-4 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 text-base font-medium rounded transition-colors ${
                  isActive(item.href)
                    ? 'text-[#0A0A0A] bg-[#F9FAFB]'
                    : 'text-[#6B7280] hover:text-[#0A0A0A] hover:bg-[#F9FAFB]'
                }`}
              >
                {item.name}
              </Link>
            ))}
            <div className="flex items-center gap-2 px-3 py-2 text-sm">
              <Link
                href={switchLocale('en')}
                className={`font-medium transition-colors ${
                  locale === 'en' ? 'text-[#0A0A0A]' : 'text-[#6B7280]'
                }`}
              >
                EN
              </Link>
              <span className="text-[#D1D5DB]">|</span>
              <Link
                href={switchLocale('es')}
                className={`font-medium transition-colors ${
                  locale === 'es' ? 'text-[#0A0A0A]' : 'text-[#6B7280]'
                }`}
              >
                ES
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
