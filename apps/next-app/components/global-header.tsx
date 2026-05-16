"use client";

/**
 * Known Issue: Radix UI Hydration Mismatch
 * 
 * DropdownMenu components may cause hydration warnings due to Radix UI
 * generating different IDs on server vs client with React 19.2's useId hook.
 * This is a known upstream issue and does not affect functionality.
 * 
 * @see https://github.com/radix-ui/primitives/issues/3700
 */

import Link from "next/link";
import { useState } from "react";
import { Button } from "@libs/react-shared/ui/button";
import { Logo } from "@/components/ui/logo";
import { authClientReact } from "@libs/auth/authClient";
import { useRouter, usePathname } from "next/navigation";
import { config } from "@config";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@libs/react-shared/ui/dropdown-menu";
import { Check, Crown, Globe } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@libs/react-shared/ui/avatar";
import { type SupportedLocale, locales } from "@libs/i18n";
import { useTranslation } from "@/hooks/use-translation";

interface HeaderProps {
  className?: string;
}

export default function Header({ className }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { t, locale: currentLocale } = useTranslation();
  
  const { 
    data: session, 
    isPending
  } = authClientReact.useSession();
  const user = session?.user;

  const handleSignOut = async () => {
    await authClientReact.signOut();
    router.push(currentLocale === config.app.i18n.defaultLocale ? '/' : `/${currentLocale}`);
  };

  const homeHref = currentLocale === config.app.i18n.defaultLocale ? '/' : `/${currentLocale}`;
  const featuresHref = currentLocale === config.app.i18n.defaultLocale ? '/#features' : `/${currentLocale}#features`;

  const handleLanguageChange = (locale: SupportedLocale) => {
    // Don't change if it's the same locale
    if (locale === currentLocale) return;
    
    // Get the current path without the locale prefix
    const pathWithoutLocale = pathname.replace(`/${currentLocale}`, '') || '/';
    
    // Store the preference first
    document.cookie = `${config.app.i18n.cookieKey}=${locale}; path=/; max-age=31536000`;
    
    // Navigate to the new locale path using window.location to ensure full page reload
    // This prevents theme state issues during navigation
    window.location.href =
      locale === config.app.i18n.defaultLocale && pathWithoutLocale === '/'
        ? '/'
        : `/${locale}${pathWithoutLocale}`;
  };

  return (
    <header className={`sticky top-0 z-40 w-full border-b border-[#26324d] bg-[#050b1d]/95 text-white backdrop-blur-sm ${className}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and brand */}
          <div className="flex items-center">
            <Link href={homeHref}>
              <Logo size="lg" />
            </Link>
          </div>

          {/* Desktop navigation */}
          <nav className="hidden md:flex md:flex-1 md:items-center md:justify-center md:space-x-16">
            <Link href={featuresHref} className="text-2xl font-medium tracking-normal text-white/90 transition-colors hover:text-[#48bdff]">
              {t.pixal3d.generator.featuresNav}
            </Link>
            <Link href={`/${currentLocale}/pricing`} className="text-2xl font-medium tracking-normal text-white/90 transition-colors hover:text-[#48bdff]">
              {t.header.navigation.pricing}
            </Link>
            <Link href={`/${currentLocale}/blog`} className="text-2xl font-medium tracking-normal text-white/90 transition-colors hover:text-[#48bdff]">
              {t.header.navigation.blog}
            </Link>
          </nav>

          {/* User menu or Auth buttons */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Language Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 px-3 text-white/85 hover:bg-white/10 hover:text-white">
                  <Globe className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">
                    {currentLocale === 'en' ? t.header.language.english : t.header.language.chinese}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {locales.map((locale) => (
                  <DropdownMenuItem
                    key={locale}
                    onClick={() => handleLanguageChange(locale)}
                  >
                    <span>{locale === 'en' ? t.header.language.english : t.header.language.chinese}</span>
                    {currentLocale === locale && <Check className="ml-auto h-4 w-4" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {isPending ? (
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse"></div>
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button 
                    type="button"
                    className="flex items-center space-x-2 focus:outline-none"
                  >
                    <Avatar className="h-8 w-8 border border-border">
                      <AvatarImage src={user.image || ""} alt={user.name || user.email || "User"} />
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                        {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-foreground">{user.name || user.email}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium text-foreground">{user.name || "User"}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link href={`/${currentLocale}/dashboard`} className="flex items-center">
                        <svg className="mr-2 h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        {t.header.userMenu.personalSettings}
                      </Link>
                    </DropdownMenuItem>
                    {user.role === 'admin' && (
                      <DropdownMenuItem asChild>
                        <Link href={`/${currentLocale}/admin`} className="flex items-center">
                          <svg className="mr-2 h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 3v18h18V3H3zm16 16H5V5h14v14z"/>
                            <path d="M8 8h8m-8 4h8m-8 4h5"/>
                          </svg>
                          {t.header.userMenu.adminPanel}
                        </Link>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={handleSignOut}>
                    <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    {t.header.auth.signOut}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link
                  href={`/${currentLocale}/signin`}
                  className="text-sm font-semibold text-white/70 transition-colors hover:text-white"
                >
                  {t.header.auth.signIn}
                </Link>
                <Link href={`/${currentLocale}/pricing`}>
                  <Button className="rounded-full bg-[#48bdff] px-5 text-base font-bold text-[#04101e] hover:bg-[#72ceff]">
                    <Crown className="h-5 w-5" />
                    {t.pixal3d.generator.upgradeButton}
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center rounded-md p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white focus:outline-none"
            >
              <span className="sr-only">Open main menu</span>
              {/* Hamburger icon */}
              {!isMenuOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="border-t border-[#26324d] bg-[#050b1d] md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link href={featuresHref} className="block rounded-md px-3 py-2 text-base font-medium text-white hover:bg-white/10" onClick={() => setIsMenuOpen(false)}>
              {t.pixal3d.generator.featuresNav}
            </Link>
            <Link href={`/${currentLocale}/blog`} className="block rounded-md px-3 py-2 text-base font-medium text-white hover:bg-white/10" onClick={() => setIsMenuOpen(false)}>
              {t.header.navigation.blog}
            </Link>
            <Link href={`/${currentLocale}/pricing`} className="block rounded-md px-3 py-2 text-base font-medium text-white hover:bg-white/10" onClick={() => setIsMenuOpen(false)}>
              {t.header.navigation.pricing}
            </Link>
            
            {/* Mobile Language Control */}
            <div className="mt-3 space-y-2 border-t border-[#26324d] pt-3">
              <div className="px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">{t.header.mobile.languageSelection}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white">
                        <Globe className="mr-2 h-4 w-4" />
                        {currentLocale === 'en' ? t.header.language.english : t.header.language.chinese}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {locales.map((locale) => (
                        <DropdownMenuItem
                          key={locale}
                          onClick={() => handleLanguageChange(locale)}
                        >
                          <span>{locale === 'en' ? t.header.language.english : t.header.language.chinese}</span>
                          {currentLocale === locale && <Check className="ml-auto h-4 w-4" />}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-[#26324d] pb-3 pt-4">
            {user ? (
              <div className="px-4 space-y-1">
                <div className="flex items-center px-3">
                  <div className="shrink-0">
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarImage src={user.image || ""} alt={user.name || user.email || "User"} />
                      <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                        {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="ml-3">
                    <div className="text-base font-medium text-white">{user.name || "User"}</div>
                    <div className="text-sm font-medium text-white/60">{user.email}</div>
                  </div>
                </div>
                <Link href={`/${currentLocale}/settings`} className="block rounded-md px-3 py-2 text-base font-medium text-white hover:bg-white/10">
                  {t.header.userMenu.personalSettings}
                </Link>
                {user.role === 'admin' && (
                  <Link href={`/${currentLocale}/admin`} className="block rounded-md px-3 py-2 text-base font-medium text-white hover:bg-white/10">
                    {t.header.userMenu.adminPanel || 'Admin Panel'}
                  </Link>
                )}
                <button
                  onClick={handleSignOut}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-destructive hover:bg-destructive/10"
                >
                  {t.header.auth.signOut}
                </button>
              </div>
            ) : (
              <div className="space-y-3 px-4 py-2">
                <Link href={`/${currentLocale}/signin`} className="block text-center text-sm font-semibold text-white/70 hover:text-white">
                  {t.header.auth.signIn}
                </Link>
                <Link href={`/${currentLocale}/pricing`}>
                  <Button className="w-full rounded-full bg-[#48bdff] text-sm font-bold text-[#04101e] hover:bg-[#72ceff]">
                    <Crown className="h-4 w-4" />
                    {t.pixal3d.generator.upgradeButton}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
} 
