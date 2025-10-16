"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { ChevronLeft, MoreHorizontal, Share2, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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
}: LookHeroClientProps) {
  const [zoomOpen, setZoomOpen] = useState(false);

  const badges = [undertoneBadge, seasonBadge, seasonMatchLabel].filter(Boolean) as string[];
  const strokeDasharray = `${((overallScore ?? 0) / 10) * RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`;
  const formattedScore = Number.isFinite(overallScore) ? overallScore.toFixed(1) : '0.0';

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
            aria-label="Zoom"
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

            {badges.length > 0 && (
              <div className="pointer-events-auto mb-1 flex flex-wrap items-center gap-2">
                {badges.map((badge, index) => (
                  <span
                    key={`${badge}-${index}`}
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                      index === 0 ? 'bg-amber-100 text-amber-800' : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    {badge}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent className="max-w-[90vw] md:max-w-4xl overflow-hidden p-0">
          <div className="relative h-[80vh] w-full bg-black">
            {src ? (
              <Image src={src} alt={alt} fill className="object-contain" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-white">
                {alt}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
