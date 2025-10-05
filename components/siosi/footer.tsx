'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface FooterProps {
  locale: string;
}

export function Footer({ locale }: FooterProps) {
  const t = useTranslations('nav');
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-[#E5E7EB] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <span className="text-xl font-bold text-[#0A0A0A]">siosi</span>
            <p className="mt-2 text-sm text-[#6B7280]">
              AI-powered makeup analysis with confidence scores
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#0A0A0A] mb-3">Product</h3>
            <ul className="space-y-2">
              <li>
                <Link href={`/${locale}`} className="text-sm text-[#6B7280] hover:text-[#0A0A0A] transition-colors">
                  {t('home')}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/about`} className="text-sm text-[#6B7280] hover:text-[#0A0A0A] transition-colors">
                  {t('about')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#0A0A0A] mb-3">Account</h3>
            <ul className="space-y-2">
              <li>
                <Link href={`/${locale}/sessions`} className="text-sm text-[#6B7280] hover:text-[#0A0A0A] transition-colors">
                  {t('sessions')}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/profile`} className="text-sm text-[#6B7280] hover:text-[#0A0A0A] transition-colors">
                  {t('profile')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#0A0A0A] mb-3">Legal</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm text-[#6B7280] hover:text-[#0A0A0A] transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-[#6B7280] hover:text-[#0A0A0A] transition-colors">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-[#E5E7EB] flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[#6B7280]">
            © {currentYear} siosi.me. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-sm">
            <Link
              href={`/en${locale === 'en' ? '' : '/' + locale.slice(1)}`}
              className="text-[#6B7280] hover:text-[#0A0A0A] transition-colors"
            >
              English
            </Link>
            <span className="text-[#D1D5DB]">|</span>
            <Link
              href={`/es${locale === 'es' ? '' : '/' + locale.slice(1)}`}
              className="text-[#6B7280] hover:text-[#0A0A0A] transition-colors"
            >
              Español
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
