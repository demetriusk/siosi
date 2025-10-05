'use client';

import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslations } from 'next-intl';

interface ConfidenceScoreProps {
  confidence: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ConfidenceScore({ confidence, showLabel = true, size = 'md' }: ConfidenceScoreProps) {
  const t = useTranslations('results');

  const getColorClass = (confidence: number) => {
    if (confidence >= 80) return 'bg-[#10B981]';
    if (confidence >= 50) return 'bg-[#F59E0B]';
    return 'bg-[#F97316]';
  };

  const getTextColorClass = (confidence: number) => {
    if (confidence >= 80) return 'text-[#10B981]';
    if (confidence >= 50) return 'text-[#F59E0B]';
    return 'text-[#F97316]';
  };

  const getTooltipText = (confidence: number) => {
    if (confidence >= 80) return 'High confidence: Very likely accurate';
    if (confidence >= 50) return 'Medium confidence: Good prediction, some uncertainty';
    return 'Low confidence: Rough estimate, take with caution';
  };

  const heightClass = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3' : 'h-2';
  const textSizeClass = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm';

  return (
    <div className="space-y-1.5">
      <div className="relative w-full bg-[#E5E7EB] rounded-full overflow-hidden">
        <div
          className={`${heightClass} ${getColorClass(confidence)} transition-all duration-500 ease-out`}
          style={{ width: `${confidence}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex items-center gap-1.5">
          <span className={`${textSizeClass} font-medium ${getTextColorClass(confidence)}`}>
            {t('confidence', { percent: Math.round(confidence) })}
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3.5 h-3.5 text-[#6B7280] cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-white border border-[#E5E7EB] text-[#0A0A0A]">
                <p className="text-sm">{getTooltipText(confidence)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
}
