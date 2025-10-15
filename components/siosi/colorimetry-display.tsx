'use client';

import { useMemo } from 'react';
import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import type { ColorimetryRecord, ColorimetrySwatch, Undertone } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

interface ColorimetryDisplayProps {
  colorimetry: ColorimetryRecord;
}

type PaletteVariant = 'detected' | 'recommended' | 'avoid';

const VARIANT_BADGE_STYLES: Record<PaletteVariant, string> = {
  detected: 'bg-slate-100 text-slate-700 border border-slate-200',
  recommended: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  avoid: 'bg-rose-100 text-rose-800 border border-rose-200',
};

function formatUndertone(value?: Undertone | null) {
  if (!value) return null;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatHex(hex: string) {
  if (!hex) return '';
  return hex.startsWith('#') ? hex.toUpperCase() : `#${hex.toUpperCase()}`;
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
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        <span
          className={clsx(
            'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
            VARIANT_BADGE_STYLES[variant]
          )}
        >
          {badgeLabel}
        </span>
      </div>

      <ul className="space-y-4">
        {swatches.map((swatch, index) => (
          <li key={swatch.id ?? `${swatch.hex}-${index}`} className="flex items-start gap-3">
            <div
              className="h-12 w-12 flex-shrink-0 rounded-full border border-white/70 shadow-inner"
              style={{ backgroundColor: swatch.hex }}
            />
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                <span>{swatch.category?.toUpperCase?.() ?? ''}</span>
                <span className="text-slate-300">•</span>
                <span>{formatHex(swatch.hex)}</span>
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

  const hasProfilePalettes = (colorimetry.profile?.recommended?.length ?? 0) > 0 ||
    (colorimetry.profile?.avoid?.length ?? 0) > 0;

  const photoUndertone = formatUndertone(colorimetry.photo.undertone);
  const profileUndertone = formatUndertone(colorimetry.profile?.undertone);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t('photo_analysis')}
          </p>
          <h2 className="text-2xl font-semibold text-slate-900">{t('title')}</h2>
          <p className="text-sm text-slate-600">{t('your_analysis')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {photoUndertone && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-700">
              {photoUndertone} undertone
            </Badge>
          )}
        </div>
      </div>

      {colorimetry.photo.notes && (
        <p className="mb-6 text-sm text-slate-600 leading-relaxed">{colorimetry.photo.notes}</p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
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

      {hasProfilePalettes && (
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

      <p className="mt-8 text-xs text-slate-500 leading-relaxed">{t('disclaimer')}</p>
    </section>
  );
}
