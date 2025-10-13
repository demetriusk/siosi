'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useQuiz } from './quiz-context';

const AUTO_ADVANCE_DELAY = 280;

export function QuizQuestionView() {
  const {
    currentQuestion,
    state,
    selectAnswer,
    goToNext,
    goToPrevious,
    questions,
    calculateResult,
  } = useQuiz();
  const timerRef = useRef<number | null>(null);

  const selectedAnswerId = useMemo(() => {
    return state.answers.find((answer) => answer.questionId === currentQuestion.id)?.answerId;
  }, [state.answers, currentQuestion.id]);

  useEffect(() => () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
  }, []);

  const isFirstQuestion = state.currentQuestionIndex === 0;
  const isLastQuestion = state.currentQuestionIndex === questions.length - 1;

  const handleSelect = (answerId: string) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    selectAnswer(currentQuestion.id, answerId);

    timerRef.current = window.setTimeout(() => {
      if (isLastQuestion) {
        calculateResult();
      } else {
        goToNext();
      }
    }, AUTO_ADVANCE_DELAY);
  };

  return (
    <div className="space-y-8">
      <Card className="border-[#E5E7EB] shadow-none">
        <CardHeader className="space-y-2 pb-4">
          <CardTitle className="text-xl font-semibold tracking-tight text-[#0A0A0A]">
            {currentQuestion.question}
          </CardTitle>
          <p className="text-sm text-[#4B5563]">Choose the option that feels most like your skin today.</p>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4">
            {currentQuestion.answers.map((answer) => {
              const isSelected = selectedAnswerId === answer.id;
              return (
                <button
                  key={answer.id}
                  type="button"
                  onClick={() => handleSelect(answer.id)}
                  className={cn(
                    'w-full rounded-sm border px-6 py-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]',
                    isSelected
                      ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white'
                      : 'border-[#E5E7EB] bg-white text-[#0A0A0A] hover:border-[#0A0A0A] hover:bg-[#F9FAFB]'
                  )}
                  aria-pressed={isSelected}
                >
                  <span className="text-base font-medium leading-6">
                    {answer.text}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          className="text-[#0A0A0A] hover:bg-[#F3F4F6]"
          onClick={goToPrevious}
          disabled={isFirstQuestion}
        >
          Back
        </Button>
        <Button
          type="button"
          className="bg-[#0A0A0A] text-white hover:bg-[#111827]"
          onClick={() => {
            if (!selectedAnswerId) return;
            if (isLastQuestion) {
              calculateResult();
            } else {
              goToNext();
            }
          }}
          disabled={!selectedAnswerId}
        >
          {isLastQuestion ? 'See Results' : 'Next'}
        </Button>
      </div>
    </div>
  );
}
