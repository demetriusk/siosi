
"use client";
import { Angry, Check, Frown, Laugh, Loader2, Smile } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { twMerge } from "tailwind-merge";
import { cn } from "@/utils/cn";

interface FeedbackProps {
  title: string;
  description: string;
  submitLabel?: string;
  userId?: string;
  sessionId?: string;
  locale?: string;
  onSubmit?: (data: { userId?: string; happiness: number; message?: string }) => Promise<void>;
}

const feedbackOptions = [
  { happiness: 4, emoji: <Laugh size={16} className="stroke-inherit" />, label: "Spot-on! Very happy" },
  { happiness: 3, emoji: <Smile size={16} className="stroke-inherit" />, label: "Pretty good" },
  { happiness: 2, emoji: <Frown size={16} className="stroke-inherit" />, label: "Could be better" },
  { happiness: 1, emoji: <Angry size={16} className="stroke-inherit" />, label: "Missed the mark" },
];

export const Feedback: React.FC<FeedbackProps> = ({
  title,
  description,
  submitLabel = "Send Feedback",
  userId,
  sessionId,
  locale,
}) => {
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [happiness, setHappiness] = useState<number | null>(null);
  const [isSubmitted, setSubmissionState] = useState(false);
  const [isLoading, setLoading] = useState(false);
  const [isSent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!happiness && textRef.current) {
      textRef.current.value = "";
    }
  }, [happiness]);

  useEffect(() => {
    let timeout: NodeJS.Timeout | null = null;
    let submissionStateTimeout: NodeJS.Timeout | null = null;
    if (isSent) {
      setSubmissionState(true);
      timeout = setTimeout(() => {
        setHappiness(null);
        if (textRef.current) textRef.current.value = "";
      }, 2000);
      submissionStateTimeout = setTimeout(() => {
        setSubmissionState(false);
        setSent(false);
      }, 2200);
    }
    return () => {
      if (timeout) clearTimeout(timeout);
      if (submissionStateTimeout) clearTimeout(submissionStateTimeout);
    };
  }, [isSent]);

  const handleSubmit = async () => {
    if (!happiness) return;
    setLoading(true);
    setError(null);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          locale,
          userId,
          happiness,
          message: textRef.current?.value || "",
        }),
      });
      setSent(true);
    } catch (err) {
      setError("Sorry, something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ borderRadius: "2rem" }}
      animate={happiness ? { borderRadius: "0.5rem" } : { borderRadius: "2rem" }}
      className={twMerge(
        "w-fit overflow-hidden border py-2 shadow-sm bg-white"
      )}
    >
      <span className="flex items-center justify-center gap-3 pl-4 pr-2">
        <div className="text-sm text-black">{submitLabel}</div>
        <div className="flex items-center text-neutral-400">
          {feedbackOptions.map((e) => (
            <button
              onClick={() => setHappiness((prev) => (e.happiness === prev ? null : e.happiness))}
              className={twMerge(
                happiness === e.happiness
                  ? "bg-black stroke-white"
                  : "stroke-neutral-500",
                "flex h-8 w-8 items-center justify-center rounded-full transition-all hover:bg-black hover:stroke-white"
              )}
              key={e.happiness}
              type="button"
              aria-label={e.label}
            >
              {e.emoji}
            </button>
          ))}
        </div>
      </span>
      <motion.div
        aria-hidden={happiness ? false : true}
        initial={{ height: 0, translateY: 15 }}
        className="px-2"
        transition={{ ease: "easeInOut", duration: 0.3 }}
        animate={happiness ? { height: "195px", width: "330px" } : {}}
      >
        <AnimatePresence>
          {!isSubmitted ? (
            <motion.span exit={{ opacity: 0 }} initial={{ opacity: 1 }}>
              <textarea
                id="feedback-message"
                name="feedback-message"
                ref={textRef}
                placeholder={title}
                className="min-h-[8rem] w-full resize-none rounded-md border bg-transparent p-2 text-sm placeholder-neutral-400 focus:border-neutral-400 focus:outline-0 dark:border-neutral-800 focus:dark:border-white"
              />
              <div className="flex h-fit w-full justify-end">
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className={cn(
                    "mt-1 flex h-9 items-center justify-center rounded-md border bg-neutral-950 px-2 text-sm text-white",
                    {
                      "bg-neutral-500": isLoading,
                    }
                  )}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading
                    </>
                  ) : (
                    submitLabel
                  )}
                </button>
              </div>
              {error && <div className="text-red-600 text-xs mt-2">{error}</div>}
            </motion.span>
          ) : (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="flex h-full w-full flex-col items-center justify-start gap-2 pt-9 text-sm font-normal"
            >
              <motion.div
                variants={item}
                className="flex h-8 min-h-8 w-8 min-w-8 items-center justify-center rounded-full bg-black"
              >
                <Check strokeWidth={2.5} size={16} className="stroke-white" />
              </motion.div>
              <motion.div variants={item}>Your feedback has been received!</motion.div>
              <motion.div variants={item}>Thank you for your help.</motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

const container = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      staggerChildren: 0.04,
    },
  },
};

const item = {
  hidden: { y: 10 },
  show: { y: 0 },
};
