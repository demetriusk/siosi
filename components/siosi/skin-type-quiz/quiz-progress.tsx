'use client';

import { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import { QUIZ_TOTAL_QUESTIONS } from '@/lib/skin-type';
import { useQuiz } from './quiz-context';

type QuizProgressProps = {
  locale: string;
};

export function QuizProgress({ locale }: QuizProgressProps) {
  const {
    state: { currentQuestionIndex },
  } = useQuiz();

  const [current, total, percent] = useMemo(() => {
    const currentNumber = currentQuestionIndex + 1;
    const totalQuestions = QUIZ_TOTAL_QUESTIONS;
    const formatter = new Intl.NumberFormat(locale);
    return [
      formatter.format(currentNumber),
      formatter.format(totalQuestions),
      Math.round((currentNumber / totalQuestions) * 100),
    ];
  }, [currentQuestionIndex, locale]);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between text-sm text-[#4B5563]">
        <span className="font-semibold tracking-tight text-[#0A0A0A]">Find Your Skin Type</span>
        <span>
          Question {current} of {total}
        </span>
      </div>
      <Progress value={percent} className="h-3 bg-[#E5E7EB]" />
    </div>
  );
}
