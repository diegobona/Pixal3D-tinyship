import { createHash } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { test, expect, type ElementHandle, type Page } from '@playwright/test';
import { comparisonActions, comparisonSources, comparisonWorkspaces, IMAGE_TO_3D_REVIEWED_AT, intentWorkspaces, publicModelSamples } from '../../../config/image-to-3d';
import { tutorialPath, tutorialSlugs } from '../../../config/tutorials';
import { imageTo3DEn } from '../../../libs/i18n/locales/image-to-3d/en';
import { imageTo3DZhCN } from '../../../libs/i18n/locales/image-to-3d/zh-CN';
import { tutorialsEn } from '../../../libs/i18n/locales/tutorials/en';
import { tutorialsZhCN } from '../../../libs/i18n/locales/tutorials/zh-CN';
import { embedEn, embedZhCN } from '../../../libs/i18n/locales/embed';
import { TIMEOUTS } from '../helpers/constants';
import { SPACE_DEFAULT_TARGETS, workspaceUrl } from '../../../config/space-workspaces';
import { startWorkspaceFixtureServer } from '../helpers/space-workspace-fixture';

const ORIGIN = 'http://localhost:7001';
const LOCAL_ORIGINS = [ORIGIN, 'http://127.0.0.1:7001'] as const;
const locales = ['en', 'zh-CN'] as const;
const slugs = ['image-to-3d-model-free-download', 'image-to-3d'] as const;
const models = ['pixal3d', 'rodin', 'trellis', 'hunyuan3d'] as const;
const embeddedModels = ['pixal3d', 'trellis', 'hunyuan3d'] as const;
const comparisonFrameIds = { pixal3d: 'intent-workspace-compare', trellis: 'intent-workspace-trellis', hunyuan3d: 'intent-workspace-hunyuan3d' } as const;
const dictionaries = { en: imageTo3DEn, 'zh-CN': imageTo3DZhCN };
const tutorials = { en: tutorialsEn, 'zh-CN': tutorialsZhCN };
const prohibitedRequests = new WeakMap<Page, string[]>();
const resolvedWorkspaceTargets = new WeakMap<Page, string[]>();
const browserDiagnostics = new WeakMap<Page, string[]>();
const activeFixtureTargets = new WeakMap<Page, Record<(typeof embeddedModels)[number], string>>();
let workspaceFixtureServer: Awaited<ReturnType<typeof startWorkspaceFixtureServer>>;

function localizedPath(slug: string, locale: (typeof locales)[number]) {
  return (locale === 'en' ? '' : '/zh-CN') + '/' + slug;
}

function sha256(bytes: Buffer) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function captureIntentPage(page: Page, filename: string, fullPage = false) {
  const directory = path.join(process.cwd(), '.tmp', 'intent-pages');
  await mkdir(directory, { recursive: true });
  await page.screenshot({ path: path.join(directory, filename), fullPage });
}

async function expectSampleLibraryHidden(page: Page) {
  await expect(page.locator('#downloads, [data-testid^="sample-"], a[href="#downloads"], a[href^="/model-samples/"], img[src^="/model-samples/"]')).toHaveCount(0);
}

type Bounds = { min: number[]; max: number[] };
function emptyBounds(): Bounds {
  return { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
}

function includeVertex(bounds: Bounds, vertex: number[]) {
  for (let axis = 0; axis < 3; axis += 1) {
    bounds.min[axis] = Math.min(bounds.min[axis], vertex[axis]);
    bounds.max[axis] = Math.max(bounds.max[axis], vertex[axis]);
  }
}

function expectRealBounds(bounds: Bounds) {
  for (let axis = 0; axis < 3; axis += 1) {
    expect(Number.isFinite(bounds.min[axis]) && Number.isFinite(bounds.max[axis])).toBe(true);
    expect(bounds.max[axis] - bounds.min[axis]).toBeGreaterThan(0.01);
  }
}

function expectSameBounds(actual: Bounds, expected: Bounds) {
  expectRealBounds(actual);
  for (let axis = 0; axis < 3; axis += 1) {
    expect(actual.min[axis]).toBeCloseTo(expected.min[axis], 5);
    expect(actual.max[axis]).toBeCloseTo(expected.max[axis], 5);
  }
}

interface GltfDocument {
  asset: { version: string };
  scene?: number;
  scenes: { nodes: number[] }[];
  nodes: { mesh?: number; children?: number[] }[];
  meshes: { primitives: { indices: number; attributes: { POSITION: number }; mode?: number; material?: number }[] }[];
  accessors: { bufferView: number; byteOffset?: number; componentType: number; count: number; type: string }[];
  bufferViews: { buffer: number; byteOffset?: number; byteLength: number; byteStride?: number }[];
  materials: unknown[];
  textures: unknown[];
  images: { bufferView?: number; mimeType?: string }[];
}

// Inspect the delivered binary independently of the site's exporter and manifest.
function inspectGlb(bytes: Buffer) {
  expect(bytes.subarray(0, 4).toString()).toBe('glTF');
  expect(bytes.readUInt32LE(4)).toBe(2);
  expect(bytes.readUInt32LE(8)).toBe(bytes.length);
  expect(bytes.readUInt32LE(16)).toBe(0x4e4f534a);
  const jsonLength = bytes.readUInt32LE(12);
  const document = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString()) as GltfDocument;
  const binaryHeader = 20 + jsonLength;
  expect(bytes.readUInt32LE(binaryHeader + 4)).toBe(0x004e4942);
  const binary = bytes.subarray(binaryHeader + 8);
  expect(binary.length).toBe(bytes.readUInt32LE(binaryHeader));
  expect(document.asset.version).toBe('2.0');
  expect(document.scenes[document.scene ?? 0].nodes.length).toBeGreaterThan(0);
  expect(document.nodes.some((node) => node.mesh !== undefined)).toBe(true);
  expect(document.meshes.length).toBeGreaterThan(0);
  expect(document.materials.length).toBeGreaterThan(0);
  expect(document.textures.length).toBeGreaterThan(0);
  expect(document.images.length).toBeGreaterThan(0);
  for (const image of document.images) {
    expect(image.mimeType).toMatch(/^image\/(?:png|jpeg|webp)$/);
    expect(image.bufferView).toBeDefined();
    const view = document.bufferViews[image.bufferView!];
    expect(view.byteLength).toBeGreaterThan(100);
    expect((view.byteOffset ?? 0) + view.byteLength).toBeLessThanOrEqual(binary.length);
  }

  const bounds = emptyBounds();
  let triangles = 0;
  for (const mesh of document.meshes) {
    expect(mesh.primitives.length).toBeGreaterThan(0);
    for (const primitive of mesh.primitives) {
      expect(primitive.mode ?? 4).toBe(4);
      expect(primitive.material).toBeDefined();
      expect(primitive.material!).toBeLessThan(document.materials.length);
      const positions = document.accessors[primitive.attributes.POSITION];
      expect(positions.type).toBe('VEC3');
      expect(positions.componentType).toBe(5126);
      expect(positions.count).toBeGreaterThan(100);
      const positionView = document.bufferViews[positions.bufferView];
      expect(positionView.buffer).toBe(0);
      const positionOffset = (positionView.byteOffset ?? 0) + (positions.byteOffset ?? 0);
      const positionStride = positionView.byteStride ?? 12;
      expect(positionOffset + (positions.count - 1) * positionStride + 12).toBeLessThanOrEqual(binary.length);
      for (let index = 0; index < positions.count; index += 1) {
        const offset = positionOffset + index * positionStride;
        includeVertex(bounds, [binary.readFloatLE(offset), binary.readFloatLE(offset + 4), binary.readFloatLE(offset + 8)]);
      }
      const indices = document.accessors[primitive.indices];
      expect(indices.type).toBe('SCALAR');
      expect([5121, 5123, 5125]).toContain(indices.componentType);
      expect(indices.count % 3).toBe(0);
      const width = indices.componentType === 5125 ? 4 : indices.componentType === 5123 ? 2 : 1;
      const indexView = document.bufferViews[indices.bufferView];
      const offset = (indexView.byteOffset ?? 0) + (indices.byteOffset ?? 0);
      expect(offset + indices.count * width).toBeLessThanOrEqual(binary.length);
      let maxIndex = 0;
      for (let index = 0; index < indices.count; index += 1) {
        maxIndex = Math.max(maxIndex, binary.readUIntLE(offset + index * width, width));
      }
      expect(maxIndex).toBeLessThan(positions.count);
      triangles += indices.count / 3;
    }
  }
  expect(triangles).toBeGreaterThan(1_000);
  expectRealBounds(bounds);
  return { triangles, bounds };
}

