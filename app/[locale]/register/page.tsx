"use client"

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { RegisterForm } from '@/components/register-form'
import { toast } from 'sonner'

export default function RegisterPage() {
  const params = useParams()
  const locale = (params as any)?.locale as string
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRegister(e: any) {
    e.preventDefault()
    setLoading(true)
    const form = e.currentTarget as HTMLFormElement
    const fd = new FormData(form)
    const name = String(fd.get('name') || '')
    const email = String(fd.get('email') || '')
    const password = String(fd.get('password') || '')

    if (!email || !password) {
      toast.error('Please provide email and password')
      setLoading(false)
      return
    }
    try {
      const { error } = await (supabase as any).auth.signUp({ email, password })
      if (error) throw error
      toast.success('Account created \u2014 check your email if confirmation is required')
      router.push(`/${locale}/sessions`)
    } catch (err: any) {
      toast.error(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] p-6">
      <div className="w-full max-w-md">
        <div className="space-y-4">
          <RegisterForm onFormSubmit={handleRegister} signInHref={`/${locale}/login`} homeHref={`/${locale}`} />
        </div>
      </div>
    </div>
  )
}
