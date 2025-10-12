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
import { Info, X } from 'lucide-react';
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
  const [activeLidInfo, setActiveLidInfo] = useState<LidType | ''>('');
  const t = useTranslations();
  const router = useRouter();

  // Debounced autosave machinery
  const saveTimerRef = useRef<number | null>(null);
  const latestValuesRef = useRef<{ skinType: SkinType | ''; skinTone: SkinTone | ''; lidType: LidType | '' }>({
    skinType: '',
    skinTone: '',
    lidType: '',
  });

  useEffect(() => {
    latestValuesRef.current = { skinType, skinTone, lidType };
  }, [skinType, skinTone, lidType]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveLidInfo('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!activeLidInfo) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        setActiveLidInfo('');
        return;
      }

      if (target.closest('[data-lid-info-panel="true"]')) return;
      if (target.closest('[data-lid-info-trigger="true"]')) return;

      setActiveLidInfo('');
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [activeLidInfo]);

  const saveProfile = useCallback(async (values: { skinType: SkinType | ''; skinTone: SkinTone | ''; lidType: LidType | '' }) => {
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

      const normalizedSkinType = (values.skinType as string) || null;
      const normalizedSkinTone = (values.skinTone as string) || null;
      const normalizedLidType = (values.lidType as string) || null;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/profile/save', {
        method: 'POST',
        headers,
        body: JSON.stringify({ skin_type: normalizedSkinType, skin_tone: normalizedSkinTone, lid_type: normalizedLidType }),
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
  }, []);

  const scheduleSave = useCallback((nextValues?: Partial<{ skinType: SkinType | ''; skinTone: SkinTone | ''; lidType: LidType | '' }>) => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }
    if (nextValues && Object.keys(nextValues).length > 0) {
      latestValuesRef.current = { ...latestValuesRef.current, ...nextValues };
    }
    const payload = { ...latestValuesRef.current };
    // debounce saves to avoid spamming API on rapid changes
    saveTimerRef.current = window.setTimeout(() => {
      void saveProfile(payload);
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

  const skinTypeOptions: SkinType[] = ['oily', 'dry', 'combination', 'normal', 'sensitive'];
  const skinTones: SkinTone[] = ['fair', 'light', 'medium', 'tan', 'deep', 'dark'];
  const lidTypeOptions: LidType[] = [
    'almond-eyes',
    'round-eyes',
    'hooded-eyes',
    'monolid-eyes',
    'upturned-eyes',
    'downturned-eyes',
    'close-set-eyes',
    'wide-set-eyes',
    'deep-set-eyes',
    'protruding-eyes',
  ];

  const legacyLidTypeMap: Record<string, LidType> = {
    monolid: 'monolid-eyes',
    hooded: 'hooded-eyes',
    'deep_set': 'deep-set-eyes',
    protruding: 'protruding-eyes',
    downturned: 'downturned-eyes',
    upturned: 'upturned-eyes',
    almond: 'almond-eyes',
    standard: 'almond-eyes',
    round: 'round-eyes',
    close_set: 'close-set-eyes',
    wide_set: 'wide-set-eyes',
  };

  const normalizeIncomingValue = <T extends string>(
    value: unknown,
    allowed: readonly T[],
    legacyMap?: Record<string, T>
  ): T | '' => {
    if (typeof value !== 'string') return '';
    const normalized = value.trim().toLowerCase();
    if (!normalized) return '';
    const match = allowed.find((option) => option === normalized);
    if (match) return match;
    if (legacyMap) {
      const mapped = legacyMap[normalized];
      if (mapped) return mapped;
    }
    return '';
  };

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
          const normalizedSkinType = normalizeIncomingValue<SkinType>(data.skin_type, skinTypeOptions);
          const normalizedSkinTone = normalizeIncomingValue<SkinTone>(data.skin_tone, skinTones);
          const normalizedLidType = normalizeIncomingValue<LidType>(data.lid_type, lidTypeOptions, legacyLidTypeMap);

          setSkinType(normalizedSkinType);
          setSkinTone(normalizedSkinTone);
          setLidType(normalizedLidType);
          latestValuesRef.current = {
            skinType: normalizedSkinType,
            skinTone: normalizedSkinTone,
            lidType: normalizedLidType,
          };
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
                  if (saveTimerRef.current) {
                    window.clearTimeout(saveTimerRef.current);
                    saveTimerRef.current = null;
                  }
                  const cleared = { skinType: '' as SkinType | '', skinTone: '' as SkinTone | '', lidType: '' as LidType | '' };
                  latestValuesRef.current = cleared;
                  void saveProfile(cleared);
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
                  <Select
                    value={skinType || undefined}
                    onValueChange={(v: string) => {
                      setSkinType(v as SkinType);
                      scheduleSave({ skinType: v as SkinType });
                    }}
                  >
                    <SelectTrigger id="skin-type" className="border-[#E5E7EB]">
                      <SelectValue placeholder="Select your skin type" />
                    </SelectTrigger>
                    <SelectContent>
                      {skinTypeOptions.map((type) => (
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
                        onClick={() => {
                          setSkinTone(tone);
                          scheduleSave({ skinTone: tone });
                        }}
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
                  <RadioGroup
                    value={lidType}
                    onValueChange={(v: string) => {
                      setLidType(v as LidType);
                      setActiveLidInfo('');
                      scheduleSave({ lidType: v as LidType });
                    }}
                  >
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      {lidTypeOptions.map((type) => {
                        const isSelected = lidType === type;
                        const isInfoOpen = activeLidInfo === type;

                        return (
                          <div
                            key={type}
                            className={`relative border-2 rounded-sm p-4 cursor-pointer transition-all ${
                              isSelected ? 'border-[#0A0A0A] bg-[#F9FAFB]' : 'border-[#E5E7EB] hover:border-[#6B7280]'
                            }`}
                            role="presentation"
                          >
                            <RadioGroupItem value={type} id={type} className="sr-only" />
                            <Label htmlFor={type} className="cursor-pointer block text-center">
                              <div className="w-16 h-16 mx-auto mb-2 bg-[#E5E7EB] rounded" />
                              <span className="text-sm font-medium text-[#0A0A0A]">
                                {t(`profile.lid_types.${type}`)}
                              </span>
                            </Label>

                            <button
                              type="button"
                              aria-label={`${t('profile.lid_type')} – ${t(`profile.lid_types.${type}`)}`}
                              className="absolute top-3 right-3 flex h-11 w-11 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#0A0A0A] transition-colors hover:border-[#0A0A0A] hover:bg-[#0A0A0A]  hover:text-[#FFFFFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                              onClick={(event) => {
                                event.stopPropagation();
                                setActiveLidInfo((prev) => (prev === type ? '' : type));
                              }}
                              data-lid-info-trigger="true"
                            >
                              <Info className="h-5 w-5" aria-hidden="true" />
                            </button>

                            {isInfoOpen ? (
                              <div
                                role="dialog"
                                aria-label={t(`profile.lid_types.${type}`)}
                                data-lid-info-panel="true"
                                className="absolute right-3 top-16 z-20 w-64 max-w-[calc(100vw-3rem)] rounded-sm border border-[#0A0A0A] bg-white p-4 text-left shadow-lg"
                                onClick={() => setActiveLidInfo('')}
                              >
                                <div className="flex items-start gap-3">
                                  <p className="text-sm leading-5 text-[#0A0A0A]">
                                    {t(`profile.lid_type_descriptions.${type}`, {
                                      default: t(`profile.lid_types.${type}`),
                                    })}
                                  </p>
                                  <button
                                    type="button"
                                    aria-label={t('common.cancel')}
                                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border border-transparent text-[#6B7280] transition-colors hover:text-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setActiveLidInfo('');
                                    }}
                                  >
                                    <X className="h-4 w-4" aria-hidden="true" />
                                  </button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
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
