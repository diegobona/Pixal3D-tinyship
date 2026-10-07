import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { test, expect, type Page } from '@playwright/test';
import { en } from '../../../libs/i18n/locales/en';
import { zhCN } from '../../../libs/i18n/locales/zh-CN';
import { PAGES, TIMEOUTS } from '../helpers/constants';
import { SPACE_DEFAULT_TARGETS, workspaceUrl } from '../../../config/space-workspaces';
import { startWorkspaceFixtureServer } from '../helpers/space-workspace-fixture';

let workspaceFixture: Awaited<ReturnType<typeof startWorkspaceFixtureServer>>;

async function expectHeaderControlsFit(page: Page) {
  const controls = await page.locator('header a, header button, header summary').evaluateAll((nodes) => nodes.map((node) => {
    const box = node.getBoundingClientRect();
    return { label: node.textContent?.trim() || node.getAttribute('aria-label'), x: box.x, y: box.y, right: box.right, bottom: box.bottom, width: box.width, height: box.height };
  }).filter((box) => box.width > 0 && box.height > 0));
  for (const [index, control] of controls.entries()) {
    expect(control.x, control.label ?? 'header control').toBeGreaterThanOrEqual(0);
    expect(control.right, control.label ?? 'header control').toBeLessThanOrEqual(page.viewportSize()!.width);
    for (const other of controls.slice(index + 1)) {
      const overlaps = Math.min(control.right, other.right) - Math.max(control.x, other.x) > 1
        && Math.min(control.bottom, other.bottom) - Math.max(control.y, other.y) > 1;
      expect(overlaps, `${control.label} overlaps ${other.label}`).toBe(false);
    }
  }
  const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport + 1);
  expect(widths.body).toBeLessThanOrEqual(widths.viewport + 1);
}

/**
 * Public Pages Smoke Tests
 *
 * Verify that all public pages load correctly without authentication.
 * These are the most basic sanity checks -- if any of these fail,
 * there is likely a build or routing issue.
 */

