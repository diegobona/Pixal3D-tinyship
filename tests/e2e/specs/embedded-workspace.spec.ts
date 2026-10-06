import { test, expect, type Page } from '@playwright/test';

const frameId = 'pixal3d-inline-trial-iframe';
const spaceUrl = 'https://victor-pixal3d-studio.hf.space';

async function mockWorkspaceSession(page: Page, authenticated: boolean) {
  await page.route('**/api/auth/get-session**', async (route) => {
    await route.fulfill({ json: authenticated ? {
      session: { id: 'layout-session', token: 'layout-token', userId: 'layout-user', expiresAt: new Date(Date.now() + 60_000).toISOString() },
      user: { id: 'layout-user', name: 'Layout User', email: 'layout@example.com', emailVerified: true },
    } : null });
  });
  await page.route('**/api/credits/status', async (route) => {
    await route.fulfill({ json: { credits: { balance: 0 }, subscription: null } });
  });
  await page.route('**/embed.tawk.to/**', (route) => route.abort());
  // Gallery images/models are unrelated to workspace auth and recovery assertions.
  await page.route('https://ldyang694.github.io/**', (route) => route.abort());
}

async function deferIntersection(page: Page) {
  await page.addInitScript(() => {
    const NativeObserver = window.IntersectionObserver;
    const pending: (() => void)[] = [];
    Object.assign(window, { revealWorkspace: () => pending.forEach((reveal) => reveal()) });
    window.IntersectionObserver = class extends NativeObserver {
      constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        super(callback, options);
        if (options?.rootMargin === '200px') {
          this.observe = (target: Element) => {
            pending.push(() => callback([{ target, isIntersecting: true } as IntersectionObserverEntry], this));
          };
        }
      }
    };
  });
}

test.describe('Embedded workspace foundation', () => {
  test('defers remote mounting, reserves height, and retains the frame after scrolling away', async ({ page }) => {
    await mockWorkspaceSession(page, false);
    await deferIntersection(page);
    let frameRequests = 0;
    await page.route(`${spaceUrl}/**`, async (route) => {
      frameRequests += 1;
      await route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Workspace fixture</title><p>Workspace fixture</p>' });
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const container = page.getByTestId(`${frameId}-container`);
    await expect(container).toBeVisible();
    await expect(page.getByTestId(frameId)).toHaveCount(0);
    await expect(page.getByTestId(`${frameId}-placeholder`)).toContainText('will load when it comes into view');
    expect((await container.boundingBox())!.height).toBeGreaterThanOrEqual(900);
    expect(frameRequests).toBe(0);

    await page.evaluate(() => (window as unknown as { revealWorkspace: () => void }).revealWorkspace());
    const frame = page.getByTestId(frameId);
    await expect(frame).toHaveAttribute('loading', 'lazy');
    await expect(frame).toHaveAttribute('src', spaceUrl);
    await expect(frame).toHaveAttribute('referrerpolicy', 'no-referrer');
    await expect(frame).toHaveAttribute('sandbox', 'allow-downloads allow-forms allow-modals allow-popups allow-same-origin allow-scripts');
    await expect(page.getByTestId(`${frameId}-placeholder`)).toHaveCount(0);
    await expect(page.getByTestId('pixal3d-inline-trial-auth-overlay')).toBeVisible();
    await page.getByTestId('pixal3d-tutorial-links').scrollIntoViewIfNeeded();
    await expect(frame).toHaveCount(1);
    expect(frameRequests).toBe(1);
  });

  test('slow loading keeps the frame usable and recovers through a manual retry', async ({ page }) => {
    await mockWorkspaceSession(page, true);
    await deferIntersection(page);
    let requests = 0;
    let releaseFirst: () => void = () => {};
    const firstRequestGate = new Promise<void>((resolve) => { releaseFirst = resolve; });
    await page.route(`${spaceUrl}/**`, async (route) => {
      requests += 1;
      if (requests === 1) {
        await firstRequestGate;
        await route.abort().catch(() => {});
      } else {
        await route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Recovered workspace</title><p>Recovered workspace</p>' });
      }
    });
    try {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('pixal3d-reference-image-cta')).toBeVisible();
      await page.clock.install();
      await page.evaluate(() => (window as unknown as { revealWorkspace: () => void }).revealWorkspace());
      await expect(page.getByTestId(frameId)).toHaveCount(1);
      await expect.poll(() => requests).toBe(1);
      await page.clock.runFor(30_100);
      const help = page.getByTestId(`${frameId}-help`);
      await expect(help).toContainText('taking longer to load');
      await expect(page.getByTestId(`${frameId}-placeholder`)).toHaveCount(0);
      await expect(page.getByTestId(frameId)).toHaveCount(1);
      await expect(help.getByRole('link', { name: 'Open on Hugging Face' })).toHaveAttribute('href', spaceUrl);
      await help.getByRole('button', { name: 'Reload workspace' }).click();
      releaseFirst();
      await expect.poll(() => requests).toBe(2);
      await expect(page.getByTestId(`${frameId}-placeholder`)).toHaveCount(0);
      await expect(help).toHaveCount(0);
    } finally {
      releaseFirst();
    }
  });

  test('brand bar and help are translated without moving the signed-in image helper', async ({ page }) => {
    await mockWorkspaceSession(page, true);
    await page.route(`${spaceUrl}/**`, (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><p>Workspace fixture</p>' }));
    for (const [path, title, helpLabel, dismissLabel] of [
      ['/', 'Pixal3D workspace', 'Workspace not responding?', 'Dismiss help'],
      ['/zh-CN', 'Pixal3D 工作台', '工作台没有响应？', '关闭帮助'],
    ]) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      const brand = page.getByTestId('pixal3d-inline-trial-brand');
      await expect(brand).toContainText(title);
      await expect(brand.getByRole('link')).toHaveCount(0);
      const frame = page.getByTestId(frameId);
      const helper = page.getByTestId('pixal3d-reference-image-cta');
      await expect(helper).toBeVisible();
      await expect(frame).toBeVisible();
      const frameBox = (await frame.boundingBox())!;
      const helperBox = (await helper.boundingBox())!;
      expect(helperBox.x - frameBox.x).toBeGreaterThanOrEqual(108);
      expect(helperBox.x - frameBox.x).toBeLessThanOrEqual(116);
      expect(helperBox.y - frameBox.y).toBeGreaterThanOrEqual(100);
      expect(helperBox.y - frameBox.y).toBeLessThanOrEqual(106);
      await page.getByTestId(`${frameId}-container`).getByRole('button', { name: helpLabel, exact: true }).click();
      await page.getByTestId(`${frameId}-help`).getByRole('button', { name: dismissLabel }).click();
      await expect(page.getByTestId(`${frameId}-help`)).toHaveCount(0);
      await expect(frame).toHaveCount(1);
    }
  });
});
