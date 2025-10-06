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
import { supabase } from '@/lib/supabase';
import { generateMockAnalysis, calculateOverallScore, calculateCriticalCount, calculateConfidenceAverage } from '@/lib/mock-analysis';
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
  const [currentMessage, setCurrentMessage] = useState(0);
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

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);

    const messageInterval = setInterval(() => {
      setCurrentMessage(prev => (prev + 1) % progressMessages.length);
    }, 2000);

    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('makeup-photos')
        .upload(fileName, selectedFile);

      let photoUrl = '';
      if (uploadError) {
        console.warn('Upload error, using placeholder:', uploadError);
        photoUrl = 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80';
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('makeup-photos')
          .getPublicUrl(fileName);
        photoUrl = publicUrl;
      }

      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          photo_url: photoUrl,
          occasion: occasion || null,
          concerns: concerns.length > 0 ? concerns : null,
          overall_score: 0,
          critical_count: 0,
          confidence_avg: 0,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      const analyses = await generateMockAnalysis(sessionData.id, {
        occasion,
        concerns: concerns.length > 0 ? concerns : undefined,
      });

      const analysisInserts = analyses.map(analysis => ({
        session_id: sessionData.id,
        lab_name: analysis.lab_name,
        verdict: analysis.verdict,
        confidence: analysis.confidence,
        score: analysis.score,
        detected: analysis.detected,
        recommendations: analysis.recommendations,
        zones_affected: analysis.zones_affected || null,
      }));

      const { error: analysisError } = await supabase
        .from('analyses')
        .insert(analysisInserts);

      if (analysisError) throw analysisError;

      const overallScore = calculateOverallScore(analyses);
      const criticalCount = calculateCriticalCount(analyses);
      const confidenceAvg = calculateConfidenceAverage(analyses);

      await supabase
        .from('sessions')
        .update({
          overall_score: overallScore,
          critical_count: criticalCount,
          confidence_avg: confidenceAvg,
        })
        .eq('id', sessionData.id);

      clearInterval(messageInterval);

      sessionStorage.removeItem('siosi_upload_photo');
      sessionStorage.removeItem('siosi_upload_photo_name');
      sessionStorage.removeItem('siosi_upload_photo_type');
      sessionStorage.removeItem('siosi_upload_photo_size');

      router.push(`/${locale}/session/${sessionData.id}`);
    } catch (error) {
      console.error('Analysis error:', error);
      clearInterval(messageInterval);
      setIsAnalyzing(false);
    }
  };

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
            <h1 className="text-3xl text-[#0A0A0A] mb-2">
              Upload Your Makeup Photo
            </h1>
            <p className="text-[#6B7280]">
              Get instant AI analysis with confidence scores
            </p>
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
