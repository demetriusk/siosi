"use client"

import React, { Suspense, useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { AuthForm } from '@/components/auth-form'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

function AuthPageContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const locale = (params as any)?.locale as string

  const [emailRequested, setEmailRequested] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState<number>(0)
  const [resentFlash, setResentFlash] = useState<boolean>(false)
  const t = useTranslations('auth')

  async function handleEmail(email: string) {
    if (!email) return
      try {
        // Try to sign up first (no-op if user exists) then send magic link
        try {
          const mod = await import('@/lib/supabase');
          const maybeSupabase = (mod as any).supabase ?? (mod as any).default ?? null;
          await (maybeSupabase as any)?.auth?.signUp?.({ email })
        } catch {
          // ignore signUp errors; we'll try signInWithOtp next
        }

        const mod2 = await import('@/lib/supabase');
        const maybeSupabase2 = (mod2 as any).supabase ?? (mod2 as any).default ?? null;
        const { error } = await (maybeSupabase2 as any)?.auth?.signInWithOtp?.({ email }) ?? { error: undefined }
        if (error) throw error
  setEmailRequested(email)
  setResendCooldown(60)
  // Inform the user via toast as well as the inline banner
  toast(t('magic_link.sent'))
    } catch (err: any) {
  toast.error(err?.message || t('magic_link.error'))
    }
  }

  // Show a toast when redirected from logout
  useEffect(() => {
    const loggedOut = searchParams?.get('loggedOut')
    if (loggedOut) {
      toast.success('Logged out')
      // Clean the URL (drop the query param) to avoid repeated toasts on refresh
      try {
        router.replace(`/${locale}/auth`)
      } catch {}
    }
  }, [locale, router, searchParams])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [resendCooldown])

  async function handleResend() {
    if (!emailRequested) return
    if (resendCooldown > 0) {
  toast.error(t('magic_link.resend_wait', { seconds: resendCooldown }))
      return
    }
    try {
      const mod = await import('@/lib/supabase');
      const maybeSupabase = (mod as any).supabase ?? (mod as any).default ?? null;
      const { error } = await (maybeSupabase as any)?.auth?.signInWithOtp?.({ email: emailRequested }) ?? { error: undefined }
      if (error) throw error
      setResendCooldown(60)
  toast(t('magic_link.sent'))
      // brief visual confirmation on the banner
      setResentFlash(true)
      setTimeout(() => setResentFlash(false), 1400)
    } catch (err: any) {
  toast.error(err?.message || t('magic_link.resend_error'))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] p-6">
      <div className="w-full max-w-md">
        <div className="space-y-4">
          <AuthForm
            onEmailSubmit={handleEmail}
            homeHref={`/${locale}`}
            signInText={'Continue'}
          />

          {/* Inline confirmation banner shown after requesting magic link */}
          {emailRequested && (
            <div className={"rounded-md border border-border bg-white p-4 text-sm shadow-sm transition-all duration-300 " + (resentFlash ? 'ring-2 ring-success/40 bg-success/5' : '')}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <strong className="block">{t('magic_link.sent')}</strong>
                    {resentFlash && <span className="text-xs text-success font-medium animate-pulse">{t('magic_link.resent_badge') || 'Resent'}</span>}
                  </div>
                  <div className="text-muted-foreground">{t('magic_link.sent_details', { email: emailRequested })}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button
                    className="text-sm text-primary underline disabled:opacity-50"
                    onClick={handleResend}
                    disabled={resendCooldown > 0}
                  >
                    {resendCooldown > 0 ? `${t('magic_link.resend')} (${resendCooldown}s)` : t('magic_link.resend')}
                  </button>
                  <button
                    className="text-sm text-muted-foreground underline"
                    onClick={() => setEmailRequested(null)}
                  >
                    {t('magic_link.dismiss')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] p-6">
          <div className="w-full max-w-md text-center text-sm text-muted-foreground">
            Loading…
          </div>
        </div>
      }
    >
      <AuthPageContent />
    </Suspense>
  )
}
