import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuthForm } from '@/hooks/useAuthForm'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { FaApple, FaFacebookF, FaGoogle } from 'react-icons/fa'

export function RegisterForm({
  className,
  onFormSubmit,
  signInHref = '#',
  homeHref = '/',
  ...props
}: React.ComponentPropsWithoutRef<"div"> & {
  onFormSubmit?: (e: React.FormEvent<HTMLFormElement>) => void
  signInHref?: string
  homeHref?: string
}) {
  const { errors, validateRegister } = useAuthForm()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget as HTMLFormElement
    const fd = new FormData(form)
    const email = String(fd.get('email') || '')
    const password = String(fd.get('password') || '')

    if (!validateRegister({ email, password })) {
      e.preventDefault()
      return
    }

    if (onFormSubmit) return onFormSubmit(e)
  }

  async function handleSSO(provider: 'google' | 'apple' | 'facebook') {
    try {
      await (supabase as any).auth.signInWithOAuth({ provider })
    } catch (err) {
      // no-op
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <div className="flex flex-col items-center pt-6">
          <a href={homeHref} aria-label="Home">
            <Image src="/siosi-emblem.min.svg" alt="siOsi" width={48} height={48} className="w-12 h-12 mx-auto" />
          </a>
        </div>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Create your account</CardTitle>
          <CardDescription>
            Create an account to save sessions and get personalized recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-6">
              <div className="flex flex-col gap-4">
                <Button type="button" variant="outline" className="w-full" onClick={() => handleSSO('apple')}>
                  <FaApple className="w-4 h-4 mr-2" />
                  Continue with Apple
                </Button>
                <Button variant="outline" className="w-full" onClick={() => handleSSO('google')}>
                  <FaGoogle className="w-4 h-4 mr-2" />
                  Continue with Google
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={() => handleSSO('facebook')}>
                  <FaFacebookF className="w-4 h-4 mr-2" />
                  Continue with Facebook
                </Button>
              </div>

              <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
                <span className="relative z-10 bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>

              <div className="grid gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" placeholder="m@example.com" required />
                  {errors.email ? <p className="text-sm text-red-600">{errors.email}</p> : null}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" name="password" type="password" required />
                  {errors.password ? <p className="text-sm text-red-600">{errors.password}</p> : null}
                </div>
                <Button type="submit" className="w-full">
                  Create account
                </Button>
              </div>

              <div className="text-center text-sm">
                Already have an account? <Link href={signInHref} className="underline underline-offset-4">Sign in</Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary  ">
        By creating an account, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  )
}
