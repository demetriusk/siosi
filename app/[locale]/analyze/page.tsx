'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader as Loader2 } from 'lucide-react';
import { Header } from '@/components/siosi/header';
import { Footer } from '@/components/siosi/footer';
import { UploadZone } from '@/components/siosi/upload-zone';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { getSupabase } from '@/lib/supabase';
import { calculateCriticalCount } from '@/lib/mock-analysis';
import { Occasion, Concern } from '@/lib/types';
import { useEffect } from 'react';

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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
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
  };

  const handleClearFile = () => {
    setSelectedFile(null);
  };

  const handleConcernToggle = (concern: Concern) => {
    setConcerns(prev =>
      prev.includes(concern)
        ? prev.filter(c => c !== concern)
        : [...prev, concern]
    );
  };

  async function handleAnalyze() {
    setIsAnalyzing(true)
    
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
      .upload(fileName, selectedFile)

  // Debug logging to capture Supabase storage response for troubleshooting
  // eslint-disable-next-line no-console
  console.log('Supabase upload response:', { uploadData, uploadError });

    if (uploadError) {
      // Provide extra context when re-throwing so console/network include helpful info
      const err = new Error(`Supabase storage upload error: ${uploadError.message || uploadError}`);
      // Attach original object for inspection in devtools
      (err as any).supabase = { uploadData, uploadError };
      throw err;
    }

    const photoUrl = supabase.storage
      .from('makeup-photos')
      .getPublicUrl(uploadData.path).data.publicUrl
    
    // 2. Call analysis API
    // TODO: Replace with actual profile data retrieval logic
    const profile = {
      skinType: 'normal',
      skinTone: 'medium',
      lidType: 'monolid'
    };

    const analysisRes = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        photoUrl,
        skinType: profile.skinType,
        skinTone: profile.skinTone,
        lidType: profile.lidType
      })
    })
    
    const analysis = await analysisRes.json()
    
    // 3. Save to database via server API - include user id if present
    const analyses = analysis?.analyses ?? [];

    let userId: string | undefined = undefined;
    try {
      // v2: getUser() returns { data: { user } }
      if (typeof (supabase as any).auth?.getUser === 'function') {
        const res = await (supabase as any).auth.getUser();
        userId = res?.data?.user?.id;
      } else if (typeof (supabase as any).auth?.user === 'function') {
        // older fallback
        const u = (supabase as any).auth.user();
        userId = u?.id;
      }
    } catch {
      // ignore - unauthenticated
    }

    const createRes = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        photo_url: photoUrl,
        analyses,
        overall_score: analysis?.overall_score ?? 0,
        confidence_avg: analysis?.confidence_avg ?? 0,
        critical_count: calculateCriticalCount(analyses),
        user_id: userId,
      })
    });

    const session = await createRes.json();

    // 4. Navigate to results
      router.push(`/session/${session.id}`)
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
            <div>
              <UploadZone
                onFileSelect={handleFileSelect}
                selectedFile={selectedFile}
                onClearFile={handleClearFile}
              />
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-sm p-6 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-base font-semibold text-[#0A0A0A]">
                    {t('upload.occasion_title')} {' '}
                    <span className="text-sm text-[#6B7280] font-normal">
                      {t('upload.occasion_optional')}
                    </span>
                  </Label>
                  <button
                    onClick={() => setOccasion(undefined)}
                    className="text-sm text-[#6B7280] hover:text-[#0A0A0A]"
                  >
                    {t('common.skip')}
                  </button>
                </div>
                <RadioGroup value={occasion} onValueChange={(v) => setOccasion(v as Occasion)}>
                  <div className="space-y-3">
                    {(['photoshoot', 'wedding', 'party', 'video', 'testing'] as Occasion[]).map((occ) => (
                      <div key={occ} className="flex items-center space-x-2">
                        <RadioGroupItem value={occ} id={occ} className="border-[#0A0A0A]" />
                        <Label htmlFor={occ} className="text-sm text-[#374151] cursor-pointer">
                          {t(`upload.occasions.${occ}`)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>

              <div className="border-t border-[#E5E7EB] pt-6">
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-base font-semibold text-[#0A0A0A]">
                    {t('upload.concerns_title')} {' '}
                    <span className="text-sm text-[#6B7280] font-normal">
                      {t('upload.occasion_optional')}
                    </span>
                  </Label>
                  <button
                    onClick={() => setConcerns([])}
                    className="text-sm text-[#6B7280] hover:text-[#0A0A0A]"
                  >
                    {t('common.skip')}
                  </button>
                </div>
                <div className="space-y-3">
                  {(['flash', 'lasting', 'closeup', 'weather', 'transfer'] as Concern[]).map((concern) => (
                    <div key={concern} className="flex items-center space-x-2">
                      <Checkbox
                        id={concern}
                        checked={concerns.includes(concern)}
                        onCheckedChange={() => handleConcernToggle(concern)}
                        className="border-[#0A0A0A]"
                      />
                      <Label htmlFor={concern} className="text-sm text-[#374151] cursor-pointer">
                        {t(`upload.concerns.${concern}`)}
                      </Label>
                    </div>
                  ))}
                </div>
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
// removed unused helper: countCritical

