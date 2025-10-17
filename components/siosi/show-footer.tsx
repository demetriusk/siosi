"use client";
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Footer } from './footer';
import { getSupabase } from '@/lib/supabase';

const FOOTER_WHITELIST = [
  '', // home
  'about',
  'privacy',
  'support',
  'terms',
];

export default function ShowFooter({ locale }: { locale: string }) {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkedAuth, setCheckedAuth] = useState(false);

  useEffect(() => {
    let isActive = true;
    let unsubscribe: (() => void) | null = null;

    const init = async () => {
      let supabase;
      try {
        supabase = getSupabase();
      } catch (error) {
        if (isActive) {
          setIsLoggedIn(false);
          setCheckedAuth(true);
        }
        return;
      }

      try {
        const { data } = await supabase.auth.getSession();
        if (isActive) {
          setIsLoggedIn(!!data.session?.user);
        }
      } catch (error) {
        if (isActive) {
          setIsLoggedIn(false);
        }
      } finally {
        if (isActive) {
          setCheckedAuth(true);
        }
      }

      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (isActive) {
          setIsLoggedIn(!!session?.user);
        }
      });

      unsubscribe = () => listener.subscription.unsubscribe();
    };

    init();

    return () => {
      isActive = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const isAllowedRoute = useMemo(() => {
    if (!pathname) {
      return false;
    }
    // pathname looks like /{locale}/path
    const segments = pathname.split('/');
    const afterLocale = segments.slice(2);
    const first = afterLocale[0] ?? '';
    return FOOTER_WHITELIST.includes(first);
  }, [pathname]);

  if (!checkedAuth) {
    return null;
  }

  if (isLoggedIn && !isAllowedRoute) {
    return null;
  }

  return <Footer locale={locale} />;
}