'use client';

import type { ComponentType, SVGProps } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LayoutGrid, Plus, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileBottomNavProps {
  locale: string;
}

interface NavItemConfig {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

export function MobileBottomNav({ locale }: MobileBottomNavProps) {
  const pathname = usePathname();
  const t = useTranslations('nav');

  const primaryNavItems: NavItemConfig[] = [
    {
      href: `/${locale}/analyze`,
      label: t('new_photo'),
      icon: Plus
    },
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

  const renderNavItem = ({ href, label, icon: Icon }: NavItemConfig) => (
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
        {renderNavItem(primaryNavItems[0])}

        <Link
          href={`/${locale}`}
          aria-label="siOsi home"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[#E5E7EB] bg-white shadow-[0_8px_20px_rgba(10,10,10,0.12)] outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/40">
            <span className="logo-mask h-7 w-7" aria-hidden />
          </span>
        </Link>

        <div className="flex items-center gap-8">
          {primaryNavItems.slice(1).map(renderNavItem)}
        </div>
      </div>
    </nav>
  );
}
