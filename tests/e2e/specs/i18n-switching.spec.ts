import { test, expect } from '@playwright/test';
import { TIMEOUTS } from '../helpers/constants';

const ORIGIN = 'http://localhost:7001';

test.describe('English and Simplified Chinese localization', () => {
  test('keeps clean canonical URLs for an English browser', async ({ page }) => {
    await page.goto('/', { timeout: TIMEOUTS.navigation });

    await expect(page).toHaveURL(`${ORIGIN}/`);
    await expect(page.getByRole('heading', {
      level: 1,
      name: 'Turn Any Image into a Faithful 3D Model',
    })).toBeVisible();
    await expect(page.getByTestId('locale-switcher')).toBeVisible();
  });

  test('automatically redirects a first-time Chinese browser without storing a manual preference', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'zh-CN' });
    const page = await context.newPage();

    await page.goto(`${ORIGIN}/`, { timeout: TIMEOUTS.navigation });
    await expect(page).toHaveURL(`${ORIGIN}/zh-CN`);
    await expect(page.getByRole('heading', { level: 1, name: '把任意图片变成高还原度 3D 模型' })).toBeVisible();
    await expect(page.getByText('登录后即可免费使用', { exact: true })).toBeVisible();
    expect((await context.cookies()).find((cookie) => cookie.name === 'NEXT_LOCALE')).toBeUndefined();

    await context.close();
  });

  test('uses country only as a fallback for an unsupported browser language', async ({ browser }) => {
    const context = await browser.newContext({
      locale: 'fr-FR',
      extraHTTPHeaders: { 'CF-IPCountry': 'CN' },
    });
    const page = await context.newPage();

    await page.goto(`${ORIGIN}/`, { timeout: TIMEOUTS.navigation });
    await expect(page).toHaveURL(`${ORIGIN}/zh-CN`);

    await context.close();
  });

  test('lets signed-out users choose a language and stores a secure server preference', async ({ page, context }) => {
    await page.goto('/', { timeout: TIMEOUTS.navigation });
    await page.evaluate(() => window.history.pushState({}, '', '/?campaign=bilingual'));
    await page.getByTestId('locale-switcher').locator('summary').click();
    await page.getByRole('menuitemradio', { name: '简体中文' }).click();

    await expect(page).toHaveURL(`${ORIGIN}/zh-CN?campaign=bilingual`);
    const localeCookie = (await context.cookies()).find((cookie) => cookie.name === 'NEXT_LOCALE');
    expect(localeCookie).toMatchObject({ value: 'zh-CN', httpOnly: true, sameSite: 'Lax', path: '/' });
  });

  test('manual preference overrides browser and country signals', async ({ browser }) => {
    const context = await browser.newContext({
      locale: 'zh-CN',
      extraHTTPHeaders: { 'CF-IPCountry': 'CN' },
    });
    await context.addCookies([{
      name: 'NEXT_LOCALE',
      value: 'en',
      url: ORIGIN,
      httpOnly: true,
      sameSite: 'Lax',
    }]);
    const page = await context.newPage();

    await page.goto(`${ORIGIN}/`, { timeout: TIMEOUTS.navigation });
    await expect(page).toHaveURL(`${ORIGIN}/`);
    await expect(page.getByRole('heading', {
      level: 1,
      name: 'Turn Any Image into a Faithful 3D Model',
    })).toBeVisible();

    await context.close();
  });

  test('renders complete Chinese product and blog copy without English fallbacks', async ({ page }) => {
    await page.goto('/zh-CN', { timeout: TIMEOUTS.navigation });
    await expect(page.getByText('登录后即可免费使用', { exact: true })).toBeVisible();
    await expect(page.getByText('Sign in to use it for free', { exact: true })).toHaveCount(0);

    await page.goto('/zh-CN/blog', { timeout: TIMEOUTS.navigation });
    await expect(page.getByRole('heading', { level: 2, name: '图片转 3D 模型实用指南' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Pixal3D 与同类工具怎么选' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Image to 3D Model Guide' })).toHaveCount(0);
  });

  test('publishes localized SEO for public pages and noindex for private pages', async ({ page }) => {
    await page.goto('/zh-CN/blog', { timeout: TIMEOUTS.navigation });
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${ORIGIN}/zh-CN/blog`);
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute('href', `${ORIGIN}/blog`);
    await expect(page.locator('link[rel="alternate"][hreflang="zh-CN"]')).toHaveAttribute('href', `${ORIGIN}/zh-CN/blog`);

    await page.goto('/zh-CN/signin', { timeout: TIMEOUTS.navigation });
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await expect(page.locator('link[rel="alternate"]')).toHaveCount(0);
  });
});
