"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Header } from '@/components/siosi/header';
import { Footer } from '@/components/siosi/footer';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import LanguageSelect from '@/components/siosi/language-select';
import { toast } from 'sonner';
import { SkinType, SkinTone, LidType } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
// Avoid top-level supabase import in client components; we'll dynamically import when needed.
import { useRouter } from 'next/navigation';
import logger from '@/lib/logger';

interface Props {
  locale: string;
}

export default function ProfileClient({ locale }: Props) {
  // use Sonner's toast directly
  const [skinType, setSkinType] = useState<SkinType | ''>('');
  const [skinTone, setSkinTone] = useState<SkinTone | ''>('');
  const [lidType, setLidType] = useState<LidType | ''>('');
  const [_language, _setLanguage] = useState<string>(locale);
  const t = useTranslations();
  const router = useRouter();

  // Debounced autosave machinery
  const saveTimerRef = useRef<number | null>(null);

  const saveProfile = useCallback(async () => {
    try {
      // dynamically import client supabase to obtain session token
      const mod = await import('@/lib/supabase');
      const maybeSupabase: any = (mod as any).supabase ?? (mod as any).default ?? null;

      let token: string | undefined;
      try {
        if (maybeSupabase) {
          // supabase-js v2: auth.getSession()
          if (typeof maybeSupabase.auth?.getSession === 'function') {
            const r = await maybeSupabase.auth.getSession();
            token = r?.data?.session?.access_token ?? r?.session?.access_token;
          // older clients: auth.session()
          } else if (typeof maybeSupabase.auth?.session === 'function') {
            const s = maybeSupabase.auth.session();
            token = s?.access_token;
          // some setups expose auth.getUser or similar; try to be defensive
          } else if (typeof maybeSupabase.auth?.getUser === 'function') {
            // getUser doesn't return token, but attempt to read any persisted session object
            try {
              const maybeAny: any = (maybeSupabase as any)?.auth || {};
              token = maybeAny?.session?.access_token ?? maybeAny?.currentSession?.access_token;
            } catch {
              // ignore nested token extraction issues
            }
          }
        }
      } catch (error) {
        logger.debug('Failed to resolve auth token from Supabase client', error);
      }

      const normalizedSkinType = skinType || null;
      const normalizedSkinTone = skinTone || null;
      const normalizedLidType = lidType || null;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/profile/save', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          skin_type: normalizedSkinType,
          skin_tone: normalizedSkinTone,
          lid_type: normalizedLidType,
        }),
      });

      // handle non-json responses safely
      const text = await res.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (error) {
        logger.debug('Unexpected response when saving profile', error);
        data = { message: text || undefined };
      }

      if (!res.ok) {
        const errMsg = data?.error || data?.message || 'Failed to save profile';
        toast.error(errMsg);
        return;
      }
      // Silent success for autosave
    } catch (error) {
      logger.error('Save profile error', error);
      toast.error('Failed to save profile');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skinType, skinTone, lidType]);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }
    // debounce saves to avoid spamming API on rapid changes
    saveTimerRef.current = window.setTimeout(() => {
      void saveProfile();
    }, 700);
  }, [saveProfile]);

  const handleLogout = useCallback(async () => {
    try {
      const mod = await import('@/lib/supabase');
      const maybeSupabase: any = (mod as any).supabase ?? (mod as any).default ?? null;
      if (maybeSupabase?.auth?.signOut) {
        await maybeSupabase.auth.signOut();
      }
    } catch (error) {
      logger.debug('Logout attempt error', error);
    } finally {
      router.push(`/${locale}/auth?loggedOut=1`);
    }
  }, [locale, router]);

  const completedFields = [skinType, skinTone, lidType].filter(Boolean).length;
  const totalFields = 3;

  const skinTones: SkinTone[] = ['fair', 'light', 'medium', 'tan', 'deep', 'dark'];

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const mod = await import('@/lib/supabase');
        const maybeSupabase: any = (mod as any).supabase ?? (mod as any).default ?? null;
        if (!maybeSupabase?.from) return;

        const userRes = await maybeSupabase.auth?.getUser?.();
        const userId: string | undefined = userRes?.data?.user?.id ?? userRes?.user?.id;
        if (!userId) return;

        const { data, error } = await maybeSupabase
          .from('profiles')
          .select('skin_type, skin_tone, lid_type')
          .eq('user_id', userId)
          .maybeSingle();

        if (!active) return;

        if (error) {
          logger.debug('Failed to load profile defaults', error);
          return;
        }

        if (data) {
          setSkinType((data.skin_type as SkinType) || '');
          setSkinTone((data.skin_tone as SkinTone) || '');
          setLidType((data.lid_type as LidType) || '');
        }
      } catch (error) {
        if (!active) return;
        logger.debug('Profile defaults load threw', error);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header locale={locale} />

      <main className="flex-1 bg-[#F9FAFB] py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="flex items-center justify-between gap-4">
              <h1 className="text-3xl text-[#0A0A0A] mb-2">
                {t('profile.title')}
              </h1>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-[#6B7280]"
                onClick={() => {
                  setSkinType('');
                  setSkinTone('');
                  setLidType('');
                  scheduleSave();
                }}
              >
                {t('common.clear')}
              </Button>
            </div>
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
                  <Select value={skinType} onValueChange={(v: string) => { setSkinType(v as SkinType); scheduleSave(); }}>
                    <SelectTrigger id="skin-type" className="border-[#E5E7EB]">
                      <SelectValue placeholder="Select your skin type" />
                    </SelectTrigger>
                    <SelectContent>
                      {(['dry', 'normal', 'combination', 'oily', 'sensitive'] as SkinType[]).map((type) => (
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
                        onClick={() => { setSkinTone(tone); scheduleSave(); }}
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
                  <RadioGroup value={lidType} onValueChange={(v: string) => { setLidType(v as LidType); scheduleSave(); }}>
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

            {/* Logout button above Danger Zone */}
            <div className="bg-white border border-[#E5E7EB] rounded-sm p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#6B7280]">{t('nav.logout')}</p>
                <Button
                  variant="outline"
                  className="h-9 px-3 border-[#E5E7EB]"
                  onClick={handleLogout}
                >
                  {t('nav.logout')}
                </Button>
              </div>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-sm p-6">
              <Label className="text-base font-semibold text-[#0A0A0A] mb-3 block">
                {t('profile.language_preference')}
              </Label>
              <div className="max-w-xs">
                <LanguageSelect locale={locale} onChangeClose={() => { /* no-op */ }} />
              </div>
            </div>

            <div className="bg-white border-2 border-[#EF4444] rounded-sm p-6">
              <h3 className="text-base font-semibold text-[#0A0A0A] mb-3">
                {t('profile.danger_zone')}
              </h3>
              <p className="text-sm text-[#6B7280] mb-4">
                This action cannot be undone. This will permanently delete all your sessions and data.
              </p>
                <DeleteProfileButton locale={locale} />
            </div>
          </div>
        </div>
      </main>

      <Footer locale={locale} />
    </div>
  );
}

function DeleteProfileButton({ locale }: { locale: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  // use the direct sonner toast export
  // (top-level `toast` import is used)
  const t = useTranslations();

  const handleConfirm = async () => {
    setLoading(true);

    try {
      // Obtain access token from client-side supabase
      let token: string | undefined;
      try {
        const mod = await import('@/lib/supabase');
        const maybeSupabase = (mod as any).supabase ?? (mod as any).default ?? null;
        if (typeof (maybeSupabase as any)?.auth?.getSession === 'function') {
          const res = await (maybeSupabase as any).auth.getSession();
          token = res?.data?.session?.access_token ?? res?.session?.access_token;
        } else if (typeof (maybeSupabase as any)?.auth?.session === 'function') {
          const s = (maybeSupabase as any).auth.session();
          token = s?.access_token;
        }
      } catch (error) {
        logger.debug('Failed to resolve Supabase token for profile deletion', error);
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/profile/delete`, {
        method: 'POST',
        headers,
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || 'Failed to delete profile');
        setLoading(false);
        return;
      }

      toast.success(t('profile.deleted_toast') || 'Profile removed');
      // redirect to homepage
      router.push(`/${locale}`);
    } catch (error) {
      logger.error('Delete profile error', error);
      toast.error('Failed to delete profile');
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        className="border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444] hover:text-white"
        onClick={() => setOpen(true)}
      >
        {t('profile.delete_data')}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('profile.confirm_delete_title') || 'Are you sure?'}</DialogTitle>
            <DialogDescription>
              {t('profile.confirm_delete_desc') || 'This will permanently remove your profile and all sessions. This action cannot be undone.'}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="mr-2">
              {t('profile.cancel') || 'Cancel'}
            </Button>
            <Button onClick={handleConfirm} className="bg-[#EF4444] hover:bg-[#DC2626] text-white" disabled={loading}>
              {loading ? (t('profile.deleting') || 'Deleting...') : (t('profile.delete_data') || 'Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
