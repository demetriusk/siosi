import { Header } from '@/components/siosi/header';
// import { Footer } from '@/components/siosi/footer';
import type { ParamsWithLocale } from '@/lib/types';

interface TermsPageProps extends ParamsWithLocale {}

export default async function TermsPage({ params }: TermsPageProps) {
  const { locale } = await params!;

  return (
    <div className="min-h-screen flex flex-col">
      <Header locale={locale} />

      <main className="flex-1 bg-white py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-4xl text-[#0A0A0A] mb-4">Terms of Service</h1>
            <p className="text-lg text-[#374151] leading-relaxed">Effective date: October 7, 2025</p>
          </div>

          <div className="space-y-8 text-[#374151]">
            <section>
              <h2 className="text-2xl text-[#0A0A0A] mb-4">1. Acceptance of Terms</h2>
              <p>
                Welcome to síOsí. By accessing or using our website and services (&ldquo;Service&rdquo;), you agree to be bound
                by these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree to these Terms, please do not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-[#0A0A0A] mb-4">2. Description of Service</h2>
              <p>
                síOsí provides AI-powered makeup analysis based on photos you upload. The Service analyzes images to
                produce predictions and recommendations about makeup performance under various conditions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-[#0A0A0A] mb-4">3. User Accounts and Content</h2>
              <p>
                You may need to create an account to use certain features. You are responsible for keeping your
                account credentials secure. You retain ownership of any photos or information you upload, but you grant
                síOsí a license to store, analyze, and display those photos as necessary to provide the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-[#0A0A0A] mb-4">4. Prohibited Uses</h2>
              <p>
                Do not use the Service for illegal activity, to upload material that violates others&rsquo; rights, or to
                attempt to reverse-engineer our models or platform. We reserve the right to suspend or terminate
                accounts that violate these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-[#0A0A0A] mb-4">5. Intellectual Property</h2>
              <p>
                All content, code, and models provided by síOsí are the property of síOsí or its licensors and are
                protected by copyright and other laws. You may not copy, reproduce, or create derivative works from
                síOsí&rsquo;s proprietary materials without express permission.
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-[#0A0A0A] mb-4">6. Disclaimers</h2>
              <p>
                The analysis provided by síOsí is for informational purposes only. Predictions are based on AI models
                and may not always be accurate. DO NOT rely solely on the Service for medical, safety, or other
                professional advice.
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-[#0A0A0A] mb-4">7. Limitation of Liability</h2>
              <p>
                To the fullest extent permitted by law, síOsí and its affiliates are not liable for indirect,
                incidental, special, consequential, or punitive damages arising out of your use of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-[#0A0A0A] mb-4">8. Changes to Terms</h2>
              <p>
                We may update these Terms from time to time. When changes are significant, we will provide a prominent
                notice. Continued use of the Service after updates constitutes acceptance of the new Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-[#0A0A0A] mb-4">9. Governing Law</h2>
              <p>
                These Terms are governed by the laws of the jurisdiction where síOsí is operated, without regard to
                conflict of law principles.
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-[#0A0A0A] mb-4">10. Contact</h2>
              <p>
                If you have questions about these Terms, please contact us at the support contact listed on the site.
              </p>
            </section>
          </div>
        </div>
      </main>

  {/* <Footer locale={locale} /> */}
    </div>
  );
}
