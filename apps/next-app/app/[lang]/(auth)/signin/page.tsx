'use client';

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { SocialAuth } from "@/components/social-auth"
import { notify as toast } from "@/lib/notify"
import { authClientReact } from "@libs/auth/authClient"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@libs/react-shared/ui/card"
import { Button } from "@libs/react-shared/ui/button"
import { Input } from "@libs/react-shared/ui/input"
import { useTranslation } from "@/hooks/use-translation"

export default function LoginPage() {
  const { t, localizedPath } = useTranslation()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  async function handleEmailSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!email.trim() || !password) {
      setErrorMessage(t.auth.signin.errors.required)
      return
    }

    const params = new URLSearchParams(window.location.search)
    const returnTo = params.get("returnTo")
    const callbackURL = returnTo ? `${window.location.origin}${returnTo}` : window.location.origin

    setLoading(true)
    setErrorMessage("")

    const { error } = await authClientReact.signIn.email({
      email: email.trim(),
      password,
      callbackURL,
      rememberMe,
    })

    setLoading(false)

    if (error) {
      setErrorMessage(error.message || t.auth.signin.errors.invalidCredentials)
      return
    }

    toast.success(t.auth.signin.success)
    router.push(returnTo || localizedPath("/"))
    router.refresh()
  }

  return (
    <Card className="w-[420px] max-w-[calc(100vw-2rem)]">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">{t.auth.signin.welcomeBack}</CardTitle>
        <CardDescription>
          {t.auth.signin.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <SocialAuth />
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          <span>{t.auth.signin.orContinueWith}</span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <form onSubmit={handleEmailSignIn} className="flex flex-col gap-4">
          {errorMessage ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}
          <div className="grid gap-2">
            <label htmlFor="signin-email" className="text-sm font-semibold">
              {t.auth.signin.email}
            </label>
            <Input
              id="signin-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t.auth.signin.emailPlaceholder}
              autoComplete="email"
              required
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="signin-password" className="text-sm font-semibold">
              {t.auth.signin.password}
            </label>
            <Input
              id="signin-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-4 w-4 rounded border border-border bg-background"
            />
            {t.auth.signin.rememberMe}
          </label>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t.auth.signin.submitting : t.auth.signin.submit}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {t.auth.signin.noAccount}{" "}
            <Link href={localizedPath("/signup")} className="font-semibold text-primary underline-offset-4 hover:underline">
              {t.auth.signin.signupLink}
            </Link>
          </p>
        </form>
        <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
          {t.auth.signin.termsNotice} <a href="#">{t.auth.signin.termsOfService}</a>{" "}
          {t.common.and} <a href="#">{t.auth.signin.privacyPolicy}</a>.
        </div>
      </CardContent>
    </Card>
  )
}
