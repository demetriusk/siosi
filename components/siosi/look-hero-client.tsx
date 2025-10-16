"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { ChevronLeft, MoreHorizontal, Share2, SwatchBook, X, ZoomIn } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import SessionActionsClient from '@/components/siosi/session-actions-client';

type ProfileSummary = {
  title: string;
  items: string[];
  emptyMessage: string;
  hasAny: boolean;
};

type ContextSummary = {
  title: string;
  occasion?: { label: string; value: string } | null;
  where?: { label: string; value: string } | null;
  climate?: { label: string; value: string } | null;
  concerns: { title: string; items: string[] };
  emptyMessage: string;
  hasAny: boolean;
};

type ActionLabels = {
  shareTitle: string;
  shareViaDevice: string;
  copyLink: string;
  downloadImage: string;
  cancel: string;
  detailsTitle: string;
  deleteLabel: string;
};

interface LookHeroClientProps {
  src?: string | null;
  alt: string;
  locale: string;
  sessionId: string;
  createdAtIso: string;
  profileSummary: ProfileSummary;
  contextSummary: ContextSummary;
  actionLabels: ActionLabels;
  overallScore: number;
  undertoneBadge?: string | null;
  seasonBadge?: string | null;
  seasonMatchLabel?: string | null;
  seasonBadgeSource?: 'photo' | 'profile' | null;
}

const RING_CIRCUMFERENCE = 2 * Math.PI * 32;

