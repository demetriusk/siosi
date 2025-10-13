'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import logger from '@/lib/logger';
import {
  QUIZ_TOTAL_QUESTIONS,
  calculateSkinType,
  getQuizQuestion,
  getQuizQuestions,
  type QuizAnswerSelection,
  type QuizQuestion,
  type SkinTypeCode,
} from '@/lib/skin-type';

const QUIZ_STORAGE_KEY = 'siosi_skin_type_quiz_progress_v1';

type QuizState = {
  currentQuestionIndex: number;
  answers: QuizAnswerSelection[];
  isComplete: boolean;
  skinTypeCode: SkinTypeCode | null;
};

type QuizContextValue = {
  questions: QuizQuestion[];
  state: QuizState;
  currentQuestion: QuizQuestion;
  selectAnswer: (questionId: string, answerId: string) => void;
  goToNext: () => void;
  goToPrevious: () => void;
  calculateResult: () => SkinTypeCode;
  resetQuiz: () => void;
  setCurrentQuestionIndex: (index: number) => void;
};

const QuizContext = createContext<QuizContextValue | undefined>(undefined);

const questionsCache = getQuizQuestions();

const defaultState: QuizState = {
  currentQuestionIndex: 0,
  answers: [],
  isComplete: false,
  skinTypeCode: null,
};

function restoreState(): QuizState {
  if (typeof window === 'undefined') {
    return defaultState;
  }

  try {
    const raw = window.localStorage.getItem(QUIZ_STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as QuizState;
    if (!parsed || !Array.isArray(parsed.answers)) return defaultState;
    if (
      typeof parsed.currentQuestionIndex !== 'number' ||
      parsed.currentQuestionIndex < 0 ||
      parsed.currentQuestionIndex >= QUIZ_TOTAL_QUESTIONS
    ) {
      parsed.currentQuestionIndex = 0;
    }

    const validAnswers = parsed.answers.filter((answer) => getQuizQuestion(answer.questionId));

    return {
      currentQuestionIndex: parsed.currentQuestionIndex,
      answers: validAnswers,
      isComplete: parsed.isComplete ?? false,
      skinTypeCode: parsed.skinTypeCode ?? null,
    };
  } catch (error) {
    logger.warn('Failed to restore quiz state', error);
    return defaultState;
  }
}

function persistState(state: QuizState) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    logger.warn('Failed to persist quiz state', error);
  }
}

export function QuizProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<QuizState>(() => restoreState());
  const isHydratedRef = useRef(false);

  useEffect(() => {
    if (!isHydratedRef.current) {
      isHydratedRef.current = true;
      return;
    }

    if (state.isComplete && state.skinTypeCode) {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(QUIZ_STORAGE_KEY);
      }
      return;
    }

    persistState(state);
  }, [state]);

  const selectAnswer = useCallback((questionId: string, answerId: string) => {
    const question = getQuizQuestion(questionId);
    if (!question) return;
    const answer = question.answers.find((option) => option.id === answerId);
    if (!answer) return;

    setState((prev) => {
      const nextAnswers = [...prev.answers];
      const existingIndex = nextAnswers.findIndex((entry) => entry.questionId === questionId);
      const selection: QuizAnswerSelection = {
        questionId,
        answerId,
        weights: { ...answer.weights },
      };

      if (existingIndex >= 0) {
        nextAnswers[existingIndex] = selection;
      } else {
        nextAnswers.push(selection);
      }

      return {
        currentQuestionIndex: prev.currentQuestionIndex,
        answers: nextAnswers,
        isComplete: false,
        skinTypeCode: null,
      };
    });
  }, []);

  const goToNext = useCallback(() => {
    setState((prev) => {
      const nextIndex = Math.min(prev.currentQuestionIndex + 1, questionsCache.length - 1);
      return { ...prev, currentQuestionIndex: nextIndex };
    });
  }, []);

  const goToPrevious = useCallback(() => {
    setState((prev) => {
      const nextIndex = Math.max(prev.currentQuestionIndex - 1, 0);
      return { ...prev, currentQuestionIndex: nextIndex };
    });
  }, []);

  const setCurrentQuestionIndex = useCallback((index: number) => {
    setState((prev) => {
      const clampedIndex = Math.min(Math.max(index, 0), questionsCache.length - 1);
      return { ...prev, currentQuestionIndex: clampedIndex };
    });
  }, []);

  const calculateResult = useCallback((): SkinTypeCode => {
    let nextCode: SkinTypeCode = 'N-C-N';
    setState((prev) => {
      const code = calculateSkinType(prev.answers);
      nextCode = code;
      return {
        ...prev,
        isComplete: true,
        skinTypeCode: code,
      };
    });
    return nextCode;
  }, []);

  const resetQuiz = useCallback(() => {
    setState(defaultState);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(QUIZ_STORAGE_KEY);
    }
  }, []);

  const value = useMemo<QuizContextValue>(() => {
    const currentQuestion = questionsCache[state.currentQuestionIndex] ?? questionsCache[0];

    return {
      questions: questionsCache,
      state,
      currentQuestion,
      selectAnswer,
      goToNext,
      goToPrevious,
      calculateResult,
      resetQuiz,
      setCurrentQuestionIndex,
    };
  }, [state, selectAnswer, goToNext, goToPrevious, calculateResult, resetQuiz, setCurrentQuestionIndex]);

  return <QuizContext.Provider value={value}>{children}</QuizContext.Provider>;
}

export function useQuiz() {
  const context = useContext(QuizContext);
  if (!context) {
    throw new Error('useQuiz must be used within a QuizProvider');
  }
  return context;
}
