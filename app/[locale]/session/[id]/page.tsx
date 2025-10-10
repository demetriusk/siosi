export const dynamic = 'force-dynamic';

import { format } from 'date-fns';
import Link from 'next/link';
import Image from 'next/image';
import { Header } from '@/components/siosi/header';
import { Footer } from '@/components/siosi/footer';
import { LabResultCard } from '@/components/siosi/lab-result-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getSupabase } from '@/lib/supabase';
import { SessionWithAnalyses, LabAnalysis } from '@/lib/types';
import { getTranslations } from 'next-intl/server';
// Client actions wrapper (renders client-only buttons)
import SessionActionsClient from '@/components/siosi/session-actions-client';

import type { ParamsWithLocaleAndId } from '@/lib/types';

interface SessionPageProps extends ParamsWithLocaleAndId {}

async function getSession(id: string): Promise<SessionWithAnalyses | null> {
  const supabase = getSupabase();

  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (sessionError || !session) {
    return null;
  }

  // Some flows save analyses inline on the sessions row (JSON column `analyses`).
  // Prefer the inline analyses when present; otherwise fall back to the separate
  // `analyses` table (legacy shape).
  if (session.analyses && Array.isArray(session.analyses)) {
    return {
      ...session,
      analyses: session.analyses as LabAnalysis[],
    };
  }

  const { data: analyses, error: analysesError } = await supabase
    .from('analyses')
    .select('*')
    .eq('session_id', id);

  if (analysesError) {
    return null;
  }

  return {
    ...session,
    analyses: analyses as LabAnalysis[],
  };
}

export default async function SessionPage({ params }: SessionPageProps) {
  const { locale, id } = await params!;
  const session = await getSession(id);
  const t = await getTranslations({ locale });

  // Safe translation helper: if a message key is missing, return a sensible fallback
  const safeT = (key: string, fallback?: string) => {
    try {
      return t(key);
    } catch {
      return fallback ?? key;
    }
  };

  // If session is missing, render a friendly empty state instead of a 404.
  // Provide safe defaults so the rest of the page can render deterministically.
  const createdAt = session?.created_at ?? new Date().toISOString();
  const overallScore = session?.overall_score ?? 0;
  const analyses = session?.analyses ?? [];

  const criticalAnalyses = analyses.filter(
    a => a.verdict === 'NAY' && a.confidence >= 80
  );
  const watchAnalyses = analyses.filter(
    a => (a.verdict === 'MAYBE' && a.confidence >= 50) ||
       (a.verdict === 'NAY' && a.confidence < 80)
  );
  const goodAnalyses = analyses.filter(
    a => a.verdict === 'YAY' && a.confidence >= 70
  );

  const categorizedCount = criticalAnalyses.length + watchAnalyses.length + goodAnalyses.length;

  return (
    <div className="min-h-screen flex flex-col">
      <Header locale={locale} />

      <main className="flex-1 bg-[#F9FAFB] py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
            <div>
              <time className="text-sm text-[#6B7280]">
                {format(new Date(createdAt), 'MMMM d, yyyy • h:mm a')}
              </time>
            </div>
            {/* Server component renders a small client wrapper for actions */}
            <SessionActionsClient locale={locale} sessionId={id} />
          </div>

          <Card className="mb-8 p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <div className="w-full md:w-1/3">
                {session?.photo_url ? (
                  <div className="aspect-square w-full bg-[#F9FAFB] rounded-sm overflow-hidden">
                    <Image
                      src={session.photo_url}
                      alt={safeT('common.photo', 'Photo')}
                      width={800}
                      height={800}
                      className="object-cover w-full h-full"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="aspect-square w-full bg-[#F9FAFB] rounded-sm flex items-center justify-center text-[#D1D5DB]">
                    <span className="text-sm">{safeT('common.no_image', 'No image')}</span>
                  </div>
                )}
              </div>

              <div className="flex-1 text-center md:text-left">
                <div className="relative inline-block mb-6">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="#E5E7EB"
                      strokeWidth="8"
                      fill="none"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="#0A0A0A"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${(overallScore / 10) * 351.86} 351.86`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-4xl font-bold text-[#0A0A0A]">
                      {overallScore.toFixed(1)}
                    </span>
                  </div>
                </div>

                <h2 className="text-xl font-semibold text-[#6B7280]">
                  {safeT('results.overall_score', 'Overall score')}
                </h2>
              </div>
            </div>
          </Card>

          {criticalAnalyses.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-xl font-bold text-[#0A0A0A]">
                  {safeT('results.critical', 'Critical')}
                </h3>
                <span className="px-2.5 py-0.5 bg-[#EF4444] text-white text-xs font-semibold rounded-full">
                  {criticalAnalyses.length}
                </span>
              </div>
              <div className="space-y-4">
                {criticalAnalyses.map((analysis) => (
                  <LabResultCard key={analysis.id} analysis={analysis} defaultExpanded />
                ))}
              </div>
            </div>
          )}

          {watchAnalyses.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-xl font-bold text-[#0A0A0A]">
                  {safeT('results.watch_these', 'Watch these')}
                </h3>
                <span className="px-2.5 py-0.5 bg-[#F59E0B] text-white text-xs font-semibold rounded-full">
                  {watchAnalyses.length}
                </span>
              </div>
              <div className="space-y-4">
                {watchAnalyses.map((analysis) => (
                  <LabResultCard key={analysis.id} analysis={analysis} />
                ))}
              </div>
            </div>
          )}

          {goodAnalyses.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-xl font-bold text-[#0A0A0A]">
                  {safeT('results.looking_good', 'Looking good')}
                </h3>
                <span className="px-2.5 py-0.5 bg-[#10B981] text-white text-xs font-semibold rounded-full">
                  {goodAnalyses.length}
                </span>
              </div>
              <div className="space-y-4">
                {goodAnalyses.map((analysis) => (
                  <LabResultCard key={analysis.id} analysis={analysis} />
                ))}
              </div>
            </div>
          )}

          {/* Empty state when no analyses present */}
          {analyses.length === 0 && (
            <Card className="p-6 text-center">
              <h3 className="text-lg font-semibold text-[#0A0A0A] mb-2">
                {safeT('results.no_analyses_title', 'No analyses yet')}
              </h3>
              <p className="text-sm text-[#6B7280]">
                {safeT('results.no_analyses_body', 'We couldn\'t find any lab results for this session. Try analyzing another photo.')}
              </p>
              <div className="mt-4">
                <Link href={`/${locale}/analyze`}>
                  <Button>{safeT('results.analyze_another', 'Analyze another')}</Button>
                </Link>
              </div>
            </Card>
          )}

          {/* If there are analyses but none matched thresholds, show them all */}
          {analyses.length > 0 && categorizedCount === 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-xl font-bold text-[#0A0A0A]">
                  {safeT('results.all_results', 'All results')}
                </h3>
                <span className="px-2.5 py-0.5 bg-[#6B7280] text-white text-xs font-semibold rounded-full">
                  {analyses.length}
                </span>
              </div>
              <div className="space-y-4">
                {analyses.map((analysis) => (
                  <LabResultCard key={analysis.id ?? analysis.lab_name} analysis={analysis} />
                ))}
              </div>
            </div>
          )}

          {/* Actions are rendered via the client-side SessionActionsClient component above */}

          {/* Removed the saved confirmation block per request */}
        </div>
      </main>

      <Footer locale={locale} />
    </div>
  );
}
