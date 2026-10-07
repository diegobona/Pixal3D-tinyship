import { expect, test } from '@playwright/test';

test('serves an anonymous text sitemap with the same URLs as XML', async ({ request, page }) => {
  const response = await request.get('/sitemap.txt', { maxRedirects: 0 });
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toBe('text/plain; charset=utf-8');
  expect(response.headers()['location']).toBeUndefined();
  const body = await response.text();
  expect(body.endsWith('\n')).toBe(true);
  const urls = body.trimEnd().split('\n');
  expect(urls.length).toBeGreaterThan(0);
  expect(new Set(urls).size).toBe(urls.length);
  for (const url of urls) {
    expect(url).toBe(url.trim());
    const parsed = new URL(url);
    expect(['http:', 'https:']).toContain(parsed.protocol);
    expect(parsed.pathname).not.toMatch(/^\/(?:zh-CN\/)?(?:api|signin|signup|dashboard|my-assets)(?:\/|$)/);
  }

  const xmlResponse = await request.get('/sitemap.xml', { maxRedirects: 0 });
  expect(xmlResponse.status()).toBe(200);
  const xml = await page.evaluate((content) => {
    const document = new DOMParser().parseFromString(content, 'application/xml');
    return {
      errors: document.getElementsByTagName('parsererror').length,
      urls: Array.from(document.getElementsByTagName('loc'), (node) => node.textContent),
    };
  }, await xmlResponse.text());
  expect(xml.errors).toBe(0);
  expect([...urls].sort()).toEqual(xml.urls.sort());
});

test('keeps the text sitemap public for Chinese preferences and a crawler user agent', async ({ request }) => {
  const normal = await request.get('/sitemap.txt', { maxRedirects: 0 });
  const crawler = await request.get('/sitemap.txt', {
    maxRedirects: 0,
    headers: {
      'Accept-Language': 'zh-CN,zh;q=0.9',
      Cookie: 'NEXT_LOCALE=zh-CN',
      'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    },
  });
  expect(normal.status()).toBe(200);
  expect(crawler.status()).toBe(200);
  expect(crawler.headers()['content-type']).toBe('text/plain; charset=utf-8');
  expect(crawler.headers()['location']).toBeUndefined();
  expect(await crawler.text()).toBe(await normal.text());
});
