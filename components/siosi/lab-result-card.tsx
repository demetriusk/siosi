'use client';

import { useState, KeyboardEvent } from 'react';
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
  const detailsId = `lab-details-${analysis.id ?? analysis.lab_name}`;

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

  const getScoreColorClass = (score: number) => {
    if (score >= 8) return 'text-[#10B981]';
    if (score >= 6) return 'text-[#F59E0B]';
    if (score >= 4) return 'text-[#F97316]';
    return 'text-[#EF4444]';
  };

  const labNameKey = `home.labs.${analysis.lab_name}`;

  const toggleExpanded = () => {
    setIsExpanded(prev => !prev);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleExpanded();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      aria-controls={detailsId}
      onClick={toggleExpanded}
      onKeyDown={handleKeyDown}
      className={`bg-white border border-[#E5E7EB] border-l-4 ${getBorderColorClass(analysis.verdict)} rounded-sm p-6 transition-all hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/20 cursor-pointer`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-lg font-semibold text-[#0A0A0A]">
              {t(labNameKey)}
            </h3>
            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded ${getVerdictBadgeClass(analysis.verdict)}`}>
              {t(`results.verdict.${analysis.verdict.toLowerCase()}`)}
            </span>
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-bold ${getScoreColorClass(analysis.score)}`}>
                {analysis.score.toFixed(1)}
              </span>
              <span className="text-sm text-[#6B7280]">/10</span>
            </div>
          </div>

          <ConfidenceScore confidence={analysis.confidence} size="sm" />

          {analysis.detected.length > 0 && (
            <p className="text-[#6B7280] line-clamp-2">
              {analysis.detected[0]}
            </p>
          )}
        </div>
        <span className="text-[#6B7280] transition-transform flex-shrink-0" aria-hidden="true">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </span>
      </div>

      {isExpanded && (
        <div id={detailsId} className="mt-6 space-y-6 pt-6 border-t border-[#E5E7EB]">
          {analysis.detected.length > 0 && (
            <div>
              <h4 className="font-semibold text-[#0A0A0A] mb-2">
                {t('results.detected')}
              </h4>
              <ul className="space-y-1.5">
                {analysis.detected.map((item, index) => (
                  <li key={index} className="text-[#6B7280] flex items-start gap-2">
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.recommendations.length > 0 && (
            <div>
              <h4 className="font-semibold text-[#0A0A0A] mb-2">
                {t('results.recommendations')}
              </h4>
              <ol className="space-y-1.5">
                {analysis.recommendations.map((item, index) => (
                  <li key={index} className="text-[#0A0A0A] flex items-start gap-2">
                    <span className="text-[#6B7280] font-medium">{index + 1}.</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {analysis.zones_affected && analysis.zones_affected.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-[#0A0A0A] mb-2">
                {t('results.zones_affected', { defaultValue: 'Zones Affected' })}
              </h4>
              <div className="flex flex-wrap gap-2">
                {analysis.zones_affected.map((zone, index) => (
                  <span
                    key={index}
                    className="px-2.5 py-1 bg-[#F3F4F6] text-[#374151] text-xs font-medium rounded"
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