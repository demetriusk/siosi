"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSupabaseUser } from '@/hooks/use-supabase-user';
import logger from '@/lib/logger';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface SessionSaveButtonProps {
  sessionId: string;
  locale: string;
  className?: string;
  ownerId?: string | null;
  viewerId?: string | null;
}

export function SessionSaveButton({ sessionId, locale, className, ownerId, viewerId }: SessionSaveButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useSupabaseUser<any>();
  const t = useTranslations('sessions');
  const [saved, setSaved] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const resolvedUserId = useMemo(() => viewerId ?? (user as any)?.id ?? null, [viewerId, user]);
  const authContextResolved = useMemo(() => viewerId !== undefined || user !== undefined, [viewerId, user]);
  const isOwner = useMemo(() => Boolean(ownerId && resolvedUserId && ownerId === resolvedUserId), [ownerId, resolvedUserId]);

  const redirectToAuth = useCallback(() => {
    const redirectPath = pathname ?? `/${locale}/look/${sessionId}`;
    router.push(`/${locale}/auth?redirect=${encodeURIComponent(redirectPath)}`);
  }, [router, pathname, locale, sessionId]);

  const resolveAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const mod = await import('@/lib/supabase');
      const maybeSupabase = (mod as any).supabase ?? (mod as any).default ?? null;
      if (!maybeSupabase?.auth) {
        logger.warn('Supabase auth client unavailable when resolving access token');
        return null;
      }

      const { data, error } = await maybeSupabase.auth.getSession();
      if (error) {
        logger.warn('Supabase getSession failed when resolving access token', error);
        return null;
      }

      const token = data?.session?.access_token ?? null;
      if (token) return token;

      const { data: refreshed, error: refreshError } = await maybeSupabase.auth.refreshSession();
      if (refreshError) {
        logger.warn('Supabase refreshSession failed when resolving access token', refreshError);
        return null;
      }

      return refreshed?.session?.access_token ?? null;
    } catch (error) {
      logger.warn('Failed to resolve Supabase access token', error);
      return null;
    }
  }, []);

  const fetchSavedState = useCallback(async () => {
    if (!user || isOwner) {
      setSaved(false);
      return;
    }

    const token = await resolveAccessToken();
    if (!token) return;

    try {
      const resp = await fetch(`/api/sessions/${sessionId}/save`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!resp.ok) {
        if (resp.status === 404) {
          setSaved(false);
        } else {
          logger.warn('Failed to fetch saved state for session', { status: resp.status });
        }
        return;
      }

      const body = await resp.json();
      setSaved(Boolean(body?.saved));
    } catch (error) {
      logger.warn('Failed to fetch saved state for session', error);
    }
  }, [resolveAccessToken, sessionId, user, isOwner]);

  useEffect(() => {
    if (user === undefined) return; // still resolving auth
    if (!user) {
      setSaved(false);
      return;
    }
    if (isOwner) {
      setSaved(false);
      return;
    }
    void fetchSavedState();
  }, [user, fetchSavedState, isOwner]);

  const handleToggle = useCallback(async () => {
    if (!user) {
      redirectToAuth();
      return;
    }

    if (loading) return;
    setLoading(true);

    const token = await resolveAccessToken();
    if (!token) {
      setLoading(false);
      toast.error(t('save_error'));
      return;
    }

    const method = saved ? 'DELETE' : 'POST';

    try {
      const resp = await fetch(`/api/sessions/${sessionId}/save`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!resp.ok) {
        const detail = await resp.json().catch(() => ({}));
        const message = detail?.error ?? t('save_error');
        toast.error(message);
        return;
      }

      const body = await resp.json();
      setSaved(Boolean(body?.saved));

      toast.success(body?.saved ? t('save_success') : t('unsave_success'));
    } catch (error) {
      logger.error('Failed to toggle session save', error);
      toast.error(t('save_error'));
    } finally {
      setLoading(false);
    }
  }, [user, saved, redirectToAuth, resolveAccessToken, sessionId, loading, t]);

  if (!authContextResolved) {
    return null;
  }

  if (isOwner) {
    return null;
  }

  const ariaLabel = saved ? t('unsave_action') : t('save_action');

  return (
    <Button
      type="button"
      variant={saved ? 'default' : 'outline'}
      size="icon"
      className={cn(
        'h-9 w-9 border-[#E5E7EB]',
        saved ? 'bg-[#0A0A0A] hover:bg-[#1F1F1F] text-white' : 'text-[#0A0A0A]',
        className,
      )}
    onClick={handleToggle}
    disabled={loading}
      aria-pressed={saved}
      aria-label={ariaLabel}
    >
      <Star
        className="h-4 w-4"
        fill={saved ? 'currentColor' : 'none'}
        strokeWidth={saved ? 0 : 2}
      />
      <span className="sr-only">{ariaLabel}</span>
    </Button>
  );
}
