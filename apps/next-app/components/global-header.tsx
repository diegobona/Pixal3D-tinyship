"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { config } from "@config";
import { authClientReact } from "@libs/auth/authClient";
import { Logo } from "@/components/ui/logo";
import { useTranslation } from "@/hooks/use-translation";

interface HeaderProps {
  className?: string;
}

export default function Header({ className }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { t, locale: currentLocale } = useTranslation();
  const { data: session, isPending } = authClientReact.useSession();
  const user = session?.user;

  const localizedPath = (path: string) =>
    currentLocale === config.app.i18n.defaultLocale ? path : `/${currentLocale}${path}`;

  const homeHref = localizedPath("/");
  const featuresHref = `${homeHref}#features`;

  const handleSignOut = async () => {
    await authClientReact.signOut();
    router.push(homeHref);
  };

  const toggleLocale = () => {
    const nextLocale = currentLocale === "en" ? "zh-CN" : "en";
    const pathWithoutLocale = pathname.replace(`/${currentLocale}`, "") || "/";
    document.cookie = `${config.app.i18n.cookieKey}=${nextLocale}; path=/; max-age=31536000`;
    window.location.href =
      nextLocale === config.app.i18n.defaultLocale
        ? pathWithoutLocale
        : `/${nextLocale}${pathWithoutLocale === "/" ? "" : pathWithoutLocale}`;
  };

  const navigation = (
    <>
      <Link href={featuresHref} className="text-2xl font-medium tracking-normal text-white/90 transition-colors hover:text-[#48bdff]">
        {t.pixal3d.generator.featuresNav}
      </Link>
      <Link href={localizedPath("/pricing")} className="text-2xl font-medium tracking-normal text-white/90 transition-colors hover:text-[#48bdff]">
        {t.header.navigation.pricing}
      </Link>
      <Link href={localizedPath("/blog")} className="text-2xl font-medium tracking-normal text-white/90 transition-colors hover:text-[#48bdff]">
        {t.header.navigation.blog}
      </Link>
    </>
  );

  return (
    <header className={`sticky top-0 z-40 w-full border-b border-[#26324d] bg-[#050b1d]/95 text-white backdrop-blur-sm ${className || ""}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href={homeHref} aria-label={config.app.name}>
            <Logo size="lg" />
          </Link>

          <nav className="hidden flex-1 items-center justify-center space-x-16 md:flex">
            {navigation}
          </nav>

          <div className="hidden items-center gap-4 md:flex">
            <button
              type="button"
              onClick={toggleLocale}
              className="text-sm font-semibold text-white/75 transition-colors hover:text-white"
            >
              {currentLocale === "en" ? t.header.language.english : t.header.language.chinese}
            </button>

            {isPending ? (
              <div className="h-8 w-28 rounded-full bg-white/10" />
            ) : user ? (
              <div className="flex items-center gap-3">
                <Link href={localizedPath("/dashboard")} className="flex items-center gap-3 rounded-full px-1 py-1 transition-colors hover:bg-white/10">
                  {user.image ? (
                    <img src={user.image} alt={user.name || user.email || "User"} className="h-8 w-8 rounded-full border border-white/20 object-cover" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white">
                      {(user.name || user.email || "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="max-w-28 truncate text-sm font-semibold text-white/85">{user.name || user.email}</span>
                </Link>
                <button type="button" onClick={handleSignOut} className="text-sm font-semibold text-white/60 transition-colors hover:text-white">
                  {t.header.auth.signOut}
                </button>
              </div>
            ) : (
              <>
                <Link href={localizedPath("/signin")} className="text-sm font-semibold text-white/70 transition-colors hover:text-white">
                  {t.header.auth.signIn}
                </Link>
                <Link href={localizedPath("/pricing")} className="rounded-full bg-[#48bdff] px-5 py-2 text-base font-bold text-[#04101e] transition-colors hover:bg-[#72ceff]">
                  {t.pixal3d.generator.upgradeButton}
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
              <button type="button" onClick={toggleLocale} className="block py-2 text-sm font-semibold text-white/75">
                {currentLocale === "en" ? t.header.language.english : t.header.language.chinese}
              </button>
              {user ? (
                <>
                  <Link href={localizedPath("/dashboard")} className="block py-2 text-sm font-semibold text-white/75">
                    {t.header.auth.dashboard}
                  </Link>
                  <button type="button" onClick={handleSignOut} className="block py-2 text-sm font-semibold text-white/75">
                    {t.header.auth.signOut}
                  </button>
                </>
              ) : (
                <>
                  <Link href={localizedPath("/signin")} className="block py-2 text-sm font-semibold text-white/75">
                    {t.header.auth.signIn}
                  </Link>
                  <Link href={localizedPath("/pricing")} className="mt-2 block rounded-full bg-[#48bdff] px-5 py-2 text-center text-sm font-bold text-[#04101e]">
                    {t.pixal3d.generator.upgradeButton}
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
