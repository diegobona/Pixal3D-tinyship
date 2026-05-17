import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from "@libs/auth";
import { i18n } from '../app/i18n-config';
import { checkSubscriptionStatus, isLifetimeMember } from '@libs/database/utils/subscription';

function getLocaleFromPathname(pathname: string) {
  const segment = pathname.split('/')[1];
  return i18n.locales.includes(segment as any) ? segment : i18n.defaultLocale;
}

function localizedPath(path: string, locale: string) {
  return locale === i18n.defaultLocale ? path : `/${locale}${path}`;
}

/**
 * 检查用户是否具有有效订阅
 * @param userId 用户ID
 * @returns 是否有有效订阅
 */
export async function hasValidSubscription(userId: string): Promise<boolean> {
  return !!(await checkSubscriptionStatus(userId));
}

/**
 * 检查用户是否是终身会员
 * @param userId 用户ID
 * @returns 是否是终身会员
 */
export async function checkLifetimeMembership(userId: string): Promise<boolean> {
  return !!(await isLifetimeMember(userId));
}

/**
 * 订阅中间件 - 检查用户是否有有效订阅
 * @param request 请求对象
 * @param options 配置项
 * @returns NextResponse或undefined
 */
export async function subscriptionMiddleware(
  request: NextRequest,
  options: {
    redirectToUpgrade?: boolean; // 是否重定向到升级页面
  } = {}
): Promise<NextResponse | undefined> {
  const pathname = request.nextUrl.pathname;
  const requestHeaders = new Headers(request.headers);
  
  // 获取当前用户会话
  const session = await auth.api.getSession({
    headers: requestHeaders
  });
  
  // 未登录，重定向到登录页面
  if (!session || !session.user) {
    const currentLocale = getLocaleFromPathname(pathname);
    const loginUrl = new URL(localizedPath('/signin', currentLocale), request.url);
    return NextResponse.redirect(loginUrl);
  }
  
  // 检查订阅状态
  const hasSubscription = await hasValidSubscription(session.user.id);
  
  if (!hasSubscription) {
    if (options.redirectToUpgrade) {
      // 重定向到升级页面
      const currentLocale = getLocaleFromPathname(pathname);
      const upgradeUrl = new URL(localizedPath('/pricing', currentLocale), request.url);
      return NextResponse.redirect(upgradeUrl);
    } else {
      // API请求返回错误
      return new NextResponse('Subscription required', { status: 402 }); // 402 Payment Required
    }
  }
  
  return undefined;
} 
