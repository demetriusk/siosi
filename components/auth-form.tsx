import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FaGoogle } from 'react-icons/fa'
import React from 'react'
import { useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'

export function AuthForm({
  className,
  onEmailSubmit,
  homeHref = '/',
  signInText = 'Continue',
}: React.ComponentPropsWithoutRef<'div'> & {
  onEmailSubmit?: (email: string) => Promise<void>
  homeHref?: string
  signInText?: string
}) {
  const t = useTranslations('auth')
  const pathname = usePathname?.() || ''
  const localeFromPath = pathname.split('/').filter(Boolean)[0] || 'en'

  async function handleSSO(provider: 'google') {
    try {
      const mod = await import('@/lib/supabase');
      const maybeSupabase = (mod as any).supabase ?? (mod as any).default ?? null;
      await (maybeSupabase as any)?.auth?.signInWithOAuth?.({ provider })
    } catch {
      // noop; Supabase will perform redirect
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    const email = String(fd.get('email') || '')

    if (onEmailSubmit) return onEmailSubmit(email)

    // default behaviour: call Supabase magic link
    if (!email) return
    try {
      const mod = await import('@/lib/supabase');
      const maybeSupabase = (mod as any).supabase ?? (mod as any).default ?? null;
      await (maybeSupabase as any)?.auth?.signInWithOtp?.({ email })
    } catch {
      // swallow - callers can show toasts
    }
  }

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <Card>
        <div className="flex flex-col items-center pt-6">
          <a href={homeHref} aria-label="Home" className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary">
            <div className="logo-mask w-12 h-12 mx-auto" aria-hidden="true" />
          </a>
        </div>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{t('login.title') || 'Sign in or create an account'}</CardTitle>
          <CardDescription>
            {t('magic_link.description') || 'Use Google, Facebook, or request a magic link. If you choose a magic link, we will email you a secure link — please click that link to complete sign in. If you don\'t see the email, check your spam or junk folder.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-6">
              <div className="flex flex-col gap-4">
                <Button type="button" variant="outline" className="w-full" onClick={() => handleSSO('google')}>
                  <FaGoogle className="w-4 h-4 mr-2" />
                  {t('login.sso_continue_with', { provider: 'Google' })}
                </Button>
              </div>

              <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
                <span className="relative z-10 bg-background px-2 text-muted-foreground">{t('login.or_continue_with') || 'Or continue with'}</span>
              </div>

              <div className="grid gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email">{t('login.email_label') || 'Email'}</Label>
                  <Input id="email" name="email" type="email" placeholder={t('login.email_placeholder') || 'you@example.com'} required />
                </div>
                <Button type="submit" className="w-full">{signInText}</Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary  ">
        {(() => {
            try {
              // Prefer rich text translation which allows embedding React elements safely
              return t.rich('login.terms_rich', {
                terms: (chunks: React.ReactNode) => (
                  <a href={`/${localeFromPath}/terms`} className="underline">{chunks}</a>
                ),
                privacy: (chunks: React.ReactNode) => (
                  <a href={`/${localeFromPath}/privacy`} className="underline">{chunks}</a>
                ),
              })
          } catch (e) {
            // missing translation - fall back to previous HTML or JSX
            try {
              const html = t('login.terms_html') as string | undefined
              if (html) return <div dangerouslySetInnerHTML={{ __html: html }} />
            } catch {}
          }
          return (
            <>
              By continuing, you agree to our <a href={`/${localeFromPath}` + `/terms`}>Terms of Service</a> and <a href={`/${localeFromPath}` + `/privacy`}>Privacy Policy</a>.
            </>
          )
        })()}
      </div>
    </div>
  )
}

export default AuthForm
// Empty compatibility placeholder removed during clean refactor.
// The project now imports `LoginForm` / `RegisterForm` directly.
export {}
