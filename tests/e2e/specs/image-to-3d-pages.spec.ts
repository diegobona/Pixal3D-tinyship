import { createHash } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { test, expect, type Page } from '@playwright/test';
import { comparisonSources, IMAGE_TO_3D_REVIEWED_AT, intentWorkspaces, publicModelSamples } from '../../../config/image-to-3d';
import { tutorialPath, tutorialSlugs } from '../../../config/tutorials';
import { imageTo3DEn } from '../../../libs/i18n/locales/image-to-3d/en';
import { imageTo3DZhCN } from '../../../libs/i18n/locales/image-to-3d/zh-CN';
import { tutorialsEn } from '../../../libs/i18n/locales/tutorials/en';
import { tutorialsZhCN } from '../../../libs/i18n/locales/tutorials/zh-CN';
import { TIMEOUTS } from '../helpers/constants';

const ORIGIN = 'http://localhost:7001';
const locales = ['en', 'zh-CN'] as const;
const slugs = ['image-to-3d-model-free-download', 'image-to-3d'] as const;
const models = ['pixal3d', 'rodin', 'trellis', 'hunyuan3d'] as const;
const dictionaries = { en: imageTo3DEn, 'zh-CN': imageTo3DZhCN };
const tutorials = { en: tutorialsEn, 'zh-CN': tutorialsZhCN };
const prohibitedRequests = new WeakMap<Page, string[]>();
const workspaceRequests = new WeakMap<Page, string[]>();

function localizedPath(slug: string, locale: (typeof locales)[number]) {
  return (locale === 'en' ? '' : '/zh-CN') + '/' + slug;
}

