import { test, expect, type BrowserContext } from '@playwright/test';
import { PAGES, TIMEOUTS, uniqueEmail } from '../helpers/constants';
import { signUpViaAPI } from '../helpers/auth';
import { seedCredits } from '../helpers/credits';

test.describe('My Assets History', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180_000);
  test.skip(
    !process.env.FAL_API_KEY && !process.env.FAL_KEY,
    'requires FAL_API_KEY or FAL_KEY for Pixal3D task creation'
  );

  let authContext: BrowserContext;
  let userId: string;

  test.beforeAll(async ({ browser }) => {
    const email = uniqueEmail('my-assets');
    authContext = await browser.newContext();
    const page = await authContext.newPage();

    const signUpRes = await signUpViaAPI(page, {
      name: 'My Assets Test User',
      email,
      password: 'TestPassword123!',
    });
    expect(signUpRes.ok(), `Sign-up failed: ${signUpRes.status()}`).toBeTruthy();

    const body = await signUpRes.json();
    userId = body.user?.id ?? body.id;
    expect(userId, 'Could not extract userId from sign-up response').toBeTruthy();

    await seedCredits(userId, 5000);
    await page.close();
  });

  test.afterAll(async () => {
    await authContext?.close();
  });

  test('creates a Pixal3D task and shows it in my-assets history', async () => {
    const page = await authContext.newPage();

    await page.goto('/', { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/$/);

    const sampleButton = page.locator('button[aria-label^="Use sample"]').first();
    await expect(sampleButton).toBeVisible({ timeout: TIMEOUTS.navigation });
    await sampleButton.click();

    const generateButton = page.getByTestId('pixal3d-generate-button');
    await expect(generateButton).toBeVisible();
    await expect(generateButton).toBeEnabled({ timeout: 20_000 });

    const createTaskResponsePromise = page.waitForResponse((response) => {
      return response.url().includes('/api/3d-generate')
        && response.request().method() === 'POST';
    }, { timeout: 60_000 });

    await generateButton.click();

    const createTaskResponse = await createTaskResponsePromise;
    expect(createTaskResponse.status(), 'Pixal3D task creation should succeed').toBe(200);

    const createTaskBody = await createTaskResponse.json();
    expect(createTaskBody?.success).toBeTruthy();
    expect(createTaskBody?.data?.taskId).toBeTruthy();

    await expect(page.getByTestId('pixal3d-generation-progress')).toBeVisible({ timeout: 20_000 });

    await page.goto('/my-assets', { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/my-assets$/);
    await expect(page.getByTestId('my-assets-title')).toBeVisible();
    await expect(page.getByTestId('my-assets-empty-state')).toHaveCount(0);
    await expect(page.getByTestId('my-assets-grid')).toBeVisible();

    const cards = page.getByTestId('my-assets-card');
    await expect(cards).toHaveCount(1, { timeout: 20_000 });

    const firstCard = cards.first();
    await expect(firstCard.getByTestId('my-assets-model-tile')).toBeVisible();

    const statusText = (await firstCard.getByTestId('my-assets-status').textContent())?.trim() ?? '';
    expect(statusText).toMatch(/Processing|Completed/);

    const previewButtons = page.getByTestId('my-assets-preview-button');
    if (await previewButtons.count()) {
      await previewButtons.first().click();
      await expect(page.getByTestId('pixal3d-glb-preview-dialog')).toBeVisible({ timeout: 15_000 });
    }

    await page.close();
  });
});
