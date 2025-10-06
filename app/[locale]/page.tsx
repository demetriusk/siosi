"use client";

import { useState } from 'react';
import Image from 'next/image'
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Camera } from 'lucide-react';
import { Header } from '@/components/siosi/header';
import { Footer } from '@/components/siosi/footer';
import { UploadZone } from '@/components/siosi/upload-zone';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const params = useParams();
  const locale = (params as any)?.locale as string;
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const router = useRouter();
  const t = useTranslations();

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);

    // Immediately prepare the file and navigate to the analyze page.
    // This mirrors what the manual "Analyze" button does but happens
    // automatically right after a successful file selection.
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;

      // Store in sessionStorage so the analyze page can read it
      try {
        sessionStorage.setItem('siosi_upload_photo', base64);
        sessionStorage.setItem('siosi_upload_photo_name', file.name);
        sessionStorage.setItem('siosi_upload_photo_type', file.type);
        sessionStorage.setItem('siosi_upload_photo_size', file.size.toString());
      } catch (e) {
        // Ignore sessionStorage errors (e.g., disabled), fallback to staying on page
        console.warn('Could not save upload to sessionStorage', e);
      }

      // Navigate to analyze page
      router.push(`/${locale}/analyze`);
    };

    reader.readAsDataURL(file);
  };

  const handleClearFile = () => {
    setSelectedFile(null);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    
    // Convert file to base64 for storage
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      
      // Store in sessionStorage
      sessionStorage.setItem('siosi_upload_photo', base64);
      sessionStorage.setItem('siosi_upload_photo_name', selectedFile.name);
      sessionStorage.setItem('siosi_upload_photo_type', selectedFile.type);
      sessionStorage.setItem('siosi_upload_photo_size', selectedFile.size.toString());
      
      // Navigate to analyze page
      router.push(`/${locale}/analyze`);
    };
    
    reader.readAsDataURL(selectedFile);
  };

  // Using placeholder images for the "What gets analyzed" icons.
  // The user will replace the filenames with their own AVIFs later.
  const labs = [
    { key: 'flashback', src: '/ico/siosi-flashback-lab.avif' },
    { key: 'pores', src: '/ico/siosi-pore-proof.avif' },
    { key: 'texture', src: '/ico/siosi-texture-trigger.avif' },
    { key: 'undertone', src: '/ico/siosi-zoom-face-check.avif' },
    { key: 'transfer', src: '/ico/siosi-crease-police.avif' },
    { key: 'longevity', src: '/ico/siosi-glitter-fallout-gate.avif' },
    { key: 'oxidation', src: '/ico/siosi-golden-hour-match.avif' },
    { key: 'creasing', src: '/ico/siosi-harsh-light-survivor.avif' },
    { key: 'blending', src: '/ico/siosi-lash-shadow-check.avif' },
    { key: 'more', src: '/ico/siosi-vein-undertone-truth.avif' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header locale={locale} />

      <main className="flex-1">
        <section className="bg-white py-16 md:py-24">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h1 className="text-5xl md:text-6xl tracking-tighter text-[#0A0A0A] mb-4">
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

              <div className="text-center">
                <Button
                  variant="outline"
                  className="border-[#E5E7EB] text-[#0A0A0A] hover:bg-[#F9FAFB]"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  {t('home.upload_cta')}
                </Button>
              </div>

            </div>
          </div>
        </section>

        <section className="bg-[#F9FAFB] py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl text-[#0A0A0A] text-center mb-12">
              {t('home.what_analyzed_title')}
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {labs.map(({ key, src }) => (
                <div
                  key={key}
                  className="flex flex-col items-center gap-3 p-4 bg-white border border-[#E5E7EB] rounded-sm hover:shadow-md transition-all"
                >
                  <Image
                    src={src}
                    alt={t(`home.labs.${key}`)}
                    width={240}
                    height={240}
                    className="w-48 h-48 object-contain"
                  />
                  <span className="text-md text-[#0A0A0A] text-center">
                    {t(`home.labs.${key}`)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl text-[#0A0A0A] text-center mb-12">
              {t('home.how_it_works')}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { step: '1', text: t('home.step1'), img: '/ico/siosi-upload-makeup.avif' },
                { step: '2', text: t('home.step2'), img: '/ico/siosi-ai-analyze-makeup.avif' },
                { step: '3', text: t('home.step3'), img: '/ico/siosi-ai-makeup-recommendations.avif' },
              ].map(({ step, text, img }) => (
                <div key={step} className="text-center group">
                  <div
                    className="inline-flex items-center justify-center w-16 h-16 text-white text-2xl rounded-full mb-4 rainbow-hover bg-[#0A0A0A]"
                    role="img"
                    aria-label={t('home.step_number', { number: step })}
                  >
                    <span className="relative z-10">{step}</span>
                  </div>
                  <div className="flex justify-center mb-4">
                    <Image
                      src={img}
                      alt={text}
                      width={240}
                      height={240}
                      className="w-48 h-48 object-contain"
                    />
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
              <h2 className="text-2xl text-[#0A0A0A] mb-4">
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
