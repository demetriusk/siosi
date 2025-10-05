'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Camera, Sparkles, Upload as UploadIcon, CircleCheck as CheckCircle } from 'lucide-react';
import { Header } from '@/components/siosi/header';
import { Footer } from '@/components/siosi/footer';
import { UploadZone } from '@/components/siosi/upload-zone';
import { Button } from '@/components/ui/button';

interface HomePageProps {
  params: { locale: string };
}

export default function HomePage({ params: { locale } }: HomePageProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const router = useRouter();
  const t = useTranslations();

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleClearFile = () => {
    setSelectedFile(null);
  };

  const handleAnalyze = () => {
    if (selectedFile) {
      const formData = new FormData();
      formData.append('file', selectedFile);
      router.push(`/${locale}/analyze`);
    }
  };

  const labs = [
    { key: 'flashback', icon: Sparkles },
    { key: 'pores', icon: Sparkles },
    { key: 'texture', icon: Sparkles },
    { key: 'undertone', icon: Sparkles },
    { key: 'transfer', icon: Sparkles },
    { key: 'longevity', icon: Sparkles },
    { key: 'oxidation', icon: Sparkles },
    { key: 'creasing', icon: Sparkles },
    { key: 'blending', icon: Sparkles },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header locale={locale} />

      <main className="flex-1">
        <section className="bg-white py-16 md:py-24">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h1 className="text-5xl md:text-6xl font-bold text-[#0A0A0A] mb-4">
                {t('home.hero_title')}
              </h1>
              <p className="text-xl text-[#6B7280] max-w-2xl mx-auto">
                {t('home.hero_subtitle')}
              </p>
            </div>

            <div className="max-w-2xl mx-auto space-y-6">
              <UploadZone
                onFileSelect={handleFileSelect}
                selectedFile={selectedFile}
                onClearFile={handleClearFile}
              />

              {selectedFile && (
                <Button
                  onClick={handleAnalyze}
                  className="w-full bg-[#0A0A0A] text-white hover:bg-[#1F1F1F] h-12 text-base font-semibold"
                >
                  <UploadIcon className="w-5 h-5 mr-2" />
                  {t('upload.analyze_button')}
                </Button>
              )}

              <div className="text-center">
                <Button
                  variant="outline"
                  className="border-[#E5E7EB] text-[#0A0A0A] hover:bg-[#F9FAFB]"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  {t('home.upload_cta')}
                </Button>
              </div>

              <p className="text-sm text-center text-[#6B7280]">
                {t('home.supported_formats')}
              </p>
            </div>
          </div>
        </section>

        <section className="bg-[#F9FAFB] py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-[#0A0A0A] text-center mb-12">
              {t('home.what_analyzed_title')}
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {labs.map(({ key, icon: Icon }) => (
                <div
                  key={key}
                  className="flex flex-col items-center gap-3 p-4 bg-white border border-[#E5E7EB] rounded-sm hover:shadow-md transition-all"
                >
                  <Icon className="w-8 h-8 text-[#0A0A0A]" />
                  <span className="text-sm font-medium text-[#0A0A0A] text-center">
                    {t(`home.labs.${key}`)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-[#0A0A0A] text-center mb-12">
              {t('home.how_it_works')}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { step: '1', text: t('home.step1'), icon: UploadIcon },
                { step: '2', text: t('home.step2'), icon: Sparkles },
                { step: '3', text: t('home.step3'), icon: CheckCircle },
              ].map(({ step, text, icon: Icon }) => (
                <div key={step} className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-[#0A0A0A] text-white text-2xl font-bold rounded-full mb-4">
                    {step}
                  </div>
                  <div className="flex justify-center mb-4">
                    <Icon className="w-12 h-12 text-[#6B7280]" />
                  </div>
                  <p className="text-base text-[#374151]">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#F9FAFB] py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white border border-[#E5E7EB] rounded-sm p-8 md:p-12 text-center">
              <h2 className="text-2xl font-bold text-[#0A0A0A] mb-4">
                Ready to analyze your makeup?
              </h2>
              <p className="text-[#6B7280] mb-8">
                Upload a photo and get instant AI-powered insights with confidence scores
              </p>
              <Button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="bg-[#0A0A0A] text-white hover:bg-[#1F1F1F] px-8 h-12 text-base font-semibold"
              >
                Get Started
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer locale={locale} />
    </div>
  );
}
