'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/siosi/header';
import { Footer } from '@/components/siosi/footer';
import { Button } from '@/components/ui/button';
import { QuizProvider, useQuiz } from '@/components/siosi/skin-type-quiz/quiz-context';
import { QuizProgress } from '@/components/siosi/skin-type-quiz/quiz-progress';
import { QuizQuestionView } from '@/components/siosi/skin-type-quiz/quiz-question';
import { QuizResult } from '@/components/siosi/skin-type-quiz/quiz-result';
import logger from '@/lib/logger';
import { toast } from 'sonner';

interface QuizClientProps {
  locale: string;
}

async function resolveSupabaseToken(): Promise<string | undefined> {
  try {
    const mod = await import('@/lib/supabase');
    const maybeSupabase: any = (mod as any).supabase ?? (mod as any).default ?? null;
    if (!maybeSupabase?.auth) return undefined;

    if (typeof maybeSupabase.auth.getSession === 'function') {
      const result = await maybeSupabase.auth.getSession();
      return result?.data?.session?.access_token ?? result?.session?.access_token;
    }

    if (typeof maybeSupabase.auth.session === 'function') {
      const session = maybeSupabase.auth.session();
      return session?.access_token;
    }

    if (typeof maybeSupabase.auth.getUser === 'function') {
      const maybeAny: any = maybeSupabase.auth;
      return maybeAny?.session?.access_token ?? maybeAny?.currentSession?.access_token;
    }
  } catch (error) {
    logger.debug('resolveSupabaseToken failed', error);
  }

  return undefined;
}

export default function QuizClient({ locale }: QuizClientProps) {
  return (
    <QuizProvider>
      <QuizShell locale={locale} />
    </QuizProvider>
  );
}

function QuizShell({ locale }: QuizClientProps) {
  const router = useRouter();
  const {
    state,
    resetQuiz,
    setCurrentQuestionIndex,
  } = useQuiz();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const lastSavedCodeRef = useRef<string | null>(null);
  const lastAttemptedCodeRef = useRef<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const persistSkinTypeCode = useCallback(async (code: string | null) => {
    const token = await resolveSupabaseToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch('/api/profile/save', {
      method: 'POST',
      headers,
      body: JSON.stringify({ skin_type_code: code }),
    });

    const text = await res.text();
    if (!res.ok) {
      let message = 'Failed to save skin type';
      try {
        const parsed = text ? JSON.parse(text) : null;
        message = parsed?.error || parsed?.message || message;
      } catch {
        if (text) message = text;
      }
      throw new Error(message);
    }
  }, []);

  useEffect(() => {
    if (!state.isComplete || !state.skinTypeCode) {
      return;
    }

    if (lastSavedCodeRef.current === state.skinTypeCode) {
      return;
    }

    if (lastAttemptedCodeRef.current === state.skinTypeCode) {
      return;
    }

    let cancelled = false;
    lastAttemptedCodeRef.current = state.skinTypeCode;
    setIsSaving(true);
    setSaveError(null);

    persistSkinTypeCode(state.skinTypeCode)
      .then(() => {
        if (cancelled) return;
        lastSavedCodeRef.current = state.skinTypeCode;
        lastAttemptedCodeRef.current = null;
        setIsSaving(false);
        setSaveError(null);
      })
      .catch((error) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'Failed to save skin type';
        logger.error('Skin type save error', error);
        setIsSaving(false);
        setSaveError(message);
        toast.error(message);
      });

    return () => {
      cancelled = true;
    };
  }, [state.isComplete, state.skinTypeCode, retryToken, persistSkinTypeCode]);

  const handleResetQuiz = useCallback(async () => {
    resetQuiz();
    setCurrentQuestionIndex(0);
    lastAttemptedCodeRef.current = null;
    setSaveError(null);
    setIsSaving(true);
    setRetryToken(0);

    try {
      await persistSkinTypeCode(null);
      lastSavedCodeRef.current = null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save skin type';
      logger.error('Skin type clear error', error);
      setSaveError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }, [persistSkinTypeCode, resetQuiz, setCurrentQuestionIndex]);

  const handleRetrySave = () => {
    if (!state.skinTypeCode) return;
    lastAttemptedCodeRef.current = null;
    setSaveError(null);
    setIsSaving(false);
    setRetryToken((token) => token + 1);
  };
  
  const handleRetake = () => {
    lastSavedCodeRef.current = null;
    lastAttemptedCodeRef.current = null;
    setSaveError(null);
    setIsSaving(false);
    setRetryToken(0);
    void handleResetQuiz();
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F9FAFB]">
      <Header locale={locale} />
      <main className="flex-1 py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-[#0A0A0A]">Find Your Perfect Skin Type Match</h1>
              <p className="mt-2 text-sm text-[#4B5563]">
                We use your answers across oil levels, skin concerns, and undertone to build a 36-type profile tailored to your routine.
              </p>
            </div>
            {state.isComplete ? (
              <Button variant="ghost" className="self-start text-[#0A0A0A]" onClick={() => void handleResetQuiz()}>
                Start Over
              </Button>
            ) : (
              <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                <Button variant="ghost" className="text-[#0A0A0A]" onClick={() => void handleResetQuiz()}>
                  Reset
                </Button>
              </div>
            )}
          </div>

          {!state.isComplete && (
            <div className="mb-8">
              <QuizProgress locale={locale} />
            </div>
          )}

          {state.isComplete && state.skinTypeCode ? (
            <QuizResult
              onRetakeAction={handleRetake}
              onViewProfileAction={() => router.push(`/${locale}/profile`)}
              onRetrySaveAction={saveError ? handleRetrySave : undefined}
              isSaving={isSaving}
              saveError={saveError}
            />
          ) : (
            <QuizQuestionView />
          )}
        </div>
      </main>
      <Footer locale={locale} />
    </div>
  );
}
