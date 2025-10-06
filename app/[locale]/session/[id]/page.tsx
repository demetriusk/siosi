export const dynamic = 'force-dynamic';

import { format } from 'date-fns';
import { Share2, Mail, Download, Upload } from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/siosi/header';
import { Footer } from '@/components/siosi/footer';
import { LabResultCard } from '@/components/siosi/lab-result-card';
import { Button } from '@/components/ui/button';
import { getSupabase } from '@/lib/supabase';
import { SessionWithAnalyses, LabAnalysis } from '@/lib/types';
import { getTranslations } from 'next-intl/server';

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
    } catch (e) {
      return fallback ?? key; // unused 'e' parameter
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
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" className="border-[#E5E7EB]">
                <Share2 className="w-4 h-4 mr-2" />
                {safeT('results.share', 'Share')}
              </Button>
              <Button variant="outline" size="sm" className="border-[#E5E7EB]">
                <Download className="w-4 h-4 mr-2" />
                {safeT('common.save', 'Save')}
              </Button>
              <Link href={`/${locale}/analyze`}>
                <Button variant="outline" size="sm" className="border-[#E5E7EB]">
                  <Upload className="w-4 h-4 mr-2" />
                  {safeT('results.analyze_another', 'Analyze another')}
                </Button>
              </Link>
            </div>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-sm p-8 md:p-12 text-center mb-8">
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

          <div className="flex flex-col md:flex-row items-center justify-center gap-4 mt-12 p-6 bg-white border border-[#E5E7EB] rounded-sm">
            <Button variant="outline" className="border-[#E5E7EB]">
              <Mail className="w-4 h-4 mr-2" />
              {safeT('results.email_report', 'Email report')}
            </Button>
            <Button variant="outline" className="border-[#E5E7EB]">
              <Share2 className="w-4 h-4 mr-2" />
              {safeT('results.share_instagram', 'Share to Instagram')}
            </Button>
          </div>

          <p className="text-center text-sm text-[#10B981] mt-4 flex items-center justify-center gap-2">
            <span>✓</span>
            {safeT('results.saved', 'Saved')}
          </p>
        </div>
      </main>

      <Footer locale={locale} />
    </div>
  );
}
