"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import logger from '@/lib/logger';

interface SessionProfileCtaProps {
  locale: string;
  hasProfile: boolean;
  editLabel: string;
  addLabel: string;
}

export default function SessionProfileCta({ locale, hasProfile, editLabel, addLabel }: SessionProfileCtaProps) {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;
    let listener: any = null;

    async function resolveAuth() {
      try {
        const mod = await import('@/lib/supabase');
        const maybeSupabase = (mod as any).supabase ?? (mod as any).default ?? null;

        if (!maybeSupabase?.auth) {
          if (mounted) setAuthChecked(true);
          return;
        }

        if (typeof maybeSupabase.auth.getUser === 'function') {
          const { data } = await maybeSupabase.auth.getUser();
          if (mounted) {
            setIsAuthenticated(!!data?.user);
            setAuthChecked(true);
          }
        } else if (typeof maybeSupabase.auth.user === 'function') {
          const user = maybeSupabase.auth.user();
          if (mounted) {
            setIsAuthenticated(!!user);
            setAuthChecked(true);
          }
        } else if (typeof maybeSupabase.auth.getSession === 'function') {
          const { data } = await maybeSupabase.auth.getSession();
          if (mounted) {
            setIsAuthenticated(!!data?.session?.user);
            setAuthChecked(true);
          }
        } else {
          if (mounted) setAuthChecked(true);
        }

        listener = maybeSupabase.auth.onAuthStateChange?.((event: string, session: any) => {
          if (!mounted) return;
          setIsAuthenticated(!!session?.user);
          setAuthChecked(true);
        });
      } catch (error) {
        logger.debug('Session profile CTA auth check failed', error);
        if (mounted) setAuthChecked(true);
      }
    }

    resolveAuth();

    return () => {
      mounted = false;
      try {
        const subscription = listener?.data?.subscription ?? listener?.subscription;
        subscription?.unsubscribe?.();
      } catch {
        // ignore
      }
    };
  }, []);

  if (!authChecked || !isAuthenticated) return null;

  if (hasProfile) {
    return (
      <Link href={`/${locale}/profile`} className="text-sm font-semibold text-[#0A0A0A] underline">
        {editLabel}
      </Link>
    );
  }

  return (
    <Link href={`/${locale}/profile`}>
      <Button variant="outline" className="h-9 px-4">
        {addLabel}
      </Button>
    </Link>
  );
}
