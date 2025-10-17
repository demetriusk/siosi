"use client";

import { Feedback } from "@/components/ui/feedback";

interface AnalysisFeedbackProps {
  title: string;
  description: string;
  submitLabel: string;
  userId: string;
  sessionId: string;
  locale: string;
}

export default function AnalysisFeedback({
  title,
  description,
  submitLabel,
  userId,
  sessionId,
  locale,
}: AnalysisFeedbackProps) {
  return (
    <Feedback
      title={title}
      description={description}
      submitLabel={submitLabel}
      userId={userId}
      onSubmit={async ({ userId, happiness, message }) => {
        await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            locale,
            userId,
            happiness,
            message,
          }),
        });
      }}
    />
  );
}
