"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { notify as toast } from "@/lib/notify";
import { config, type Plan } from "@config";
import { Button } from "@libs/react-shared/ui/button";
import { authClientReact } from "@libs/auth/authClient";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";

type BillingCycle = "monthly" | "yearly";

const formatPrice = (amount: number) =>
  Number.isInteger(amount) ? amount.toString() : amount.toFixed(2).replace(/\.?0+$/, "");

const monthlyAmount = (plan: Plan) =>
  "months" in plan.duration && plan.duration.months === 12 ? plan.amount / 12 : plan.amount;

const monthlyCredits = (plan: Plan) => {
  const credits = plan.i18n.en.features.find((feature) => feature.toLowerCase().includes("monthly credits"));
  const match = credits?.match(/[\d,]+/);
  return match ? Number(match[0].replace(/,/g, "")) : 0;
};

export default function PricingPage() {
  const { locale: currentLocale, localizedPath } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [loading, setLoading] = useState<string | null>(null);
  const { data: session } = authClientReact.useSession();
  const user = session?.user;

  const allPlans = Object.values(config.payment.plans) as unknown as Plan[];
  const plans = allPlans.filter((plan) => {
    if (plan.id === "free") return billingCycle === "monthly";
    if (!("months" in plan.duration)) return false;
    return billingCycle === "monthly" ? plan.duration.months === 1 : plan.duration.months === 12;
  });

  const monthlyPlans = allPlans.filter(
    (plan) => "months" in plan.duration && plan.duration.months === 1 && plan.id !== "free",
  );

  const handleSubscribe = async (plan: Plan) => {
    if (plan.id === "free") return;

    if (!user) {
      router.push(`${localizedPath("/signin")}?returnTo=${encodeURIComponent(pathname)}`);
      return;
    }

    setLoading(plan.id);

    try {
      const response = await fetch("/api/payment/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id, provider: "stripe" }),
      });

      const contentType = response.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await response.json()
        : { error: await response.text() };
      if (!response.ok) throw new Error(data.error || "Failed to initiate payment");

      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast.error(error instanceof Error ? error.message : "Unable to start checkout. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-16 text-foreground sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-normal sm:text-5xl">Pricing</h1>
          <p className="mt-4 text-lg text-muted-foreground">Choose the credits plan that fits your 3D workflow.</p>

          <div className="mt-8 inline-flex rounded-xl bg-muted p-1">
            <button
              type="button"
              className={cn(
                "rounded-lg px-7 py-3 text-sm font-semibold transition",
                billingCycle === "monthly" ? "bg-background text-foreground shadow" : "text-muted-foreground",
              )}
              onClick={() => setBillingCycle("monthly")}
            >
              Monthly
            </button>
            <button
              type="button"
              className={cn(
                "rounded-lg px-7 py-3 text-sm font-semibold transition",
                billingCycle === "yearly" ? "bg-background text-foreground shadow" : "text-muted-foreground",
              )}
              onClick={() => setBillingCycle("yearly")}
            >
              Yearly <span className="ml-2 rounded-md bg-yellow-400 px-2 py-0.5 text-xs text-black">-30%</span>
            </button>
          </div>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-4">
          {plans.map((plan) => {
            const content = plan.i18n[currentLocale] || plan.i18n.en;
            const credits = monthlyCredits(plan);
            const displayMonthlyPrice = monthlyAmount(plan);
            const monthlyPeer = monthlyPlans.find((item) => item.i18n.en.name === plan.i18n.en.name);
            const crossedPrice = billingCycle === "yearly" ? monthlyAmount(monthlyPeer || plan) : null;
            const creditPrice = credits > 0 ? (displayMonthlyPrice / credits) * 100 : null;
            const isPaidPlan = plan.id !== "free";

            return (
              <article
                key={plan.id}
                className={cn(
                  "relative flex min-h-[620px] flex-col rounded-xl border border-border bg-card p-7",
                  plan.recommended && "border-primary shadow-[0_0_0_1px_hsl(var(--primary))]",
                )}
              >
                {plan.recommended && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-bold text-primary-foreground">
                    Recommended
                  </div>
                )}

                <div>
                  <h2 className="text-2xl font-bold text-primary">{content.name}</h2>
                  <p className="mt-2 min-h-12 text-sm text-muted-foreground">{content.description}</p>
                </div>

                <div className="mt-10">
                  {plan.id === "free" ? (
                    <div className="text-5xl font-bold">$0</div>
                  ) : (
                    <>
                      <div className="flex items-end gap-2">
                        {crossedPrice !== null && (
                          <span className="pb-2 text-xl text-muted-foreground line-through">
                            ${formatPrice(crossedPrice)}
                          </span>
                        )}
                        <span className="text-5xl font-bold">${formatPrice(displayMonthlyPrice)}</span>
                        <span className="pb-2 text-sm text-muted-foreground">/ month</span>
                      </div>
                      {creditPrice !== null && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          ${creditPrice.toFixed(2)} / 100 credits
                        </p>
                      )}
                    </>
                  )}
                </div>

                <Button
                  className={cn(
                    "mt-10 h-14 w-full rounded-full text-base font-extrabold transition",
                    isPaidPlan
                      ? "border-0 bg-gradient-to-r from-[#48bdff] via-[#28e4cf] to-[#00f08a] text-[#06111f] shadow-[0_18px_50px_rgba(0,240,138,0.22)] hover:scale-[1.015] hover:brightness-110"
                      : "bg-white/55 text-black/75 hover:bg-white/55",
                    plan.recommended && isPaidPlan && "shadow-[0_20px_70px_rgba(72,189,255,0.34)] ring-2 ring-[#48bdff]/35",
                  )}
                  disabled={plan.id === "free" || loading === plan.id}
                  onClick={() => handleSubscribe(plan)}
                >
                  {loading === plan.id ? <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" /> : null}
                  {plan.id === "free" ? "Current plan" : "Subscribe Now"}
                </Button>

                <ul className="mt-10 space-y-4 text-sm">
                  {content.features.map((feature) => (
                    <li key={feature} className="flex gap-3">
                      <span className="mt-0.5 shrink-0 text-primary" aria-hidden="true">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
