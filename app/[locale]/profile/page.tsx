'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Header } from '@/components/siosi/header';
import { Footer } from '@/components/siosi/footer';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { SkinType, SkinTone, LidType } from '@/lib/types';

interface ProfilePageProps {
  params: { locale: string };
}

export default function ProfilePage({ params: { locale } }: ProfilePageProps) {
  const [skinType, setSkinType] = useState<SkinType | undefined>();
  const [skinTone, setSkinTone] = useState<SkinTone | undefined>();
  const [lidType, setLidType] = useState<LidType | undefined>();
  const [language, setLanguage] = useState<string>(locale);
  const t = useTranslations();

  const handleSave = () => {
    toast.success('Profile saved successfully!');
  };

  const completedFields = [skinType, skinTone, lidType].filter(Boolean).length;
  const totalFields = 3;

  const skinTones: SkinTone[] = ['fair', 'light', 'medium', 'tan', 'deep', 'rich'];

  return (
    <div className="min-h-screen flex flex-col">
      <Header locale={locale} />

      <main className="flex-1 bg-[#F9FAFB] py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#0A0A0A] mb-2">
              {t('profile.title')}
            </h1>
            <p className="text-[#6B7280]">
              Help us provide better analysis by completing your profile
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-[#E5E7EB] rounded-sm p-6">
              <div className="space-y-6">
                <div>
                  <Label htmlFor="skin-type" className="text-base font-semibold text-[#0A0A0A] mb-3 block">
                    {t('profile.skin_type')}
                  </Label>
                  <Select value={skinType} onValueChange={(v) => setSkinType(v as SkinType)}>
                    <SelectTrigger id="skin-type" className="border-[#E5E7EB]">
                      <SelectValue placeholder="Select your skin type" />
                    </SelectTrigger>
                    <SelectContent>
                      {(['dry', 'normal', 'combo', 'oily', 'not_sure'] as SkinType[]).map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(`profile.skin_types.${type}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-base font-semibold text-[#0A0A0A] mb-3 block">
                    {t('profile.skin_tone')}
                  </Label>
                  <div className="flex gap-3">
                    {skinTones.map((tone, index) => (
                      <button
                        key={tone}
                        onClick={() => setSkinTone(tone)}
                        className={`w-12 h-12 rounded-full transition-all ${
                          skinTone === tone ? 'ring-4 ring-[#0A0A0A] ring-offset-2' : ''
                        }`}
                        style={{
                          backgroundColor: `hsl(${30 - index * 5}, ${50 + index * 5}%, ${85 - index * 12}%)`
                        }}
                        aria-label={tone}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-base font-semibold text-[#0A0A0A] mb-3 block">
                    {t('profile.lid_type')}
                  </Label>
                  <RadioGroup value={lidType} onValueChange={(v) => setLidType(v as LidType)}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {(['hooded', 'standard', 'deep_set'] as LidType[]).map((type) => (
                        <div key={type}>
                          <div
                            className={`border-2 rounded-sm p-4 cursor-pointer transition-all ${
                              lidType === type
                                ? 'border-[#0A0A0A] bg-[#F9FAFB]'
                                : 'border-[#E5E7EB] hover:border-[#6B7280]'
                            }`}
                          >
                            <RadioGroupItem value={type} id={type} className="sr-only" />
                            <Label htmlFor={type} className="cursor-pointer block text-center">
                              <div className="w-16 h-16 mx-auto mb-2 bg-[#E5E7EB] rounded" />
                              <span className="text-sm font-medium text-[#0A0A0A]">
                                {t(`profile.lid_types.${type}`)}
                              </span>
                            </Label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>

            <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-sm p-4">
              <p className="text-sm text-[#6B7280] mb-2">
                {t('profile.complete_profile')}
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0A0A0A] transition-all"
                    style={{ width: `${(completedFields / totalFields) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-[#0A0A0A]">
                  {t('profile.progress', { completed: completedFields, total: totalFields })}
                </span>
              </div>
            </div>

            <Button
              onClick={handleSave}
              className="w-full bg-[#0A0A0A] text-white hover:bg-[#1F1F1F] h-12 text-base font-semibold"
            >
              {t('profile.save_profile')}
            </Button>

            <div className="bg-white border border-[#E5E7EB] rounded-sm p-6">
              <Label className="text-base font-semibold text-[#0A0A0A] mb-3 block">
                {t('profile.language_preference')}
              </Label>
              <RadioGroup value={language} onValueChange={setLanguage}>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="en" id="lang-en" />
                    <Label htmlFor="lang-en" className="cursor-pointer">English</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="es" id="lang-es" />
                    <Label htmlFor="lang-es" className="cursor-pointer">Español</Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            <div className="bg-white border-2 border-[#EF4444] rounded-sm p-6">
              <h3 className="text-base font-semibold text-[#0A0A0A] mb-3">
                {t('profile.danger_zone')}
              </h3>
              <p className="text-sm text-[#6B7280] mb-4">
                This action cannot be undone. This will permanently delete all your sessions and data.
              </p>
              <Button variant="outline" className="border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444] hover:text-white">
                {t('profile.delete_data')}
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer locale={locale} />
    </div>
  );
}
