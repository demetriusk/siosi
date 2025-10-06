"use client";

import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { ArrowRight, CircleAlert as AlertCircle } from 'lucide-react';
import { Session } from '@/lib/types';
import { useTranslations } from 'next-intl';

interface SessionCardProps {
  session: Session;
  locale: string;
}

export function SessionCard({ session, locale }: SessionCardProps) {
  const t = useTranslations('sessions');

  const getScoreBadgeClass = (score: number) => {
    if (score >= 8) return 'bg-[#10B981] text-white';
    if (score >= 6) return 'bg-[#F59E0B] text-white';
    if (score >= 4) return 'bg-[#F97316] text-white';
    return 'bg-[#EF4444] text-white';
  };

  const getScoreBadgeText = (score: number) => {
    if (score >= 8) return t('score_badges.excellent');
    if (score >= 6) return t('score_badges.good');
    if (score >= 4) return t('score_badges.needs_work');
    return t('score_badges.issues_found');
  };

  return (
    <Link href={`/${locale}/session/${session.id}`}>
      <div className="bg-white border border-[#E5E7EB] rounded-sm overflow-hidden hover:shadow-lg transition-all group">
        <div className="aspect-video bg-[#F9FAFB] relative overflow-hidden">
          {session.photo_url ? (
            <Image
              src={session.photo_url}
              alt="Makeup analysis"
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#D1D5DB]">
              <span className="text-sm">No image</span>
            </div>
          )}
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <time className="text-xs text-[#6B7280]">
              {format(new Date(session.created_at), 'MMM d, yyyy • h:mm a')}
            </time>
            {session.critical_count > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-[#EF4444] text-white text-xs font-medium rounded-full">
                <AlertCircle className="w-3 h-3" />
                {session.critical_count}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className={`px-3 py-1 text-sm font-semibold rounded ${getScoreBadgeClass(session.overall_score)}`}>
              {getScoreBadgeText(session.overall_score)}
            </span>
            <span className="text-2xl font-bold text-[#0A0A0A]">
              {session.overall_score.toFixed(1)}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm text-[#6B7280] group-hover:text-[#0A0A0A] transition-colors">
            <span>{t('view_report')}</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </Link>
  );
}