function inspectStl(bytes: Buffer) {
  expect(bytes.length).toBeGreaterThan(84);
  expect(bytes.subarray(0, 80).toString()).toContain('GLB geometry export');
  const triangles = bytes.readUInt32LE(80);
  expect(bytes.length).toBe(84 + triangles * 50);
  const bounds = emptyBounds();
  for (let triangle = 0; triangle < triangles; triangle += 1) {
    for (let vertex = 0; vertex < 3; vertex += 1) {
      const offset = 84 + triangle * 50 + 12 + vertex * 12;
      includeVertex(bounds, [bytes.readFloatLE(offset), bytes.readFloatLE(offset + 4), bytes.readFloatLE(offset + 8)]);
    }
  }
  return { triangles, bounds };
}

function inspectObj(bytes: Buffer) {
  const bounds = emptyBounds();
  let vertices = 0;
  let triangles = 0;
  let minIndex = Infinity;
  let maxIndex = 0;
  let triangular = true;
  for (const line of bytes.toString().split(/\r?\n/)) {
    if (line.startsWith('v ')) {
      includeVertex(bounds, line.trim().split(/\s+/).slice(1).map(Number));
      vertices += 1;
    } else if (line.startsWith('f ')) {
      const face = line.trim().split(/\s+/).slice(1).map((part) => Number(part.split('/')[0]));
      triangular &&= face.length === 3;
      minIndex = Math.min(minIndex, ...face);
      maxIndex = Math.max(maxIndex, ...face);
      triangles += 1;
    }
  }
  expect(vertices).toBeGreaterThan(100);
  expect(triangular).toBe(true);
  expect(minIndex).toBeGreaterThanOrEqual(1);
  expect(maxIndex).toBeLessThanOrEqual(vertices);
  return { triangles, bounds };
}

