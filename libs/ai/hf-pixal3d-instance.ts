const DEFAULT_SPACE_CONFIG_URL = 'https://tencentarc-pixal3d-server.hf.space/config';
const DEFAULT_SPACE_PAGE_URL = 'https://huggingface.co/spaces/TencentARC/Pixal3D-Server';
const REQUEST_TIMEOUT_MS = 7000;

export interface HfPixal3DInstanceStatus {
  index: number;
  url: string;
  queueSize: number | null;
  available: boolean;
}

export interface HfPixal3DInstanceSelection {
  selected: HfPixal3DInstanceStatus;
  instances: HfPixal3DInstanceStatus[];
}

function withTimeout(timeoutMs = REQUEST_TIMEOUT_MS): AbortSignal {
  return AbortSignal.timeout(timeoutMs);
}

function normalizeGradioUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

export function extractGradioLiveUrls(content: string): string[] {
  const decoded = content
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\\\//g, '/');
  const matches = decoded.match(/https:\/\/[a-z0-9-]+\.gradio\.live/gi) || [];
  return Array.from(new Set(matches.map(normalizeGradioUrl)));
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json,text/html;q=0.9,*/*;q=0.8',
      'user-agent': 'Pixal3D free-trial instance resolver',
    },
    signal: withTimeout(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.text();
}

async function getRemoteInstanceUrls(): Promise<string[]> {
  const candidates: string[] = [];

  try {
    const configText = await fetchText(DEFAULT_SPACE_CONFIG_URL);
    candidates.push(...extractGradioLiveUrls(configText));
  } catch (error) {
    console.warn('Could not read Pixal3D HF Space config:', error);
  }

  if (candidates.length === 0) {
    try {
      const pageText = await fetchText(DEFAULT_SPACE_PAGE_URL);
      candidates.push(...extractGradioLiveUrls(pageText));
    } catch (error) {
      console.warn('Could not read Pixal3D HF Space page:', error);
    }
  }

  return Array.from(new Set(candidates)).slice(0, 8);
}

async function queryInstanceStatus(url: string, index: number): Promise<HfPixal3DInstanceStatus> {
  try {
    const response = await fetch(`${url}/gradio_api/queue/status`, {
      headers: { accept: 'application/json' },
      signal: withTimeout(),
    });

    if (!response.ok) {
      throw new Error(`Queue status ${response.status}`);
    }

    const data = (await response.json()) as { queue_size?: unknown };
    const queueSize = typeof data.queue_size === 'number' && Number.isFinite(data.queue_size)
      ? Math.max(0, data.queue_size)
      : null;

    return {
      index,
      url,
      queueSize,
      available: queueSize !== null,
    };
  } catch (error) {
    console.warn(`Could not query Pixal3D instance ${index}:`, error);
    return {
      index,
      url,
      queueSize: null,
      available: false,
    };
  }
}

export async function selectLeastBusyHfPixal3DInstance(): Promise<HfPixal3DInstanceSelection | null> {
  const urls = await getRemoteInstanceUrls();
  if (urls.length === 0) return null;

  const instances = await Promise.all(urls.map((url, index) => queryInstanceStatus(url, index)));
  const available = instances
    .filter((instance) => instance.available && instance.queueSize !== null)
    .sort((a, b) => {
      const queueDelta = (a.queueSize || 0) - (b.queueSize || 0);
      return queueDelta === 0 ? a.index - b.index : queueDelta;
    });

  if (available.length === 0) return null;

  return {
    selected: available[0],
    instances,
  };
}
