export const dynamic = 'force-dynamic';

import { Header } from '@/components/siosi/header';
// import { Footer } from '@/components/siosi/footer';
import { Card } from '@/components/ui/card';
import { getSupabase } from '@/lib/supabase';
import { SessionWithAnalyses, LabAnalysis } from '@/lib/types';
import { getTranslations } from 'next-intl/server';
import ColorimetryDisplay from '@/components/siosi/colorimetry-display';
import { mapColorimetryRow } from '@/lib/normalize-colorimetry';
import logger from '@/lib/logger';
import type { ParamsWithLocaleAndId } from '@/lib/types';
import LookHeroClient from '@/components/siosi/look-hero-client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SessionSaveButton } from '@/components/siosi/session-save-button';
import { publicPosterUrl } from '@/lib/poster';
import type { Metadata } from 'next';
import ClickableLabCard from '@/components/siosi/clickable-lab-card';
import LabResultDrawerRoot from '@/components/siosi/lab-result-drawer-root';
import AnalysisFeedback from '@/components/siosi/analysis-feedback';

interface LookPageProps extends ParamsWithLocaleAndId {}

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

  let analyses: LabAnalysis[] = [];

  if (session.analyses && Array.isArray(session.analyses)) {
    analyses = session.analyses as LabAnalysis[];
  } else {
    const { data: analysesRows, error: analysesError } = await supabase
      .from('analyses')
      .select('*')
      .eq('session_id', id);

    if (!analysesError && Array.isArray(analysesRows)) {
      analyses = analysesRows as LabAnalysis[];
    }
  }

  let colorimetry = null;
  try {
    const { data: colorimetryRow } = await supabase
      .from('colorimetry')
      .select('*')
      .eq('session_id', id)
      .maybeSingle();

    if (colorimetryRow) {
      colorimetry = mapColorimetryRow(colorimetryRow);
    }
  } catch (error) {
    logger.warn('Failed to fetch colorimetry for session', { sessionId: id, error });
  }

  return {
    ...session,
    analyses,
    colorimetry,
  };
}

