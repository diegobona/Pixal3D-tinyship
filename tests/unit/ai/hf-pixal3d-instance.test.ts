import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  extractGradioLiveUrls,
  selectLeastBusyHfPixal3DInstance,
} from '@libs/ai/hf-pixal3d-instance';

describe('HF Pixal3D instance resolver', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test('extracts unique gradio.live URLs from escaped page content', () => {
    const content = '&quot;https://aaa111.gradio.live&quot; https:\\/\\/bbb222.gradio.live https://aaa111.gradio.live/';

    expect(extractGradioLiveUrls(content)).toEqual([
      'https://aaa111.gradio.live',
      'https://bbb222.gradio.live',
    ]);
  });

  test('selects the available instance with the smallest queue', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const href = String(url);

      if (href === 'https://tencentarc-pixal3d-server.hf.space/config') {
        return new Response(JSON.stringify({
          components: [
            {
              props: {
                value: [
                  'https://first111.gradio.live',
                  'https://second222.gradio.live',
                  'https://third333.gradio.live',
                ].join(' '),
              },
            },
          ],
        }));
      }

      if (href.includes('first111')) {
        return new Response(JSON.stringify({ queue_size: 4 }));
      }

      if (href.includes('second222')) {
        return new Response(JSON.stringify({ queue_size: 1 }));
      }

      if (href.includes('third333')) {
        return new Response('offline', { status: 502 });
      }

      return new Response('not found', { status: 404 });
    });

    vi.stubGlobal('fetch', fetchMock);

    const selection = await selectLeastBusyHfPixal3DInstance();

    expect(selection?.selected.url).toBe('https://second222.gradio.live');
    expect(selection?.selected.queueSize).toBe(1);
    expect(selection?.instances).toHaveLength(3);
    expect(selection?.instances[2].available).toBe(false);

    warnSpy.mockRestore();
  });
});
