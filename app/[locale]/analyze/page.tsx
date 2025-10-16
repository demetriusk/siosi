'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader as Loader2, Gem, Shell, PartyPopper, ThermometerSun, Ghost, Zap, Trees, Aperture, Camera, Video, Activity, Home, Sun, Thermometer, Droplet, Clock, ZoomIn, AlertCircle } from 'lucide-react';
import logger from '@/lib/logger';
import { Header } from '@/components/siosi/header';
import { Footer } from '@/components/siosi/footer';
import { UsageBanner } from '@/components/siosi/usage-banner';
import { UploadZone } from '@/components/siosi/upload-zone';
import { Button } from '@/components/ui/button';
import ChipList from '@/components/ui/chip-list';
import { getSupabase } from '@/lib/supabase';
import { normalizeAnalysesPayload, calculateCriticalCountFromArray } from '@/lib/normalize-analyses';
import { Occasion, Concern } from '@/lib/types';

const PROGRESS_MESSAGE_KEYS = [
  'upload.progress.flashback',
  'upload.progress.pores',
  'upload.progress.texture',
  'upload.progress.undertone',
  'upload.progress.transfer',
  'upload.progress.longevity',
  'upload.progress.oxidation',
  'upload.progress.creasing',
  'upload.progress.blending',
  'upload.progress.shimmer',
  'upload.progress.transitions',
  'upload.progress.coverage',
  // extra friendly "fake" steps for a nicer loading loop
  'upload.progress.lighting',
  'upload.progress.color',
  'upload.progress.shade',
  'upload.progress.prep',
  'upload.progress.powder',
  'upload.progress.contour',
  'upload.progress.blush',
  'upload.progress.lashes',
  'upload.progress.highlights',
  'upload.progress.angles',
] as const;

const ANONYMOUS_LIMIT = 3;

