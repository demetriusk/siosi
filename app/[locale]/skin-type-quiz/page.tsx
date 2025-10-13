import type { ParamsWithLocale } from '@/lib/types';

import QuizClient from './QuizClient';

interface SkinTypeQuizPageProps extends ParamsWithLocale {}

export default async function SkinTypeQuizPage({ params }: SkinTypeQuizPageProps) {
  const { locale } = await params!;
  return <QuizClient locale={locale} />;
}
