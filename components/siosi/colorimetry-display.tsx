'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ColorimetryRecord, ColorimetrySwatch, Season, Undertone } from '@/lib/types';
import { Badge, badgeVariants } from '@/components/ui/badge';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
  DrawerBody,
} from '@/components/ui/drawer';
import { SEASON_PALETTES } from '@/lib/season-palettes';
import { SwatchBook } from 'lucide-react';

interface ColorimetryDisplayProps {
  colorimetry: ColorimetryRecord;
}

type SeasonDrawerEventDetail = {
  source?: 'photo' | 'profile';
};

type PaletteVariant = 'detected' | 'recommended' | 'avoid';

const VARIANT_BADGE_STYLES: Record<PaletteVariant, string> = {
  detected: 'bg-slate-100 text-slate-700 border border-slate-200',
  recommended: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  avoid: 'bg-rose-100 text-rose-800 border border-rose-200',
};

const SEASON_DISPLAY_NAMES: Record<Season, string> = {
  bright_winter: 'Bright Winter',
  cool_winter: 'Cool Winter',
  deep_winter: 'Deep Winter',
  bright_spring: 'Bright Spring',
  warm_spring: 'Warm Spring',
  light_spring: 'Light Spring',
  light_summer: 'Light Summer',
  cool_summer: 'Cool Summer',
  soft_summer: 'Soft Summer',
  soft_autumn: 'Soft Autumn',
  warm_autumn: 'Warm Autumn',
  deep_autumn: 'Deep Autumn',
};

