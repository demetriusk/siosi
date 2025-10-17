'use client'

import Link from 'next/link';
import { Upload, ScanFace } from 'lucide-react';
import { Header } from '@/components/siosi/header';
import { Footer } from '@/components/siosi/footer';
import { SessionCard } from '@/components/siosi/session-card';
import { Button } from '@/components/ui/button';
// Do not import `supabase` at module scope in client components. We'll dynamically
// import it inside the effect when needed.
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Session } from '@/lib/types';
import { useTranslations } from 'next-intl';
import logger from '@/lib/logger';

export default function LooksPage() {
  const params = useParams();
  const locale = (params as any)?.locale as string;
  const t = useTranslations();
  const router = useRouter();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        // get current user id
        let uid: string | undefined;
        const mod = await import('@/lib/supabase');
        const maybeSupabase = (mod as any).supabase ?? (mod as any).default ?? null;
        if (typeof (maybeSupabase as any)?.auth?.getUser === 'function') {
          const res = await (maybeSupabase as any)?.auth?.getUser?.();
          uid = res?.data?.user?.id;
        } else if (typeof (maybeSupabase as any)?.auth?.user === 'function') {
          const u = (maybeSupabase as any)?.auth?.user?.();
          uid = u?.id;
        }

        if (!uid) {
          setUserId(null);
          setSessions([]);
          setLoading(false);
          return;
        }

        setUserId(uid);

        if (!maybeSupabase) {
          logger.error('Supabase client unavailable when fetching sessions');
        } else {
          const { data, error } = await (maybeSupabase as any)
            .from('sessions')
            .select('*')
            .eq('user_id', uid)
            .order('created_at', { ascending: false })
            .limit(50);

          if (error) {
            logger.error('Error fetching sessions:', error);
            setSessions([]);
          } else {
            if (mounted) setSessions(data ?? []);
          }
        }
        } catch (e) {
        logger.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => { mounted = false };
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header locale={locale} />

      <main className="flex-1 bg-[#F9FAFB] pt-4 sm:pt-6 lg:pt-8 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {loading ? (
            <div className="bg-white border border-[#E5E7EB] rounded-sm p-16 text-center">Loading...</div>
          ) : !userId ? (
            <div className="bg-white border border-[#E5E7EB] rounded-sm p-16 text-center">
              <p className="mb-4">Log in to see your looks.</p>
              <Button onClick={() => router.push(`/${locale}/auth`)} className="bg-[#0A0A0A] text-white">
                Log in
              </Button>
            </div>
          ) : sessions.length === 0 ? (
            <div className="bg-white border border-[#E5E7EB] rounded-sm p-16 text-center">
              <Upload className="w-16 h-16 text-[#D1D5DB] mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-[#0A0A0A] mb-2">
                {t('sessions.empty_title')}
              </h2>
              <p className="text-[#6B7280] mb-6">
                {t('sessions.empty_subtitle')}
              </p>
              <Link href={`/${locale}/analyze`}>
                <Button className="bg-[#0A0A0A] text-white hover:bg-[#1F1F1F]">
                  <ScanFace className="w-4 h-4 mr-2" />
                  Analyze New Look
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
