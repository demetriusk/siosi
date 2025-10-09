'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader as Loader2, Gem, Shell, PartyPopper, ThermometerSun, Ghost, Zap, Trees, Aperture, Camera, Video, Activity, Home, Sun, Repeat, Thermometer, Droplet, Clock, ZoomIn, AlertCircle } from 'lucide-react';
import logger from '@/lib/logger';
import { Header } from '@/components/siosi/header';
import { Footer } from '@/components/siosi/footer';
import { UploadZone } from '@/components/siosi/upload-zone';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import ChipList from '@/components/ui/chip-list';
import { getSupabase } from '@/lib/supabase';
import { calculateCriticalCount } from '@/lib/mock-analysis';
import { Occasion, Concern } from '@/lib/types';

const progressMessages = [
  'progress.analyzing_flashback',
  'progress.checking_pores',
  'progress.detecting_undertone',
  'progress.evaluating_texture',
  'progress.checking_transfer',
  'progress.assessing_longevity',
  'progress.almost_there',
];

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
  const [currentMessage] = useState(0);
  const router = useRouter();
  const t = useTranslations();

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
      
      // 2. Fetch user profile if authenticated
      let profile = {
        skinType: undefined as string | undefined,
        skinTone: undefined as string | undefined,
        lidType: undefined as string | undefined
      };

      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('skin_type, skin_tone, lid_type')
            .eq('user_id', user.id)
            .single();
          
          if (profileData && !profileError) {
            profile = {
              skinType: profileData.skin_type,
              skinTone: profileData.skin_tone,
              lidType: profileData.lid_type
            };
            logger.debug('User profile loaded:', profile);
          } else {
            logger.debug('No profile found for user');
          }
        } else {
          logger.debug('User not authenticated, skipping profile fetch');
        }
      } catch (err) {
        logger.warn('Could not fetch user profile:', err);
        // Continue with undefined values
      }
      
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
          lidType: profile.lidType
        })
      });
      
      const analysis = await analysisRes.json();
      
      // Handle validation failure or API errors
      if (!analysisRes.ok) {
        const errorMessage = analysis.reason || analysis.error || 'Analysis failed';
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
      const analyses = analysis?.analyses ?? [];

      // Get userId (already fetched earlier for profile)
      let userId: string | undefined = undefined;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id;
      } catch {
        // ignore - unauthenticated
      }

      const createRes = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photo_url: photoUrl,
          occasion,
          concerns,
          indoor_outdoor: where,
          climate,
          analyses,
          overall_score: analysis?.overall_score ?? 0,
          confidence_avg: analysis?.confidence_avg ?? 0,
          critical_count: analysis?.critical_count ?? calculateCriticalCount(analyses),
          user_id: userId,
        })
      });

      if (!createRes.ok) {
        throw new Error('Failed to save session');
      }

      const session = await createRes.json();

      // 4. Navigate to results
      router.push(`/${locale}/session/${session.id}`);
      
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
                Analyzing your makeup...
              </h2>
              <p className="text-[#6B7280] animate-pulse">
                {t(`upload.${progressMessages[currentMessage]}`)}
              </p>
            </div>
            <div className="w-64 h-2 bg-[#E5E7EB] rounded-full overflow-hidden mx-auto">
              <div className="h-full bg-[#0A0A0A] animate-progress" style={{
                animation: 'progress 8s ease-in-out'
              }} />
            </div>
            <p className="text-sm text-[#6B7280]">This usually takes 8-15 seconds</p>
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
                  <Label className="text-base font-semibold text-[#0A0A0A]">
                    {t('upload.occasion_title')} {' '}
                    <span className="text-sm text-[#6B7280] font-normal">
                      {t('upload.occasion_optional')}
                    </span>
                  </Label>
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
                  <Label className="text-base font-semibold text-[#0A0A0A]">
                    {t('upload.where_title')}
                    <span className="text-sm text-[#6B7280] font-normal"> {t('upload.where_optional')}</span>
                  </Label>
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
                <Label className="text-sm text-[#374151] mb-4 block">{t('upload.climate_title')}</Label>
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
                  <Label className="text-base font-semibold text-[#0A0A0A]">
                    {t('upload.concerns_title')} {' '}
                    <span className="text-sm text-[#6B7280] font-normal">
                      {t('upload.occasion_optional')}
                    </span>
                  </Label>
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