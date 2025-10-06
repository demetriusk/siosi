import { useState } from 'react'
import { validateEmail, validatePassword, validateName } from '@/lib/validators'

export function useAuthForm() {
  const [errors, setErrors] = useState<Record<string, string | null>>({})

  function validateLogin(fields: { email?: string; password?: string }) {
    const e: Record<string, string | null> = {}
    e.email = validateEmail(fields.email || '')
    e.password = validatePassword(fields.password || '')
    setErrors(e)
    return !e.email && !e.password
  }

  function validateRegister(fields: { name?: string; email?: string; password?: string }) {
    const e: Record<string, string | null> = {}
    // name is optional now
    e.name = fields.name !== undefined ? validateName(fields.name || '') : null
    e.email = validateEmail(fields.email || '')
    e.password = validatePassword(fields.password || '')
    setErrors(e)
    return !e.email && !e.password
  }

  return { errors, validateLogin, validateRegister, setErrors }
}
