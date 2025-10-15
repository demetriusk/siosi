"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Session } from '@/lib/types';
import { useTranslations } from 'next-intl';
import { SessionSaveButton } from './session-save-button';

interface SessionCardProps {
  session: Session;
  locale: string;
}

export function SessionCard({ session, locale }: SessionCardProps) {
  const t = useTranslations('sessions');

  const getScoreBadgeClass = (score: number) => {
    if (score >= 8) return 'bg-[#10B981]';
    if (score >= 6) return 'bg-[#F59E0B]';
    if (score >= 4) return 'bg-[#F97316]';
    return 'bg-[#EF4444]';
  };

  const getScoreBadgeText = (score: number) => {
    if (score >= 8) return t('score_badges.excellent');
    if (score >= 6) return t('score_badges.good');
    if (score >= 4) return t('score_badges.needs_work');
    return t('score_badges.issues_found');
  };

  return (
    <div className="break-inside-avoid mb-4">
      <article className="relative overflow-hidden rounded-lg bg-[#111827] group">
        <SessionSaveButton
          sessionId={session.id}
          locale={locale}
          className="absolute right-3 top-3 z-10 shadow-sm"
        />
        <Link href={`/${locale}/session/${session.id}`} className="block">
          <div className="relative aspect-[9/16]">
            {session.photo_url ? (
              <Image
                src={session.photo_url}
                alt="Makeup analysis"
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(min-width: 1280px) 320px, (min-width: 768px) 260px, 45vw"
                unoptimized
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-[#1F2937] text-white/70 text-sm">
                <span>No image</span>
              </div>
            )}

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/90 via-[#0A0A0A]/20 to-transparent" />

            <div className="absolute inset-x-0 bottom-0 p-4">
              <div className="pointer-events-none rounded-md border border-white/10 bg-white/10 p-3 backdrop-blur-sm">
                <div className="flex items-center justify-between text-white">
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${getScoreBadgeClass(session.overall_score)}`}>
                    {getScoreBadgeText(session.overall_score)}
                  </span>
                  <span className="text-xm font-bold leading-none">
                    {session.overall_score.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Link>
      </article>
    </div>
  );
}
