export function validateEmail(value: string): string | null {
  if (!value) return 'Email is required'
  const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\\.,;:\s@\"]+\.)+[^<>()[\]\\.,;:\s@\"]{2,})$/i
  return re.test(value) ? null : 'Enter a valid email'
}

export function validatePassword(value: string): string | null {
  if (!value) return 'Password is required'
  if (value.length < 8) return 'Password must be at least 8 characters'
  return null
}

export function validateName(value: string): string | null {
  if (!value) return 'Full name is required'
  if (value.trim().length < 2) return 'Provide your full name'
  return null
}
