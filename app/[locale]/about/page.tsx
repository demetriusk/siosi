import { Header } from '@/components/siosi/header';
import { Footer } from '@/components/siosi/footer';
import { CircleCheck as CheckCircle, CircleAlert as AlertCircle, TriangleAlert as AlertTriangle } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import type { ParamsWithLocale } from '@/lib/types';

interface AboutPageProps extends ParamsWithLocale {}

export default async function AboutPage({ params }: AboutPageProps) {
  const { locale } = await params!;
  const t = await getTranslations({ locale });

  return (
    <div className="min-h-screen flex flex-col">
      <Header locale={locale} />

      <main className="flex-1 bg-white py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-[#0A0A0A] mb-4">
              {t('about.title')}
            </h1>
            <p className="text-lg text-[#374151] leading-relaxed">
              {t('about.description')}
            </p>
          </div>

          <div className="space-y-12">
            <section>
              <h2 className="text-2xl font-bold text-[#0A0A0A] mb-6">
                How It Works
              </h2>
              <div className="space-y-4 text-[#374151]">
                <p>
                  siosi.me uses advanced AI models trained on thousands of makeup photos to predict how
                  your makeup will perform in different situations. Our analysis covers multiple aspects:
                </p>
                <ul className="space-y-2 ml-6">
                  <li className="flex items-start gap-2">
                    <span className="text-[#D1D5DB] mt-1.5">•</span>
                    <span><strong className="text-[#0A0A0A]">Flashback:</strong> Predicts how your makeup will look under camera flash</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#D1D5DB] mt-1.5">•</span>
                    <span><strong className="text-[#0A0A0A]">Texture & Pores:</strong> Analyzes skin texture and pore visibility</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#D1D5DB] mt-1.5">•</span>
                    <span><strong className="text-[#0A0A0A]">Longevity:</strong> Estimates how long your makeup will last</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#D1D5DB] mt-1.5">•</span>
                    <span><strong className="text-[#0A0A0A]">Color Matching:</strong> Checks undertone and shade compatibility</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#D1D5DB] mt-1.5">•</span>
                    <span>And more...</span>
                  </li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[#0A0A0A] mb-6">
                {t('about.confidence_title')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-[#E5E7EB] rounded-sm p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle className="w-6 h-6 text-[#10B981]" />
                    <h3 className="text-lg font-semibold text-[#0A0A0A]">High</h3>
                  </div>
                  <p className="text-sm text-[#6B7280] mb-2">80-100% confident</p>
                  <p className="text-sm text-[#374151]">
                    {t('about.confidence_high')}
                  </p>
                </div>

                <div className="bg-white border border-[#E5E7EB] rounded-sm p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <AlertTriangle className="w-6 h-6 text-[#F59E0B]" />
                    <h3 className="text-lg font-semibold text-[#0A0A0A]">Medium</h3>
                  </div>
                  <p className="text-sm text-[#6B7280] mb-2">50-79% confident</p>
                  <p className="text-sm text-[#374151]">
                    {t('about.confidence_medium')}
                  </p>
                </div>

                <div className="bg-white border border-[#E5E7EB] rounded-sm p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <AlertCircle className="w-6 h-6 text-[#F97316]" />
                    <h3 className="text-lg font-semibold text-[#0A0A0A]">Low</h3>
                  </div>
                  <p className="text-sm text-[#6B7280] mb-2">0-49% confident</p>
                  <p className="text-sm text-[#374151]">
                    {t('about.confidence_low')}
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[#0A0A0A] mb-6">
                Understanding Verdicts
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <span className="px-3 py-1 bg-[#10B981] text-white text-sm font-semibold rounded">YAY</span>
                  <div>
                    <p className="text-[#0A0A0A] font-medium mb-1">Looking Good</p>
                    <p className="text-sm text-[#6B7280]">
                      This aspect of your makeup is predicted to perform well. No action needed.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <span className="px-3 py-1 bg-[#F59E0B] text-white text-sm font-semibold rounded">MAYBE</span>
                  <div>
                    <p className="text-[#0A0A0A] font-medium mb-1">Watch This</p>
                    <p className="text-sm text-[#6B7280]">
                      There might be room for improvement. Review the recommendations to decide if changes are needed.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <span className="px-3 py-1 bg-[#EF4444] text-white text-sm font-semibold rounded">NAY</span>
                  <div>
                    <p className="text-[#0A0A0A] font-medium mb-1">Needs Attention</p>
                    <p className="text-sm text-[#6B7280]">
                      This aspect may have issues. Review the detected problems and consider the recommendations.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-sm p-8">
              <h2 className="text-xl font-bold text-[#0A0A0A] mb-4">
                Important Disclaimer
              </h2>
              <p className="text-[#374151] leading-relaxed">
                {t('about.disclaimer')}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[#0A0A0A] mb-6">
                Frequently Asked Questions
              </h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-[#0A0A0A] mb-2">
                    How accurate is the analysis?
                  </h3>
                  <p className="text-[#374151]">
                    Our AI provides predictions based on patterns learned from thousands of examples. Accuracy varies
                    by aspect, which is why we include confidence scores. High-confidence predictions (80%+) tend to be
                    more reliable.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#0A0A0A] mb-2">
                    What kind of photos work best?
                  </h3>
                  <p className="text-[#374151]">
                    For best results, use well-lit photos taken in natural lighting. Make sure your face is clearly
                    visible and the makeup is the focus. Avoid heavily filtered or edited images.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#0A0A0A] mb-2">
                    Is my data private?
                  </h3>
                  <p className="text-[#374151]">
                    Yes. Your photos and analysis results are stored securely and are only accessible to you.
                    We don't share your data with third parties or use it for advertising.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer locale={locale} />
    </div>
  );
}