test.describe('Public Pages', () => {
  test.beforeAll(async () => { workspaceFixture = await startWorkspaceFixtureServer(); });
  test.afterAll(async () => { await workspaceFixture.close(); });
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/auth/get-session**', (route) => route.fulfill({ json: null }));
    await page.route('**/api/credits/status', (route) => route.fulfill({ json: { credits: { balance: 0 }, subscription: null } }));
    await page.route('**' + workspaceUrl('pixal3d'), (route) => route.fulfill({ status: 307, headers: { Location: workspaceFixture.destination(SPACE_DEFAULT_TARGETS.pixal3d.url), 'Cache-Control': 'no-store' } }));
    await page.route('**/embed.tawk.to/**', (route) => route.abort());
    await page.route('https://ldyang694.github.io/**', (route) => route.abort());
  });
  for (const width of [1280, 768, 390]) {
    for (const { locale, home, copy } of [
      { locale: 'en', home: '/', copy: en },
      { locale: 'zh-CN', home: '/zh-CN', copy: zhCN },
    ]) {
      test(`Home page loads and renders hero section with working navigation at ${width}px in ${locale}`, async ({ page }) => {
        test.setTimeout(45_000);
        const mobile = width < 768;
        await page.setViewportSize({ width, height: 900 });
        await page.goto(home, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
        await expect(page).not.toHaveTitle(/error|500|404/i);
        await expect(page.locator('header')).toBeVisible();
        const hero = page.getByRole('heading', { level: 1, name: copy.pixal3d.generator.heroTitle, exact: true });
        const badge = page.getByTestId('pixal3d-free-badge');
        await expect(hero).toBeInViewport();
        await expect(badge).toHaveText(copy.pixal3d.generator.subtitle);
        await expect(badge).toBeInViewport({ ratio: 1 });
        expect(await badge.evaluate((node) => node.matches('a, button, input, [role="button"], [role="link"], [tabindex]'))).toBe(false);
        await expect(badge.locator('a, button, input, [role="button"], [role="link"], [tabindex]')).toHaveCount(0);
        const heroBox = (await hero.boundingBox())!;
        const badgeBox = (await badge.boundingBox())!;
        const workspaceBox = (await page.getByTestId('pixal3d-inline-trial').boundingBox())!;
        expect(badgeBox.y).toBeGreaterThanOrEqual(heroBox.y + heroBox.height);
        expect(badgeBox.y + badgeBox.height).toBeLessThanOrEqual(workspaceBox.y);
        const toggle = page.getByTestId('header-menu-toggle');
        const navigation = mobile
          ? page.getByTestId('header-mobile-navigation').getByRole('navigation')
          : page.getByTestId('header-navigation');
        if (mobile) {
          await expect(page.getByTestId('header-navigation')).toBeHidden();
          await expect(toggle).toHaveAccessibleName(copy.header.navigation.openMenu);
          await expect(toggle).toHaveAttribute('aria-expanded', 'false');
          await expect(navigation).toHaveCount(0);
        } else {
          await expect(toggle).toBeHidden();
          await expect(navigation).toBeVisible();
          await expect(page.locator('header').getByRole('link', { name: copy.header.auth.signIn, exact: true })).toBeVisible();
        }
        await expectHeaderControlsFit(page);
        const directory = path.join(process.cwd(), '.tmp', 'home-polish');
        await mkdir(directory, { recursive: true });
        await page.screenshot({ path: path.join(directory, `home-header-${width}-${locale}.png`), ...(mobile ? {} : { clip: { x: 0, y: 0, width, height: 400 } }) });
        if (mobile) {
          await toggle.click();
          await expect(toggle).toHaveAttribute('aria-expanded', 'true');
        }
        const homeLink = navigation.getByRole('link', { name: copy.header.navigation.home, exact: true });
        const featuresLink = navigation.getByRole('link', { name: copy.pixal3d.generator.featuresNav, exact: true });
        const blogLink = navigation.getByRole('link', { name: copy.header.navigation.blog, exact: true });
        await expect(navigation.getByRole('link')).toHaveText([copy.header.navigation.home, copy.pixal3d.generator.featuresNav, copy.header.navigation.blog]);
        await expect(homeLink).toHaveAttribute('aria-current', 'page');
        await expect(blogLink).not.toHaveAttribute('aria-current');
        await expect(featuresLink).toHaveAttribute('href', locale === 'en' ? '/#features' : '/zh-CN#features');
        await expectHeaderControlsFit(page);
        await blogLink.click();
        await expect(page).toHaveURL(new RegExp(locale === 'en' ? '/blog$' : '/zh-CN/blog$'));
        if (mobile) {
          await expect(toggle).toHaveAttribute('aria-expanded', 'false');
          await expect(navigation).toHaveCount(0);
          await toggle.click();
        }
        await expect(blogLink).toHaveAttribute('aria-current', 'page');
        await expect(homeLink).not.toHaveAttribute('aria-current');
        await featuresLink.click();
        await expect(page).toHaveURL(new RegExp(locale === 'en' ? '/#features$' : '/zh-CN/?#features$'));
        await expect(page.getByTestId('pixal3d-advantages')).toBeInViewport();
        if (mobile) {
          await expect(toggle).toHaveAttribute('aria-expanded', 'false');
          await expect(navigation).toHaveCount(0);
        } else {
          await expect(homeLink).toHaveAttribute('aria-current', 'page');
          await expect(blogLink).not.toHaveAttribute('aria-current');
        }
      });
    }
  }

  test('Embedded workspace shows a small source-image helper only after sign-in', async ({ page }) => {
    await page.goto(PAGES.home, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('pixal3d-inline-trial-auth-overlay')).toBeVisible();
    await expect(page.getByTestId('pixal3d-reference-image-cta')).toHaveCount(0);
    const englishBrand = page.getByTestId('pixal3d-inline-trial-brand');
    await expect(englishBrand).toContainText(en.embed.title);
    await expect(englishBrand.getByRole('link')).toHaveCount(0);

    if (process.env.E2E_CAPTURE_FEEDBACK === 'true') {
      await page.setViewportSize({ width: 1280, height: 1050 });
      await englishBrand.scrollIntoViewIfNeeded();
      const brandBox = (await englishBrand.boundingBox())!;
      await page.evaluate((y) => window.scrollBy({ top: y - 120, behavior: 'instant' }), brandBox.y);
      const directory = path.join(process.cwd(), '.tmp', 'feedback-copy');
      await mkdir(directory, { recursive: true });
      await page.screenshot({ path: path.join(directory, 'home-workspace-en.png'), fullPage: false });
    }

    await page.route('**/api/auth/get-session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          session: {
            id: 'test-session',
            token: 'test-session-token',
            userId: 'test-user',
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
          },
          user: {
            id: 'test-user',
            name: 'Layout Test User',
            email: 'layout-test@example.com',
            emailVerified: true,
          },
        }),
      });
    });
    await page.route('**/api/credits/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ credits: { balance: 0 }, subscription: null }),
      });
    });
    await page.reload({ waitUntil: 'domcontentloaded' });

    const englishLink = page.getByTestId('pixal3d-reference-image-cta');
    const workspaceIframe = page.getByTestId('pixal3d-inline-trial-iframe');
    await expect(workspaceIframe).toHaveAttribute('src', workspaceUrl('pixal3d'));
    await expect(page.frameLocator('[data-testid="pixal3d-inline-trial-iframe"]').getByTestId('fixture-provider')).toHaveText(SPACE_DEFAULT_TARGETS.pixal3d.url);
    await expect(page.getByTestId('pixal3d-inline-trial-auth-overlay')).toHaveCount(0);
    await expect(englishLink).toContainText('No image? Create one free');
    await expect(englishLink).toHaveAttribute(
      'href',
      'https://seedance3-pro.com/app/image/gpt-image-2?ref=pixal3d',
    );
    await expect(englishLink).toHaveAttribute('target', '_blank');
    await expect(englishLink).toHaveAttribute('rel', 'noreferrer noopener');
    await expect(englishLink).toHaveCSS('position', 'absolute');
    await expect(englishLink).toHaveCSS('z-index', '30');

    const originalViewport = page.viewportSize()!;
    await page.setViewportSize({ width: 768, height: originalViewport.height });
    await expect(page.getByTestId('header-navigation')).toBeVisible();
    await expect(page.locator('header').getByRole('button', { name: /Layout Test User/ })).toBeVisible();
    await expectHeaderControlsFit(page);
    await page.setViewportSize(originalViewport);

    const linkBox = await englishLink.boundingBox();
    const iframeBox = await workspaceIframe.boundingBox();
    expect(linkBox).not.toBeNull();
    expect(iframeBox).not.toBeNull();
    expect(linkBox!.x - iframeBox!.x).toBeGreaterThanOrEqual(108);
    expect(linkBox!.x - iframeBox!.x).toBeLessThanOrEqual(116);
    expect(linkBox!.y - iframeBox!.y).toBeGreaterThanOrEqual(100);
    expect(linkBox!.y - iframeBox!.y).toBeLessThanOrEqual(106);
    expect(linkBox!.width).toBeLessThanOrEqual(180);
    expect(linkBox!.height).toBeLessThanOrEqual(24);
    expect(linkBox!.y + linkBox!.height).toBeLessThanOrEqual(iframeBox!.y + 130);
    await expect(page.getByTestId('anyposes-footer-link')).toHaveCount(0);

    await page.goto('/zh-CN', { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });

    const chineseLink = page.getByTestId('pixal3d-reference-image-cta');
    await expect(page.getByTestId('pixal3d-inline-trial-brand')).toContainText(zhCN.embed.title);
    await expect(page.getByTestId('pixal3d-inline-trial-brand').getByRole('link')).toHaveCount(0);
    await expect(chineseLink).toContainText('没有参考图？免费生成一张');
    await expect(chineseLink).toHaveAttribute(
      'href',
      'https://seedance3-pro.com/app/image/gpt-image-2?ref=pixal3d',
    );
  });

  test('Home page collects a 3D modeling tool request in both languages', async ({ page }) => {
    test.setTimeout(60_000);
    const toolRequest = 'I need a 3D modeling SaaS that fixes mesh errors in batches；希望 AI 自动检查模型问题并保留编辑记录。';
    const submittedPayloads: Record<string, unknown>[] = [];

    await page.route('**/api/feedback/pain-point', async (route) => {
      submittedPayloads.push(route.request().postDataJSON() as Record<string, unknown>);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    for (const [index, localized] of [
      { url: '/', copy: en.pixal3d.painPoint },
      { url: '/zh-CN', copy: zhCN.pixal3d.painPoint },
    ].entries()) {
      await page.goto(localized.url, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
      const feedback = page.getByTestId('pixal3d-pain-point-feedback');
      const textarea = feedback.getByTestId('pixal3d-product-request-input');
      await expect(feedback.getByRole('heading', { name: localized.copy.title, exact: true })).toBeVisible();
      await expect(feedback.getByText(localized.copy.description, { exact: true })).toBeVisible();
      await expect(feedback.locator('input[type="checkbox"]')).toHaveCount(0);
      await expect(feedback.locator('textarea')).toHaveCount(1);
      await expect(textarea).toHaveAttribute('maxlength', '3000');
      await expect(textarea).toHaveAttribute('placeholder', localized.copy.otherPlaceholder);
      await expect(feedback.getByText(localized.copy.inputHint, { exact: true })).toBeVisible();

      if (index === 0 && process.env.E2E_CAPTURE_FEEDBACK === 'true') {
        await page.setViewportSize({ width: 1280, height: 1050 });
        await feedback.scrollIntoViewIfNeeded();
        const directory = path.join(process.cwd(), '.tmp', 'feedback-copy');
        await mkdir(directory, { recursive: true });
        await page.screenshot({ path: path.join(directory, 'feedback-en.png'), fullPage: false });
      }

      await textarea.fill(toolRequest);
      await feedback.getByRole('button', { name: localized.copy.submitButton, exact: true }).click();
      await expect(feedback.getByText(localized.copy.successMessage, { exact: true })).toBeVisible();
      expect(submittedPayloads).toHaveLength(index + 1);
      expect(submittedPayloads[index]).toMatchObject({ otherText: toolRequest });
      expect(submittedPayloads[index]).not.toHaveProperty('painPoints');
    }
  });

  test('Sign in page loads and shows login form', async ({ page }) => {
    await page.goto(PAGES.signin, { timeout: TIMEOUTS.navigation });

    // Should have email and password inputs
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Should have a submit button
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('Sign up page loads and shows registration form', async ({ page }) => {
    await page.goto(PAGES.signup, { timeout: TIMEOUTS.navigation });

    // Should have name, email, and password inputs
    await expect(page.locator('input#name')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Should have a submit button
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('Forgot password page loads and shows form', async ({ page }) => {
    await page.goto(PAGES.forgotPassword, { timeout: TIMEOUTS.navigation });

    // Should have an email input
    await expect(page.locator('input[type="email"]')).toBeVisible();

    // Should have a button inside the form (the submit button may not have explicit type="submit")
    await expect(page.locator('form button').first()).toBeVisible();
  });

  test('Pricing page loads and shows plan cards', async ({ page }) => {
    await page.goto(PAGES.pricing, { timeout: TIMEOUTS.navigation });

    // Page should not show error
    await expect(page).not.toHaveTitle(/error|500|404/i);

    // Should display at least one plan card with a price
    const priceElements = page.locator('text=/[¥$]\\d+/');
    await expect(priceElements.first()).toBeVisible({ timeout: TIMEOUTS.navigation });
  });
});
