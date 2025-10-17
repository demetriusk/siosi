'use client';

import { LabAnalysis, Verdict } from '@/lib/types';
import { ConfidenceScore } from './confidence-score';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

type LabResultCardVariant = 'preview' | 'full';

interface LabResultCardProps {
  analysis: LabAnalysis;
  variant?: LabResultCardVariant;
  className?: string;
}

const verdictBorder: Record<Verdict, string> = {
  YAY: 'border-l-[#10B981]',
  NAY: 'border-l-[#EF4444]',
  MAYBE: 'border-l-[#F59E0B]',
};

const verdictBadge: Record<Verdict, string> = {
  YAY: 'bg-[#10B981] text-white',
  NAY: 'bg-[#EF4444] text-white',
  MAYBE: 'bg-[#F59E0B] text-white',
};

function scoreColor(score: number) {
  if (score >= 8) return 'text-[#10B981]';
  if (score >= 6) return 'text-[#F59E0B]';
  if (score >= 4) return 'text-[#F97316]';
  return 'text-[#EF4444]';
}

export function LabResultCard({ analysis, variant = 'preview', className }: LabResultCardProps) {
  const t = useTranslations();
  const labNameKey = `home.labs.${analysis.lab_name}`;
  const labLabel = (() => {
    try {
      return t(labNameKey);
    } catch {
      return analysis.lab_name ?? labNameKey;
    }
  })();

  const wrapperClassName = cn(
    variant === 'preview'
      ? 'rounded-sm border border-[#E5E7EB] bg-white p-6 transition-shadow hover:shadow-md'
      : undefined,
    className,
  );

  return (
    <div className={wrapperClassName}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold text-[#0A0A0A]">{labLabel}</h3>
            <span
              className={cn('rounded px-2.5 py-0.5 text-xs font-semibold', verdictBadge[analysis.verdict])}
            >
              {t(`results.verdict.${analysis.verdict.toLowerCase()}`)}
            </span>
            <div className="flex items-baseline gap-1">
              <span className={cn('text-2xl font-bold', scoreColor(analysis.score))}>
                {analysis.score.toFixed(1)}
              </span>
              <span className="text-sm text-[#6B7280]">/10</span>
            </div>
          </div>

          <ConfidenceScore confidence={analysis.confidence} size="sm" />

          {analysis.detected.length > 0 && variant === 'preview' && (
            <p className="line-clamp-2 text-[#6B7280]">{analysis.detected[0]}</p>
          )}
        </div>
      </div>

      {variant === 'full' && (
        <div className="mt-6 space-y-6 pt-6">
          {analysis.detected.length > 0 && (
            <div>
              <h4 className="mb-2 font-semibold text-[#0A0A0A]">{t('results.detected')}</h4>
              <ul className="space-y-1.5">
                {analysis.detected.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-[#6B7280]">
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.recommendations.length > 0 && (
            <div>
              <h4 className="mb-2 font-semibold text-[#0A0A0A]">{t('results.recommendations')}</h4>
              <ol className="space-y-1.5">
                {analysis.recommendations.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-[#0A0A0A]">
                    <span className="font-medium text-[#6B7280]">{index + 1}.</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {analysis.zones_affected && analysis.zones_affected.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-[#0A0A0A]">
                {t('results.zones_affected', { defaultValue: 'Zones Affected' })}
              </h4>
              <div className="flex flex-wrap gap-2">
                {analysis.zones_affected.map((zone, index) => (
                  <span
                    key={index}
                    className="rounded bg-[#F3F4F6] px-2.5 py-1 text-xs font-medium text-[#374151]"
                  >
                    {zone}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}