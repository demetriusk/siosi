"use client";

import { useEffect, useState } from 'react';

/**
 * Client hook that returns the current Supabase user, if any.
 * Returns `undefined` while loading, `null` when unauthenticated,
 * and the user object when authenticated.
 */
export function useSupabaseUser<TUser = any>() {
  const [user, setUser] = useState<TUser | null | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    let listener: { subscription?: { unsubscribe?: () => void } } | null = null;

    const loadUser = async () => {
      try {
        const mod = await import('@/lib/supabase');
        const maybeSupabase = (mod as any).supabase ?? (mod as any).default ?? null;
        const auth = (maybeSupabase as any)?.auth;

        if (!auth) {
          if (mounted) setUser(null);
          return;
        }

        if (typeof auth.getUser === 'function') {
          const { data } = await auth.getUser();
          if (mounted) setUser(data?.user ?? null);
        } else if (typeof auth.user === 'function') {
          if (mounted) setUser(auth.user() ?? null);
        } else {
          if (mounted) setUser(null);
        }
      } catch {
        if (mounted) setUser(null);
      }
    };

    const subscribeToAuth = async () => {
      try {
        const mod = await import('@/lib/supabase');
        const maybeSupabase = (mod as any).supabase ?? (mod as any).default ?? null;
        const auth = (maybeSupabase as any)?.auth;

        if (auth?.onAuthStateChange) {
          listener = auth.onAuthStateChange((_event: string, session: any) => {
            if (!mounted) return;
            setUser(session?.user ?? null);
          });
        }
      } catch {
        // ignore subscription errors
      }
    };

    loadUser();
    subscribeToAuth();

    return () => {
      mounted = false;
      try {
        listener?.subscription?.unsubscribe?.();
      } catch {
        // ignore cleanup errors
      }
    };
  }, []);

  return user;
}
