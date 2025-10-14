"use client";

import type { CSSProperties, ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { useSupabaseUser } from '@/hooks/use-supabase-user';
import { AppSidebar, APP_SIDEBAR_WIDTH } from '@/components/siosi/app-sidebar';

interface AppShellProps {
  locale: string;
  children: ReactNode;
}

export function AppShell({ locale, children }: AppShellProps) {
  const user = useSupabaseUser();
  const showSidebar = Boolean(user);

  return (
    <SidebarProvider className="contents">
      <div
        className="relative flex min-h-screen w-full"
        style={{ '--app-sidebar-width': APP_SIDEBAR_WIDTH } as CSSProperties}
      >
        <AppSidebar locale={locale} user={user} />

        <div
          className={cn(
            'flex min-h-screen w-full flex-1 flex-col',
            showSidebar ? 'md:ml-[var(--app-sidebar-width)]' : ''
          )}
        >
          {children}
        </div>
      </div>
    </SidebarProvider>
  );
}