export default async function LookPage({ params }: LookPageProps) {
  const { locale, id } = await params!;
  const session = await getSession(id);
  const t = await getTranslations({ locale });

  const safeT = (key: string, fallback?: string) => {
    try {
      return t(key);
    } catch {
      return fallback ?? key;
    }
  };

  const createdAt = session?.created_at ?? new Date().toISOString();
  const overallScore = session?.overall_score ?? 0;
  const analyses = session?.analyses ?? [];
  const colorimetry = session?.colorimetry ?? null;
  const occasion = session?.occasion;
  const concerns = session?.concerns ?? [];
  const where = session?.indoor_outdoor ?? 'both';
  const climate = session?.climate;
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
    (a) => a.verdict === 'NAY' && a.confidence >= 80,
  );
  const watchAnalyses = analyses.filter(
    (a) => (a.verdict === 'MAYBE' && a.confidence >= 50) || (a.verdict === 'NAY' && a.confidence < 80),
  );
  const goodAnalyses = analyses.filter(
    (a) => a.verdict === 'YAY' && a.confidence >= 70,
  );

  const categorizedCount = criticalAnalyses.length + watchAnalyses.length + goodAnalyses.length;

  const categorizedAnalyses = [...criticalAnalyses, ...watchAnalyses, ...goodAnalyses];
  const categorizedSet = new Set(categorizedAnalyses);
  const orderedAnalyses = categorizedAnalyses.length > 0
    ? [...categorizedAnalyses, ...analyses.filter((analysis) => !categorizedSet.has(analysis))]
    : analyses;

  const indexByRef = new Map<LabAnalysis, number>();
  orderedAnalyses.forEach((analysis, idx) => {
    indexByRef.set(analysis, idx);
  });

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
    emptyMessage: safeT(
      'results.context.empty',
      'No extra context was selected this time. Results may be a tiny bit less precise. Adding a few quick details next time helps the labs aim better.',
    ),
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

  const toTitleCase = (value: string) =>
    value
      .split(/[_\s]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

  const formatTemplateBadge = (templateKey: string, fallbackTemplate: string, rawValue?: string | null) => {
    if (!rawValue) return null;
    const prettyValue = toTitleCase(rawValue);
    const template = safeT(templateKey, fallbackTemplate);
    if (template.includes('{value}')) {
      return template.replace('{value}', prettyValue);
    }
    return `${prettyValue} ${template}`.trim();
  };

  const formatUndertoneBadge = (value?: string | null) =>
    formatTemplateBadge('colorimetry.undertone_suffix', '{value} undertone', value);

  const formatSeasonBadge = (value?: string | null) =>
    formatTemplateBadge('colorimetry.season_suffix', '{value} season', value);

  const formatSeasonMatch = (confidence: number) => {
    const rounded = Math.round(confidence);
    const template = safeT('colorimetry.season_confidence_badge', '{value}% season match');
    if (template.includes('{value}')) {
      return template.replace('{value}', String(rounded));
    }
    return `${rounded}% ${template}`.trim();
  };

  const undertoneBadge = formatUndertoneBadge(colorimetry?.photo?.undertone ?? colorimetry?.profile?.undertone ?? null);

  const seasonBadge = formatSeasonBadge(
    colorimetry?.photo?.season ?? colorimetry?.profile?.season ?? colorimetry?.user_season ?? null,
  );

  const seasonMatchPct =
    typeof colorimetry?.photo?.seasonConfidence === 'number'
      ? colorimetry.photo.seasonConfidence
      : typeof colorimetry?.profile?.seasonConfidence === 'number'
        ? colorimetry.profile.seasonConfidence
        : null;

  const seasonMatchLabel =
    typeof seasonMatchPct === 'number'
      ? formatSeasonMatch(seasonMatchPct)
      : null;

  const seasonBadgeSource: 'photo' | 'profile' | null = seasonBadge
    ? (colorimetry?.photo?.season ?? colorimetry?.photo_season)
      ? 'photo'
      : (colorimetry?.profile?.season ?? colorimetry?.user_season)
        ? 'profile'
        : null
    : null;

  return (
    <div className="flex min-h-screen flex-col">
      <Header locale={locale} />

      <main className="flex-1 bg-[#F9FAFB]">
        <div className="mx-auto flex w-full max-w-6xl flex-col lg:grid lg:grid-cols-5 lg:gap-8">
          <aside className="lg:sticky lg:top-0 lg:col-span-2 lg:h-screen">
            <div className="relative aspect-[9/16] w-full max-h-[60vh] max-h-[60svh] max-h-[60dvh] lg:h-screen lg:max-h-none">
              <LookHeroClient
                src={session?.photo_url ?? null}
                alt={safeT('common.photo', 'Photo')}
                locale={locale}
                sessionId={id}
                createdAtIso={createdAt}
                profileSummary={profileSummary}
                contextSummary={contextSummary}
                actionLabels={actionLabels}
                overallScore={overallScore}
                undertoneBadge={undertoneBadge}
                seasonBadge={seasonBadge}
                seasonMatchLabel={seasonMatchLabel}
                seasonBadgeSource={seasonBadgeSource}
              />
            </div>
          </aside>

          <section className="lg:col-span-3">
            <Tabs defaultValue="analysis" className="w-full">
              <div
                className="sticky z-20 border-b border-gray-100 bg-[#F9FAFB]/90 px-4 pb-3 pt-4 backdrop-blur-sm sm:px-6"
                style={{ top: 'var(--public-header-offset, 0px)' }}
              >
                <div className="flex items-center justify-between gap-3">
                  <TabsList className="grid flex-1 grid-cols-2 rounded-none border-b border-gray-200 bg-transparent p-0">
                    <TabsTrigger
                      value="analysis"
                      data-tab-value="analysis"
                      className="group relative inline-flex w-full items-center justify-center gap-2 rounded-none bg-transparent px-0 py-2.5 text-sm font-medium text-[#111827] transition-colors data-[state=active]:text-black"
                    >
                      {safeT('results.tab.analysis', 'Analysis')}
                      <span
                        aria-hidden
                        className="indicator absolute -bottom-[1px] left-0 h-[3px] w-full origin-center scale-x-0 bg-black transition-transform duration-300 ease-out group-data-[state=active]:scale-x-100"
                      />
                    </TabsTrigger>
                    <TabsTrigger
                      value="color"
                      data-tab-value="color"
                      className="group relative inline-flex w-full items-center justify-center gap-2 rounded-none bg-transparent px-0 py-2.5 text-sm font-medium text-[#111827] transition-colors data-[state=active]:text-black"
                    >
                      {safeT('results.tab.color_guide', 'Color Guide')}
                      <span
                        aria-hidden
                        className="indicator absolute -bottom-[1px] left-0 h-[3px] w-full origin-center scale-x-0 bg-black transition-transform duration-300 ease-out group-data-[state=active]:scale-x-100"
                      />
                    </TabsTrigger>
                  </TabsList>
                  <SessionSaveButton
                    sessionId={id}
                    locale={locale}
                    ownerId={session?.user_id ?? null}
                    className="h-11 w-11 bg-white/80 text-[#0A0A0A] backdrop-blur hover:bg-white"
                  />
                </div>
              </div>

              <div className="px-4 pb-16 sm:px-6">

                <TabsContent value="analysis" className="mt-6 space-y-12">
                  {criticalAnalyses.length > 0 && (
                    <div>
                      <div className="mb-4 flex items-center gap-2">
                        <h3 className="text-xl font-bold text-[#0A0A0A]">
                          {safeT('results.critical', 'Critical')}
                        </h3>
                        <span className="rounded-full bg-[#EF4444] px-2.5 py-0.5 text-xs font-semibold text-white">
                          {criticalAnalyses.length}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {criticalAnalyses.map((analysis) => {
                          const key = analysis.id ?? `${analysis.lab_name ?? 'critical'}-${indexByRef.get(analysis) ?? 0}`;
                          return (
                            <ClickableLabCard
                              key={key}
                              analysis={analysis}
                              index={indexByRef.get(analysis) ?? 0}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {watchAnalyses.length > 0 && (
                    <div>
                      <div className="mb-4 flex items-center gap-2">
                        <h3 className="text-xl font-bold text-[#0A0A0A]">
                          {safeT('results.watch_these', 'Watch these')}
                        </h3>
                        <span className="rounded-full bg-[#F59E0B] px-2.5 py-0.5 text-xs font-semibold text-white">
                          {watchAnalyses.length}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {watchAnalyses.map((analysis) => {
                          const key = analysis.id ?? `${analysis.lab_name ?? 'watch'}-${indexByRef.get(analysis) ?? 0}`;
                          return (
                            <ClickableLabCard
                              key={key}
                              analysis={analysis}
                              index={indexByRef.get(analysis) ?? 0}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {goodAnalyses.length > 0 && (
                    <div>
                      <div className="mb-4 flex items-center gap-2">
                        <h3 className="text-xl font-bold text-[#0A0A0A]">
                          {safeT('results.looking_good', 'Looking good')}
                        </h3>
                        <span className="rounded-full bg-[#10B981] px-2.5 py-0.5 text-xs font-semibold text-white">
                          {goodAnalyses.length}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {goodAnalyses.map((analysis) => {
                          const key = analysis.id ?? `${analysis.lab_name ?? 'good'}-${indexByRef.get(analysis) ?? 0}`;
                          return (
                            <ClickableLabCard
                              key={key}
                              analysis={analysis}
                              index={indexByRef.get(analysis) ?? 0}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {analyses.length === 0 && (
                    <Card className="p-6 text-center">
                      <h3 className="mb-2 text-lg font-semibold text-[#0A0A0A]">
                        {safeT('results.no_analyses_title', 'No analyses yet')}
                      </h3>
                      <p className="text-sm text-[#6B7280]">
                        {safeT(
                          'results.no_analyses_body',
                          "We couldn't find any lab results for this session. Try analyzing another photo.",
                        )}
                      </p>
                    </Card>
                  )}

                  {analyses.length > 0 && categorizedCount === 0 && (
                    <div>
                      <div className="mb-4 flex items-center gap-2">
                        <h3 className="text-xl font-bold text-[#0A0A0A]">
                          {safeT('results.all_results', 'All results')}
                        </h3>
                        <span className="rounded-full bg-[#6B7280] px-2.5 py-0.5 text-xs font-semibold text-white">
                          {analyses.length}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {analyses.map((analysis) => {
                          const key = analysis.id ?? `${analysis.lab_name ?? 'analysis'}-${indexByRef.get(analysis) ?? 0}`;
                          return (
                            <ClickableLabCard
                              key={key}
                              analysis={analysis}
                              index={indexByRef.get(analysis) ?? 0}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <LabResultDrawerRoot
                    analyses={orderedAnalyses}
                    closeLabel={safeT('common.close', 'Close')}
                  />

                </TabsContent>

                <TabsContent value="color" className="mt-6" forceMount>
                  {colorimetry ? (
                    <div className="space-y-6">
                      <ColorimetryDisplay colorimetry={colorimetry} />
                    </div>
                  ) : (
                    <Card className="p-6 text-center">
                      <p className="text-sm text-[#6B7280]">
                        {safeT('colorimetry.empty', 'No color guidance available for this session.')}
                      </p>
                    </Card>
                  )}
                </TabsContent>

                <p className="mt-8 text-xs leading-relaxed text-[#4B5563]">
                  {safeT(
                    'colorimetry.disclaimer',
                    'Color recommendations are based on color theory and undertone analysis. Personal preference and experimentation are encouraged. Lighting conditions may affect how colors appear in real life.',
                  )}
                </p>

                    <div className="mt-6">
                      <AnalysisFeedback
                        title={safeT('feedback.analysis.title', 'How accurate was this analysis?')}
                        description={safeT('feedback.analysis.description', 'We want to make síOsí smarter for you! Was this analysis spot-on, or did it miss something? Share your thoughts below — every bit of feedback helps us improve.')}
                        submitLabel={safeT('feedback.analysis.submit', 'Send Feedback')}
                        userId={session?.user_id ?? ''}
                        sessionId={id}
                        locale={locale}
                      />
                    </div>

              </div>
            </Tabs>
          </section>
        </div>
      </main>

  {/* <Footer locale={locale} /> */}
    </div>
  );
}

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string; id: string }> }
): Promise<Metadata> {
  const { locale, id } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const poster = publicPosterUrl(id);
  const title = 'síOsí makeup analysis';
  const description = 'Makeup analysis and colorimetry results by síOsí';
  const images = [{ url: poster, width: 1080, height: 1920, alt: title }];
  return {
    metadataBase: baseUrl ? new URL(baseUrl) : undefined,
    title,
    description,
    openGraph: {
      title,
      description,
      images,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images,
    },
  };
}
