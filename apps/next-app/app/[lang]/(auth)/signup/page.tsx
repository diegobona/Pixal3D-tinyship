'use client';

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { notify as toast } from "@/lib/notify"
import { authClientReact } from "@libs/auth/authClient"
import { Button } from "@libs/react-shared/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@libs/react-shared/ui/card"
import { Input } from "@libs/react-shared/ui/input"
import { useTranslation } from "@/hooks/use-translation"

export default function SignupPage() {
  const { t, localizedPath } = useTranslation()
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  async function handleSignUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!name.trim() || !email.trim() || !password) {
      setErrorMessage(t.auth.signup.errors.required)
      return
    }

    if (password.length < 8) {
      setErrorMessage(t.auth.signup.errors.passwordTooShort)
      return
    }

    const params = new URLSearchParams(window.location.search)
    const returnTo = params.get("returnTo")

    setLoading(true)
    setErrorMessage("")

    const { error } = await authClientReact.signUp.email({
      email: email.trim(),
      password,
      name: name.trim(),
    })

    setLoading(false)

    if (error) {
      setErrorMessage(error.message || t.common.unexpectedError)
      return
    }

    toast.success(t.auth.signup.success)
    router.push(returnTo || localizedPath("/"))
    router.refresh()
  }

  return (
    <Card className="w-[420px] max-w-[calc(100vw-2rem)]">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">{t.auth.signup.title}</CardTitle>
        <CardDescription>{t.auth.signup.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <form onSubmit={handleSignUp} className="flex flex-col gap-4">
          {errorMessage ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}
          <div className="grid gap-2">
            <label htmlFor="signup-name" className="text-sm font-semibold">
              {t.auth.signup.name}
            </label>
            <Input
              id="signup-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t.auth.signup.namePlaceholder}
              autoComplete="name"
              required
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="signup-email" className="text-sm font-semibold">
              {t.auth.signup.email}
            </label>
            <Input
              id="signup-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t.auth.signup.emailPlaceholder}
              autoComplete="email"
              required
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="signup-password" className="text-sm font-semibold">
              {t.auth.signup.password}
            </label>
            <Input
              id="signup-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t.auth.signup.passwordPlaceholder}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t.auth.signup.submitting : t.auth.signup.submit}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {t.auth.signup.haveAccount}{" "}
            <Link href={localizedPath("/signin")} className="font-semibold text-primary underline-offset-4 hover:underline">
              {t.auth.signup.signinLink}
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
