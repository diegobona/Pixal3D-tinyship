import { test, expect, type Page } from '@playwright/test';
import { tutorialPath, tutorialSlugs, TUTORIAL_REVIEWED_AT, type TutorialSlug } from '../../../config/tutorials';
import { tutorialsEn } from '../../../libs/i18n/locales/tutorials/en';
import { tutorialsZhCN } from '../../../libs/i18n/locales/tutorials/zh-CN';
import { TIMEOUTS } from '../helpers/constants';

const ORIGIN = 'http://localhost:7001';
const dictionaries = { en: tutorialsEn, 'zh-CN': tutorialsZhCN };
const locales = ['en', 'zh-CN'] as const;
const sections = ['requirements', 'steps', 'performance', 'errors', 'files', 'screenshots'] as const;
const prohibitedRequests = new WeakMap<Page, string[]>();

function localizedPath(slug: TutorialSlug, locale: (typeof locales)[number]) {
  return (locale === 'en' ? '' : '/zh-CN') + tutorialPath(slug);
}

test.describe('Public Pixal3D tutorials', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addCookies([{
      name: 'NEXT_LOCALE',
      value: 'en',
      url: ORIGIN,
      httpOnly: true,
      sameSite: 'Lax',
    }]);
    await page.route('**/api/auth/get-session**', (route) => route.fulfill({ json: null }));
    await page.route('**/api/credits/status', (route) => route.fulfill({
      json: { credits: { balance: 0 }, subscription: null },
    }));
    await page.route(/^https:\/\/[^/]+\.hf\.space(?:\/|$)/, (route) => route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>External workspace fixture</title><p>External workspace fixture</p>',
    }));
    await page.route(/^https:\/\/(?:[^/]+\.)?tawk\.to\//, (route) => route.abort());
    // Source image delivery is checked separately; these tests verify provenance attributes.
    await page.route('https://raw.githubusercontent.com/**', (route) => route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700"><rect width="1200" height="700" fill="#0b1937"/></svg>',
    }));
    await page.route('https://ldyang694.github.io/**', (route) => route.abort());

    const unexpected: string[] = [];
    prohibitedRequests.set(page, unexpected);
    await page.route(/\/api\/(?:hf-pixal3d-instance|3d-generate)(?:[/?]|$)/, async (route) => {
      unexpected.push(route.request().url());
      await route.abort();
    });
  });

  test.afterEach(async ({ page }) => {
    expect(prohibitedRequests.get(page), 'Tutorial browsing must not reserve a trial or generate a model').toEqual([]);
  });

  for (const locale of locales) {
    for (const slug of tutorialSlugs) {
      test(locale + ' ' + slug + ' is public, sourced, and has clean localized metadata', async ({ page }) => {
        const dictionary = dictionaries[locale];
        const content = dictionary.pages[slug];
        const path = localizedPath(slug, locale);
        const response = await page.goto(path + '?campaign=tutorial-e2e', {
          timeout: TIMEOUTS.navigation,
          waitUntil: 'domcontentloaded',
        });

        expect(response?.status()).toBe(200);
        await expect(page).toHaveURL(ORIGIN + path + '?campaign=tutorial-e2e');
        await expect(page.getByRole('heading', { level: 1, name: content.title, exact: true })).toBeVisible();
        await expect(page.locator('html')).toHaveAttribute('lang', locale);
        await expect(page.locator('iframe')).toHaveCount(0);
        const article = page.getByTestId('tutorial-article');
        await expect(article).toBeVisible();
        expect(await article.locator(':scope > section').evaluateAll((nodes) => nodes.map((node) => node.id))).toEqual(sections);

        for (const section of sections) {
          await expect(article.locator('#' + section).getByRole('heading', {
            level: 2,
            name: dictionary.common[section],
            exact: true,
          })).toHaveCount(1);
        }
        for (const section of ['requirements', 'steps', 'errors', 'files'] as const) {
          const sectionLocator = article.locator('#' + section);
          await expect(sectionLocator.getByRole('heading', { level: 3 })).toHaveCount(content[section].length);
          expect(await sectionLocator.locator('a[target="_blank"]').count()).toBeGreaterThan(0);
        }
        await expect(article.locator('#steps h3')).toContainText(content.steps.map((step) => step.title));
        await expect(article.locator('#steps h3 > span')).toHaveText(content.steps.map((_, index) => (index + 1) + '.'));
        await expect(article.locator('#performance').getByRole('columnheader')).toHaveText([
          dictionary.common.configuration,
          dictionary.common.memory,
          dictionary.common.time,
          dictionary.common.evidence,
        ]);
        await expect(article.locator('#performance tbody tr')).toHaveCount(content.performance.rows.length);

        const citations = article.locator('ul[aria-label="' + dictionary.common.source + '"] a');
        expect(await citations.count()).toBeGreaterThan(0);
        for (const citation of await citations.all()) {
          await expect(citation).toHaveAttribute('href', /^https:\/\//);
          await expect(citation).toHaveAttribute('target', '_blank');
          await expect(citation).toHaveAttribute('rel', 'noreferrer noopener');
          expect((await citation.innerText()).trim()).not.toBe('');
        }
        const figures = article.locator('#screenshots figure');
        expect(content.screenshots.items.length).toBeGreaterThan(0);
        await expect(figures).toHaveCount(content.screenshots.items.length);
        for (const [index, evidence] of content.screenshots.items.entries()) {
          const figure = figures.nth(index);
          const image = figure.locator('img');
          await expect(image).toHaveAttribute('src', evidence.src);
          await expect(image).toHaveAttribute('alt', evidence.alt);
          await expect(image).toHaveAttribute('loading', 'lazy');
          await expect(image).toHaveAttribute('decoding', 'async');
          await expect(figure.locator('figcaption')).toContainText(evidence.caption);
          await expect(figure.locator('a').first()).toHaveAttribute('href', evidence.source.href);
        }

        await expect(page).toHaveTitle(content.title);
        await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', content.description);
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', ORIGIN + path);
        await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute('href', ORIGIN + tutorialPath(slug));
        await expect(page.locator('link[rel="alternate"][hreflang="zh-CN"]')).toHaveAttribute('href', ORIGIN + '/zh-CN' + tutorialPath(slug));
        await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute('href', ORIGIN + tutorialPath(slug));
        await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', ORIGIN + path);
        await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0);
        for (const other of tutorialSlugs.filter((candidate) => candidate !== slug)) {
          expect(await page.title()).not.toBe(dictionary.pages[other].title);
          expect(content.description).not.toBe(dictionary.pages[other].description);
        }
      });
    }
  }

  test('redirects every English-prefixed tutorial to its clean public URL', async ({ page }) => {
    for (const slug of tutorialSlugs) {
      await page.goto('/en' + tutorialPath(slug) + '?campaign=alias-e2e', {
        timeout: TIMEOUTS.navigation,
        waitUntil: 'domcontentloaded',
      });
      await expect(page).toHaveURL(ORIGIN + tutorialPath(slug) + '?campaign=alias-e2e');
      await expect(page.getByRole('heading', { level: 1, name: tutorialsEn.pages[slug].title, exact: true })).toBeVisible();
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', ORIGIN + tutorialPath(slug));
    }
  });

  test('publishes tutorial language variants in sitemap and permits public crawling', async ({ request, page }) => {
    const sitemapResponse = await request.get('/sitemap.xml');
    expect(sitemapResponse.ok()).toBe(true);
    const sitemap = await sitemapResponse.text();
    const entries = await page.evaluate((xml) => {
      const document = new DOMParser().parseFromString(xml, 'application/xml');
      return Array.from(document.getElementsByTagName('url')).map((node) => ({
        url: node.getElementsByTagName('loc')[0]?.textContent,
        lastModified: node.getElementsByTagName('lastmod')[0]?.textContent,
        alternates: Array.from(node.getElementsByTagNameNS('http://www.w3.org/1999/xhtml', 'link')).map((link) => ({
          locale: link.getAttribute('hreflang'),
          href: link.getAttribute('href'),
        })),
      }));
    }, sitemap);
    for (const slug of tutorialSlugs) {
      const entry = entries.find((candidate) => candidate.url === ORIGIN + tutorialPath(slug));
      expect(entry).toBeDefined();
      expect(entry?.lastModified).toMatch(new RegExp('^' + TUTORIAL_REVIEWED_AT));
      expect(entry?.alternates).toEqual(expect.arrayContaining([
        { locale: 'en', href: ORIGIN + tutorialPath(slug) },
        { locale: 'zh-CN', href: ORIGIN + '/zh-CN' + tutorialPath(slug) },
        { locale: 'x-default', href: ORIGIN + tutorialPath(slug) },
      ]));
    }
    for (const entry of entries) {
      expect(new URL(entry.url!).pathname).not.toMatch(/^\/(?:zh-CN\/)?(?:api|dashboard|my-assets|signin|signup|payment-success|payment-cancel)(?:\/|$)/);
    }

    const robotsResponse = await request.get('/robots.txt');
    expect(robotsResponse.ok()).toBe(true);
    const robots = await robotsResponse.text();
    expect(robots).toMatch(/^User-Agent:\s*\*\s*$/im);
    expect(robots).toMatch(/^Allow:\s*\/\s*$/im);
    expect(robots).toContain('Sitemap: ' + ORIGIN + '/sitemap.xml');
    const disallowed = Array.from(robots.matchAll(/^Disallow:\s*(\S+)\s*$/gim), (match) => match[1]);
    expect(disallowed).toEqual(expect.arrayContaining([
      '/api/', '/dashboard', '/my-assets', '/signin', '/signup', '/payment-success', '/payment-cancel',
      '/zh-CN/dashboard', '/zh-CN/my-assets', '/zh-CN/signin', '/zh-CN/signup',
      '/zh-CN/payment-success', '/zh-CN/payment-cancel',
    ]));
    for (const slug of tutorialSlugs) {
      for (const prefix of ['', '/zh-CN', '/en']) {
        expect(disallowed.some((rule) => (prefix + tutorialPath(slug)).startsWith(rule))).toBe(false);
      }
    }
  });

  test('keeps homepage, related tutorial, and home links in the current language', async ({ page }) => {
    test.setTimeout(60_000);
    for (const locale of locales) {
      const dictionary = dictionaries[locale];
      const home = locale === 'en' ? '/' : '/zh-CN';
      await page.goto(home, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', {
        level: 1,
        name: locale === 'en' ? 'Turn Any Image into a Faithful 3D Model' : '把任意图片变成高还原度 3D 模型',
        exact: true,
      })).toBeVisible();
      const homeLinks = page.getByTestId('pixal3d-tutorial-links');
      await expect(homeLinks.getByRole('link')).toHaveCount(4);
      for (const slug of tutorialSlugs) {
        await expect(homeLinks.getByRole('link', { name: dictionary.pages[slug].title })).toHaveAttribute('href', localizedPath(slug, locale));
      }
      await homeLinks.getByRole('link', { name: dictionary.pages['how-to-install-locally'].title }).click();
      await expect(page).toHaveURL(ORIGIN + localizedPath('how-to-install-locally', locale));
      const related = page.getByTestId('tutorial-related');
      await expect(related.getByRole('link')).toHaveCount(3);
      for (const slug of tutorialSlugs.filter((candidate) => candidate !== 'how-to-install-locally')) {
        await expect(related.getByRole('link', { name: dictionary.pages[slug].title })).toHaveAttribute('href', localizedPath(slug, locale));
      }
      await related.getByRole('link', { name: dictionary.pages.gguf.title }).click();
      await expect(page).toHaveURL(ORIGIN + localizedPath('gguf', locale));
      await page.locator('main').getByRole('link', { name: '← ' + dictionary.common.home, exact: true }).click();
      await expect(page).toHaveURL(ORIGIN + home);
      await expect(page.getByTestId('pixal3d-tutorial-links')).toBeAttached();
    }
  });

  test('contains commands and performance tables within the mobile page width', async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 390, height: 844 });
    for (const locale of locales) {
      for (const slug of tutorialSlugs) {
        await page.goto(localizedPath(slug, locale), { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
        await expect(page.getByTestId('tutorial-article')).toBeVisible();
        const geometry = await page.evaluate(() => ({
          viewport: window.innerWidth,
          document: document.documentElement.scrollWidth,
          body: document.body.scrollWidth,
        }));
        expect(geometry.document, locale + ' ' + slug + ' document width').toBeLessThanOrEqual(geometry.viewport + 1);
        expect(geometry.body, locale + ' ' + slug + ' body width').toBeLessThanOrEqual(geometry.viewport + 1);
        const scrollRegions = await page.locator('#steps pre, #performance > div').evaluateAll((nodes) => nodes.map((node) => ({
          overflow: getComputedStyle(node).overflowX,
          width: node.getBoundingClientRect().width,
          scrollWidth: node.scrollWidth,
          clientWidth: node.clientWidth,
        })));
        expect(scrollRegions.length).toBeGreaterThan(0);
        for (const region of scrollRegions) {
          expect(region.overflow).toMatch(/auto|scroll/);
          expect(region.width).toBeLessThanOrEqual(390);
        }
        expect(scrollRegions.some((region) => region.scrollWidth > region.clientWidth)).toBe(true);
      }
    }
  });

  test('switches languages without losing the tutorial slug or query parameters', async ({ page, context }) => {
    const query = '?campaign=tutorial-locale&mode=low-memory';
    await page.goto('/low-vram' + query, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
    await page.getByTestId('locale-switcher').locator('summary').click();
    await page.getByRole('menuitemradio', { name: '简体中文', exact: true }).click();
    await expect(page).toHaveURL(ORIGIN + '/zh-CN/low-vram' + query);
    await expect(page.getByRole('heading', { level: 1, name: tutorialsZhCN.pages['low-vram'].title, exact: true })).toBeVisible();
    expect((await context.cookies()).find((cookie) => cookie.name === 'NEXT_LOCALE')).toMatchObject({
      value: 'zh-CN', httpOnly: true, sameSite: 'Lax', path: '/',
    });
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', ORIGIN + '/zh-CN/low-vram');

    await page.getByTestId('locale-switcher').locator('summary').click();
    await page.getByRole('menuitemradio', { name: 'English', exact: true }).click();
    await expect(page).toHaveURL(ORIGIN + '/low-vram' + query);
    await expect(page.getByRole('heading', { level: 1, name: tutorialsEn.pages['low-vram'].title, exact: true })).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', ORIGIN + '/low-vram');
  });
});
