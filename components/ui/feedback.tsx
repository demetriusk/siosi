"use client";
import React, { useState } from 'react';


interface FeedbackProps {
  title: string;
  description: string;
  submitLabel?: string;
  userId?: string;
  onSubmit: (data: { userId?: string; happiness: string; message?: string }) => Promise<void>;
}

const happinessOptions = [
  { value: 'happy', label: 'Spot-on! Very happy' },
  { value: 'neutral', label: "It's okay, but could be better" },
  { value: 'unhappy', label: 'Missed the mark' },
];

export const Feedback: React.FC<FeedbackProps> = ({
  title,
  description,
  submitLabel = 'Send Feedback',
  userId,
  onSubmit,
}) => {
  const [happiness, setHappiness] = useState('happy');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await onSubmit({ userId, happiness, message });
      setSuccess(true);
      setMessage('');
      setHappiness('happy');
    } catch (err) {
      setError('Sorry, something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto rounded-lg bg-white shadow p-6">
      <h3 className="mb-2 text-lg font-semibold text-[#0A0A0A]">{title}</h3>
      <p className="mb-4 text-sm text-[#6B7280]">{description}</p>
      {success ? (
        <div className="text-green-600 text-sm mb-2">Thank you for your feedback!</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">How did you feel about the results?</label>
            <div className="flex gap-2">
              {happinessOptions.map((opt) => (
                <label key={opt.value} className="flex items-center gap-1 text-sm">
                  <input
                    type="radio"
                    name="happiness"
                    value={opt.value}
                    checked={happiness === opt.value}
                    onChange={() => setHappiness(opt.value)}
                    className="accent-[#111827]"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="feedback-message" className="block text-xs font-medium text-[#374151] mb-1">
              Anything else you'd like to share? (optional)
            </label>
            <textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-blue-200"
              rows={3}
              placeholder="Tell us what was accurate, what missed, or any thoughts!"
            />
          </div>
          {error && <div className="text-red-600 text-xs">{error}</div>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-[#111827] text-white py-2 font-semibold hover:bg-[#0A0A0A] transition"
          >
            {submitting ? 'Sending...' : submitLabel}
          </button>
        </form>
      )}
    </div>
  );
};
