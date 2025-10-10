"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { Header } from '@/components/siosi/header';
import { Footer } from '@/components/siosi/footer';
import { Button } from '@/components/ui/button';
import ProfileClient from './ProfileClient';
import { useTranslations } from 'next-intl';

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params as any)?.locale ?? 'en';
  const t = useTranslations();

  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function check() {
      try {
        const mod = await import('@/lib/supabase');
        const maybeSupabase = (mod as any).supabase ?? (mod as any).default ?? null;
        let uid: string | undefined;
        if (typeof (maybeSupabase as any)?.auth?.getUser === 'function') {
          const res = await (maybeSupabase as any)?.auth?.getUser?.();
          uid = res?.data?.user?.id;
        } else if (typeof (maybeSupabase as any)?.auth?.user === 'function') {
          const u = (maybeSupabase as any)?.auth?.user?.();
          uid = u?.id;
        }

        if (!mounted) return;

        setAuthenticated(!!uid);
      } catch (e) {
        setAuthenticated(false);
      } finally {
        if (mounted) setChecking(false);
      }
    }

    check();

    // Try to subscribe to auth changes so the page updates if the user logs in
    let listener: any = null;
    (async () => {
      try {
        const mod = await import('@/lib/supabase');
        const maybeSupabase = (mod as any).supabase ?? (mod as any).default ?? null;
        listener = (maybeSupabase as any)?.auth?.onAuthStateChange?.((event: string, session: any) => {
          if (!mounted) return;
          setAuthenticated(!!session?.user);
        });
      } catch {
        // ignore
      }
    })();

    return () => {
      mounted = false;
      try {
        if (listener?.subscription?.unsubscribe) listener.subscription.unsubscribe();
      } catch {
        // ignore
      }
    };
  }, [locale]);

  if (checking) return null;

  if (!authenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header locale={locale} />
        <main className="flex-1 bg-[#F9FAFB] py-12">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white border border-[#E5E7EB] rounded-sm p-16 text-center">
              <p className="mb-4">Please log in to access your profile.</p>
              <Button onClick={() => router.push(`/${locale}/auth`)} className="bg-[#0A0A0A] text-white">
                Log in
              </Button>
            </div>
          </div>
        </main>
        <Footer locale={locale} />
      </div>
    );
  }

  return <ProfileClient locale={locale} />;
}