export default function LookHeroClient({
  src,
  alt,
  locale,
  sessionId,
  createdAtIso,
  profileSummary,
  contextSummary,
  actionLabels,
  overallScore,
  undertoneBadge,
  seasonBadge,
  seasonMatchLabel,
  seasonBadgeSource = null,
}: LookHeroClientProps) {
  const [zoomOpen, setZoomOpen] = useState(false);
  const t = useTranslations('look.zoom');
  const colorT = useTranslations('colorimetry');

  const zoomTitle = t('title');
  const zoomDescription = t('description');
  const zoomHint = t('hint');
  const zoomCloseLabel = t('close');
  const seasonPaletteLabel = colorT('season_palette_title');

  const heroBadges = (
    [
      undertoneBadge ? { key: 'undertone' as const, label: undertoneBadge } : null,
      seasonBadge ? { key: 'season' as const, label: seasonBadge } : null,
      seasonMatchLabel ? { key: 'seasonMatch' as const, label: seasonMatchLabel } : null,
    ].filter(Boolean) as Array<{ key: 'undertone' | 'season' | 'seasonMatch'; label: string }>
  );
  const strokeDasharray = `${((overallScore ?? 0) / 10) * RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`;
  const formattedScore = Number.isFinite(overallScore) ? overallScore.toFixed(1) : '0.0';

  const handleSeasonBadgeClick = () => {
    if (!seasonBadgeSource || typeof window === 'undefined') return;

    const dispatchOrFallback = (attempts = 8) => {
      const detail = { source: seasonBadgeSource } as const;
      const event = new CustomEvent('siosi:season-drawer', { detail, cancelable: true });
      window.dispatchEvent(event);

      if (event.defaultPrevented) {
        return;
      }

      const drawerButton = document.querySelector<HTMLButtonElement>(
        `[data-season-source="${seasonBadgeSource}"]:not([data-season-badge])`
      );

      if (drawerButton) {
        drawerButton.click();
      } else if (attempts > 0) {
        window.setTimeout(() => dispatchOrFallback(attempts - 1), 75);
      }
    };

    const colorTab = document.querySelector<HTMLElement>('[data-tab-value="color"]');
    const isActive = colorTab?.getAttribute('data-state') === 'active';

    if (!isActive && colorTab) {
      colorTab.click();
      window.requestAnimationFrame(() => {
        window.setTimeout(() => dispatchOrFallback(), 100);
      });
    } else {
      dispatchOrFallback();
    }
  };

  return (
    <div className="relative h-full w-full">
      <div className="relative h-full w-full">
        {src ? (
          <Image
            src={src}
            alt={alt}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 40vw"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[#F3F4F6] text-[#9CA3AF]">
            {alt || 'No image'}
          </div>
        )}

        <div className="absolute top-3 left-3 flex gap-2">
          <Button
            asChild
            size="icon"
            variant="ghost"
            className="h-11 w-11 rounded-full bg-white/80 text-[#0A0A0A] backdrop-blur hover:bg-white"
          >
            <Link href={`/${locale}/looks`}>
              <ChevronLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
        </div>

        <div className="absolute top-3 right-3 flex gap-2">
          <Button
            size="icon"
            variant="ghost"
            className="h-11 w-11 rounded-full bg-white/80 text-[#0A0A0A] backdrop-blur hover:bg-white"
            onClick={() => setZoomOpen(true)}
            aria-label={zoomTitle}
          >
            <ZoomIn className="h-5 w-5" />
          </Button>

          <SessionActionsClient
            locale={locale}
            sessionId={sessionId}
            createdAtIso={createdAtIso}
            profileSummary={profileSummary}
            contextSummary={contextSummary}
            labels={actionLabels}
            shareButtonVariant="ghost"
            shareButtonSize="icon"
            shareButtonClassName="h-11 w-11 rounded-full bg-white/80 text-[#0A0A0A] backdrop-blur hover:bg-white"
            shareIcon={<Share2 className="h-5 w-5" />}
            shareAriaLabel={actionLabels.shareTitle}
            optionsButtonVariant="ghost"
            optionsButtonSize="icon"
            optionsButtonClassName="h-11 w-11 rounded-full bg-white/80 text-[#0A0A0A] backdrop-blur hover:bg-white"
            optionsIcon={<MoreHorizontal className="h-5 w-5" />}
            optionsAriaLabel={actionLabels.detailsTitle}
          />
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-white/95 via-white/70 to-transparent" />

        <div className="pointer-events-none absolute inset-x-0 bottom-4 px-4 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <div className="pointer-events-auto">
              <div className="relative inline-block">
                <svg className="h-20 w-20 -rotate-90">
                  <circle cx="40" cy="40" r="32" stroke="#E5E7EB" strokeWidth="8" fill="none" />
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    stroke="#0A0A0A"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={strokeDasharray}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-[#0A0A0A]">{formattedScore}</span>
                </div>
              </div>
            </div>

            {heroBadges.length > 0 && (
              <div className="pointer-events-auto mb-1 flex flex-wrap items-center gap-2">
                {heroBadges.map((badge, index) => {
                  const baseClass = 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium';
                  const highlightedClass = 'bg-amber-100 text-amber-800';
                  const neutralClass = 'bg-gray-200 text-gray-800';

                  if (badge.key === 'season' && seasonBadgeSource) {
                    return (
                      <button
                        key={`${badge.label}-${index}`}
                        type="button"
                        onClick={handleSeasonBadgeClick}
                        className={`${baseClass} ${neutralClass} gap-1.5 transition hover:bg-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80`}
                        data-season-badge
                        data-season-source={seasonBadgeSource}
                        aria-label={seasonPaletteLabel}
                      >
                        <SwatchBook className="h-3.5 w-3.5" aria-hidden />
                        {badge.label}
                      </button>
                    );
                  }

                  return (
                    <span
                      key={`${badge.label}-${index}`}
                      className={`${baseClass} ${index === 0 ? highlightedClass : neutralClass}`}
                    >
                      {badge.label}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent
          hideCloseButton
          layout="fullscreen"
          className="relative border-none bg-black/95 p-4 text-white shadow-2xl focus:outline-none sm:p-6"
        >
          <DialogTitle className="sr-only">{zoomTitle}</DialogTitle>
          <DialogDescription className="sr-only">{zoomDescription}</DialogDescription>

          <DialogClose
            className="absolute right-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            aria-label={zoomCloseLabel}
          >
            <X className="h-5 w-5" />
          </DialogClose>

          <div className="flex h-full w-full items-center justify-center">
            <DialogClose asChild>
              <button
                type="button"
                aria-label={zoomCloseLabel}
                className="relative flex aspect-[9/16] w-full max-h-[90vh] max-w-[min(90vw,calc(90vh*0.5625))] items-center justify-center overflow-hidden rounded-[1.5rem] bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:max-w-[min(70vw,calc(85vh*0.5625))]"
              >
                {src ? (
                  <Image src={src} alt={alt} fill className="object-contain" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-white/80">
                    {alt}
                  </div>
                )}
                <span className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow-md">
                  {zoomHint}
                </span>
              </button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
