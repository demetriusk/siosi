"use client"

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { LoginForm } from '@/components/login-form'
import { toast } from 'sonner'

export default function LoginPage() {
  const params = useParams()
  const locale = (params as any)?.locale as string
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleEmailSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = e.currentTarget as HTMLFormElement
    const formData = new FormData(form)
    const email = String(formData.get('email') || '')
    const password = String(formData.get('password') || '')

    if (!email || !password) {
      toast.error('Please enter both email and password')
      setLoading(false)
      return
    }
    try {
      const { error } = await (supabase as any).auth.signInWithPassword({ email, password })
      if (error) throw error
      toast.success('Signed in')
      router.push(`/${locale}/sessions`)
    } catch (err: any) {
      toast.error(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] p-6">
      <div className="w-full max-w-md">
        <div className="space-y-4">
          <LoginForm onFormSubmit={handleEmailSignIn} signUpHref={`/${locale}/register`} homeHref={`/${locale}`} forgotHref={`/${locale}/forgot-password`} />
        </div>
      </div>
    </div>
  )
}
