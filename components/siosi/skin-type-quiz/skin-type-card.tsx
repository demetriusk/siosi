'use client';

import { useState } from 'react';
import { Check, ChevronDown, ChevronUp, ScanFace } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSkinTypeProfile } from '@/lib/skin-type';

type SkinTypeCardProps = {
  skinTypeCode?: string | null;
  onTakeQuizAction: () => void;
  onRetakeAction?: () => void;
  isLoading?: boolean;
  variant?: 'standalone' | 'embedded';
  className?: string;
};

function formatNeedItem(value: string): string {
  if (!value) return value;
  return value.replace(/\b([a-z])/g, (match) => match.toUpperCase());
}

export function SkinTypeCard({
  skinTypeCode,
  onTakeQuizAction,
  onRetakeAction,
  isLoading = false,
  variant = 'standalone',
  className,
}: SkinTypeCardProps) {
  const [expanded, setExpanded] = useState(false);
  const hasResult = Boolean(skinTypeCode);
  const profile = hasResult ? getSkinTypeProfile(skinTypeCode) : null;

  const combinedClassName = [
    variant === 'standalone' ? 'border-[#E5E7EB] shadow-none' : 'space-y-6',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const renderHeader = () => (
    <>
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-[#6B7280]">Skin Type</p>
        <CardTitle className="text-xl font-semibold tracking-tight text-[#0A0A0A]">
          {hasResult ? profile?.profile_summary ?? 'Your Skin Type' : 'Find Your Skin Type'}
        </CardTitle>
        <p className="max-w-xl text-sm leading-6 text-[#4B5563]">
          {hasResult
            ? 'This 36-type quiz blends oil balance, concern focus, and undertone to tailor your makeup routine.'
            : 'Spend two minutes to map your oil balance, skin concerns, and undertone. We build a 36-type profile to personalize every lab result.'}
        </p>
      </div>
      <ScanFace className="h-6 w-6 text-[#0A0A0A]" aria-hidden="true" />
    </>
  );

  const renderBody = () => {
    if (hasResult && profile) {
      const detailedProfile = profile;

      return (
        <div className="space-y-4">
          <div className="rounded-sm border border-[#E5E7EB] bg-[#F9FAFB] p-4">
            <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-[#0A0A0A]">
              <span className="rounded-sm bg-[#0A0A0A] px-2 py-1 text-xs uppercase tracking-wide text-white">{detailedProfile.code}</span>
              <span>{detailedProfile.oil_level}</span>
              <span aria-hidden="true">·</span>
              <span>{detailedProfile.concern}</span>
              <span aria-hidden="true">·</span>
              <span>{detailedProfile.undertone} Undertone</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-[#4B5563]">{detailedProfile.description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {onRetakeAction ? (
              <Button
                type="button"
                variant="outline"
                className="border-[#D1D5DB] text-[#0A0A0A]"
                onClick={onRetakeAction}
                disabled={isLoading}
              >
                Retake Quiz
              </Button>
            ) : null}
            <Button
              type="button"
              className="bg-[#0A0A0A] text-white hover:bg-[#111827]"
              onClick={() => setExpanded((prev) => !prev)}
              disabled={isLoading}
            >
              {expanded ? 'Hide Details' : 'View Details'}
              {expanded ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
            </Button>
          </div>

          {expanded && (
            <div className="space-y-5 rounded-sm border border-[#E5E7EB] bg-[#F9FAFB] p-5">
              <div>
                <p className="text-xs uppercase tracking-wide text-[#6B7280]">Your Makeup Needs</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {(Object.entries(detailedProfile.makeup_needs) as [string, string[]][]).map(([category, items]) => (
                    <div key={category} className="rounded-sm border border-[#E5E7EB] bg-white p-4">
                      <p className="text-xs uppercase tracking-wide text-[#6B7280]">{category.replace('_', ' ')}</p>
                      <ul className="mt-2 space-y-2 text-sm text-[#374151] list-none">
                        {items.length > 0 ? (
                          items.map((item) => (
                            <li key={item} className="flex items-start gap-2">
                              <Check className="mt-0.5 h-3 w-3 text-[#0A0A0A]" aria-hidden="true" />
                              <span>{formatNeedItem(item)}</span>
                            </li>
                          ))
                        ) : (
                          <li className="flex items-start gap-2 text-[#9CA3AF]">
                            <Check className="mt-0.5 h-3 w-3 text-[#D1D5DB]" aria-hidden="true" />
                            <span>No recommendations yet.</span>
                          </li>
                        )}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4 rounded-sm border border-dashed border-[#D1D5DB] bg-[#F9FAFB] p-6 text-center">
        <p className="text-sm text-[#4B5563]">
          You haven’t run the skin type quiz yet. It takes 9 questions and unlocks smarter lab insights.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button
            type="button"
            className="bg-[#0A0A0A] text-white hover:bg-[#111827]"
            onClick={onTakeQuizAction}
            disabled={isLoading}
          >
            Take the Quiz
          </Button>
        </div>
      </div>
    );
  };

  if (isLoading) {
    const loadingContent = (
      <div className="space-y-4">
        <div className="h-4 w-24 animate-pulse rounded-sm bg-[#E5E7EB]" />
        <div className="h-6 w-3/4 animate-pulse rounded-sm bg-[#E5E7EB]" />
        <div className="h-20 animate-pulse rounded-sm bg-[#E5E7EB]" />
        <div className="h-10 w-32 animate-pulse rounded-sm bg-[#E5E7EB]" />
      </div>
    );

    if (variant === 'standalone') {
      return (
        <Card className={[combinedClassName].filter(Boolean).join(' ')}>
          <CardContent>{loadingContent}</CardContent>
        </Card>
      );
    }

    return <div className={[combinedClassName].filter(Boolean).join(' ')}>{loadingContent}</div>;
  }

  if (variant === 'standalone') {
    return (
      <Card className={[combinedClassName].filter(Boolean).join(' ')}>
        <CardHeader className="flex flex-row items-start justify-between gap-6 pb-4">
          {renderHeader()}
        </CardHeader>
        <CardContent>
          {renderBody()}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={[combinedClassName].filter(Boolean).join(' ')}>
      <div className="flex flex-row items-start justify-between gap-6 pb-4">
        {renderHeader()}
      </div>
      {renderBody()}
    </div>
  );
}
