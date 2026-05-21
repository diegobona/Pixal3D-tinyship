"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@libs/react-shared/ui/button";
import { useTranslation } from "@/hooks/use-translation";

function PaymentSuccessContent() {
  const { t, localizedPath } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      router.replace("/");
      return;
    }

    async function verifySession() {
      try {
        const response = await fetch(`/api/payment/verify/stripe?session_id=${sessionId}`);
        if (!response.ok) throw new Error("Invalid Stripe session");
        await response.json();
        setIsValid(true);
      } catch (error) {
        console.error("Session verification failed:", error);
        router.replace("/pricing");
      } finally {
        setIsVerifying(false);
      }
    }

    verifySession();
  }, [router, sessionId]);

  if (isVerifying) {
    return (
      <div className="container max-w-2xl py-20">
        <div className="flex flex-col items-center space-y-6 text-center">
          <span className="h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
          <p className="text-muted-foreground">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  if (!isValid) return null;

  return (
    <div className="container max-w-2xl py-20">
      <div className="flex flex-col items-center space-y-6 text-center">
        <div className="rounded-full bg-green-100 p-3">
          <span className="flex h-12 w-12 items-center justify-center text-3xl font-bold text-green-600" aria-hidden="true">✓</span>
        </div>
        <h1 className="text-3xl font-bold">{t.payment.result.success.title}</h1>
        <p className="text-muted-foreground">{t.payment.result.success.description}</p>
        <div className="flex flex-col gap-4 pt-6 sm:flex-row">
          <Button asChild>
            <Link href={localizedPath("/dashboard")}>{t.payment.result.success.actions.viewDashboard}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={localizedPath("/")}>{t.payment.result.success.actions.backToHome}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="container max-w-2xl py-20">
      <div className="flex flex-col items-center space-y-6 text-center">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
