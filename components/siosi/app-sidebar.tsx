"use client";

import type { ComponentType, CSSProperties, SVGProps } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Plus, UserRound } from 'lucide-react';
import { Sidebar, SidebarSeparator } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslations } from 'next-intl';

export const APP_SIDEBAR_WIDTH = '4.5rem';

interface AppSidebarProps {
  locale: string;
  user: unknown;
}

interface NavItem {
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
}

export function AppSidebar({ locale, user }: AppSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const [logoBurst, setLogoBurst] = useState(false);

  useEffect(() => {
    setLogoBurst(true);
    const timeout = window.setTimeout(() => setLogoBurst(false), 950);
    return () => window.clearTimeout(timeout);
  }, [pathname]);

  if (!user) {
    return null;
  }

  const navItems: NavItem[] = [
    {
      href: `/${locale}/sessions`,
      icon: LayoutGrid,
      label: t('sessions')
    },
    {
      href: `/${locale}/analyze`,
      icon: Plus,
      label: t('new_photo')
    }
  ];

  const bottomItem: NavItem = {
    href: `/${locale}/profile`,
    icon: UserRound,
    label: t('profile')
  };
  const BottomIcon = bottomItem.icon;

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <Sidebar
      collapsible="none"
      className="hidden border-r border-sidebar-border bg-white/90 backdrop-blur md:fixed md:inset-y-0 md:left-0 md:z-40 md:flex md:w-[var(--app-sidebar-width)] md:flex-col md:items-center md:py-6"
      style={{ '--app-sidebar-width': APP_SIDEBAR_WIDTH } as CSSProperties}
    >
      <div className="flex flex-1 flex-col items-center gap-5">
        <Link
          href={`/${locale}`}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-sidebar-border bg-white shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/50"
        >
          <span className={cn('logo-mask h-7 w-7', logoBurst && 'logo-burst')} aria-hidden />
          <span className="sr-only">siOsi home</span>
        </Link>

        <SidebarSeparator className="my-1 h-px w-8 bg-sidebar-border" />

        <nav className="flex flex-1 flex-col items-center gap-4">
          {navItems.map(({ href, icon: Icon, label }) => (
            <Tooltip key={href} delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  href={href}
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-full border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/50',
                    isActive(href)
                      ? 'border-transparent bg-[#0A0A0A] text-white shadow-lg'
                      : 'border-transparent bg-white text-[#6B7280] shadow-sm hover:bg-[#0A0A0A]/5 hover:text-[#0A0A0A]'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="sr-only">{label}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="px-2 py-1 text-xs">
                {label}
              </TooltipContent>
            </Tooltip>
          ))}
        </nav>
      </div>

      <div className="mt-auto flex flex-col items-center gap-4">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Link
              href={bottomItem.href}
              className={cn(
                'flex h-11 w-11 items-center justify-center rounded-full border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/50',
                isActive(bottomItem.href)
                  ? 'border-transparent bg-[#0A0A0A] text-white shadow-lg'
                  : 'border-transparent bg-white text-[#6B7280] shadow-sm hover:bg-[#0A0A0A]/5 hover:text-[#0A0A0A]'
              )}
            >
              <BottomIcon className="h-5 w-5" />
              <span className="sr-only">{bottomItem.label}</span>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="px-2 py-1 text-xs">
            {bottomItem.label}
          </TooltipContent>
        </Tooltip>
      </div>
    </Sidebar>
  );
}
