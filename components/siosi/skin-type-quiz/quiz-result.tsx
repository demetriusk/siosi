'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { getSkinTypeProfile, splitSkinTypeCode } from '@/lib/skin-type';
import { useQuiz } from './quiz-context';

type QuizResultProps = {
  onRetakeAction: () => void;
  onViewProfileAction: () => void;
  onRetrySaveAction?: () => void;
  isSaving?: boolean;
  saveError?: string | null;
};

export function QuizResult({ onRetakeAction, onViewProfileAction, onRetrySaveAction, isSaving = false, saveError = null }: QuizResultProps) {
  const {
    state: { skinTypeCode },
  } = useQuiz();

  const profile = getSkinTypeProfile(skinTypeCode);
  const breakdown = splitSkinTypeCode(profile.code);

  const formatNeedItem = (value: string): string => {
    if (!value) return value;
    return value.replace(/\b([a-z])/g, (match) => match.toUpperCase());
  };

  return (
    <div className="space-y-8">
      <Card className="border-[#E5E7EB] shadow-none">
        <CardHeader className="space-y-3 pb-4">
          <CardTitle className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">
            Your Skin Type
          </CardTitle>
          <div className="rounded-sm border border-dashed border-[#D1D5DB] bg-[#F9FAFB] px-4 py-3 text-sm text-[#4B5563]">
            <p className="font-medium text-[#0A0A0A]"><span className="mr-2 text-sm uppercase tracking-wide text-[#6B7280]">Code</span>{profile.code}</p>
            <p className="mt-2 leading-6 text-[#4B5563]">{profile.profile_summary}</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-base font-semibold tracking-tight text-[#0A0A0A]">Skin Snapshot</h3>
            <ul className="grid gap-2 text-sm text-[#4B5563] sm:grid-cols-3">
              <li><span className="block text-xs uppercase tracking-wide text-[#6B7280]">Oil Level</span><span className="font-medium text-[#0A0A0A]">{profile.oil_level}</span></li>
              <li><span className="block text-xs uppercase tracking-wide text-[#6B7280]">Concern Focus</span><span className="font-medium text-[#0A0A0A]">{profile.concern}</span></li>
              <li><span className="block text-xs uppercase tracking-wide text-[#6B7280]">Undertone</span><span className="font-medium text-[#0A0A0A]">{profile.undertone}</span></li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-base font-semibold tracking-tight text-[#0A0A0A]">About Your Skin</h3>
            <p className="text-sm leading-6 text-[#374151]">{profile.description}</p>
          </section>

          <section className="space-y-3">
            <h3 className="text-base font-semibold tracking-tight text-[#0A0A0A]">Your Makeup Needs</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {(Object.entries(profile.makeup_needs) as [string, string[]][]).map(([category, items]) => (
                <div key={category} className="rounded-sm border border-[#E5E7EB] bg-white p-4">
                  <p className="text-xs uppercase tracking-wide text-[#6B7280]">{category.replace('_', ' ')}</p>
                  <ul className="mt-2 space-y-2 list-none text-sm text-[#374151]">
                    {items.length === 0 ? (
                      <li className="flex items-start gap-2 text-[#9CA3AF]">
                        <Check className="mt-0.5 h-3 w-3 text-[#D1D5DB]" aria-hidden="true" />
                        <span>No recommendations yet.</span>
                      </li>
                    ) : (
                      items.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-3 w-3 text-[#0A0A0A]" aria-hidden="true" />
                          <span>{formatNeedItem(item)}</span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <div className="flex gap-3">
          <Button variant="outline" className="border-[#D1D5DB] text-[#0A0A0A]" onClick={onRetakeAction} disabled={isSaving}>
            Retake Quiz
          </Button>
          <Button className="bg-[#0A0A0A] text-white hover:bg-[#111827]" onClick={onViewProfileAction} disabled={isSaving}>
            View My Profile
          </Button>
        </div>
        <div className="rounded-sm border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-xs text-[#6B7280]">
          <span className="font-semibold text-[#0A0A0A]">Axis Breakdown:</span>{' '}
          <span className="ml-2">Oil {breakdown.oilLevel ?? '—'} · Concerns {breakdown.concern ?? '—'} · Undertone {breakdown.undertone ?? '—'}</span>
        </div>
      </div>
      {isSaving ? (
        <p className="text-xs text-[#6B7280]">Saving your skin type to your profile…</p>
      ) : saveError ? (
        <div className="rounded-sm border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-xs text-[#B91C1C]">
          <p className="font-medium">We couldn’t save your quiz yet.</p>
          <p className="mt-1">{saveError}</p>
          {onRetrySaveAction ? (
            <button
              type="button"
              className="mt-2 inline-flex items-center rounded-sm border border-[#B91C1C] px-3 py-1 text-xs font-semibold text-[#B91C1C] hover:bg-[#B91C1C]/10"
              onClick={onRetrySaveAction}
            >
              Try Again
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
