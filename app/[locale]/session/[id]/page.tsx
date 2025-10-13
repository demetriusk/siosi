export const dynamic = 'force-dynamic';

import { format } from 'date-fns';
import Link from 'next/link';
import { Aperture, Gem, PartyPopper, Video, Activity, Home, Trees, Shell, Sun, Thermometer, Droplet, Zap, Camera, Clock, ZoomIn, ThermometerSun, Ghost, ChevronLeft } from 'lucide-react';
import { Header } from '@/components/siosi/header';
import { Footer } from '@/components/siosi/footer';
import { LabResultCard } from '@/components/siosi/lab-result-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import ChipList from '@/components/ui/chip-list';
import { getSupabase } from '@/lib/supabase';
import { SessionWithAnalyses, LabAnalysis } from '@/lib/types';
import { getTranslations } from 'next-intl/server';
// Client actions wrapper (renders client-only buttons)
import SessionActionsClient from '@/components/siosi/session-actions-client';
import SessionProfileCta from '@/components/siosi/session-profile-cta';
import { SessionPhotoPreview } from '@/components/siosi/session-photo-preview';

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
  const occasion = session?.occasion;
  const concerns = session?.concerns ?? [];
  const where = session?.indoor_outdoor ?? 'both';
  const climate = session?.climate;
  const hasProfile = Boolean(session?.skin_type || session?.skin_tone || session?.lid_type);

  // Icon maps (string-keyed to gracefully handle legacy/extended values)
  const occasionIconMap: Record<string, React.ReactNode> = {
    photoshoot: <Aperture size={16} className="mr-2" />,
    wedding: <Gem size={16} className="mr-2" />,
    party: <PartyPopper size={16} className="mr-2" />,
    video: <Video size={16} className="mr-2" />,
    testing: <Activity size={16} className="mr-2" />,
    work: <Activity size={16} className="mr-2" />,
    everyday: <Activity size={16} className="mr-2" />,
    date: <PartyPopper size={16} className="mr-2" />,
    stage: <Activity size={16} className="mr-2" />,
    special: <Gem size={16} className="mr-2" />,
  };
  const whereIconMap: Record<string, React.ReactNode> = {
    indoor: <Home size={16} className="mr-2" />,
    outdoor: <Trees size={16} className="mr-2" />,
    both: <Shell size={16} className="mr-2" />,
  };
  const climateIconMap: Record<string, React.ReactNode> = {
    dry: <Sun size={16} className="mr-2" />,
    normal: <Thermometer size={16} className="mr-2" />,
    humid: <Droplet size={16} className="mr-2" />,
    hot_humid: <Zap size={16} className="mr-2" />,
  };
  const concernIconMap: Record<string, React.ReactNode> = {
    flash: <Camera size={16} className="mr-2" />,
    lasting: <Clock size={16} className="mr-2" />,
    closeup: <ZoomIn size={16} className="mr-2" />,
    weather: <ThermometerSun size={16} className="mr-2" />,
    heat: <ThermometerSun size={16} className="mr-2" />,
    transfer: <Ghost size={16} className="mr-2" />,
    sensitive: <ThermometerSun size={16} className="mr-2" />,
  };

  const legacyLidTypeMap: Record<string, string> = {
    monolid: 'monolid-eyes',
    hooded: 'hooded-eyes',
    'deep_set': 'deep-set-eyes',
    protruding: 'protruding-eyes',
    downturned: 'downturned-eyes',
    upturned: 'upturned-eyes',
    almond: 'almond-eyes',
    standard: 'almond-eyes',
    round: 'round-eyes',
    close_set: 'close-set-eyes',
    wide_set: 'wide-set-eyes',
  };

  const formatLidType = (value?: string | null) => {
    if (!value || typeof value !== 'string') return null;
    const normalized = value.trim().toLowerCase();
    if (!normalized) return null;
    const coerced = legacyLidTypeMap[normalized] ?? normalized;
    const fallbackLabel = coerced
      .split(/[-_]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
    return safeT(`profile.lid_types.${coerced}`, fallbackLabel);
  };

  const lidTypeLabel = formatLidType(session?.lid_type);

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

  const profileDetails: string[] = [];
  if (session?.skin_type) {
    profileDetails.push(`${safeT('profile.skin_type', 'Skin type')}: ${session.skin_type}`);
  }
  if (session?.skin_tone) {
    profileDetails.push(`${safeT('profile.skin_tone', 'Skin tone')}: ${session.skin_tone}`);
  }
  if (lidTypeLabel) {
    profileDetails.push(`${safeT('profile.lid_type', 'Lid type')}: ${lidTypeLabel}`);
  }

  const profileSummary = {
    title: safeT('results.profile.title', 'Profile details'),
    items: profileDetails,
    emptyMessage: safeT('results.profile.drawer_empty', 'No profile details were used this time.'),
    hasAny: profileDetails.length > 0,
  };

  const concernLabels = concerns.map((key) => safeT(`upload.concerns.${String(key)}`, String(key)));
  const contextHasAny = Boolean(occasion || concernLabels.length > 0 || (where && where !== 'both') || climate);

  const contextSummary = {
    title: safeT('results.context.title', 'What this look was checked for'),
    occasion: occasion
      ? {
          label: safeT('upload.occasion_title', 'Occasion'),
          value: safeT(`upload.occasions.${occasion}`, String(occasion)),
        }
      : null,
    where: contextHasAny || (where && where !== 'both')
      ? {
          label: safeT('upload.where_title', 'Where'),
          value: safeT(`upload.where.${where}`, String(where)),
        }
      : null,
    climate: climate
      ? {
          label: safeT('upload.climate_title', 'Climate'),
          value: safeT(`upload.climate.${climate}`, String(climate)),
        }
      : null,
    concerns: {
      title: safeT('upload.concerns_title', 'Concerns'),
      items: concernLabels,
    },
    emptyMessage: safeT('results.context.empty', 'No extra context was selected this time. Results may be a tiny bit less precise. Adding a few quick details next time helps the labs aim better.'),
    hasAny: contextHasAny,
  };

  const actionLabels = {
    shareTitle: safeT('results.share.drawer_title', 'Share to'),
    shareViaDevice: safeT('results.share.device', 'Share via device'),
    copyLink: safeT('results.share.copy_link', 'Copy link'),
    downloadImage: safeT('results.share.download_image', 'Download image'),
    cancel: safeT('common.cancel', 'Cancel'),
    detailsTitle: safeT('results.details.title', 'Session details'),
    deleteLabel: safeT('sessions.delete', 'Delete'),
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header locale={locale} />

      <main className="flex-1 bg-[#F9FAFB] py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

          <Card className="mb-8 p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="w-full md:w-1/3">
                {session?.photo_url ? (
                  <SessionPhotoPreview
                    src={session.photo_url}
                    alt={safeT('common.photo', 'Photo')}
                  />
                ) : (
                  <div className="aspect-square w-full bg-[#F9FAFB] rounded-sm flex items-center justify-center text-[#D1D5DB]">
                    <span className="text-sm">{safeT('common.no_image', 'No image')}</span>
                  </div>
                )}
              </div>

              <div className="flex-1 flex flex-col gap-6">

                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
                  <Button asChild variant="ghost" className="gap-2 px-0 text-[#0A0A0A]">
                    <Link href={`/${locale}/sessions`}>
                      <ChevronLeft className="h-4 w-4" />
                    </Link>
                  </Button>
                  <SessionActionsClient
                    locale={locale}
                    sessionId={id}
                    createdAtIso={createdAt}
                    profileSummary={profileSummary}
                    contextSummary={contextSummary}
                    labels={actionLabels}
                  />
                </div>
          
                {/* Overall score */}
                <div className="flex items-center gap-4">
                  <div className="relative inline-block">
                    <svg className="w-28 h-28 transform -rotate-90">
                      <circle cx="56" cy="56" r="48" stroke="#E5E7EB" strokeWidth="8" fill="none" />
                      <circle
                        cx="56"
                        cy="56"
                        r="48"
                        stroke="#0A0A0A"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${(overallScore / 10) * 301.59} 301.59`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-3xl font-bold text-[#0A0A0A]">{overallScore.toFixed(1)}</span>
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-[#0A0A0A]">
                      {safeT('results.overall_score', 'Overall score')}
                    </h2>
                  </div>
                </div>
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