function formatUndertone(value?: Undertone | null) {
  if (!value) return null;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getSeasonDisplayName(value?: Season | string | null) {
  if (!value) return null;
  const key = value as Season;
  if (key in SEASON_DISPLAY_NAMES) {
    return SEASON_DISPLAY_NAMES[key];
  }

  return value
    .toString()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatCategory(category?: ColorimetrySwatch['category']) {
  if (!category) return '';
  return category
    .toString()
    .toLowerCase()
    .replace(/_/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function PaletteCard({
  title,
  subtitle,
  swatches,
  variant,
  badgeLabel,
  notes,
}: {
  title: string;
  subtitle?: string;
  swatches: ColorimetrySwatch[];
  variant: PaletteVariant;
  badgeLabel: string;
  notes?: string | null;
}) {
  if (!swatches || swatches.length === 0) return null;

  return (
    <div className="border border-slate-200 bg-white p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h4 className="text-lg font-semibold text-[#0A0A0A]">{title}</h4>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>

      <ul className="space-y-4">
        {swatches.map((swatch, index) => (
          <li key={swatch.id ?? `${swatch.hex}-${index}`} className="flex items-start gap-3">
            <div
              className="h-14 w-14 rounded-full border-2 border-white shadow-inner shadow-md ring-2 ring-gray-200 transition-all hover:scale-110 hover:shadow-xl hover:ring-4 hover:ring-gray-300 lg:h-16 lg:w-16"
              style={{ backgroundColor: swatch.hex }}
            />
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                <span>{formatCategory(swatch.category)}</span>
                {swatch.finish && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span>{swatch.finish}</span>
                  </>
                )}
                {typeof swatch.confidence === 'number' && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span>{swatch.confidence}%</span>
                  </>
                )}
              </div>
              <p className="text-sm font-medium text-slate-900">{swatch.name}</p>
              {swatch.reason && (
                <p className="text-sm text-slate-600 leading-snug">{swatch.reason}</p>
              )}
            </div>
          </li>
        ))}
      </ul>

      {notes && <p className="mt-4 text-xs italic text-slate-500">{notes}</p>}
    </div>
  );
}

export default function ColorimetryDisplay({ colorimetry }: ColorimetryDisplayProps) {
  const t = useTranslations('colorimetry');
  const [isPaletteDrawerOpen, setIsPaletteDrawerOpen] = useState(false);
  const [activeSeasonContext, setActiveSeasonContext] = useState<{
    key: Season | null;
    label: string | null;
    source: 'photo' | 'profile' | null;
  }>({ key: null, label: null, source: null });

  const handleDrawerChange = (open: boolean) => {
    setIsPaletteDrawerOpen(open);
    if (!open) {
      setActiveSeasonContext({ key: null, label: null, source: null });
    }
  };

  const openSeasonDrawer = useCallback(
    (
      seasonKey: Season | null,
      seasonLabel: string | null,
      source: 'photo' | 'profile'
    ) => {
      setActiveSeasonContext({ key: seasonKey, label: seasonLabel, source });
      setIsPaletteDrawerOpen(true);
    },
    []
  );

  const photoPalettes = useMemo(
    () => [
      {
        title: t('detected'),
        variant: 'detected' as PaletteVariant,
        swatches: colorimetry.photo.detected,
        badge: t('detected'),
      },
      {
        title: t('recommended_photo'),
        variant: 'recommended' as PaletteVariant,
        swatches: colorimetry.photo.recommended,
        badge: t('recommended_photo'),
      },
      {
        title: t('avoid_photo'),
        variant: 'avoid' as PaletteVariant,
        swatches: colorimetry.photo.avoid,
        badge: t('avoid_photo'),
      },
    ],
    [colorimetry.photo.avoid, colorimetry.photo.detected, colorimetry.photo.recommended, t]
  );

  const profilePalettes = useMemo(() => {
    const recommended = colorimetry.profile?.recommended ?? [];
    const avoid = colorimetry.profile?.avoid ?? [];

    return [
      {
        title: t('recommended_user'),
        variant: 'recommended' as PaletteVariant,
        swatches: recommended,
        badge: t('recommended_user'),
      },
      {
        title: t('avoid_user'),
        variant: 'avoid' as PaletteVariant,
        swatches: avoid,
        badge: t('avoid_user'),
      },
    ];
  }, [colorimetry.profile?.avoid, colorimetry.profile?.recommended, t]);

  const photoUndertone = formatUndertone(colorimetry.photo.undertone);
  const profileUndertone = formatUndertone(colorimetry.profile?.undertone);
  const rawPhotoSeason = colorimetry.photo.season ?? colorimetry.photo_season ?? null;
  const photoSeasonLabel = getSeasonDisplayName(rawPhotoSeason);
  const photoSeasonKey =
    typeof rawPhotoSeason === 'string' && rawPhotoSeason in SEASON_PALETTES
      ? (rawPhotoSeason as Season)
      : null;
  const rawProfileSeason = colorimetry.profile?.season ?? colorimetry.user_season ?? null;
  const profileSeasonLabel = getSeasonDisplayName(rawProfileSeason);
  const profileSeasonKey =
    typeof rawProfileSeason === 'string' && rawProfileSeason in SEASON_PALETTES
      ? (rawProfileSeason as Season)
      : null;
  const photoConfidence = typeof colorimetry.photo.confidence === 'number'
    ? t('confidence_badge', { value: colorimetry.photo.confidence })
    : null;
  const profileConfidence = typeof colorimetry.profile?.confidence === 'number'
    ? t('confidence_badge', { value: colorimetry.profile.confidence })
    : null;
  const photoSeasonConfidence = typeof colorimetry.photo.seasonConfidence === 'number'
    ? t('season_confidence_badge', { value: colorimetry.photo.seasonConfidence })
    : null;
  const profileSeasonConfidence = typeof colorimetry.profile?.seasonConfidence === 'number'
    ? t('season_confidence_badge', { value: colorimetry.profile.seasonConfidence })
    : null;
  const hasProfilePalettes = (colorimetry.profile?.recommended?.length ?? 0) > 0 ||
    (colorimetry.profile?.avoid?.length ?? 0) > 0;
  const shouldShowProfileSection =
    hasProfilePalettes ||
    Boolean(colorimetry.profile?.notes) ||
    Boolean(profileUndertone) ||
    Boolean(profileConfidence) ||
    Boolean(profileSeasonLabel) ||
    Boolean(profileSeasonConfidence);

  const activeSeasonPalette = activeSeasonContext.key
    ? SEASON_PALETTES[activeSeasonContext.key]
    : null;

  useEffect(() => {
    const onSeasonDrawer = (event: Event) => {
      const customEvent = event as CustomEvent<SeasonDrawerEventDetail>;
      const preferredSource = customEvent.detail?.source;

      if (preferredSource === 'photo' && photoSeasonLabel) {
        openSeasonDrawer(photoSeasonKey, photoSeasonLabel, 'photo');
        customEvent.preventDefault();
        return;
      }

      if (preferredSource === 'profile' && profileSeasonLabel) {
        openSeasonDrawer(profileSeasonKey, profileSeasonLabel, 'profile');
        customEvent.preventDefault();
        return;
      }

      if (photoSeasonLabel) {
        openSeasonDrawer(photoSeasonKey, photoSeasonLabel, 'photo');
        customEvent.preventDefault();
      } else if (profileSeasonLabel) {
        openSeasonDrawer(profileSeasonKey, profileSeasonLabel, 'profile');
        customEvent.preventDefault();
      }
    };

    window.addEventListener('siosi:season-drawer', onSeasonDrawer);
    return () => {
      window.removeEventListener('siosi:season-drawer', onSeasonDrawer);
    };
  }, [openSeasonDrawer, photoSeasonKey, photoSeasonLabel, profileSeasonKey, profileSeasonLabel]);

  return (
    <Drawer open={isPaletteDrawerOpen} onOpenChange={handleDrawerChange}>
      <section>
      <div className="mb-6 flex gap-3 items-center justify-between">
          <h2 className="text-xl font-bold text-[#0A0A0A]">{t('title')}</h2>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {t('photo_analysis')}
          </p>
      </div>

      {colorimetry.photo.notes && (
        <p className="mb-6 text-sm text-slate-600 leading-relaxed">{colorimetry.photo.notes}</p>
      )}

      <div className="grid gap-4">
        {photoPalettes.map((palette) => (
          <PaletteCard
            key={palette.title}
            title={palette.title}
            swatches={palette.swatches}
            variant={palette.variant}
            badgeLabel={palette.badge}
          />
        ))}
      </div>

      {shouldShowProfileSection && (
        <div className="mt-10 border-t border-slate-200 pt-8">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                {t('personalized_for_you')}
              </p>
              <h3 className="text-lg font-semibold text-slate-900">{t('based_on_profile')}</h3>
              {colorimetry.profile?.notes && (
                <p className="text-sm text-slate-600 leading-relaxed">{colorimetry.profile.notes}</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {profileUndertone && (
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                  {profileUndertone} undertone
                </Badge>
              )}
              {profileSeasonLabel && (
                <button
                  type="button"
                  className={`${badgeVariants({ variant: 'outline' })} gap-2 border-slate-200 bg-slate-100 text-slate-800 transition hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2`}
                  aria-controls="season-palette-drawer"
                  aria-expanded={isPaletteDrawerOpen && activeSeasonContext.source === 'profile'}
                  data-season-source="profile"
                  onClick={() => openSeasonDrawer(profileSeasonKey, profileSeasonLabel, 'profile')}
                >
                  <SwatchBook className="h-3.5 w-3.5" aria-hidden />
                  <span>{t('season_badge', { season: profileSeasonLabel })}</span>
                </button>
              )}
              {profileConfidence && (
                <Badge variant="outline" className="border-slate-200 bg-slate-100 text-slate-800">
                  {profileConfidence}
                </Badge>
              )}
              {profileSeasonConfidence && (
                <Badge variant="outline" className="border-slate-200 bg-slate-100 text-slate-800">
                  {profileSeasonConfidence}
                </Badge>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {profilePalettes.map((palette) => (
              <PaletteCard
                key={palette.title}
                title={palette.title}
                swatches={palette.swatches}
                variant={palette.variant}
                badgeLabel={palette.badge}
              />
            ))}
          </div>
        </div>
      )}
      </section>
      <DrawerContent id="season-palette-drawer">
        <DrawerHeader className="space-y-2 text-center">
          <DrawerTitle>
            {activeSeasonContext.label ?? t('season_palette_title')}
          </DrawerTitle>
          <DrawerDescription>
            {activeSeasonContext.source === 'photo' && colorimetry.photo.notes && (
              <p className="text-sm leading-relaxed text-slate-600">
                {colorimetry.photo.notes}
              </p>
            )}
          </DrawerDescription>
          {activeSeasonContext.source === 'profile' && (
            <p className="text-sm leading-relaxed text-slate-600">
              Shades best suitable for you
            </p>
          )}
        </DrawerHeader>
        <DrawerBody className="space-y-6">
          {activeSeasonPalette ? (
            <ul className="grid grid-cols-3 gap-4 sm:grid-cols-5 md:grid-cols-6">
              {activeSeasonPalette.palette.map((swatch) => (
                <li key={swatch.hex} className="flex flex-col items-center text-center">
                  <span
                    className="h-14 w-14 rounded-full border-2 border-white shadow-inner shadow-md ring-2 ring-gray-200 transition-all hover:scale-110 hover:shadow-xl hover:ring-4 hover:ring-gray-300 lg:h-16 lg:w-16"
                    style={{ backgroundColor: swatch.hex }}
                    aria-hidden
                  />
                  <span className="mt-2 text-xs font-medium text-slate-900">
                    {swatch.name}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-sm text-slate-600">
              {activeSeasonContext.key ? t('season_palette_unavailable') : t('season_palette_empty')}
            </p>
          )}
        </DrawerBody>
        <DrawerFooter className="items-center">
          <DrawerClose asChild>
            <button
              type="button"
              className="inline-flex w-full items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {t('close')}
            </button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
