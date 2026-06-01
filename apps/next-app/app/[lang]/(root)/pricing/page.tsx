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

export default function PricingPage() {
  const { locale: currentLocale, localizedPath, t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [loading, setLoading] = useState<string | null>(null);
  const { data: session } = authClientReact.useSession();
  const user = session?.user;

  const allPlans = Object.values(config.payment.plans) as unknown as Plan[];
  const visiblePlans = allPlans.filter((plan) => plan.showInPricing !== false);
  const plans = visiblePlans.filter((plan) => {
    if (plan.id === "free") return true;
    if (!("months" in plan.duration)) return false;
    return billingCycle === "monthly" ? plan.duration.months === 1 : plan.duration.months === 12;
  });

  const monthlyPlans = visiblePlans.filter(
    (plan) => "months" in plan.duration && plan.duration.months === 1 && plan.id !== "free",
  );

  const handleContactSales = () => {
    const maximizeChat = window.Tawk_API?.maximize;
    if (typeof maximizeChat === "function") {
      maximizeChat();
      return;
    }

    toast.info(t.pricing.contactPlan.chatUnavailable);
  };

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
              Yearly <span className="ml-2 rounded-md bg-yellow-400 px-2 py-0.5 text-xs text-black">{t.pricing.yearlyDiscountBadge}</span>
            </button>
          </div>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-4">
          {plans.map((plan) => {
            const content = plan.i18n[currentLocale] || plan.i18n.en;
            const displayMonthlyPrice = monthlyAmount(plan);
            const billedYearlyPrice =
              "months" in plan.duration && plan.duration.months === 12 ? plan.amount : displayMonthlyPrice * 12;
            const monthlyPeer = monthlyPlans.find((item) => item.i18n.en.name === plan.i18n.en.name);
            const crossedPrice = billingCycle === "yearly" ? monthlyAmount(monthlyPeer || plan) : null;
            const isPaidPlan = plan.id !== "free";

            return (
              <article
                key={plan.id}
                className="relative flex min-h-[620px] flex-col rounded-xl border border-border bg-card p-7"
              >
                <div>
                  <h2 className="text-2xl font-bold text-primary">{content.name}</h2>
                  <p className="mt-2 min-h-12 text-sm text-muted-foreground">{content.description}</p>
                </div>

                <div className="mt-10">
                  {plan.id === "free" ? (
                    <div className="flex items-start gap-1">
                      <span className="pt-2 text-xl font-semibold text-foreground/72">$</span>
                      <span className="text-5xl font-bold">0</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-end gap-2">
                        {crossedPrice !== null && (
                          <span className="flex items-start gap-0.5 pb-2 text-muted-foreground line-through">
                            <span className="pt-1 text-sm font-semibold">$</span>
                            <span className="text-xl">{formatPrice(crossedPrice)}</span>
                          </span>
                        )}
                        <span className="flex items-start gap-1">
                          <span className="pt-2 text-xl font-semibold text-foreground/72">$</span>
                          <span className="text-5xl font-bold">{formatPrice(displayMonthlyPrice)}</span>
                        </span>
                        <span className="pb-2 text-sm text-muted-foreground">/ month</span>
                      </div>
                      {billingCycle === "yearly" ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {t.pricing.billedYearly.replace("{amount}", formatPrice(billedYearlyPrice))}
                        </p>
                      ) : null}
                    </>
                  )}
                </div>

                <Button
                  className={cn(
                    "mt-10 h-14 w-full rounded-full text-base font-extrabold transition",
                    isPaidPlan
                      ? "border-0 bg-gradient-to-r from-[#48bdff] via-[#28e4cf] to-[#00f08a] text-[#06111f] shadow-[0_18px_50px_rgba(0,240,138,0.22)] hover:scale-[1.015] hover:brightness-110"
                      : "border border-white/20 bg-[linear-gradient(180deg,#6c727e,#535864)] text-white shadow-[0_14px_36px_rgba(255,255,255,0.08)] ring-2 ring-white/10 disabled:cursor-default disabled:opacity-100",
                  )}
                  disabled={plan.id === "free" || loading === plan.id}
                  onClick={() => handleSubscribe(plan)}
                >
                  {loading === plan.id ? <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" /> : null}
                  {plan.id === "free" ? (
                    <>
                      <span
                        aria-hidden="true"
                        className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/16 text-sm"
                      >
                        ✓
                      </span>
                      Current plan
                    </>
                  ) : "Subscribe Now"}
                </Button>

                <ul className="mt-10 space-y-4 text-sm">
                  {plan.id === "free" ? (
                    <li className="flex gap-3 text-sm font-medium leading-6 text-primary">
                      <span className="mt-0.5 shrink-0 text-primary" aria-hidden="true">✓</span>
                      <span>{t.pricing.freeTrialNotice}</span>
                    </li>
                  ) : null}
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

          <article className="relative flex min-h-[620px] flex-col rounded-xl border border-yellow-400/35 bg-card p-7 shadow-[0_22px_80px_rgba(255,205,0,0.08)]">
            <div>
              <h2 className="text-2xl font-bold text-yellow-300">{t.pricing.contactPlan.name}</h2>
              <p className="mt-2 min-h-12 text-sm text-muted-foreground">{t.pricing.contactPlan.description}</p>
            </div>

            <div className="mt-10">
              <p className="text-5xl font-bold">{t.pricing.contactPlan.price}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t.pricing.contactPlan.priceNote}</p>
            </div>

            <Button
              className="mt-10 h-14 w-full rounded-full border-0 bg-yellow-400 text-base font-extrabold text-black shadow-[0_18px_50px_rgba(250,204,21,0.2)] transition hover:scale-[1.015] hover:bg-yellow-300"
              onClick={handleContactSales}
            >
              {t.pricing.contactPlan.button}
            </Button>

            <ul className="mt-10 space-y-4 text-sm">
              {t.pricing.contactPlan.features.map((feature: string) => (
                <li key={feature} className="flex gap-3">
                  <span className="mt-0.5 shrink-0 text-yellow-300" aria-hidden="true">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>
    </main>
  );
}
