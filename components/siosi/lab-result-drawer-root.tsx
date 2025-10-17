'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerTitle,
} from '@/components/ui/drawer';
import type { LabAnalysis, Verdict } from '@/lib/types';
import { LabResultCard } from './lab-result-card';
import { OPEN_LAB_DRAWER_EVENT } from './lab-result-drawer-events';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface LabResultDrawerRootProps {
  analyses: LabAnalysis[];
  closeLabel: string;
}

const badgeColorByVerdict: Record<Verdict, string> = {
  YAY: 'bg-[#10B981] text-white',
  NAY: 'bg-[#EF4444] text-white',
  MAYBE: 'bg-[#F59E0B] text-white',
};

export default function LabResultDrawerRoot({ analyses, closeLabel }: LabResultDrawerRootProps) {
  const [open, setOpen] = React.useState(false);
  const [index, setIndex] = React.useState(0);
  const t = useTranslations();
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (analyses.length === 0) {
      setOpen(false);
      setIndex(0);
    } else {
      setIndex((current) => Math.min(current, analyses.length - 1));
    }
  }, [analyses.length]);

  React.useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ index: number }>;
      if (!Array.isArray(analyses) || analyses.length === 0) return;
      const requested = Math.max(0, Math.min(custom.detail?.index ?? 0, analyses.length - 1));
      setIndex(requested);
      setOpen(true);
    };

    window.addEventListener(OPEN_LAB_DRAWER_EVENT, handler as EventListener);
    return () => {
      window.removeEventListener(OPEN_LAB_DRAWER_EVENT, handler as EventListener);
    };
  }, [analyses]);

  const selected = analyses[index];
  const canPrev = index > 0;
  const canNext = index < analyses.length - 1;

  const goPrev = React.useCallback(() => {
    if (canPrev) {
      setIndex((current) => current - 1);
    }
  }, [canPrev]);

  const goNext = React.useCallback(() => {
    if (canNext) {
      setIndex((current) => current + 1);
    }
  }, [canNext]);

  const goTo = React.useCallback(
    (target: number) => {
      if (target >= 0 && target < analyses.length) {
        setIndex(target);
      }
    },
    [analyses.length],
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goPrev();
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      goNext();
    }
  };

  if (analyses.length === 0) {
    return null;
  }

  const positionLabel = `${index + 1} of ${analyses.length}`;
  const statusClass = selected ? badgeColorByVerdict[selected.verdict] : 'bg-[#6B7280] text-white';
  const statusLabel = selected
    ? t(`results.verdict.${selected.verdict.toLowerCase()}`)
    : '';
  const currentLabName = selected?.lab_name ?? selected?.name;
  const labTitle = currentLabName
    ? (() => {
        try {
          return t(`home.labs.${currentLabName}`);
        } catch {
          return currentLabName;
        }
      })()
    : 'Lab';

  React.useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => {
        closeButtonRef.current?.focus();
      });
      return () => cancelAnimationFrame(id);
    }
    return undefined;
  }, [open]);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent
        className="mt-0 max-h-[92dvh] rounded-t-[24px] border-0 bg-white px-0 pb-0 shadow-2xl sm:max-h-[85dvh] [&>div:first-child]:mx-auto [&>div:first-child]:mt-3 [&>div:first-child]:h-2 [&>div:first-child]:w-[100px] [&>div:first-child]:rounded-full [&>div:first-child]:bg-[#D1D5DB]"
        onKeyDown={handleKeyDown}
      >
        <DrawerTitle className="sr-only">{labTitle}</DrawerTitle>
        <DrawerDescription className="sr-only">
          Detailed analysis for {labTitle}. {positionLabel}.
        </DrawerDescription>

        <div className="flex flex-col">
          <header className="flex items-center gap-3 border-b border-[#E5E7EB] px-4 py-3 sm:px-6">
            <button
              type="button"
              onClick={goPrev}
              disabled={!canPrev}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#D1D5DB] text-[#111827] transition disabled:opacity-40"
              aria-label="Previous lab"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-base font-semibold text-[#0A0A0A]">
                  {labTitle}
                </span>
                {selected && (
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', statusClass)}>
                    {statusLabel}
                  </span>
                )}
              </div>
              <span className="text-xs text-[#6B7280]">{positionLabel}</span>
            </div>

            <button
              type="button"
              onClick={goNext}
              disabled={!canNext}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#D1D5DB] text-[#111827] transition disabled:opacity-40"
              aria-label="Next lab"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </header>

          <DrawerBody className="overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 max-h-[calc(92dvh-220px)] sm:max-h-[calc(85dvh-220px)]">
            {selected && <LabResultCard analysis={selected} variant="full" />}
          </DrawerBody>

          <DrawerFooter className="gap-3 border-t border-[#E5E7EB] bg-white px-4 py-4 sm:px-6">
            <div className="flex items-center justify-center gap-3">
              {analyses.map((_, dotIndex) => {
                const active = dotIndex === index;
                return (
                  <button
                    key={dotIndex}
                    type="button"
                    onClick={() => goTo(dotIndex)}
                    aria-label={`Go to result ${dotIndex + 1}`}
                    aria-pressed={active}
                    className={cn(
                      'h-[6px] rounded-full transition-all duration-300 ease-out',
                      active
                        ? 'w-[32px] bg-[#0F172A] shadow-[0_0_0_2px_rgba(15,23,42,0.12)]'
                        : 'w-[6px] bg-[#CBD5F5] hover:bg-[#94A3B8]',
                    )}
                    data-active={active ? 'true' : 'false'}
                  />
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              ref={closeButtonRef}
              className="w-full rounded-md border border-[#D1D5DB] bg-white px-4 py-2.5 text-sm font-semibold text-[#111827] transition hover:bg-[#F9FAFB]"
            >
              {closeLabel}
            </button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
