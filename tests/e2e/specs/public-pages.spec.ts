import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { en } from '../../../libs/i18n/locales/en';
import { zhCN } from '../../../libs/i18n/locales/zh-CN';
import { PAGES, TIMEOUTS } from '../helpers/constants';

/**
 * Public Pages Smoke Tests
 *
 * Verify that all public pages load correctly without authentication.
 * These are the most basic sanity checks -- if any of these fail,
 * there is likely a build or routing issue.
 */

test.describe('Public Pages', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/auth/get-session**', (route) => route.fulfill({ json: null }));
    await page.route('**/api/credits/status', (route) => route.fulfill({ json: { credits: { balance: 0 }, subscription: null } }));
    await page.route('https://victor-pixal3d-studio.hf.space/**', (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Workspace fixture</title><body style="margin:0;background:#0b0f1a"></body>' }));
    await page.route('**/embed.tawk.to/**', (route) => route.abort());
    await page.route('https://ldyang694.github.io/**', (route) => route.abort());
  });
  test('Home page loads and renders hero section', async ({ page }) => {
    await page.goto(PAGES.home, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });

    // Page should load without errors
    await expect(page).not.toHaveTitle(/error|500|404/i);

    // Header should be visible
    await expect(page.locator('header')).toBeVisible();

    // Hero section should contain a heading
    const heroHeading = page.locator('h1').first();
    await expect(heroHeading).toBeVisible();

    // Navigation links should be present
    await expect(page.locator('nav')).toBeVisible();
  });

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
