import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { auth } from "@libs/auth";
import { config } from "@config";
import { db } from "@libs/database";
import { order } from "@libs/database/schema/order";
import { subscription, subscriptionStatus } from "@libs/database/schema/subscription";
import { user as userTable } from "@libs/database/schema/user";
import { translations } from "@libs/i18n";
import { syncStripeSubscriptionFromStripe } from "@libs/payment/stripe-subscription-sync";
import { PIXAL3D_SHOW_USER_LIBRARY_SURFACES } from "@/lib/pixal3d-surface-visibility";

type PlanContent = {
  name: string;
  description: string;
  duration: string;
  features: readonly string[];
};

function localizedPath(path: string, locale: string) {
  return locale === config.app.i18n.defaultLocale ? path : `/${locale}${path}`;
}

function formatDate(value: Date | string | null | undefined, locale: string) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString(locale === "zh-CN" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(amount: string | number, currency: string) {
  const value = typeof amount === "number" ? amount : Number.parseFloat(amount);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(Number.isFinite(value) ? value : 0);
}

function getPlanContent(planId: string, locale: string): PlanContent {
  const plan = config.payment.plans[planId as keyof typeof config.payment.plans];
  const i18n = plan?.i18n as unknown as Record<string, PlanContent> | undefined;

  return i18n?.[locale] || i18n?.en || {
    name: planId || "Free",
    description: "",
    duration: "month",
    features: [],
  };
}

function getBillingCycle(planId: string, locale: string) {
  const plan = config.payment.plans[planId as keyof typeof config.payment.plans];
  if (!plan || !("months" in plan.duration)) return "-";
  if (plan.duration.months === 12) return locale === "zh-CN" ? "Yearly" : "Yearly";
  return locale === "zh-CN" ? "Monthly" : "Monthly";
}

function parseMetadata(metadata: string | null) {
  if (!metadata) return {};
  try {
    return JSON.parse(metadata) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function getPlanStatus(
  currentSubscription: typeof subscription.$inferSelect | null | undefined,
  now: Date,
  t: typeof translations.en.dashboard
) {
  if (!currentSubscription) {
    return {
      label: t.subscription.free,
      className: "border-[#48bdff]/35 bg-[#102848] text-[#48bdff]",
    };
  }

  if (currentSubscription.status === subscriptionStatus.CANCELED) {
    return {
      label: t.subscription.canceled,
      className: "border-[#ff8c5f]/35 bg-[#332018] text-[#ffb38f]",
    };
  }

  if (currentSubscription.status === subscriptionStatus.EXPIRED || currentSubscription.periodEnd < now) {
    return {
      label: t.subscription.expired,
      className: "border-white/20 bg-white/[0.06] text-white/65",
    };
  }

  if (currentSubscription.cancelAtPeriodEnd) {
    return {
      label: t.subscription.cancelAtPeriodEnd,
      className: "border-[#ffc24d]/35 bg-[#352809] text-[#ffd37a]",
    };
  }

  return {
    label: t.subscription.active,
    className: "border-[#1de9a6]/40 bg-[#0b312d] text-[#1de9a6]",
  };
}

export default async function DashboardPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;

  if (!PIXAL3D_SHOW_USER_LIBRARY_SURFACES) {
    redirect(localizedPath("/", lang));
  }

  const locale = lang as keyof typeof translations;
  const t = translations[locale]?.dashboard || translations.en.dashboard;
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    redirect(localizedPath("/signin", lang));
  }

  const userId = session.user.id;
  const now = new Date();

  const [account] = await db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      image: userTable.image,
      creditBalance: userTable.creditBalance,
      createdAt: userTable.createdAt,
    })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  const [storedSubscription] = await db
    .select()
    .from(subscription)
    .where(eq(subscription.userId, userId))
    .orderBy(desc(subscription.createdAt))
    .limit(1);

  const syncedSubscription = storedSubscription?.stripeSubscriptionId
    ? await syncStripeSubscriptionFromStripe(storedSubscription.stripeSubscriptionId)
    : null;
  const currentSubscription = syncedSubscription || storedSubscription || null;

  const recentOrders = await db
    .select()
    .from(order)
    .where(eq(order.userId, userId))
    .orderBy(desc(order.createdAt))
    .limit(5);

  const planId = currentSubscription?.planId || "free";
  const plan = getPlanContent(planId, lang);
  const metadata = parseMetadata(currentSubscription?.metadata || null);
  const isLifetime = metadata.isLifetime === true;
  const creditBalance = Number.parseFloat(account?.creditBalance || "0") || 0;
  const planStatus = getPlanStatus(currentSubscription, now, t);

  return (
    <main className="min-h-screen bg-[#06132e] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#48bdff]">{t.eyebrow}</p>
            <h1 className="mt-3 text-3xl font-bold tracking-normal sm:text-4xl">{t.title}</h1>
            <p className="mt-2 text-base text-white/65">{t.description}</p>
          </div>
          <Link
            href={localizedPath("/pricing", lang)}
            className="inline-flex items-center justify-center rounded-full bg-[#48bdff] px-5 py-2 text-sm font-bold text-[#04101e] transition hover:bg-[#72ceff]"
          >
            {t.actions.managePlan}
          </Link>
        </div>

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-xl border border-[#263653] bg-[#0a1530] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/45">{t.subscription.label}</p>
                <h2 className="mt-3 text-3xl font-bold">{plan.name}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/62">{plan.description}</p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-sm font-bold ${planStatus.className}`}>
                {planStatus.label}
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-[#263653] bg-[#0d1a38] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/42">{t.subscription.billingCycle}</p>
                <p className="mt-2 text-lg font-semibold">{currentSubscription ? getBillingCycle(planId, lang) : "-"}</p>
              </div>
              <div className="rounded-lg border border-[#263653] bg-[#0d1a38] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/42">{t.subscription.periodStart}</p>
                <p className="mt-2 text-lg font-semibold">
                  {currentSubscription ? formatDate(currentSubscription.periodStart, lang) : "-"}
                </p>
              </div>
              <div className="rounded-lg border border-[#263653] bg-[#0d1a38] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/42">{isLifetime ? t.subscription.lifetime : t.subscription.validUntil}</p>
                <p className="mt-2 text-lg font-semibold">
                  {isLifetime ? t.subscription.lifetime : currentSubscription ? formatDate(currentSubscription.periodEnd, lang) : "-"}
                </p>
              </div>
            </div>

            {plan.features.length ? (
              <div className="mt-6">
                <p className="mb-3 text-sm font-semibold text-white/75">{t.subscription.included}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {plan.features.slice(0, 6).map((feature) => (
                    <div key={feature} className="flex gap-2 rounded-md bg-white/[0.035] px-3 py-2 text-sm text-white/70">
                      <span className="text-[#1de9a6]">✓</span>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid gap-5">
            <div className="rounded-xl border border-[#263653] bg-[#0a1530] p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/45">{t.credits.label}</p>
              <p className="mt-3 text-4xl font-bold text-[#1de9a6]">{creditBalance.toLocaleString("en-US")}</p>
              <p className="mt-2 text-sm text-white/58">{t.credits.description}</p>
            </div>

            <div className="rounded-xl border border-[#263653] bg-[#0a1530] p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/45">{t.account.label}</p>
              <div className="mt-4 flex items-center gap-4">
                {account?.image ? (
                  <img src={account.image} alt={account.name || account.email} className="h-14 w-14 rounded-full border border-white/15 object-cover" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#48bdff]/15 text-xl font-bold text-[#48bdff]">
                    {(account?.name || account?.email || "U").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold">{account?.name || t.account.unnamed}</p>
                  <p className="truncate text-sm text-white/55">{account?.email}</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-white/55">
                {t.account.memberSince}: {formatDate(account?.createdAt, lang)}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-[#263653] bg-[#0a1530] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/45">{t.orders.label}</p>
              <h2 className="mt-2 text-xl font-bold">{t.orders.title}</h2>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-lg border border-[#263653]">
            {recentOrders.length ? (
              <div className="divide-y divide-[#263653]">
                {recentOrders.map((item) => {
                  const orderPlan = getPlanContent(item.planId, lang);
                  return (
                    <div key={item.id} className="grid gap-3 bg-[#0d1a38] px-4 py-4 text-sm sm:grid-cols-[1.2fr_0.7fr_0.7fr_0.8fr] sm:items-center">
                      <div>
                        <p className="font-semibold text-white">{orderPlan.name}</p>
                        <p className="mt-1 text-xs text-white/45">{item.id}</p>
                      </div>
                      <span className="font-semibold text-white/75">{formatCurrency(item.amount, item.currency)}</span>
                      <span className="capitalize text-white/62">{item.status}</span>
                      <span className="text-white/45 sm:text-right">{formatDate(item.createdAt, lang)}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-[#0d1a38] px-4 py-8 text-center text-sm text-white/55">
                {t.orders.empty}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
