'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '@/components/siosi/header';
import { Footer } from '@/components/siosi/footer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Turnstile } from '@marsidev/react-turnstile';

const SUPPORT_TOPICS = [
  'I have a question about my analysis results',
  'The app is not working correctly',
  'I want to delete my account',
  'I have a billing question',
  'I have a feature suggestion',
  'Other issue',
];

export default function SupportPage() {
  const params = useParams();
  const locale = (params as any)?.locale ?? 'en';

  const [userId, setUserId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const captchaRequired = Boolean(turnstileSiteKey);

  useEffect(() => {
    let mounted = true;

    async function check() {
      try {
        const mod = await import('@/lib/supabase');
        const maybeSupabase = (mod as any).supabase ?? (mod as any).default ?? null;
        let uid: string | undefined;
        if (typeof (maybeSupabase as any)?.auth?.getUser === 'function') {
          const res = await (maybeSupabase as any)?.auth?.getUser?.();
          uid = res?.data?.user?.id;
        } else if (typeof (maybeSupabase as any)?.auth?.user === 'function') {
          const u = (maybeSupabase as any)?.auth?.user?.();
          uid = u?.id;
        }

        if (!mounted) return;
        setUserId(uid || null);
      } catch {
        setUserId(null);
      } finally {
        if (mounted) setChecking(false);
      }
    }

    check();
    return () => {
      mounted = false;
    };
  }, []);

  const handleChipClick = (topic: string) => {
    setMessage((prev) => {
      if (prev.trim()) {
        return prev + '\n\n' + topic;
      }
      return topic;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    if (!userId && !email.trim()) {
      toast.error('Please enter your email');
      return;
    }

    if (captchaRequired && !captchaToken) {
      toast.error('Please complete the security check');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          email: userId ? undefined : email.trim(),
          userId: userId || undefined,
          turnstileToken: captchaRequired ? captchaToken : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send message');
      }

      toast.success('Message sent! siOsi will get back to you soon.');
      setMessage('');
      setEmail('');
      if (captchaRequired) {
        setCaptchaToken(null);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message');
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header locale={locale} />
      <main className="flex-1 bg-[#F9FAFB] py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white border border-[#E5E7EB] rounded-sm p-8">
            <h1 className="text-2xl font-semibold text-[#0A0A0A] mb-2">Contact Support</h1>
            <p className="text-[#6B7280] mb-8">
              Have a question or issue? We're here to help. Select a topic below or describe your problem.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {!userId && (
                <div className="space-y-2">
                  <Label htmlFor="email">Your Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required={!userId}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Quick Topics</Label>
                <div className="flex flex-wrap gap-2">
                  {SUPPORT_TOPICS.map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => handleChipClick(topic)}
                      className="px-3 py-1.5 text-sm border border-[#E5E7EB] rounded-sm bg-white text-[#0A0A0A] hover:border-[#0A0A0A] hover:bg-[#F9FAFB] transition-colors"
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Your Message</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue or question..."
                  className="min-h-[200px]"
                  required
                />
              </div>

              {turnstileSiteKey && (
                <div>
                  <Turnstile
                    siteKey={turnstileSiteKey}
                    onSuccess={(token) => setCaptchaToken(token)}
                    onError={() => setCaptchaToken(null)}
                    onExpire={() => setCaptchaToken(null)}
                  />
                </div>
              )}

              <Button
                type="submit"
                disabled={submitting || (captchaRequired && !captchaToken)}
                className="bg-[#0A0A0A] text-white hover:bg-[#111827]"
              >
                {submitting ? 'Sending...' : 'Send Message'}
              </Button>
            </form>
          </div>
        </div>
      </main>
      <Footer locale={locale} />
    </div>
  );
}