test.describe('Public image-to-3D intent pages', () => {
  test.beforeAll(async () => { workspaceFixtureServer = await startWorkspaceFixtureServer(); });
  test.afterAll(async () => { await workspaceFixtureServer.close(); });
  test.beforeEach(async ({ page, context }) => {
    const diagnostics: string[] = [];
    browserDiagnostics.set(page, diagnostics);
    page.on('pageerror', (error) => diagnostics.push('pageerror: ' + error.message));
    page.on('console', (message) => { if (message.type() === 'error') diagnostics.push('console: ' + message.text()); });
    page.on('requestfailed', (request) => {
      if (LOCAL_ORIGINS.some((origin) => request.url().startsWith(origin + '/')) && request.resourceType() === 'script') diagnostics.push('script: ' + request.url() + ' ' + request.failure()?.errorText);
    });
    await context.addCookies([{ name: 'NEXT_LOCALE', value: 'en', url: ORIGIN, httpOnly: true, sameSite: 'Lax' }]);
    await page.route('**/api/auth/get-session**', (route) => route.fulfill({ json: null }));
    await page.route('**/api/credits/status', (route) => route.fulfill({ json: { credits: { balance: 0 }, subscription: null } }));
    const frames: string[] = [];
    resolvedWorkspaceTargets.set(page, frames);
    const targets = Object.fromEntries(embeddedModels.map((model) => [model, SPACE_DEFAULT_TARGETS[model].url])) as Record<(typeof embeddedModels)[number], string>;
    activeFixtureTargets.set(page, targets);
    // Browser 307 redirects are real; their final documents live on a second local
    // origin so redirect-chain routing cannot accidentally reach a real HF runner.
    await context.route(/\/api\/space-workspaces\/(pixal3d|trellis|hunyuan3d)(?:[/?]|$)/, (route) => {
      const model = new URL(route.request().url()).pathname.split('/').pop() as (typeof embeddedModels)[number];
      return route.fulfill({ status: 307, headers: { Location: workspaceFixtureServer.destination(targets[model]), 'Cache-Control': 'no-store' } });
    });
    page.on('request', (request) => {
      if (request.url().startsWith(workspaceFixtureServer.origin + '/')) frames.push(new URL(request.url()).searchParams.get('provider')!);
    });
    await page.route(/^https:\/\/[^/]+\.hf\.space(?:\/|$)/, (route) => route.abort());
    await page.route(/^https:\/\/(?:[^/]+\.)?tawk\.to\//, (route) => route.abort());
    await page.route('https://ldyang694.github.io/**', (route) => route.abort());
    const unexpected: string[] = [];
    prohibitedRequests.set(page, unexpected);
    await page.route(/\/api\/(?:hf-pixal3d-instance|3d-generate)(?:[/?]|$)/, async (route) => {
      unexpected.push(route.request().url());
      await route.abort();
    });
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) await testInfo.attach('browser-diagnostics', { body: browserDiagnostics.get(page)!.join('\n') || 'No page errors or failed local scripts.', contentType: 'text/plain' });
    expect(prohibitedRequests.get(page), 'Reading intent pages must not reserve a trial or spend generation credits').toEqual([]);
  });

  test('loads every model through the real anonymous resolver before the fixture provider boundary', async ({ page }) => {
    test.setTimeout(60_000);
    const resolved: string[] = [];
    await page.route(/\/api\/space-workspaces\/(pixal3d|trellis|hunyuan3d)$/, async (route) => {
      // Inspect the actual Next response without following it to a live provider.
      const response = await route.fetch({ maxRedirects: 0, timeout: 20_000 });
      const model = new URL(route.request().url()).pathname.split('/').pop() as (typeof embeddedModels)[number];
      expect(response.status()).toBe(307);
      expect(response.headers()['cache-control']).toContain('no-store');
      expect(response.headers().location).toBe(SPACE_DEFAULT_TARGETS[model].url);
      resolved.push(model);
      await route.fulfill({ status: 307, headers: { Location: workspaceFixtureServer.destination(response.headers().location), 'Cache-Control': 'no-store' } });
    });
    await page.goto('/image-to-3d', { waitUntil: 'domcontentloaded' });
    for (const model of embeddedModels) {
      await page.getByTestId('model-navigation').getByTestId('model-use-' + model).click();
      await expect(page.getByTestId(comparisonFrameIds[model])).toHaveAttribute('src', workspaceUrl(model));
      await expect(page.frameLocator('[data-testid="' + comparisonFrameIds[model] + '"]').getByTestId('fixture-provider')).toHaveText(SPACE_DEFAULT_TARGETS[model].url);
    }
    expect(resolved).toEqual([...embeddedModels]);
    expect(resolvedWorkspaceTargets.get(page)).toEqual(embeddedModels.map((model) => SPACE_DEFAULT_TARGETS[model].url));
  });

  for (const locale of locales) {
    test(locale + ' applies a changed resolver target only to new loads or explicit retries', async ({ page, context }) => {
      const labels = locale === 'en' ? embedEn : embedZhCN;
      await page.setViewportSize(locale === 'en' ? { width: 1280, height: 1050 } : { width: 390, height: 844 });
      await page.goto(localizedPath('image-to-3d', locale), { waitUntil: 'domcontentloaded' });
      const navigation = page.getByTestId('model-navigation');
      const initialPixal = await page.getByTestId(comparisonFrameIds.pixal3d).elementHandle();
      await page.frameLocator('[data-testid="intent-workspace-compare"]').getByRole('textbox').fill('Pixal session remains');
      await navigation.getByTestId('model-use-trellis').click();
      const initialTrellis = await page.getByTestId(comparisonFrameIds.trellis).elementHandle();
      const trellisFrame = page.frameLocator('[data-testid="intent-workspace-trellis"]');
      await trellisFrame.getByRole('textbox').fill('Existing TRELLIS input');

      // This changes only the controlled resolver fixture, never database state.
      const targets = activeFixtureTargets.get(page)!;
      targets.trellis = 'https://fixture-trellis-alternative.hf.space';
      targets.hunyuan3d = 'https://fixture-hunyuan-alternative.hf.space';
      await navigation.getByTestId('model-use-pixal3d').click();
      await navigation.getByTestId('model-use-trellis').click();
      expect(await initialTrellis!.evaluate((node) => node.isConnected)).toBe(true);
      await expect(trellisFrame.getByRole('textbox')).toHaveValue('Existing TRELLIS input');
      await expect(trellisFrame.getByTestId('fixture-provider')).toHaveText(SPACE_DEFAULT_TARGETS.trellis.url);
      expect(resolvedWorkspaceTargets.get(page)).toEqual([SPACE_DEFAULT_TARGETS.pixal3d.url, SPACE_DEFAULT_TARGETS.trellis.url]);

      await navigation.getByTestId('model-use-hunyuan3d').click();
      await expect(page.frameLocator('[data-testid="intent-workspace-hunyuan3d"]').getByTestId('fixture-provider')).toHaveText(targets.hunyuan3d);
      await navigation.getByTestId('model-use-trellis').click();
      await page.getByTestId('workspace-panel-trellis').getByRole('button', { name: labels.help, exact: true }).click();
      const help = page.getByTestId('intent-workspace-trellis-help');
      await expect(help.getByRole('link', { name: labels.open, exact: true })).toHaveAttribute('href', workspaceUrl('trellis'));
      const popupEvent = context.waitForEvent('page');
      await help.getByRole('link', { name: labels.open, exact: true }).click();
      const popup = await popupEvent;
      await expect(popup.getByTestId('fixture-provider')).toHaveText(targets.trellis);
      await popup.close();
      expect(await initialTrellis!.evaluate((node) => node.isConnected)).toBe(true);
      await expect(trellisFrame.getByRole('textbox')).toHaveValue('Existing TRELLIS input');

      await help.getByRole('button', { name: labels.retry, exact: true }).click();
      await expect(trellisFrame.getByTestId('fixture-provider')).toHaveText(targets.trellis);
      await expect(trellisFrame.getByRole('textbox')).toHaveValue('');
      expect(await initialTrellis!.evaluate((node) => node.isConnected)).toBe(false);
      expect(await initialPixal!.evaluate((node) => node.isConnected)).toBe(true);
      await expect(page.frameLocator('[data-testid="intent-workspace-compare"]').getByRole('textbox', { includeHidden: true })).toHaveValue('Pixal session remains');
      await expect(page.locator('iframe')).toHaveCount(3);
      await expect(page.locator('iframe:visible')).toHaveCount(1);
      expect(resolvedWorkspaceTargets.get(page)).toEqual([SPACE_DEFAULT_TARGETS.pixal3d.url, SPACE_DEFAULT_TARGETS.trellis.url, targets.hunyuan3d, targets.trellis]);
    });

    for (const slug of slugs) {
      test(locale + ' ' + slug + ' has distinct public content, metadata, sources, and working FAQs', async ({ page }) => {
        const dictionary = dictionaries[locale];
        const isComparison = slug === 'image-to-3d';
        const content = isComparison ? dictionary.comparison : dictionary.download;
        const pagePath = localizedPath(slug, locale);
        if (process.env.E2E_CAPTURE_INTENT_PAGES === 'true') {
          await page.setViewportSize({ width: 1280, height: 1050 });
        }
        const response = await page.goto(pagePath + '?campaign=intent-e2e', { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
        expect(response?.status()).toBe(200);
        await expect(page).toHaveURL(ORIGIN + pagePath + '?campaign=intent-e2e');
        const intentPage = page.getByTestId('intent-page');
        await expect(intentPage).toBeVisible();
        await expect(intentPage.getByRole('heading', { level: 1, name: content.title, exact: true })).toBeVisible();
        await expect(page.getByTestId('intent-page-header').locator('p')).toHaveText(content.summary);
        await expect(page.locator('html')).toHaveAttribute('lang', locale);
        const frameId = isComparison ? 'intent-workspace-compare' : 'intent-workspace-download';
        const frame = page.getByTestId(frameId);
        await expect(page.locator('iframe')).toHaveCount(1);
        await expect(frame).toBeInViewport({ ratio: 0.2 });
        const workspaceName = locale === 'en' ? 'Pixal3D workspace' : 'Pixal3D 工作台';
        if (isComparison) {
          const navigation = page.getByTestId('model-navigation');
          await expect(navigation).toHaveAccessibleName(dictionary.comparison.modelNavigation);
          await expect(navigation).toBeInViewport();
          await expect(navigation.getByRole('link')).toHaveCount(5);
          await expect(navigation.getByRole('button')).toHaveCount(3);
          for (const model of models) {
            const copy = dictionary.comparison.models[model];
            await expect(navigation.getByRole('link', { name: copy.shortName, exact: true })).toHaveAttribute('href', '#model-' + model);
            const useLink = navigation.getByTestId('model-use-' + model);
            const external = comparisonActions[model].onlineUrl.startsWith('https://');
            if (external) await expect(useLink).toHaveAttribute('href', comparisonActions[model].onlineUrl);
            else {
              await expect(useLink).toHaveAttribute('type', 'button');
              await expect(useLink).toHaveAttribute('aria-pressed', String(model === 'pixal3d'));
              await expect(useLink).toBeEnabled();
            }
            await expect(useLink).toHaveAccessibleName((external ? dictionary.comparison.openOnline : dictionary.comparison.tryHere) + ': ' + copy.shortName);
            await expect(navigation.getByText(copy.accessBadge, { exact: true }).first()).toBeVisible();
          }
          await expect(intentPage.locator('#workspace > p')).toHaveCount(0);
          await expect(intentPage.locator('#models > p')).toHaveCount(0);
          await expect(intentPage.locator('#models-title')).toHaveText(dictionary.comparison.modelsTitle);
        } else {
          if (locale === 'en') expect(content.title).toMatch(/Free.*Download/);
          const workflow = page.getByTestId('download-workflow');
          await expect(workflow.locator('li')).toHaveText(dictionary.download.workspaceSteps.map((step, index) => (index + 1) + step));
          await expect(workflow).toBeInViewport();
          await expect(page.getByTestId('intent-workspace-bar').getByText(dictionary.download.downloadFallbackHint, { exact: true })).toBeVisible();
          const exportHelp = page.getByTestId('download-export-help');
          await expect(exportHelp.locator('p')).toHaveText(dictionary.download.exportHint);
          await expect(exportHelp.getByRole('link')).toHaveCount(0);
          await expect(intentPage.locator('#workspace > p')).toHaveCount(0);
        }
        await expect(intentPage.locator('#workspace')).toHaveAccessibleName(isComparison ? dictionary.comparison.modelNavigation : workspaceName);
        await expect(frame).toHaveAttribute('title', workspaceName);
        if (isComparison) {
          await expect(intentPage.locator('header a[href^="#"]')).toHaveAttribute('href', '#models');
          await intentPage.locator('header a[href^="#"]').click();
          await expect(page).toHaveURL(ORIGIN + pagePath + '?campaign=intent-e2e#models');
        } else {
          await expect(intentPage.locator('header a[href^="#"]')).toHaveCount(0);
          await expect(page).toHaveURL(ORIGIN + pagePath + '?campaign=intent-e2e');
        }

        expect(await intentPage.locator(':scope > div > article > section').evaluateAll((nodes) => nodes.map((node) => node.id))).toEqual(['workspace']);
        const supporting = page.getByTestId('intent-supporting-content');
        expect(await supporting.locator(':scope > section').evaluateAll((nodes) => nodes.map((node) => node.id))).toEqual(isComparison ? ['models', 'faq'] : ['formats', 'faq']);
        await expect(intentPage.locator('#workflow, #selection')).toHaveCount(0);
        if (isComparison) {
          const fields = ['avoid', 'quality', 'formats', 'runtime', 'memory', 'time'] as const;
          const quickFields = ['formats', 'memory', 'time', 'quality', 'avoid'] as const;
          await expect(intentPage.locator('#models article')).toHaveCount(4);
          for (const model of models) {
            const card = page.getByTestId('model-comparison-' + model);
            const copy = dictionary.comparison.models[model];
            await expect(card).toHaveAttribute('id', 'model-' + model);
            await expect(card.getByRole('heading', { level: 3 })).toHaveText(copy.name);
            if (model === 'pixal3d') {
              await expect(card.locator(':scope > p')).toHaveCount(0);
            } else {
              expect(copy.version).toBeTruthy();
              await expect(card.locator(':scope > p')).toHaveText(copy.version!);
            }
            await expect(card.locator(':scope > dl').first().locator('dt')).toHaveText(dictionary.common.suitable);
            await expect(card.locator(':scope > dl').first().locator('dd')).toHaveText(copy.suitable);
            await expect(card.locator(':scope > dl').first().locator('dd')).toBeVisible();
            const access = card.getByTestId('model-access-' + model);
            await expect(access.getByText(dictionary.comparison.accessLabel, { exact: true })).toBeVisible();
            await expect(access.getByText(copy.access, { exact: true })).toBeVisible();
            const actions = card.getByTestId('model-actions-' + model);
            const action = comparisonActions[model];
            await expect(actions.getByRole('link')).toHaveCount(1);
            const online = actions.getByTestId('model-use-' + model);
            const isExternalOnline = action.onlineUrl.startsWith('https://');
            await expect(online).toHaveAccessibleName((isExternalOnline ? dictionary.comparison.openOnline : dictionary.comparison.tryHere) + ': ' + copy.shortName);
            if (isExternalOnline) {
              await expect(online).toHaveAttribute('href', action.onlineUrl);
              await expect(online).toHaveAttribute('target', '_blank');
              await expect(online).toHaveAttribute('rel', 'noreferrer noopener');
            } else {
              await expect(online).toHaveAttribute('type', 'button');
              await expect(online).toHaveAttribute('aria-pressed', String(model === 'pixal3d'));
              await expect(online).toBeEnabled();
              await expect(online).not.toHaveAttribute('target');
            }
            if (action.localUrl) {
              const local = actions.getByRole('link', { name: dictionary.comparison.localSetup, exact: true });
              const isExternalLocal = action.localUrl.startsWith('https://');
              await expect(local).toHaveAttribute('href', isExternalLocal ? action.localUrl : localizedPath(action.localUrl.slice(1), locale));
              if (isExternalLocal) {
                await expect(local).toHaveAttribute('target', '_blank');
                await expect(local).toHaveAttribute('rel', 'noreferrer noopener');
              } else {
                await expect(local).not.toHaveAttribute('target');
              }
            }
            const facts = card.getByTestId('model-facts-' + model);
            await expect(facts.locator('dt')).toHaveText(quickFields.map((field) => dictionary.common[field]));
            await expect(facts.locator('dd')).toHaveText(quickFields.map((field) => copy.quickFacts[field]));
            for (const fact of await facts.locator('dd').all()) await expect(fact).toBeVisible();
            const details = page.getByTestId('model-details-' + model);
            await expect(details).not.toHaveAttribute('open', '');
            await expect(details.locator('summary')).toHaveText(dictionary.common.details + '+');
            await expect(details.locator('dl')).not.toBeVisible();
            await expect(details.getByText(copy.summary, { exact: true })).not.toBeVisible();
            await details.locator('summary').click();
            await expect(details).toHaveAttribute('open', '');
            await expect(details.locator('dl')).toBeVisible();
            await expect(details.getByText(copy.summary, { exact: true })).toBeVisible();
            await expect(details.locator('dt')).toHaveText(fields.map((field) => dictionary.common[field]));
            await expect(details.locator('dd')).toHaveText(fields.map((field) => copy[field]));
            expect(await details.locator('a[target="_blank"]').evaluateAll((links) => links.map((link) => link.getAttribute('href')))).toEqual(comparisonSources[model]);
            for (const source of await details.locator('a[target="_blank"]').all()) {
              await expect(source).toBeVisible();
              await expect(source).toHaveAttribute('rel', 'noreferrer noopener');
            }
            await details.locator('summary').click();
            await expect(details.locator('dl')).not.toBeVisible();
          }
        } else {
          await expectSampleLibraryHidden(page);
          const formats = intentPage.locator('#formats').getByRole('table');
          await expect(formats).toHaveAccessibleName(dictionary.download.formatsTitle);
          await expect(formats.getByRole('row')).toHaveCount(5);
          await expect(formats.getByRole('columnheader')).toHaveText(dictionary.download.formatHeaders);
          for (const [index, row] of dictionary.download.formatRows.entries()) {
            const format = formats.getByRole('row').nth(index + 1);
            await expect(format.getByRole('rowheader')).toHaveText(row.name);
            await expect(format.getByRole('cell')).toHaveText([row.use, row.limits]);
            await expect(format.getByRole('cell').first()).toBeVisible();
            await expect(format.getByRole('cell').last()).toBeVisible();
          }
        }

        const faq = intentPage.locator('#faq details');
        await expect(faq).toHaveCount(content.faq.length);
        await expect(faq.locator('summary')).toHaveText(content.faq.map((entry) => entry.question + '+'));
        const firstFaq = faq.first();
        await expect(firstFaq).not.toHaveAttribute('open', '');
        await expect(firstFaq.locator('p')).not.toBeVisible();
        await firstFaq.locator('summary').click();
        await expect(firstFaq).toHaveAttribute('open', '');
        await expect(firstFaq.locator('p')).toHaveText(content.faq[0].answer);
        await firstFaq.locator('summary').click();
        await expect(firstFaq.locator('p')).not.toBeVisible();

        await expect(page).toHaveTitle(content.title);
        await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', content.title);
        await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute('content', content.title);
        expect(dictionary.download.title).not.toBe(dictionary.comparison.title);
        expect(dictionary.download.description).not.toBe(dictionary.comparison.description);
        await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', content.description);
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', ORIGIN + pagePath);
        for (const [language, href] of [['en', ORIGIN + '/' + slug], ['zh-CN', ORIGIN + '/zh-CN/' + slug], ['x-default', ORIGIN + '/' + slug]]) {
          await expect(page.locator('link[rel="alternate"][hreflang="' + language + '"]')).toHaveAttribute('href', href);
        }
        await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', ORIGIN + pagePath);
        await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0);
        await expect(intentPage.locator('time')).toHaveAttribute('datetime', IMAGE_TO_3D_REVIEWED_AT);

        if (process.env.E2E_CAPTURE_INTENT_PAGES === 'true') {
          await expect(page.getByTestId(frameId + '-placeholder')).toHaveCount(0);
          for (const image of await intentPage.locator('img').all()) {
            await image.scrollIntoViewIfNeeded();
            await expect.poll(() => image.evaluate((node) => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0)).toBe(true);
          }
          await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
          const prefix = isComparison ? 'comparison' : 'download';
          await captureIntentPage(page, prefix + '-top-' + locale + '.png');
          await intentPage.locator(isComparison ? '#models' : '#formats').evaluate((node) => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
          await captureIntentPage(page, prefix + '-supporting-' + locale + '.png');
          if (!isComparison && locale === 'en') await captureIntentPage(page, 'download-preview.png');
          await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
          await captureIntentPage(page, prefix + (locale === 'en' ? '-page.png' : '-page-' + locale + '.png'), true);
        }
      });
    }
  }

  for (const locale of locales) {
    test(locale + ' model navigation reaches each choice and use actions preserve the embedded workspace', async ({ page, context }) => {
      const dictionary = dictionaries[locale];
      const content = dictionary.comparison;
      await page.setViewportSize(locale === 'en' ? { width: 1440, height: 1050 } : { width: 390, height: 844 });
      const externalTargets = new Set(Object.values(comparisonActions).flatMap((action) => [action.onlineUrl, action.localUrl]).filter((url): url is string => Boolean(url?.startsWith('https://'))).map((url) => {
        const target = new URL(url);
        return target.origin + target.pathname;
      }));
      await context.route((url) => externalTargets.has(url.origin + url.pathname), (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Model entry fixture</title><p>Model entry fixture</p>' }));
      const pagePath = localizedPath('image-to-3d', locale);
      await page.goto(pagePath, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
      const frame = page.getByTestId('intent-workspace-compare');
      await expect(page.frameLocator('[data-testid="intent-workspace-compare"]').getByText('External workspace fixture', { exact: true })).toBeVisible();
      const originalFrame = await frame.elementHandle();
      const navigation = page.getByTestId('model-navigation');
      for (const model of models) {
        await navigation.getByRole('link', { name: content.models[model].shortName, exact: true }).click();
        await expect(page).toHaveURL(ORIGIN + pagePath + '#model-' + model);
        await expect(page.getByTestId('model-comparison-' + model).getByRole('heading', { level: 3 })).toBeInViewport();
        await expect(page.locator('iframe')).toHaveCount(1);
        expect(await originalFrame!.evaluate((node) => node.isConnected)).toBe(true);
        await expect(frame).toHaveAttribute('src', intentWorkspaces['image-to-3d'].src);
      }
      await navigation.getByTestId('model-use-pixal3d').click();
      await expect(page).toHaveURL(ORIGIN + pagePath + '#model-hunyuan3d');
      await expect(frame).toBeInViewport({ ratio: 0.2 });
      for (const model of models) {
        const action = comparisonActions[model];
        if (action.onlineUrl.startsWith('https://')) {
          const online = navigation.getByTestId('model-use-' + model);
          await expect(online).toHaveAttribute('target', '_blank');
          await expect(online).toHaveAttribute('rel', 'noreferrer noopener');
          const popupEvent = context.waitForEvent('page');
          await online.click();
          const popup = await popupEvent;
          await expect(popup).toHaveURL(action.onlineUrl);
          await expect(popup.locator('p')).toHaveText('Model entry fixture');
          await popup.close();
        }
        if (action.localUrl?.startsWith('https://')) {
          const local = page.getByTestId('model-actions-' + model).getByRole('link', { name: content.localSetup, exact: true });
          const popupEvent = context.waitForEvent('page');
          await local.click();
          const popup = await popupEvent;
          await expect(popup).toHaveURL(action.localUrl);
          await expect(popup.locator('p')).toHaveText('Model entry fixture');
          await popup.close();
        }
      }
      await expect(page.locator('iframe')).toHaveCount(1);
      expect(await originalFrame!.evaluate((node) => node.isConnected)).toBe(true);
      expect(resolvedWorkspaceTargets.get(page)).toEqual([SPACE_DEFAULT_TARGETS.pixal3d.url]);
      const localSetup = page.getByTestId('model-actions-pixal3d').getByRole('link', { name: content.localSetup, exact: true });
      await localSetup.click();
      await expect(page).toHaveURL(ORIGIN + localizedPath('how-to-install-locally', locale));
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(tutorials[locale].pages['how-to-install-locally'].title);
    });

    test(locale + ' switches embedded models in place and retains each visited workspace and input', async ({ page, context }) => {
      const content = dictionaries[locale].comparison;
      await page.setViewportSize(locale === 'en' ? { width: 1440, height: 1050 } : { width: 390, height: 844 });
      const pagePath = localizedPath('image-to-3d', locale) + '?campaign=embedded-switch';
      await page.goto(pagePath, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
      const navigation = page.getByTestId('model-navigation');
      await expect(navigation.getByTestId('model-use-trellis')).toBeEnabled();
      const handles = new Map<string, ElementHandle>();
      const visited = new Set<string>();
      const initialPages = context.pages().length;
      let popupCount = 0;
      page.on('popup', () => { popupCount += 1; });
      await expect(page.locator('iframe')).toHaveCount(1);
      await expect(page.frameLocator('[data-testid="intent-workspace-compare"]').getByRole('textbox')).toBeVisible();
      expect(resolvedWorkspaceTargets.get(page)).toEqual([SPACE_DEFAULT_TARGETS.pixal3d.url]);

      const sequence = [
        ['pixal3d', 'top'], ['trellis', 'top'], ['hunyuan3d', 'card'],
        ['pixal3d', 'card'], ['trellis', 'card'], ['hunyuan3d', 'top'],
      ] as const;
      for (const [model, location] of sequence) {
        const control = location === 'top' ? navigation.getByTestId('model-use-' + model) : page.getByTestId('model-actions-' + model).getByTestId('model-use-' + model);
        await control.click();
        await expect(page).toHaveURL(ORIGIN + pagePath);
        const frameId = comparisonFrameIds[model];
        const frame = page.getByTestId(frameId);
        const panel = page.getByTestId('workspace-panel-' + model);
        const title = content.workspaceTitle.replace('{model}', content.models[model].shortName);
        await expect(panel).toBeVisible();
        await expect(panel).toHaveAccessibleName(title);
        await expect(frame).toHaveAttribute('src', comparisonWorkspaces[model].src);
        await expect(frame).toHaveAttribute('title', title);
        await expect(frame).toBeInViewport({ ratio: 0.2 });
        const input = page.frameLocator('[data-testid="' + frameId + '"]').getByRole('textbox', { name: 'Fixture input' });
        const retainedText = locale + ' ' + model + ' retained input';
        if (!visited.has(model)) {
          visited.add(model);
          handles.set(model, (await frame.elementHandle())!);
          await input.fill(retainedText);
          if (process.env.E2E_CAPTURE_INTENT_PAGES === 'true') await captureIntentPage(page, 'comparison-active-' + model + '-' + locale + '.png');
        } else {
          expect(await handles.get(model)!.evaluate((node) => node.isConnected)).toBe(true);
          await expect(input).toHaveValue(retainedText);
        }
        await expect(page.locator('iframe')).toHaveCount(visited.size);
        await expect(page.locator('iframe:visible')).toHaveCount(1);
        for (const candidate of embeddedModels) {
          for (const button of await page.getByTestId('model-use-' + candidate).all()) await expect(button).toHaveAttribute('aria-pressed', String(candidate === model));
          if (visited.has(candidate) && candidate !== model) await expect(page.getByTestId('workspace-panel-' + candidate)).toBeHidden();
        }
        expect(context.pages()).toHaveLength(initialPages);
        expect(popupCount).toBe(0);
        const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
        expect(widths.document).toBeLessThanOrEqual(widths.viewport + 1);
        expect(widths.body).toBeLessThanOrEqual(widths.viewport + 1);
      }
      expect(resolvedWorkspaceTargets.get(page)).toEqual(embeddedModels.map((model) => SPACE_DEFAULT_TARGETS[model].url));
      // Model-name anchors keep their explanatory navigation role and do not select a runner.
      await navigation.getByRole('link', { name: content.models.trellis.shortName, exact: true }).click();
      await expect(page).toHaveURL(ORIGIN + pagePath + '#model-trellis');
      await expect(navigation.getByTestId('model-use-hunyuan3d')).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByTestId('model-comparison-trellis').getByRole('heading', { level: 3 })).toBeInViewport();
      await expect(page.locator('iframe')).toHaveCount(3);
    });

    test(locale + ' reloads only the active embedded workspace and keeps other model inputs intact', async ({ page }) => {
      const labels = locale === 'en' ? embedEn : embedZhCN;
      await page.goto(localizedPath('image-to-3d', locale), { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
      const navigation = page.getByTestId('model-navigation');
      const handles = new Map<string, ElementHandle>();
      for (const model of embeddedModels) {
        await navigation.getByTestId('model-use-' + model).click();
        const frameId = comparisonFrameIds[model];
        await page.frameLocator('[data-testid="' + frameId + '"]').getByRole('textbox').fill(model + ' keep');
        handles.set(model, (await page.getByTestId(frameId).elementHandle())!);
      }
      const expectedRequests = embeddedModels.map((model) => SPACE_DEFAULT_TARGETS[model].url);
      for (const model of embeddedModels) {
        await navigation.getByTestId('model-use-' + model).click();
        const frameId = comparisonFrameIds[model];
        const panel = page.getByTestId('workspace-panel-' + model);
        await panel.getByRole('button', { name: labels.help, exact: true }).click();
        const help = page.getByTestId(frameId + '-help');
        await expect(help).toBeVisible();
        await expect(help.getByRole('link', { name: labels.open, exact: true })).toHaveAttribute('href', comparisonWorkspaces[model].src);
        await expect(help.getByRole('link')).toHaveAttribute('target', '_blank');
        await help.getByRole('button', { name: labels.retry, exact: true }).click();
        const freshInput = page.frameLocator('[data-testid="' + frameId + '"]').getByRole('textbox');
        await expect(freshInput).toHaveValue('');
        expect(await handles.get(model)!.evaluate((node) => node.isConnected)).toBe(false);
        handles.set(model, (await page.getByTestId(frameId).elementHandle())!);
        await freshInput.fill(model + ' keep');
        expectedRequests.push(SPACE_DEFAULT_TARGETS[model].url);
        expect(resolvedWorkspaceTargets.get(page)).toEqual(expectedRequests);
        for (const other of embeddedModels.filter((candidate) => candidate !== model)) {
          expect(await handles.get(other)!.evaluate((node) => node.isConnected)).toBe(true);
          await expect(page.frameLocator('[data-testid="' + comparisonFrameIds[other] + '"]').getByRole('textbox', { includeHidden: true })).toHaveValue(other + ' keep');
          await expect(page.getByTestId('workspace-panel-' + other)).toBeHidden();
        }
        await expect(page.locator('iframe')).toHaveCount(3);
        await expect(page.locator('iframe:visible')).toHaveCount(1);
        await expect(help).toHaveCount(0);
      }
    });
  }

  for (const origin of LOCAL_ORIGINS) {
    for (const locale of locales) {
      test(origin + ' ' + locale + ' hydrates and switches inline models in a fresh browser context', async ({ page, context }) => {
        // Each Playwright test gets an independent context. Keep all parent Next scripts real;
        // the provider frames use the same inert fixtures as the other public-page scenarios.
        const content = dictionaries[locale].comparison;
        await page.setViewportSize(locale === 'en' ? { width: 1280, height: 1050 } : { width: 390, height: 844 });
        const pageUrl = origin + localizedPath('image-to-3d', locale) + '?campaign=origin-switch';
        await page.goto(pageUrl, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
        const navigation = page.getByTestId('model-navigation');
        await expect(navigation.getByTestId('model-use-pixal3d')).toBeEnabled();
        for (const model of embeddedModels) await expect(navigation.getByTestId('model-use-' + model)).toHaveCSS('cursor', 'pointer');
        await expect(page.locator('iframe')).toHaveCount(1);
        await expect(page.frameLocator('[data-testid="intent-workspace-compare"]').getByRole('textbox')).toBeVisible();
        expect(resolvedWorkspaceTargets.get(page)).toEqual([SPACE_DEFAULT_TARGETS.pixal3d.url]);
        const initialPages = context.pages().length;
        for (const model of ['trellis', 'hunyuan3d'] as const) {
          await navigation.getByTestId('model-use-' + model).click();
          await expect(page).toHaveURL(pageUrl);
          await expect(page.getByTestId('workspace-panel-' + model)).toBeVisible();
          const frame = page.getByTestId(comparisonFrameIds[model]);
          await expect(frame).toHaveAttribute('src', comparisonWorkspaces[model].src);
          await expect(frame).toHaveAttribute('title', content.workspaceTitle.replace('{model}', content.models[model].shortName));
          await expect(frame).toBeInViewport({ ratio: 0.2 });
          for (const button of await page.getByTestId('model-use-' + model).all()) await expect(button).toHaveAttribute('aria-pressed', 'true');
          await page.frameLocator('[data-testid="' + comparisonFrameIds[model] + '"]').getByRole('textbox').fill(model + ' origin check');
        }
        const originalTrellis = await page.getByTestId('intent-workspace-trellis').elementHandle();
        const cardUse = page.getByTestId('model-actions-trellis').getByTestId('model-use-trellis');
        await expect(cardUse).toHaveCSS('cursor', 'pointer');
        await cardUse.click();
        await expect(page).toHaveURL(pageUrl);
        expect(await originalTrellis!.evaluate((node) => node.isConnected)).toBe(true);
        await expect(page.frameLocator('[data-testid="intent-workspace-trellis"]').getByRole('textbox')).toHaveValue('trellis origin check');
        await expect(page.getByTestId('model-navigation').getByTestId('model-use-trellis')).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('iframe')).toHaveCount(3);
        await expect(page.locator('iframe:visible')).toHaveCount(1);
        expect(resolvedWorkspaceTargets.get(page)).toEqual(embeddedModels.map((model) => SPACE_DEFAULT_TARGETS[model].url));
        expect(context.pages()).toHaveLength(initialPages);
        expect(browserDiagnostics.get(page)!.filter((entry) => entry.startsWith('pageerror:'))).toEqual([]);
      });
    }
  }

  test('retains real completed model files anonymously while sample download UI is hidden', async ({ playwright, page }) => {
    test.setTimeout(60_000);
    expect(publicModelSamples.length).toBeGreaterThan(0);
    const anonymous = await playwright.request.newContext({ baseURL: ORIGIN });
    try {
      for (const sample of publicModelSamples) {
        const directory = '/model-samples/' + sample.id;
        const provenanceResponse = await anonymous.get(directory + '/generation.json');
        expect(provenanceResponse.ok()).toBe(true);
        const generation = await provenanceResponse.json();
        expect(generation).toMatchObject({ id: sample.id, status: 'complete', sourceSpace: sample.sourceUrl, health: { ok: true, mock: false }, result: { ok: true, asset: { status: 'complete' } } });
        expect(generation.sourceRevision).toMatch(/^[a-f0-9]{40}$/);
        expect(generation.eventId).toMatch(/^[a-f0-9]{32}$/);
        expect(generation.input.path).toBe(sample.referenceImage);
        const reference = await anonymous.get(sample.referenceImage);
        expect(reference.ok()).toBe(true);
        const referenceBytes = await reference.body();
        expect(referenceBytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(true);
        expect(sha256(referenceBytes)).toBe(generation.input.sha256);
        const license = await anonymous.get(sample.licenseUrl);
        expect(license.ok()).toBe(true);
        expect(await license.text()).toMatch(/non-commercial/i);

        const files = new Map<string, Buffer>();
        expect(sample.files.some((file) => file.format === 'GLB')).toBe(true);
        for (const file of sample.files) {
          expect(file.path).toMatch(new RegExp('^/model-samples/' + sample.id + '/model\\.(?:glb|obj|stl)$'));
          const response = await anonymous.get(file.path);
          expect(response.status()).toBe(200);
          expect(response.url()).toBe(ORIGIN + file.path);
          const bytes = await response.body();
          expect(bytes.length).toBe(file.bytes);
          expect(sha256(bytes)).toBe(file.sha256);
          files.set(file.format, bytes);
        }
        const glbFile = sample.files.find((file) => file.format === 'GLB')!;
        expect(generation.output).toMatchObject({ path: glbFile.path, bytes: glbFile.bytes, sha256: glbFile.sha256 });
        expect(sample.previewImage).toBe(directory + '/preview.png');
        const previewResponse = await anonymous.get(sample.previewImage!);
        expect(previewResponse.ok()).toBe(true);
        const preview = await previewResponse.body();
        expect(preview.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(true);
        expect(sha256(preview)).not.toBe(sha256(referenceBytes));
        const previewProvenanceResponse = await anonymous.get(directory + '/preview-provenance.json');
        expect(previewProvenanceResponse.ok()).toBe(true);
        const previewProvenance = await previewProvenanceResponse.json();
        expect(previewProvenance).toMatchObject({
          input: { path: glbFile.path, bytes: glbFile.bytes, sha256: glbFile.sha256 },
          output: { path: sample.previewImage, bytes: preview.length, sha256: sha256(preview), width: preview.readUInt32BE(16), height: preview.readUInt32BE(20) },
        });
        expect(previewProvenance.output.width).toBeGreaterThanOrEqual(384);
        expect(previewProvenance.output.height).toBeGreaterThanOrEqual(384);
        const glb = inspectGlb(files.get('GLB')!);
        if (sample.id === 'mushroom') expect(glb.triangles).toBe(99_288);
        if (files.has('OBJ') || files.has('STL')) {
          const exportsResponse = await anonymous.get(directory + '/geometry-exports.json');
          expect(exportsResponse.ok()).toBe(true);
          const exports = await exportsResponse.json();
          expect(exports).toMatchObject({ inputPath: glbFile.path, inputSha256: glbFile.sha256, geometryOnly: true, triangles: glb.triangles, materialAndTextureFiles: [], printabilityVerified: false });
          expectSameBounds(glb.bounds, exports.bounds);
          for (const format of ['OBJ', 'STL']) {
            if (!files.has(format)) continue;
            const geometry = format === 'OBJ' ? inspectObj(files.get(format)!) : inspectStl(files.get(format)!);
            expect(geometry.triangles).toBe(glb.triangles);
            expectSameBounds(geometry.bounds, glb.bounds);
          }
        }
      }
      expect((await anonymous.storageState()).cookies).toEqual([]);
    } finally {
      await anonymous.dispose();
    }

    await page.goto('/image-to-3d-model-free-download', { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
    await expectSampleLibraryHidden(page);
    await expect(page.locator('#formats').getByRole('table')).toBeVisible();
    await expect(page).toHaveURL(ORIGIN + '/image-to-3d-model-free-download');
  });

  test('server-renders the public workspace in the initial viewport and preserves a single frame', async ({ page }) => {
    for (const slug of slugs) {
      const id = slug === 'image-to-3d' ? 'intent-workspace-compare' : 'intent-workspace-download';
      const before = resolvedWorkspaceTargets.get(page)!.length;
      const response = await page.goto('/' + slug, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBe(200);
      // Parse the response body, not the hydrated DOM: the iframe must exist before React runs.
      const serverFrames = await page.evaluate((html) => {
        const document = new DOMParser().parseFromString(html, 'text/html');
        return Array.from(document.querySelectorAll('iframe')).map((frame) => ({
          testId: frame.dataset.testid,
          src: frame.getAttribute('src'),
          loading: frame.getAttribute('loading'),
        }));
      }, await response!.text());
      expect(serverFrames).toEqual([{ testId: id, src: intentWorkspaces[slug].src, loading: 'lazy' }]);
      const container = page.getByTestId(id + '-container');
      await expect(container).toBeAttached();
      expect((await container.boundingBox())!.height).toBeGreaterThanOrEqual(900);
      const frame = page.getByTestId(id);
      await expect(frame).toBeInViewport({ ratio: 0.2 });
      await expect(page.locator('iframe')).toHaveCount(1);
      await expect(frame).toHaveAttribute('src', intentWorkspaces[slug].src);
      await expect(frame).toHaveAttribute('loading', 'lazy');
      await expect(frame).toHaveAttribute('referrerpolicy', 'no-referrer');
      await expect(page.getByTestId(id + '-placeholder')).toHaveCount(0);
      await expect(page.frameLocator('[data-testid="' + id + '"]').getByText('External workspace fixture', { exact: true })).toBeVisible();
      await expect(page.getByTestId('pixal3d-inline-trial-auth-overlay')).toHaveCount(0);
      await expect(page.getByTestId('pixal3d-reference-image-cta')).toHaveCount(0);
      await page.getByTestId('intent-related-links').scrollIntoViewIfNeeded();
      await expect(frame).toHaveCount(1);
      expect(resolvedWorkspaceTargets.get(page)!.length - before).toBe(1);
    }
  });

  test('keeps the workspace and format guidance usable with hidden samples when parent scripts cannot load', async ({ page }) => {
    await page.route('**/_next/static/**', (route) => route.request().resourceType() === 'script' ? route.abort() : route.continue());
    for (const slug of slugs) {
      await page.goto('/' + slug, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
      const frameId = slug === 'image-to-3d' ? 'intent-workspace-compare' : 'intent-workspace-download';
      const frame = page.getByTestId(frameId);
      await expect(frame).toBeInViewport({ ratio: 0.2 });
      await expect(frame).toHaveAttribute('src', intentWorkspaces[slug].src);
      await expect(page.getByTestId(frameId + '-placeholder')).toHaveCount(0);
      await expect(page.frameLocator('[data-testid="' + frameId + '"]').getByText('External workspace fixture', { exact: true })).toBeVisible();
      await expect(page.locator('iframe')).toHaveCount(1);
      if (slug === 'image-to-3d') {
        for (const model of embeddedModels) {
          const buttons = page.getByTestId('model-use-' + model);
          await expect(buttons).toHaveCount(2);
          for (const button of await buttons.all()) await expect(button).toBeDisabled();
        }
      }
      if (slug === 'image-to-3d-model-free-download') {
        await expectSampleLibraryHidden(page);
        const formats = page.locator('#formats').getByRole('table');
        await formats.scrollIntoViewIfNeeded();
        await expect(formats).toBeVisible();
        await expect(formats.getByRole('row')).toHaveCount(5);
        for (const cell of await formats.getByRole('cell').all()) await expect(cell).toBeVisible();
        const firstFaq = page.locator('#faq details').first();
        await firstFaq.locator('summary').click();
        await expect(firstFaq.locator('p')).toBeVisible();
        await expect(firstFaq.locator('p')).toHaveText(imageTo3DEn.download.faq[0].answer);
      }
    }
  });

  test('redirects English aliases and preserves query parameters during hydrated locale changes', async ({ page, context }) => {
    test.setTimeout(60_000);
    const query = '?campaign=intent-locale&format=glb';
    for (const slug of slugs) {
      await page.goto('/en/' + slug + query, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(ORIGIN + '/' + slug + query);
      // This scenario exercises the header's client submit handler, which preserves the query.
      if (slug === 'image-to-3d') await expect(page.getByTestId('model-use-pixal3d').first()).toBeEnabled();
      await page.getByTestId('locale-switcher').locator('summary').click();
      await page.getByRole('menuitemradio', { name: '简体中文', exact: true }).click();
      await expect(page).toHaveURL(ORIGIN + '/zh-CN/' + slug + query);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(slug === 'image-to-3d' ? imageTo3DZhCN.comparison.title : imageTo3DZhCN.download.title);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', ORIGIN + '/zh-CN/' + slug);
      expect((await context.cookies()).find((cookie) => cookie.name === 'NEXT_LOCALE')).toMatchObject({ value: 'zh-CN', httpOnly: true, sameSite: 'Lax', path: '/' });
      if (slug === 'image-to-3d') await expect(page.getByTestId('model-use-pixal3d').first()).toBeEnabled();
      await page.getByTestId('locale-switcher').locator('summary').click();
      await page.getByRole('menuitemradio', { name: 'English', exact: true }).click();
      await expect(page).toHaveURL(ORIGIN + '/' + slug + query);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', ORIGIN + '/' + slug);
    }
  });

  test('links from the homepage and between intent pages and tutorials in both languages', async ({ page }) => {
    test.setTimeout(60_000);
    for (const locale of locales) {
      const home = locale === 'en' ? '/' : '/zh-CN';
      const dictionary = dictionaries[locale];
      await page.goto(home, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
      const primary = page.getByTestId('pixal3d-multi-model-entry');
      await expect(primary.getByRole('link')).toHaveCount(1);
      await expect(primary.getByTestId('pixal3d-multi-model-link')).toHaveAccessibleName(dictionary.common.homeMultiModel.action);
      await expect(primary.getByTestId('pixal3d-multi-model-link')).toHaveAttribute('href', localizedPath(slugs[1], locale));
      const links = page.getByTestId('pixal3d-intent-links');
      await expect(links.getByRole('link')).toHaveCount(1);
      await expect(links.getByRole('heading')).toHaveText(dictionary.common.homeLinksTitle);
      await expect(links).toContainText(dictionary.common.homeLinksDescription);
      await expect(links).not.toContainText('Pixal3D');
      const downloadLink = links.getByRole('link', { name: dictionary.common.downloadLink, exact: true });
      await expect(downloadLink).toHaveText(locale === 'en' ? /free/i : /免费/);
      await expect(downloadLink).toHaveAttribute('href', localizedPath(slugs[0], locale));
      const directory = path.join(process.cwd(), '.tmp', 'intent-pages');
      await mkdir(directory, { recursive: true });
      await links.screenshot({ path: path.join(directory, 'home-download-guide-' + locale + '.png') });
      await downloadLink.click();
      await expect(page).toHaveURL(ORIGIN + localizedPath(slugs[0], locale));
      for (const slug of slugs) {
        const related = page.getByTestId('intent-related-links');
        await expect(related.getByRole('link')).toHaveCount(5);
        for (const tutorial of tutorialSlugs) {
          await expect(related.getByRole('link', { name: tutorials[locale].pages[tutorial].title })).toHaveAttribute('href', (locale === 'en' ? '' : '/zh-CN') + tutorialPath(tutorial));
        }
        const otherSlug = slug === slugs[0] ? slugs[1] : slugs[0];
        const crossLink = related.getByRole('link', { name: slug === slugs[0] ? dictionary.common.compareLink : dictionary.common.downloadLink });
        await expect(crossLink).toHaveAttribute('href', localizedPath(otherSlug, locale));
        await crossLink.click();
        await expect(page).toHaveURL(ORIGIN + localizedPath(otherSlug, locale));
      }
      await page.getByTestId('intent-page').getByRole('link', { name: dictionary.common.home, exact: true }).click();
      await expect(page).toHaveURL(ORIGIN + home);
    }
  });

  for (const viewport of [
    { name: 'desktop', width: 1280, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ] as const) {
    for (const locale of locales) {
      test(locale + ' homepage multi-model entry stays below the workspace and preserves sign-in on ' + viewport.name, async ({ page }) => {
        test.setTimeout(45_000);
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        const dictionary = dictionaries[locale];
        const home = locale === 'en' ? '/' : '/zh-CN';
        await page.goto(home, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
        const entry = page.getByTestId('pixal3d-multi-model-entry');
        const link = entry.getByTestId('pixal3d-multi-model-link');
        await expect(entry.getByRole('heading')).toHaveCount(0);
        await expect(entry.getByRole('list')).toHaveCount(0);
        await expect(entry.getByRole('link')).toHaveCount(1);
        await expect(link).toHaveAccessibleName(dictionary.common.homeMultiModel.action);
        await expect(link).toHaveAttribute('href', localizedPath('image-to-3d', locale));
        await expect(entry).not.toBeInViewport();
        const workspace = page.getByTestId('pixal3d-inline-trial');
        await expect(workspace).toBeInViewport();
        const overlay = page.getByTestId('pixal3d-inline-trial-auth-overlay');
        await expect(overlay).toBeVisible();
        const frame = page.getByTestId('pixal3d-inline-trial-iframe');
        await expect(frame).toHaveAttribute('src', workspaceUrl('pixal3d'));
        await expect(page.locator('iframe')).toHaveCount(1);
        const entryBox = (await entry.boundingBox())!;
        const workspaceBox = (await workspace.boundingBox())!;
        const feedbackBox = (await page.getByTestId('pixal3d-pain-point-feedback').boundingBox())!;
        const gap = entryBox.y - (workspaceBox.y + workspaceBox.height);
        expect(gap).toBeGreaterThanOrEqual(0);
        expect(gap).toBeLessThanOrEqual(12);
        expect(await entry.evaluate((node) => node.previousElementSibling?.getAttribute('data-testid'))).toBe('pixal3d-inline-trial');
        expect(entryBox.y + entryBox.height).toBeLessThanOrEqual(feedbackBox.y);
        expect(await page.evaluate(() => window.scrollY)).toBe(0);
        await captureIntentPage(page, 'home-more-models-initial-' + viewport.name + '-' + locale + '.png');

        await overlay.getByRole('button').click();
        await expect(page).toHaveURL(ORIGIN + localizedPath('signin', locale));
        await page.goto(home, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
        await expect(overlay).toBeVisible();
        await expect(frame).toHaveAttribute('src', workspaceUrl('pixal3d'));
        await link.evaluate((node) => node.scrollIntoView({ block: 'center', behavior: 'instant' }));
        await expect(link).toBeInViewport({ ratio: 1 });
        const scrolledWorkspace = (await workspace.boundingBox())!;
        const scrolledEntry = (await entry.boundingBox())!;
        expect(scrolledWorkspace.y + scrolledWorkspace.height).toBeGreaterThan(0);
        expect(scrolledWorkspace.y + scrolledWorkspace.height).toBeLessThanOrEqual(scrolledEntry.y);
        const layout = await page.evaluate(() => ({
          document: document.documentElement.scrollWidth,
          body: document.body.scrollWidth,
          viewport: document.documentElement.clientWidth,
        }));
        expect(layout.document).toBeLessThanOrEqual(layout.viewport + 1);
        expect(layout.body).toBeLessThanOrEqual(layout.viewport + 1);
        const linkBox = (await link.boundingBox())!;
        expect(linkBox.x).toBeGreaterThanOrEqual(0);
        expect(linkBox.x + linkBox.width).toBeLessThanOrEqual(viewport.width);
        await captureIntentPage(page, 'home-more-models-' + viewport.name + '-' + locale + '.png');
        await link.focus();
        await expect(link).toBeFocused();
        await link.press('Enter');
        await expect(page).toHaveURL(ORIGIN + localizedPath('image-to-3d', locale));
        const navigation = page.getByTestId('model-navigation');
        await expect(navigation).toBeVisible();
        for (const id of embeddedModels) {
          await expect(navigation.getByRole('link', { name: dictionary.comparison.models[id].shortName, exact: true })).toBeVisible();
          await expect(navigation.getByTestId('model-use-' + id)).toBeEnabled();
        }
      });
    }
  }

  test('publishes stable localized sitemap entries and allows public crawling', async ({ request, page }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.ok()).toBe(true);
    const entries = await page.evaluate((xml) => {
      const document = new DOMParser().parseFromString(xml, 'application/xml');
      return Array.from(document.getElementsByTagName('url')).map((node) => ({
        url: node.getElementsByTagName('loc')[0]?.textContent,
        modified: node.getElementsByTagName('lastmod')[0]?.textContent,
        alternates: Array.from(node.getElementsByTagNameNS('http://www.w3.org/1999/xhtml', 'link')).map((link) => ({ locale: link.getAttribute('hreflang'), href: link.getAttribute('href') })),
      }));
    }, await response.text());
    for (const slug of slugs) {
      const matches = entries.filter((entry) => entry.url === ORIGIN + '/' + slug);
      expect(matches).toHaveLength(1);
      expect(matches[0].modified).toMatch(new RegExp('^' + IMAGE_TO_3D_REVIEWED_AT));
      expect(matches[0].alternates).toEqual(expect.arrayContaining([
        { locale: 'en', href: ORIGIN + '/' + slug },
        { locale: 'zh-CN', href: ORIGIN + '/zh-CN/' + slug },
        { locale: 'x-default', href: ORIGIN + '/' + slug },
      ]));
    }
    const robotsResponse = await request.get('/robots.txt');
    expect(robotsResponse.ok()).toBe(true);
    const robots = await robotsResponse.text();
    expect(robots).toMatch(/^Allow:\s*\/\s*$/im);
    const disallowed = Array.from(robots.matchAll(/^Disallow:\s*(\S+)\s*$/gim), (match) => match[1]);
    for (const slug of slugs) {
      for (const prefix of ['', '/en', '/zh-CN']) {
        expect(disallowed.some((rule) => (prefix + '/' + slug).startsWith(rule))).toBe(false);
      }
    }
  });

  test('keeps both localized pages within 390px with hidden sample UI and readable formats', async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 390, height: 844 });
    for (const locale of locales) {
      for (const slug of slugs) {
        await page.goto(localizedPath(slug, locale), { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
        await expect(page.getByTestId('intent-page')).toBeVisible();
        const frameId = slug === 'image-to-3d' ? 'intent-workspace-compare' : 'intent-workspace-download';
        await expect(page.getByTestId(frameId)).toBeInViewport({ ratio: 0.2 });
        await expect(page.locator('iframe')).toHaveCount(1);
        const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
        expect(widths.document, locale + ' ' + slug + ' document').toBeLessThanOrEqual(widths.viewport + 1);
        expect(widths.body, locale + ' ' + slug + ' body').toBeLessThanOrEqual(widths.viewport + 1);
        const prefix = slug === 'image-to-3d' ? 'comparison' : 'download';
        if (process.env.E2E_CAPTURE_INTENT_PAGES === 'true') {
          await expect(page.frameLocator('[data-testid="' + frameId + '"]').getByText('External workspace fixture', { exact: true })).toBeVisible();
          await captureIntentPage(page, prefix + '-mobile-top-' + locale + '.png');
        }
        if (slug === 'image-to-3d-model-free-download') {
          await expectSampleLibraryHidden(page);
          const formats = page.locator('#formats [role="row"]').filter({ has: page.getByRole('rowheader') });
          await expect(formats).toHaveCount(4);
          for (const format of await formats.all()) {
            for (const cell of await format.getByRole('cell').all()) await expect(cell).toBeVisible();
            const geometry = await format.evaluate((node) => ({ client: node.clientWidth, scroll: node.scrollWidth, width: node.getBoundingClientRect().width }));
            expect(geometry.width).toBeLessThanOrEqual(widths.viewport);
            expect(geometry.scroll).toBeLessThanOrEqual(geometry.client + 1);
          }
        } else {
          const cards = page.locator('#models article');
          await expect(cards).toHaveCount(4);
          const boxes = await cards.evaluateAll((nodes) => nodes.map((node) => ({ top: node.getBoundingClientRect().top, bottom: node.getBoundingClientRect().bottom, width: node.getBoundingClientRect().width })));
          for (const [index, box] of boxes.entries()) {
            expect(box.width).toBeLessThanOrEqual(widths.viewport);
            if (index > 0) expect(box.top).toBeGreaterThanOrEqual(boxes[index - 1].bottom);
          }
        }
        await expect(page.getByTestId(frameId)).toHaveCount(1);
        if (process.env.E2E_CAPTURE_INTENT_PAGES === 'true') {
          await page.locator(slug === 'image-to-3d' ? '#models' : '#formats').evaluate((node) => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
          await captureIntentPage(page, prefix + '-mobile-supporting-' + locale + '.png');
        }
      }
    }
  });
});
