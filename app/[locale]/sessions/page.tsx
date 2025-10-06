 'use client'

import Link from 'next/link';
import { Upload } from 'lucide-react';
import { Header } from '@/components/siosi/header';
import { Footer } from '@/components/siosi/footer';
import { SessionCard } from '@/components/siosi/session-card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Session } from '@/lib/types';
import { useTranslations } from 'next-intl';

export default function SessionsPage() {
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
        if (typeof (supabase as any).auth?.getUser === 'function') {
          const res = await (supabase as any).auth.getUser();
          uid = res?.data?.user?.id;
        } else if (typeof (supabase as any).auth?.user === 'function') {
          const u = (supabase as any).auth.user();
          uid = u?.id;
        }

        if (!uid) {
          setUserId(null);
          setSessions([]);
          setLoading(false);
          return;
        }

        setUserId(uid);

        const { data, error } = await (supabase as any)
          .from('sessions')
          .select('*')
          .eq('user_id', uid)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          // eslint-disable-next-line no-console
          console.error('Error fetching sessions:', error);
          setSessions([]);
        } else {
          if (mounted) setSessions(data ?? []);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
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

      <main className="flex-1 bg-[#F9FAFB] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-[#0A0A0A] mb-2">
                {t('sessions.title')}
              </h1>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-[#E5E7EB] text-[#0A0A0A] text-sm font-medium rounded">
                  {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
                </span>
              </div>
            </div>
            <Link href={`/${locale}/analyze`}>
              <Button className="bg-[#0A0A0A] text-white hover:bg-[#1F1F1F]">
                <Upload className="w-4 h-4 mr-2" />
                Upload New Photo
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="bg-white border border-[#E5E7EB] rounded-sm p-16 text-center">Loading...</div>
          ) : !userId ? (
            <div className="bg-white border border-[#E5E7EB] rounded-sm p-16 text-center">
              <p className="mb-4">Please log in to see your sessions.</p>
              <Button onClick={() => router.push(`/${locale}/login`)} className="bg-[#0A0A0A] text-white">
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
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Photo
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sessions.map((session) => (
                <SessionCard key={session.id} session={session} locale={locale} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer locale={locale} />
    </div>
  );
}