function sha256(bytes: Buffer) {
  return createHash('sha256').update(bytes).digest('hex');
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
  test.beforeEach(async ({ page, context }) => {
    await context.addCookies([{ name: 'NEXT_LOCALE', value: 'en', url: ORIGIN, httpOnly: true, sameSite: 'Lax' }]);
    await page.route('**/api/auth/get-session**', (route) => route.fulfill({ json: null }));
    await page.route('**/api/credits/status', (route) => route.fulfill({ json: { credits: { balance: 0 }, subscription: null } }));
    const frames: string[] = [];
    workspaceRequests.set(page, frames);
    await page.route(/^https:\/\/[^/]+\.hf\.space(?:\/|$)/, (route) => {
      frames.push(route.request().url());
      return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>External workspace fixture</title><p>External workspace fixture</p>' });
    });
    await page.route(/^https:\/\/(?:[^/]+\.)?tawk\.to\//, (route) => route.abort());
    await page.route('https://ldyang694.github.io/**', (route) => route.abort());
    const unexpected: string[] = [];
    prohibitedRequests.set(page, unexpected);
    await page.route(/\/api\/(?:hf-pixal3d-instance|3d-generate)(?:[/?]|$)/, async (route) => {
      unexpected.push(route.request().url());
      await route.abort();
    });
  });

  test.afterEach(async ({ page }) => {
    expect(prohibitedRequests.get(page), 'Reading intent pages must not reserve a trial or spend generation credits').toEqual([]);
  });

  for (const locale of locales) {
    for (const slug of slugs) {
      test(locale + ' ' + slug + ' has distinct public content, metadata, sources, and working FAQs', async ({ page }) => {
        const dictionary = dictionaries[locale];
        const isComparison = slug === 'image-to-3d';
        const content = isComparison ? dictionary.comparison : dictionary.download;
        const pagePath = localizedPath(slug, locale);
        const response = await page.goto(pagePath + '?campaign=intent-e2e', { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
        expect(response?.status()).toBe(200);
        await expect(page).toHaveURL(ORIGIN + pagePath + '?campaign=intent-e2e');
        const intentPage = page.getByTestId('intent-page');
        await expect(intentPage).toBeVisible();
        await expect(intentPage.getByRole('heading', { level: 1, name: content.title, exact: true })).toBeVisible();
        await expect(page.locator('html')).toHaveAttribute('lang', locale);
        await expect(page.locator('iframe')).toHaveCount(0);
        await expect(intentPage.locator('header a[href^="#"]')).toHaveAttribute('href', isComparison ? '#models' : '#downloads');
        await intentPage.locator('header a[href^="#"]').click();
        await expect(page).toHaveURL(ORIGIN + pagePath + '?campaign=intent-e2e' + (isComparison ? '#models' : '#downloads'));

        const sections = isComparison ? ['models', 'selection', 'workspace', 'faq'] : ['downloads', 'workflow', 'formats', 'workspace', 'faq'];
        expect(await intentPage.locator(':scope > div > article > section').evaluateAll((nodes) => nodes.map((node) => node.id))).toEqual(sections);
        await expect(intentPage.locator('#workspace > div > div').first().getByRole('link')).toHaveCount(0);
        if (isComparison) {
          const fields = ['suitable', 'avoid', 'quality', 'formats', 'runtime', 'memory', 'time'] as const;
          await expect(intentPage.locator('#models article')).toHaveCount(4);
          for (const model of models) {
            const card = page.getByTestId('model-comparison-' + model);
            await expect(card.getByRole('heading', { level: 3 })).toHaveText(dictionary.comparison.models[model].name);
            await expect(card.locator('dt')).toHaveText(fields.map((field) => dictionary.common[field]));
            await expect(card.locator('dd')).toHaveText(fields.map((field) => dictionary.comparison.models[model][field]));
            expect(await card.locator('a[target="_blank"]').evaluateAll((links) => links.map((link) => link.getAttribute('href')))).toEqual(comparisonSources[model]);
            for (const source of await card.locator('a[target="_blank"]').all()) {
              await expect(source).toHaveAttribute('rel', 'noreferrer noopener');
            }
          }
        } else {
          expect(publicModelSamples.length, 'The download library must contain completed real samples').toBeGreaterThan(0);
          await expect(page.getByTestId('sample-library').locator('article')).toHaveCount(publicModelSamples.length);
          for (const sample of publicModelSamples) {
            const card = page.getByTestId('sample-' + sample.id);
            await expect(card.getByRole('heading', { level: 3 })).toHaveText(dictionary.samples[sample.id].name);
            await expect(card.locator('img')).toHaveAttribute('src', sample.referenceImage);
            await expect(card.locator('img')).toHaveAttribute('alt', dictionary.samples[sample.id].referenceAlt);
            await expect(card.locator('figcaption')).toHaveText(dictionary.download.referenceLabel);
            await expect(card.locator('a[download]')).toHaveCount(sample.files.length);
            for (const file of sample.files) {
              await expect(card.locator('a[download="' + file.filename + '"]')).toHaveAttribute('href', file.path);
            }
            await expect(card.locator('dl a').first()).toHaveAttribute('href', sample.sourceUrl);
            await expect(card.locator('dl a').last()).toHaveAttribute('href', sample.licenseUrl);
          }
          await expect(intentPage.locator('#formats thead th')).toHaveText(dictionary.download.formatHeaders);
          await expect(intentPage.locator('#formats tbody th')).toHaveText(['GLB', 'STL', 'OBJ', 'FBX']);
          await expect(intentPage.locator('#formats tbody tr')).toHaveCount(4);
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

        if (locale === 'en' && process.env.E2E_CAPTURE_INTENT_PAGES === 'true') {
          await page.setViewportSize({ width: 1280, height: 1050 });
          await page.getByTestId(isComparison ? 'intent-workspace-compare-container' : 'intent-workspace-download-container').scrollIntoViewIfNeeded();
          await expect(page.getByTestId(isComparison ? 'intent-workspace-compare-placeholder' : 'intent-workspace-download-placeholder')).toHaveCount(0);
          for (const image of await intentPage.locator('img').all()) {
            await image.scrollIntoViewIfNeeded();
            await expect.poll(() => image.evaluate((node) => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0)).toBe(true);
          }
          await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
          const directory = path.join(process.cwd(), '.tmp', 'intent-pages');
          await mkdir(directory, { recursive: true });
          if (!isComparison) {
            await intentPage.locator('#downloads').scrollIntoViewIfNeeded();
            await page.screenshot({ path: path.join(directory, 'download-preview.png'), fullPage: false });
            await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
          }
          await page.screenshot({ path: path.join(directory, isComparison ? 'comparison-page.png' : 'download-page.png'), fullPage: true });
        }
      });
    }
  }

  test('serves real completed model files anonymously and downloads the GLB through its card', async ({ playwright, page }) => {
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

    const sample = publicModelSamples[0];
    const file = sample.files.find((candidate) => candidate.format === 'GLB')!;
    await page.goto('/image-to-3d-model-free-download', { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
    const downloadEvent = page.waitForEvent('download');
    await page.getByTestId('sample-' + sample.id).locator('a[download="' + file.filename + '"]').click();
    const download = await downloadEvent;
    expect(download.suggestedFilename()).toBe(file.filename);
    expect(await download.failure()).toBeNull();
    const downloadedPath = await download.path();
    expect(downloadedPath).not.toBeNull();
    expect(sha256(await readFile(downloadedPath!))).toBe(file.sha256);
    await expect(page).toHaveURL(ORIGIN + '/image-to-3d-model-free-download');
  });

  test('loads one public workspace only after scrolling into view and preserves its frame', async ({ page }) => {
    for (const slug of slugs) {
      await page.goto('/' + slug, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
      const id = slug === 'image-to-3d' ? 'intent-workspace-compare' : 'intent-workspace-download';
      const container = page.getByTestId(id + '-container');
      await expect(container).toBeAttached();
      await expect(page.getByTestId(id)).toHaveCount(0);
      const before = workspaceRequests.get(page)!.length;
      expect((await container.boundingBox())!.height).toBeGreaterThanOrEqual(900);
      await container.scrollIntoViewIfNeeded();
      const frame = page.getByTestId(id);
      await expect(frame).toBeVisible();
      await expect(page.locator('iframe')).toHaveCount(1);
      await expect(frame).toHaveAttribute('src', intentWorkspaces[slug].src);
      await expect(frame).toHaveAttribute('loading', 'lazy');
      await expect(frame).toHaveAttribute('referrerpolicy', 'no-referrer');
      await expect(page.getByTestId(id + '-placeholder')).toHaveCount(0);
      await expect(page.frameLocator('[data-testid="' + id + '"]').locator('p')).toHaveText('External workspace fixture');
      await expect(page.getByTestId('pixal3d-inline-trial-auth-overlay')).toHaveCount(0);
      await expect(page.getByTestId('pixal3d-reference-image-cta')).toHaveCount(0);
      await page.getByTestId('intent-related-links').scrollIntoViewIfNeeded();
      await expect(frame).toHaveCount(1);
      expect(workspaceRequests.get(page)!.length - before).toBe(1);
    }
  });

  test('redirects English aliases and switches languages while preserving query parameters', async ({ page, context }) => {
    test.setTimeout(60_000);
    const query = '?campaign=intent-locale&format=glb';
    for (const slug of slugs) {
      await page.goto('/en/' + slug + query, { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(ORIGIN + '/' + slug + query);
      await page.getByTestId('locale-switcher').locator('summary').click();
      await page.getByRole('menuitemradio', { name: '简体中文', exact: true }).click();
      await expect(page).toHaveURL(ORIGIN + '/zh-CN/' + slug + query);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(slug === 'image-to-3d' ? imageTo3DZhCN.comparison.title : imageTo3DZhCN.download.title);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', ORIGIN + '/zh-CN/' + slug);
      expect((await context.cookies()).find((cookie) => cookie.name === 'NEXT_LOCALE')).toMatchObject({ value: 'zh-CN', httpOnly: true, sameSite: 'Lax', path: '/' });
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
      const links = page.getByTestId('pixal3d-intent-links');
      await expect(links.getByRole('link')).toHaveCount(2);
      await expect(links.getByRole('link', { name: dictionary.common.downloadLink })).toHaveAttribute('href', localizedPath(slugs[0], locale));
      await expect(links.getByRole('link', { name: dictionary.common.compareLink })).toHaveAttribute('href', localizedPath(slugs[1], locale));
      await links.getByRole('link', { name: dictionary.common.downloadLink }).click();
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

  test('keeps both localized pages within 390px and decodes local source images', async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 390, height: 844 });
    for (const locale of locales) {
      for (const slug of slugs) {
        await page.goto(localizedPath(slug, locale), { timeout: TIMEOUTS.navigation, waitUntil: 'domcontentloaded' });
        await expect(page.getByTestId('intent-page')).toBeVisible();
        const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
        expect(widths.document, locale + ' ' + slug + ' document').toBeLessThanOrEqual(widths.viewport + 1);
        expect(widths.body, locale + ' ' + slug + ' body').toBeLessThanOrEqual(widths.viewport + 1);
        if (slug === 'image-to-3d-model-free-download') {
          for (const sample of publicModelSamples) {
            const image = page.getByTestId('sample-' + sample.id).locator('img');
            await image.scrollIntoViewIfNeeded();
            await expect.poll(() => image.evaluate((node) => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0)).toBe(true);
            expect((await image.boundingBox())!.width).toBeGreaterThan(0);
            expect((await image.boundingBox())!.width).toBeLessThanOrEqual(390);
          }
          const formats = page.locator('#formats > div');
          await expect(formats).toHaveCSS('overflow-x', 'auto');
          const region = await formats.evaluate((node) => ({ client: node.clientWidth, scroll: node.scrollWidth, width: node.getBoundingClientRect().width }));
          expect(region.width).toBeLessThanOrEqual(390);
          expect(region.scroll).toBeGreaterThan(region.client);
        }
      }
    }
  });
});
