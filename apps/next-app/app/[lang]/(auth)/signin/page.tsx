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
    <Card className="w-[420px] max-w-[calc(100vw-2rem)] border border-white/10 bg-[linear-gradient(180deg,rgba(11,20,43,0.88),rgba(7,13,32,0.96))] text-[#f5f8ff] shadow-[0_24px_90px_rgba(0,0,0,0.36),0_0_0_1px_rgba(72,189,255,0.06)] backdrop-blur">
      <CardHeader className="text-center">
        <CardTitle className="text-xl text-white">{t.auth.signin.welcomeBack}</CardTitle>
        <CardDescription className="text-[#aeb8cf]">
          {t.auth.signin.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <SocialAuth buttonClassName="h-10 border-white/10 bg-[#0d1730]/78 text-[#f5f8ff] shadow-none hover:border-[#48bdff]/55 hover:bg-[#14213e] hover:text-white" />
        <div className="flex items-center gap-3 text-xs text-[#8996b2]">
          <span className="h-px flex-1 bg-white/10" />
          <span>{t.auth.signin.orContinueWith}</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>
        <form onSubmit={handleEmailSignIn} className="flex flex-col gap-4">
          {errorMessage ? (
            <div className="rounded-md border border-[#ff6b6b]/45 bg-[#220f1d]/72 px-3 py-2 text-sm font-semibold text-[#ffb8b8]">
              {errorMessage}
            </div>
          ) : null}
          <div className="grid gap-2">
            <label htmlFor="signin-email" className="text-sm font-semibold text-[#edf3ff]">
              {t.auth.signin.email}
            </label>
            <Input
              id="signin-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t.auth.signin.emailPlaceholder}
              autoComplete="email"
              className="h-11 rounded-lg border-white/10 bg-[#0d1730]/82 text-base font-medium text-white shadow-none placeholder:text-[#667493] focus-visible:border-[#48bdff] focus-visible:ring-[#48bdff]/20"
              required
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="signin-password" className="text-sm font-semibold text-[#edf3ff]">
              {t.auth.signin.password}
            </label>
            <Input
              id="signin-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className="h-11 rounded-lg border-white/10 bg-[#0d1730]/82 text-base font-medium text-white shadow-none placeholder:text-[#667493] focus-visible:border-[#48bdff] focus-visible:ring-[#48bdff]/20"
              required
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-[#dbe6ff]">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-4 w-4 rounded border border-white/15 bg-[#0d1730] accent-[#48bdff]"
            />
            {t.auth.signin.rememberMe}
          </label>
          <Button type="submit" className="h-11 w-full rounded-full bg-gradient-to-r from-[#48bdff] to-[#00f08a] text-base font-extrabold text-[#051021] shadow-[0_18px_52px_rgba(0,240,138,0.2)] hover:brightness-110 disabled:opacity-55" disabled={loading}>
            {loading ? t.auth.signin.submitting : t.auth.signin.submit}
          </Button>
          <p className="text-center text-sm text-[#aeb8cf]">
            {t.auth.signin.noAccount}{" "}
            <Link href={localizedPath("/signup")} className="font-semibold text-[#77e8ff] underline-offset-4 hover:text-white hover:underline">
              {t.auth.signin.signupLink}
            </Link>
          </p>
        </form>
        <div className="text-center text-xs text-balance text-[#8996b2] *:[a]:underline *:[a]:underline-offset-4 *:[a]:hover:text-[#77e8ff]">
          {t.auth.signin.termsNotice} <a href="#">{t.auth.signin.termsOfService}</a>{" "}
          {t.common.and} <a href="#">{t.auth.signin.privacyPolicy}</a>.
        </div>
      </CardContent>
    </Card>
  )
}
