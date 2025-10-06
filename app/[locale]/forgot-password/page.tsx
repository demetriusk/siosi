'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { useAuthForm } from '@/hooks/useAuthForm'
import { validateEmail } from '@/lib/validators'

export default function ForgotPasswordPage() {
  const params = useParams();
  const locale = (params as any)?.locale as string;
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const { errors, validateLogin } = useAuthForm()

  async function handleReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget as HTMLFormElement
    const fd = new FormData(form)
    const email = String(fd.get('email') || '')

    if (!validateEmail(email)) {
      toast.error('Please enter a valid email')
      return
    }

    const { error } = await (supabase as any).auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
    if (error) {
      toast.error(error.message || 'Reset failed')
    } else {
      toast.success('Reset link sent — check your email')
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] p-4">
      <div className="w-full max-w-md">
        <Card>
          <div className="flex flex-col items-center pt-6">
            <a href={`/${locale}`} aria-label="Home">
              <img src="/siosi-emblem.min.svg" alt="siOsi" className="w-12 h-12 mx-auto" />
            </a>
          </div>
          <CardHeader>
            <CardTitle>Reset your password</CardTitle>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4">
                <p>Check your email for a reset link.</p>
                <div className="text-center text-sm">
                  <a href={`/${locale}/login`} className="underline underline-offset-4">Back to sign in</a>
                </div>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" />
                  {errors.email ? <p className="text-sm text-red-600">{errors.email}</p> : null}
                </div>
                <div className="flex items-center justify-end">
                  <Button type="submit" className="bg-[#0A0A0A] text-white">Send reset link</Button>
                </div>
                <div className="text-center text-sm">
                  <a href={`/${locale}/login`} className="underline underline-offset-4">Back to sign in</a>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

