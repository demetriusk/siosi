import QuizClient from './QuizClient';

interface SkinTypeQuizPageProps {
  params: { locale?: string };
}

export default function SkinTypeQuizPage({ params }: SkinTypeQuizPageProps) {
  const locale = params?.locale ?? 'en';
  return <QuizClient locale={locale} />;
}