export default function AnalyzePage() {
  const params = useParams();
  const locale = (params as any)?.locale as string;
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [occasion, setOccasion] = useState<Occasion | undefined>();
  const [concerns, setConcerns] = useState<Concern[]>([]);
  const [where, setWhere] = useState<'indoor'|'outdoor'|'both'>('both');
  const [climate, setClimate] = useState<string | undefined>(undefined);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMessage, setCurrentMessage] = useState(0);
  const t = useTranslations();
  const progressMessages = useMemo(
    () => PROGRESS_MESSAGE_KEYS.map((key) => t(key)),
    [t]
  );

  useEffect(() => {
    setCurrentMessage(0);
  }, [progressMessages, isAnalyzing]);

  useEffect(() => {
    if (!isAnalyzing) {
      return;
    }

    if (progressMessages.length <= 1) {
      return;
    }

    const interval = window.setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % progressMessages.length);
    }, 1800);

    return () => window.clearInterval(interval);
  }, [isAnalyzing, progressMessages.length]);

  const router = useRouter();

  useEffect(() => {
    const photoData = sessionStorage.getItem('siosi_upload_photo');
    const photoName = sessionStorage.getItem('siosi_upload_photo_name');
    const photoType = sessionStorage.getItem('siosi_upload_photo_type');
    
    if (photoData && photoName && photoType) {
      fetch(photoData)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], photoName, { 
            type: photoType,
            lastModified: Date.now()
          });
          setSelectedFile(file);
        });
    }
  }, []);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setError(null); // Clear any previous errors
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setError(null);
  };

  const handleConcernToggle = (concern: Concern) => {
    setConcerns(prev =>
      prev.includes(concern)
        ? prev.filter(c => c !== concern)
        : [...prev, concern]
    );
  };

  const checkAnonymousLimit = (): boolean => {
    const key = 'anonymous_analyses';
    const stored = localStorage.getItem(key);
    const count = stored ? parseInt(stored, 10) : 0;
    return count < ANONYMOUS_LIMIT;
  };

  const incrementAnonymousCount = (): void => {
    const key = 'anonymous_analyses';
    const stored = localStorage.getItem(key);
    const count = stored ? parseInt(stored, 10) : 0;
    localStorage.setItem(key, String(count + 1));
  };

  async function handleAnalyze() {
    try {
      setIsAnalyzing(true);
      setError(null);
      
      // 1. Upload photo to Supabase Storage
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Supabase client is not initialized.');
      }
      if (!selectedFile) {
        throw new Error('No file selected for upload.');
      }

      // Check if user is authenticated
      let userId: string | undefined = undefined;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id;
      } catch {
        // Not authenticated
      }

      // Check anonymous limit if not logged in
      if (!userId && !checkAnonymousLimit()) {
        setError(`Anonymous users can only perform ${ANONYMOUS_LIMIT} analyses. Please sign up for unlimited access.`);
        setIsAnalyzing(false);
        return;
      }

      const fileName = `${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('makeup-photos')
        .upload(fileName, selectedFile);

      logger.debug('Supabase upload response:', { uploadData, uploadError });

      if (uploadError) {
        const err = new Error(`Supabase storage upload error: ${uploadError.message || uploadError}`);
        (err as any).supabase = { uploadData, uploadError };
        throw err;
      }

      const photoUrl = supabase.storage
        .from('makeup-photos')
        .getPublicUrl(uploadData.path).data.publicUrl;
      
      // 2. (Optional) We intentionally avoid fetching the `profiles` row
      // from the client to prevent direct REST requests that may fail due
      // to RLS/policy differences. The server will associate a session
      // with a user when an Authorization token is provided. Continue
      // with undefined profile fields; analysis can run without them.
      const profile = {
        skinType: undefined as string | undefined,
        skinTone: undefined as string | undefined,
        lidType: undefined as string | undefined
      };
      
      // 3. Call analysis API

      const analysisRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoUrl,
          occasion,
          concerns,
          indoor_outdoor: where,
          climate,
          skinType: profile.skinType,
          skinTone: profile.skinTone,
          lidType: profile.lidType,
          locale
        })
      });
      
  const analysis = await analysisRes.json();
  const colorimetryPayload = analysis?.colorimetry ?? null;

  const analysesArray = normalizeAnalysesPayload(analysis?.analyses);

      // Handle validation failure or API errors
      if (!analysisRes.ok) {
        // Try to surface server-provided reason if available
        const serverReason = analysis?.reason || analysis?.error || null;
        const errorMessage = serverReason || `Analysis failed (status ${analysisRes.status})`;
        logger.warn('Analysis API failed', { status: analysisRes.status, body: analysis });
        setError(errorMessage);
        setIsAnalyzing(false);

        // Delete the uploaded photo if analysis failed
        if (uploadData?.path) {
          await supabase.storage
            .from('makeup-photos')
            .remove([uploadData.path]);
        }
        return;
      }
      
      // 4. Save to database via server API
      // Get userId (already fetched earlier for profile)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id;
      } catch {
        // ignore - unauthenticated
      }

      // Attach Authorization header when we have an access token so the
      // server can associate the session with an authenticated user.
      let authHeader: Record<string, string> = { 'Content-Type': 'application/json' };
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = (session as any)?.access_token ?? (session as any)?.accessToken ?? null;
        if (token) authHeader['Authorization'] = `Bearer ${token}`;
      } catch {
        // ignore - proceed without Authorization
      }

      const createRes = await fetch('/api/sessions', {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify({
          photo_url: photoUrl,
          occasion,
          concerns,
          indoor_outdoor: where,
          climate,
          analyses: analysesArray,
          overall_score: analysis?.overall_score ?? 0,
          confidence_avg: analysis?.confidence_avg ?? 0,
          critical_count: analysis?.critical_count ?? calculateCriticalCountFromArray(analysesArray),
          user_id: userId,
          colorimetry: colorimetryPayload,
        })
      });

      if (!createRes.ok) {
        throw new Error('Failed to save session');
      }

      const session = await createRes.json();

      // Increment anonymous counter if not logged in
      if (!userId) {
        incrementAnonymousCount();
      }

      // 4. Navigate to results
  router.push(`/${locale}/look/${session.id}`);
      
    } catch (err: any) {
      logger.error('Analysis error:', err);
      setError(err.message || 'An unexpected error occurred');
      setIsAnalyzing(false);
    }
  }

  if (isAnalyzing) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header locale={locale} />
        <div className="flex-1 flex items-center justify-center bg-white/95">
          <div className="text-center space-y-6 p-8">
            <Loader2 className="w-16 h-16 animate-spin text-[#0A0A0A] mx-auto" />
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-[#0A0A0A]">
                Analyzing makeup...
              </h2>
              <p className="text-[#6B7280] animate-pulse">
                {progressMessages[currentMessage] ?? ''}
              </p>
            </div>
            <p className="text-sm text-[#6B7280]">This usually takes 20–60 seconds</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header locale={locale} />

      <main className="flex-1 bg-white py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl text-[#0A0A0A] mb-0">
              Analyze Makeup
            </h1>
          </div>

          <UsageBanner locale={locale} />

          <div className="space-y-8">
            {/* Error Banner */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-sm p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-red-900 mb-1">
                    Analysis Failed
                  </h3>
                  <p className="text-sm text-red-700">
                    {error}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setError(null)}
                    className="mt-3 border-red-300 text-red-700 hover:bg-red-100"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            )}

            <div>
              <UploadZone
                onFileSelect={handleFileSelect}
                selectedFile={selectedFile}
                onClearFile={handleClearFile}
              />
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-sm p-6 space-y-6">
              {/* What's this for? */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-base font-semibold text-[#0A0A0A]">
                    {t('upload.occasion_title')} {' '}
                    <span className="text-sm text-[#6B7280] font-normal">
                      {t('upload.occasion_optional')}
                    </span>
                  </div>
                  {occasion && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-[#6B7280]"
                      onClick={() => setOccasion(undefined)}
                    >
                      {t('common.clear')}
                    </Button>
                  )}
                </div>

                <ChipList
                  items={[
                    { key: 'photoshoot', label: t('upload.occasions.photoshoot'), icon: <Aperture size={16} className="mr-2" /> },
                    { key: 'wedding', label: t('upload.occasions.wedding'), icon: <Gem size={16} className="mr-2" /> },
                    { key: 'party', label: t('upload.occasions.party'), icon: <PartyPopper size={16} className="mr-2" /> },
                    { key: 'video', label: t('upload.occasions.video'), icon: <Video size={16} className="mr-2" /> },
                    { key: 'testing', label: t('upload.occasions.testing'), icon: <Activity size={16} className="mr-2" /> },
                  ]}
                  selected={occasion}
                  onToggle={(k) => setOccasion(occasion === (k as Occasion) ? undefined : (k as Occasion))}
                />
              </div>

              {/* Where will you be? */}
              <div className="border-t border-[#E5E7EB] pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-base font-semibold text-[#0A0A0A]">
                    {t('upload.where_title')}
                    <span className="text-sm text-[#6B7280] font-normal"> {t('upload.where_optional')}</span>
                  </div>
                  {where !== 'both' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-[#6B7280]"
                      onClick={() => setWhere('both')}
                    >
                      {t('common.clear')}
                    </Button>
                  )}
                </div>
                <ChipList
                  items={[
                    { key: 'indoor', label: t('upload.where.indoor'), icon: <Home size={16} className="mr-2" /> },
                    { key: 'outdoor', label: t('upload.where.outdoor'), icon: <Trees size={16} className="mr-2" /> },
                    { key: 'both', label: t('upload.where.both'), icon: <Shell size={16} className="mr-2" /> },
                  ]}
                  selected={where}
                  onToggle={(k) => setWhere(where === (k as any) ? 'both' : (k as any))}
                />
              </div>

              {/* Climate */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-[#374151]">{t('upload.climate_title')}</p>
                  {climate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-[#6B7280]"
                      onClick={() => setClimate(undefined)}
                    >
                      {t('common.clear')}
                    </Button>
                  )}
                </div>
                <ChipList
                  items={[
                    { key: 'dry', label: t('upload.climate.dry'), icon: <Sun size={16} className="mr-2" /> },
                    { key: 'normal', label: t('upload.climate.normal'), icon: <Thermometer size={16} className="mr-2" /> },
                    { key: 'humid', label: t('upload.climate.humid'), icon: <Droplet size={16} className="mr-2" /> },
                    { key: 'hot_humid', label: t('upload.climate.hot_humid'), icon: <Zap size={16} className="mr-2" /> },
                  ]}
                  selected={climate}
                  onToggle={(k) => setClimate(climate === k ? undefined : k)}
                />
              </div>

              {/* Concerns */}
              <div className="border-t border-[#E5E7EB] pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-base font-semibold text-[#0A0A0A]">
                    {t('upload.concerns_title')} {' '}
                    <span className="text-sm text-[#6B7280] font-normal">
                      {t('upload.occasion_optional')}
                    </span>
                  </div>
                  {concerns.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-[#6B7280]"
                      onClick={() => setConcerns([])}
                    >
                      {t('common.clear')}
                    </Button>
                  )}
                </div>
                <ChipList
                  items={[
                    { key: 'flash', label: t('upload.concerns.flash'), icon: <Camera size={16} className="mr-2" /> },
                    { key: 'lasting', label: t('upload.concerns.lasting'), icon: <Clock size={16} className="mr-2" /> },
                    { key: 'closeup', label: t('upload.concerns.closeup'), icon: <ZoomIn size={16} className="mr-2" /> },
                    { key: 'weather', label: t('upload.concerns.weather'), icon: <ThermometerSun size={16} className="mr-2" /> },
                    { key: 'transfer', label: t('upload.concerns.transfer'), icon: <Ghost size={16} className="mr-2" /> },
                  ]}
                  selected={concerns}
                  multi
                  onToggle={(k) => handleConcernToggle(k as Concern)}
                />
              </div>
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={!selectedFile || isAnalyzing}
              className="w-full bg-[#0A0A0A] text-white hover:bg-[#1F1F1F] h-12 text-base font-semibold disabled:opacity-50"
            >
              {t('upload.analyze_button')}
            </Button>
          </div>
        </div>
      </main>

      <Footer locale={locale} />

      <style jsx global>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}