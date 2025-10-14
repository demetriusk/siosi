'use client';

import type { ComponentType, SVGProps } from 'react';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LayoutGrid, Plus, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileBottomNavProps {
  locale: string;
}

export function MobileBottomNav({ locale }: MobileBottomNavProps) {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const logoRef = useRef<HTMLSpanElement | null>(null);
  const animationTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const logoEl = logoRef.current;
    if (!logoEl) return;

    logoEl.classList.remove('is-logo-bursting');
    void logoEl.offsetWidth;
    logoEl.classList.add('is-logo-bursting');

    if (animationTimeoutRef.current) {
      window.clearTimeout(animationTimeoutRef.current);
    }

    animationTimeoutRef.current = window.setTimeout(() => {
      logoEl.classList.remove('is-logo-bursting');
    }, 1150);

    return () => {
      if (animationTimeoutRef.current) {
        window.clearTimeout(animationTimeoutRef.current);
        animationTimeoutRef.current = null;
      }
    };
  }, [pathname]);

  const navigation = [
    {
      href: `/${locale}/sessions`,
      label: t('sessions'),
      icon: LayoutGrid
    },
    {
      href: `/${locale}/profile`,
      label: t('profile'),
      icon: UserRound
    }
  ];

  const isActive = (href: string) => pathname.startsWith(href);
  const isHomeActive = pathname === `/${locale}` || pathname === `/${locale}/`;

  const renderNavItem = ({ href, label, icon: Icon }: { href: string; label: string; icon: ComponentType<SVGProps<SVGSVGElement>> }) => (
    <Link
      key={href}
      href={href}
      className={cn(
        'flex flex-col items-center gap-1 text-xs font-medium transition-colors',
        isActive(href) ? 'text-[#0A0A0A]' : 'text-[#6B7280] hover:text-[#0A0A0A]'
      )}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  );

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E5E7EB] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70 md:hidden">
      <div className="mx-auto flex w-full max-w-md items-end justify-between px-8 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
        <Link
          href={`/${locale}`}
          className={cn(
            'flex flex-col items-center gap-1 text-xs font-medium transition-colors',
            isHomeActive ? 'text-[#0A0A0A]' : 'text-[#6B7280] hover:text-[#0A0A0A]'
          )}
        >
          <span ref={logoRef} className="logo-mask h-5 w-5" aria-hidden />
          <span className="text-xs">síOsí</span>
        </Link>

        {navigation.map((item) => renderNavItem(item))}

        <Link
          href={`/${locale}/analyze`}
          className="flex items-center justify-center rounded-full bg-[#0A0A0A] p-3 text-white shadow-[0_8px_20px_rgba(10,10,10,0.18)] outline-none transition-transform hover:scale-[1.02] focus-visible:scale-[1.02] focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/50"
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden />
          <span className="sr-only">{t('new_photo')}</span>
        </Link>
      </div>
    </nav>
  );
}
