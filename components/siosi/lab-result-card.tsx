'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { LabAnalysis, Verdict } from '@/lib/types';
import { ConfidenceScore } from './confidence-score';
import { useTranslations } from 'next-intl';

interface LabResultCardProps {
  analysis: LabAnalysis;
  defaultExpanded?: boolean;
}

export function LabResultCard({ analysis, defaultExpanded = false }: LabResultCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const t = useTranslations();

  const getBorderColorClass = (verdict: Verdict) => {
    if (verdict === 'YAY') return 'border-l-[#10B981]';
    if (verdict === 'NAY') return 'border-l-[#EF4444]';
    return 'border-l-[#F59E0B]';
  };

  const getVerdictBadgeClass = (verdict: Verdict) => {
    if (verdict === 'YAY') return 'bg-[#10B981] text-white';
    if (verdict === 'NAY') return 'bg-[#EF4444] text-white';
    return 'bg-[#F59E0B] text-white';
  };

  const labNameKey = `home.labs.${analysis.lab_name}`;

  return (
    <div className={`bg-white border border-[#E5E7EB] border-l-4 ${getBorderColorClass(analysis.verdict)} rounded-sm p-6 transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-[#0A0A0A]">
              {t(labNameKey)}
            </h3>
            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded ${getVerdictBadgeClass(analysis.verdict)}`}>
              {t(`results.verdict.${analysis.verdict.toLowerCase()}`)}
            </span>
          </div>

          <ConfidenceScore confidence={analysis.confidence} size="sm" />

          {analysis.detected.length > 0 && (
            <p className="text-sm text-[#6B7280] line-clamp-2">
              {analysis.detected[0]}
            </p>
          )}
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-[#6B7280] hover:text-[#0A0A0A] transition-colors"
          aria-label={isExpanded ? t('results.hide_details') : t('results.show_details')}
        >
          {isExpanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-6 space-y-6 pt-6 border-t border-[#E5E7EB]">
          {analysis.detected.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-[#0A0A0A] mb-2">
                {t('results.detected')}
              </h4>
              <ul className="space-y-1.5">
                {analysis.detected.map((item, index) => (
                  <li key={index} className="text-sm text-[#6B7280] flex items-start gap-2">
                    <span className="text-[#D1D5DB] mt-1.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.recommendations.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-[#0A0A0A] mb-2">
                {t('results.recommendations')}
              </h4>
              <ol className="space-y-1.5">
                {analysis.recommendations.map((item, index) => (
                  <li key={index} className="text-sm text-[#0A0A0A] flex items-start gap-2">
                    <span className="text-[#6B7280] font-medium">{index + 1}.</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
