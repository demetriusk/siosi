import { Header } from '@/components/siosi/header';
import { Footer } from '@/components/siosi/footer';
import type { ParamsWithLocale } from '@/lib/types';

interface PrivacyPageProps extends ParamsWithLocale {}

export default async function PrivacyPage({ params }: PrivacyPageProps) {
  const { locale } = await params!;

  return (
    <div className="min-h-screen flex flex-col">
      <Header locale={locale} />

      <main className="flex-1 bg-white py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-4xl text-[#0A0A0A] mb-4">Privacy Policy</h1>
            <p className="text-lg text-[#374151] leading-relaxed">Effective date: October 7, 2025</p>
          </div>

          <div className="space-y-8 text-[#374151]">
            <section>
              <h2 className="text-2xl text-[#0A0A0A] mb-4">1. Information We Collect</h2>
              <p>
                We collect information you provide directly, such as account details and photos you upload for
                analysis. We also collect technical information (device, browser, IP address) and usage data to help
                improve the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-[#0A0A0A] mb-4">2. How We Use Information</h2>
              <p>
                We use your information to provide, maintain, and improve the Service, to communicate with you,
                and to comply with legal obligations. Uploaded photos are analyzed by our AI models to produce the
                results you see in the app.
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-[#0A0A0A] mb-4">3. Sharing and Disclosure</h2>
              <p>
                We do not sell personal data. We may share information with service providers who perform services on
                our behalf (for example, storage providers). We will disclose information if required by law or to
                protect rights and safety.
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-[#0A0A0A] mb-4">4. Data Security</h2>
              <p>
                We take reasonable measures to protect your information. However, no system is completely secure. If
                you believe your account has been compromised, contact support immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-[#0A0A0A] mb-4">5. Data Retention</h2>
              <p>
                We retain your data for as long as necessary to provide the Service, comply with legal obligations,
                and resolve disputes. You can request deletion of your account and associated data by contacting
                support.
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-[#0A0A0A] mb-4">6. Your Choices</h2>
              <p>
                You can access, update, or delete your account settings and uploaded content. You may opt out of
                certain communications by following the instructions in those messages.
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-[#0A0A0A] mb-4">7. Children</h2>
              <p>
                The Service is not intended for children under the age of 13. We do not knowingly collect personal
                data from children under 13. If you believe a child has provided us personal data, contact support.
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-[#0A0A0A] mb-4">8. Changes to this Policy</h2>
              <p>
                We may update this Privacy Policy periodically. When changes are material, we will provide notice.
                Continued use of the Service after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-[#0A0A0A] mb-4">9. Contact</h2>
              <p>
                If you have questions or requests about your personal data or this policy, please contact our
                support team using the contact information provided on the site.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer locale={locale} />
    </div>
  );
}
