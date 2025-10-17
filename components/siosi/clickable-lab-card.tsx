'use client';

import { LabResultCard } from './lab-result-card';
import { openLabDrawer } from './lab-result-drawer-events';
import type { LabAnalysis } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ClickableLabCardProps {
  analysis: LabAnalysis;
  index: number;
  className?: string;
}

export default function ClickableLabCard({ analysis, index, className }: ClickableLabCardProps) {
  const label = analysis.lab_name ? `Open ${analysis.lab_name} details` : 'Open lab details';

  return (
    <button
      type="button"
      onClick={() => openLabDrawer(index)}
      className={cn(
        'block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-black/40',
        className,
      )}
      aria-label={label}
    >
      <LabResultCard analysis={analysis} variant="preview" />
    </button>
  );
}
