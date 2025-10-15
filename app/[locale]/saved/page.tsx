'use client'

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/siosi/header';
import { Footer } from '@/components/siosi/footer';
import { SessionCard } from '@/components/siosi/session-card';
import { Button } from '@/components/ui/button';
import { Session } from '@/lib/types';
import { useTranslations } from 'next-intl';
import logger from '@/lib/logger';

interface SavedRow {
  session: Session | null;
}

export default function SavedSessionsPage() {
  const params = useParams();
  const locale = (params as any)?.locale as string;
  const t = useTranslations('saved_sessions');
  const router = useRouter();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const mod = await import('@/lib/supabase');
        const maybeSupabase = (mod as any).supabase ?? (mod as any).default ?? null;
        if (!maybeSupabase) {
          logger.error('Supabase client unavailable when fetching saved sessions');
          if (mounted) {
            setUserId(null);
            setSessions([]);
          }
          return;
        }

        let uid: string | undefined;
        if (typeof maybeSupabase.auth?.getUser === 'function') {
          const res = await maybeSupabase.auth.getUser();
          uid = res?.data?.user?.id;
        } else if (typeof maybeSupabase.auth?.user === 'function') {
          const user = maybeSupabase.auth.user();
          uid = user?.id;
        }

        if (!uid) {
          if (mounted) {
            setUserId(null);
            setSessions([]);
          }
          return;
        }

        if (mounted) {
          setUserId(uid);
        }

        const { data, error } = await maybeSupabase
          .from('session_saves')
          .select('session:sessions(*)')
          .eq('user_id', uid)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          logger.error('Error fetching saved sessions', error);
          if (mounted) setSessions([]);
          return;
        }

        if (mounted) {
          const rows = (data ?? []) as SavedRow[];
          const mapped = rows
            .map((row) => row.session)
            .filter(Boolean) as Session[];
          setSessions(mapped);
        }
      } catch (error) {
        logger.error('Unexpected error loading saved sessions', error);
        if (mounted) {
          setSessions([]);
          setUserId(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header locale={locale} />

      <main className="flex-1 bg-[#F9FAFB] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl text-[#0A0A0A]">
                {t('title')}
              </h1>
            </div>
            <Link href={`/${locale}/sessions`}>
              <Button className="bg-[#0A0A0A] text-white hover:bg-[#1F1F1F]">
                {t('browse_sessions')}
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="bg-white border border-[#E5E7EB] rounded-sm p-16 text-center">
              {t('loading')}
            </div>
          ) : !userId ? (
            <div className="bg-white border border-[#E5E7EB] rounded-sm p-16 text-center">
              <p className="mb-4">{t('login_prompt')}</p>
              <Button onClick={() => router.push(`/${locale}/auth`)} className="bg-[#0A0A0A] text-white">
                {t('login_cta')}
              </Button>
            </div>
          ) : sessions.length === 0 ? (
            <div className="bg-white border border-[#E5E7EB] rounded-sm p-16 text-center">
              <h2 className="text-xl font-semibold text-[#0A0A0A] mb-2">
                {t('empty_title')}
              </h2>
              <p className="text-[#6B7280] mb-6">
                {t('empty_subtitle')}
              </p>
              <Link href={`/${locale}/sessions`}>
                <Button className="bg-[#0A0A0A] text-white hover:bg-[#1F1F1F]">
                  {t('browse_sessions')}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="columns-2 gap-4 md:columns-3 xl:columns-4">
              {sessions.map((session) => (
                <SessionCard key={session.id} session={session} locale={locale} viewerId={userId} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer locale={locale} />
    </div>
  );
}
