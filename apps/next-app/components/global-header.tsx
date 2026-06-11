"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { config } from "@config";
import { authClientReact } from "@libs/auth/authClient";
import { Logo } from "@/components/ui/logo";
import { useTranslation } from "@/hooks/use-translation";
import {
  CREDIT_BALANCE_UPDATED_EVENT,
  getCreditBalanceFromEvent,
  getSubscriptionPlanIdFromEvent,
} from "@/lib/credit-balance-events";
import { shouldShowHeaderUpgradeButton } from "@/lib/header-actions";
import {
  PIXAL3D_SHOW_LANGUAGE_SWITCHER,
  PIXAL3D_SHOW_MONETIZATION_SURFACES,
  PIXAL3D_SHOW_USER_LIBRARY_SURFACES,
} from "@/lib/pixal3d-surface-visibility";

interface HeaderProps {
  className?: string;
}

interface CreditStatusResponse {
  credits?: {
    balance?: number;
  };
  subscription?: {
    planId?: string;
  } | null;
}

export default function Header({ className }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLocaleMenuOpen, setIsLocaleMenuOpen] = useState(false);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [subscriptionPlanId, setSubscriptionPlanId] = useState<string | null>(null);
  const [isCreditStatusLoaded, setIsCreditStatusLoaded] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const localeMenuRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { t, locale: currentLocale } = useTranslation();
  const { data: session, isPending } = authClientReact.useSession();
  const user = session?.user;

  const localizedPath = (path: string) =>
    currentLocale === config.app.i18n.defaultLocale ? path : `/${currentLocale}${path}`;

  const homeHref = localizedPath("/");
  const featuresHref = `${homeHref}#features`;
  const displayName = user?.name || user?.email || "User";
  const displayEmail = user?.email || "";
  const shouldShowUpgradeButton = PIXAL3D_SHOW_MONETIZATION_SURFACES
    && shouldShowHeaderUpgradeButton({
      isAuthenticated: Boolean(user),
      isCreditStatusLoaded,
      subscriptionPlanId,
    });

  useEffect(() => {
    if (!isUserMenuOpen && !isLocaleMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!userMenuRef.current?.contains(target)) {
        setIsUserMenuOpen(false);
      }
      if (!localeMenuRef.current?.contains(target)) {
        setIsLocaleMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
        setIsLocaleMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isLocaleMenuOpen, isUserMenuOpen]);

  useEffect(() => {
    if (!PIXAL3D_SHOW_MONETIZATION_SURFACES) {
      setCreditBalance(null);
      setSubscriptionPlanId(null);
      setIsCreditStatusLoaded(false);
      return;
    }

    if (!user) {
      setCreditBalance(null);
      setSubscriptionPlanId(null);
      setIsCreditStatusLoaded(false);
      return;
    }

    let isMounted = true;
    setIsCreditStatusLoaded(false);

    const loadCreditBalance = async () => {
      try {
        const response = await fetch("/api/credits/status", { cache: "no-store" });
        if (!response.ok) {
          if (isMounted) {
            setCreditBalance(0);
            setSubscriptionPlanId(null);
            setIsCreditStatusLoaded(true);
          }
          return;
        }

        const data = (await response.json()) as CreditStatusResponse;
        if (isMounted) {
          setCreditBalance(Number(data.credits?.balance || 0));
          setSubscriptionPlanId(data.subscription?.planId || null);
          setIsCreditStatusLoaded(true);
        }
      } catch {
        if (isMounted) {
          setCreditBalance(0);
          setSubscriptionPlanId(null);
          setIsCreditStatusLoaded(true);
        }
      }
    };

    void loadCreditBalance();

    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    const handleCreditBalanceUpdated = (event: Event) => {
      const nextBalance = getCreditBalanceFromEvent(event);
      const nextSubscriptionPlanId = getSubscriptionPlanIdFromEvent(event);
      if (nextBalance !== null) {
        setCreditBalance(nextBalance);
        setIsCreditStatusLoaded(true);
      }
      if (nextSubscriptionPlanId !== undefined) {
        setSubscriptionPlanId(nextSubscriptionPlanId);
      }
    };

    window.addEventListener(CREDIT_BALANCE_UPDATED_EVENT, handleCreditBalanceUpdated);

    return () => {
      window.removeEventListener(CREDIT_BALANCE_UPDATED_EVENT, handleCreditBalanceUpdated);
    };
  }, []);

  const handleSignOut = async () => {
    setIsUserMenuOpen(false);
    await authClientReact.signOut();
    router.push(homeHref);
  };

  const setLocale = (nextLocale: "en" | "zh-CN") => {
    setIsLocaleMenuOpen(false);
    const pathWithoutLocale = pathname.replace(`/${currentLocale}`, "") || "/";
    document.cookie = `${config.app.i18n.cookieKey}=${nextLocale}; path=/; max-age=31536000`;
    window.location.href =
      nextLocale === config.app.i18n.defaultLocale
        ? pathWithoutLocale
        : `/${nextLocale}${pathWithoutLocale === "/" ? "" : pathWithoutLocale}`;
  };

  const navigation = (
    <>
      <Link href={homeHref} className="text-2xl font-medium tracking-normal text-white/90 transition-colors hover:text-[#48bdff]">
        {t.header.navigation.home}
      </Link>
      <Link href={featuresHref} className="text-2xl font-medium tracking-normal text-white/90 transition-colors hover:text-[#48bdff]">
        {t.pixal3d.generator.featuresNav}
      </Link>
      {PIXAL3D_SHOW_MONETIZATION_SURFACES ? (
        <Link href={localizedPath("/pricing")} className="text-2xl font-medium tracking-normal text-white/90 transition-colors hover:text-[#48bdff]">
          {t.header.navigation.pricing}
        </Link>
      ) : null}
      <Link href={localizedPath("/blog")} className="text-2xl font-medium tracking-normal text-white/90 transition-colors hover:text-[#48bdff]">
        {t.header.navigation.blog}
      </Link>
    </>
  );

  return (
    <header className={`sticky top-0 z-40 w-full border-b border-[#26324d] bg-[#050b1d]/95 text-white backdrop-blur-sm ${className || ""}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href={homeHref} aria-label={config.app.name} className="flex shrink-0 items-center gap-3">
            <Logo size="lg" />
            <span
              data-testid="pixal3d-source-badge"
              className="hidden rounded-full border border-[#48bdff]/35 bg-[#071a33] px-2.5 py-1 text-[11px] font-extrabold leading-none tracking-normal text-[#7ee7ff] shadow-[0_0_24px_rgba(72,189,255,0.16)] sm:inline-flex"
            >
              From TencentARC
            </span>
          </Link>

          <nav className="hidden flex-1 items-center justify-center space-x-16 md:flex">
            {navigation}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            {isPending ? (
              <div className="h-8 w-28 rounded-full bg-white/10" />
            ) : user ? (
              <>
                {PIXAL3D_SHOW_MONETIZATION_SURFACES ? (
                  <div className="group relative">
                    <div className="inline-flex h-10 items-center gap-2 rounded-full border border-[#6a4a16] bg-[linear-gradient(180deg,#2a1b06,#1a1207)] px-3 text-[#f7c455] shadow-[0_8px_18px_rgba(0,0,0,0.18)]">
                      <CreditsIcon />
                      <span className="min-w-[1ch] text-sm font-bold leading-none">
                        {creditBalance === null ? "..." : creditBalance.toLocaleString("en-US")}
                      </span>
                    </div>
                    <div
                      role="tooltip"
                      className="pointer-events-none absolute left-1/2 top-[calc(100%+10px)] z-30 -translate-x-1/2 rounded-lg border border-[#6a4a16] bg-[#171008]/98 px-3 py-2 text-xs font-semibold text-[#f7c455] opacity-0 shadow-[0_18px_40px_rgba(0,0,0,0.3)] transition duration-150 group-hover:opacity-100"
                    >
                      {t.header.auth.myCredits}
                      <span className="absolute bottom-full left-1/2 h-2.5 w-2.5 -translate-x-1/2 translate-y-1/2 rotate-45 border-l border-t border-[#6a4a16] bg-[#171008]" />
                    </div>
                  </div>
                ) : null}
                {shouldShowUpgradeButton ? (
                  <Link
                    href={localizedPath("/pricing")}
                    className="inline-flex h-10 items-center rounded-full bg-[#48bdff] px-4 text-sm font-bold text-[#04101e] transition-colors hover:bg-[#72ceff]"
                  >
                    {t.pixal3d.generator.upgradeButton}
                  </Link>
                ) : null}
                <div
                  ref={userMenuRef}
                  className="relative"
                  onMouseEnter={() => setIsUserMenuOpen(true)}
                  onMouseLeave={() => setIsUserMenuOpen(false)}
                  onFocusCapture={() => setIsUserMenuOpen(true)}
                  onBlurCapture={(event) => {
                    if (!userMenuRef.current?.contains(event.relatedTarget as Node | null)) {
                      setIsUserMenuOpen(false);
                    }
                  }}
                >
                  <button
                    type="button"
                    className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-1.5 py-1.5 transition-colors hover:bg-white/8"
                    aria-haspopup="menu"
                    aria-expanded={isUserMenuOpen}
                  >
                    {user.image ? (
                      <img src={user.image} alt={displayName} className="h-9 w-9 rounded-full border border-white/20 object-cover" />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="max-w-28 truncate text-sm font-semibold text-white/85">{displayName}</span>
                  </button>

                  {isUserMenuOpen ? (
                    <div className="absolute right-0 top-full z-50 pt-2">
                      <div
                        role="menu"
                        className="w-[320px] overflow-hidden rounded-[22px] border border-white/12 bg-[linear-gradient(180deg,rgba(24,29,43,0.98),rgba(16,19,29,0.98))] text-white shadow-[0_28px_90px_rgba(0,0,0,0.52)] backdrop-blur-xl"
                      >
                        <div className="border-b border-white/8 px-5 py-5">
                          <div className="flex items-center gap-4">
                            {user.image ? (
                              <img
                                src={user.image}
                                alt={displayName}
                                className="h-14 w-14 rounded-full border border-white/15 object-cover shadow-[0_10px_30px_rgba(0,0,0,0.24)]"
                              />
                            ) : (
                              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-[linear-gradient(135deg,#1b315d,#0c6c86)] text-lg font-bold text-white">
                                {displayName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[15px] font-semibold text-white">{displayName}</p>
                              {displayEmail ? (
                                <p className="mt-1 truncate text-sm text-white/55">{displayEmail}</p>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        {PIXAL3D_SHOW_USER_LIBRARY_SURFACES ? (
                          <div className="px-3 py-3">
                            <Link
                              href={localizedPath("/my-assets")}
                              target="_blank"
                              rel="noreferrer"
                              role="menuitem"
                              onClick={() => setIsUserMenuOpen(false)}
                              className="flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-semibold text-white/84 transition-colors hover:bg-white/8 hover:text-white"
                            >
                              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                                <AssetsIcon />
                              </span>
                              <span className="flex min-w-0 flex-1 items-center justify-between gap-4">
                                <span className="truncate">{t.header.auth.myAssets}</span>
                                <span aria-hidden="true" className="text-white/30">{"\u203A"}</span>
                              </span>
                            </Link>
                            <Link
                              href={localizedPath("/dashboard")}
                              target="_blank"
                              rel="noreferrer"
                              role="menuitem"
                              onClick={() => setIsUserMenuOpen(false)}
                              className="mt-1.5 flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-semibold text-white/84 transition-colors hover:bg-white/8 hover:text-white"
                            >
                              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                                <DashboardIcon />
                              </span>
                              <span className="flex min-w-0 flex-1 items-center justify-between gap-4">
                                <span className="truncate">{t.header.auth.dashboard}</span>
                                <span aria-hidden="true" className="text-white/30">{"\u203A"}</span>
                              </span>
                            </Link>
                          </div>
                        ) : null}
                        <div className="border-t border-white/8 px-3 py-3">
                          <button
                            type="button"
                            role="menuitem"
                            onClick={handleSignOut}
                            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-base font-semibold text-white/84 transition-colors hover:bg-[#2a1318] hover:text-white"
                          >
                            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#4f232b] bg-[#241217]">
                              <LogOutIcon />
                            </span>
                            <span className="flex min-w-0 flex-1 items-center justify-between gap-4">
                              <span className="truncate">{t.header.auth.signOut}</span>
                              <span aria-hidden="true" className="text-white/30">{"\u203A"}</span>
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
                {PIXAL3D_SHOW_LANGUAGE_SWITCHER ? (
                <div
                  ref={localeMenuRef}
                  className="relative"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsLocaleMenuOpen((open) => !open);
                    }}
                    className="inline-flex h-10 w-8 items-center justify-center text-white/82 transition-colors hover:text-white"
                    aria-haspopup="menu"
                    aria-expanded={isLocaleMenuOpen}
                    aria-label="Language"
                  >
                    <LocaleIcon />
                  </button>

                  {isLocaleMenuOpen ? (
                    <div className="absolute right-0 top-full z-50 pt-2">
                      <div
                        role="menu"
                        className="min-w-[170px] overflow-hidden rounded-[18px] border border-white/12 bg-[linear-gradient(180deg,rgba(24,29,43,0.98),rgba(16,19,29,0.98))] p-2 text-white shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl"
                      >
                        <button
                          type="button"
                          role="menuitemradio"
                          aria-checked={currentLocale === "en"}
                          onClick={() => setLocale("en")}
                          className={`flex w-full items-center rounded-xl px-4 py-3 text-left text-base font-semibold transition-colors ${
                            currentLocale === "en"
                              ? "bg-white/10 text-white"
                              : "text-white/82 hover:bg-white/8 hover:text-white"
                          }`}
                        >
                          English
                        </button>
                        <button
                          type="button"
                          role="menuitemradio"
                          aria-checked={currentLocale === "zh-CN"}
                          onClick={() => setLocale("zh-CN")}
                          className={`mt-1 flex w-full items-center rounded-xl px-4 py-3 text-left text-base font-semibold transition-colors ${
                            currentLocale === "zh-CN"
                              ? "bg-white/10 text-white"
                              : "text-white/82 hover:bg-white/8 hover:text-white"
                          }`}
                        >
                          中文
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
                ) : null}
              </>
            ) : (
              <>
                <Link href={localizedPath("/signin")} className="text-sm font-semibold text-white/70 transition-colors hover:text-white">
                  {t.header.auth.signIn}
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            className="inline-flex items-center justify-center rounded-md p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white md:hidden"
            aria-label="Open main menu"
          >
            <span className="text-2xl leading-none">{isMenuOpen ? "x" : "="}</span>
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="border-t border-[#26324d] bg-[#050b1d] md:hidden">
          <div className="space-y-2 px-4 py-4">
            <div className="flex flex-col gap-3" onClick={() => setIsMenuOpen(false)}>
              {navigation}
            </div>
            <div className="border-t border-[#26324d] pt-4">
              {PIXAL3D_SHOW_LANGUAGE_SWITCHER ? (
                <button
                  type="button"
                  onClick={() => setLocale(currentLocale === "en" ? "zh-CN" : "en")}
                  className="block py-2 text-sm font-semibold text-white/75"
                >
                  {currentLocale === "en" ? t.header.language.english : t.header.language.chinese}
                </button>
              ) : null}
              {user ? (
                <>
                  {PIXAL3D_SHOW_USER_LIBRARY_SURFACES ? (
                    <>
                      <Link href={localizedPath("/my-assets")} target="_blank" rel="noreferrer" className="block py-2 text-sm font-semibold text-white/75">
                        {t.header.auth.myAssets}
                      </Link>
                      <Link href={localizedPath("/dashboard")} target="_blank" rel="noreferrer" className="block py-2 text-sm font-semibold text-white/75">
                        {t.header.auth.dashboard}
                      </Link>
                    </>
                  ) : null}
                  {shouldShowUpgradeButton ? (
                    <Link href={localizedPath("/pricing")} className="block py-2 text-sm font-semibold text-white/75">
                      {t.pixal3d.generator.upgradeButton}
                    </Link>
                  ) : null}
                  <button type="button" onClick={handleSignOut} className="block py-2 text-sm font-semibold text-white/75">
                    {t.header.auth.signOut}
                  </button>
                </>
              ) : (
                <>
                  <Link href={localizedPath("/signin")} className="block py-2 text-sm font-semibold text-white/75">
                    {t.header.auth.signIn}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function AssetsIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 text-[#c9d2e8]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.75 8.75 12 4.5l7.25 4.25v6.5L12 19.5l-7.25-4.25z" />
      <path d="M12 12 4.75 8.75" />
      <path d="M12 12l7.25-3.25" />
      <path d="M12 12v7.5" />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 text-[#c9d2e8]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.75 6.75h6.5v4.75h-6.5z" />
      <path d="M12.75 6.75h6.5v7.75h-6.5z" />
      <path d="M4.75 13h6.5v4.25h-6.5z" />
      <path d="M12.75 16h6.5v1.25h-6.5z" />
    </svg>
  );
}

function LogOutIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 text-[#ffb7c0]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 7.5V6.75A2.75 2.75 0 0 1 11.75 4h5.5A2.75 2.75 0 0 1 20 6.75v10.5A2.75 2.75 0 0 1 17.25 20h-5.5A2.75 2.75 0 0 1 9 17.25v-.75" />
      <path d="M13.5 12H4.5" />
      <path d="m7.75 8.75-3.25 3.25 3.25 3.25" />
    </svg>
  );
}

function CreditsIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 text-[#f7c455]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="13" cy="8" rx="5" ry="2.25" />
      <path d="M8 8v4c0 1.24 2.24 2.25 5 2.25s5-1.01 5-2.25V8" />
      <path d="M5 12.25c0-1.24 2.01-2.25 4.5-2.25" />
      <path d="M5 12.25v3.5c0 1.24 2.01 2.25 4.5 2.25 1.9 0 3.52-.58 4.16-1.41" />
    </svg>
  );
}

function LocaleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4.5 w-4.5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="8.25" />
      <path d="M3.75 12h16.5" />
      <path d="M12 3.75a12.4 12.4 0 0 1 0 16.5" />
      <path d="M12 3.75a12.4 12.4 0 0 0 0 16.5" />
    </svg>
  );
}
