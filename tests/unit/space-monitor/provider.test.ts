import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isSpaceModelId, isTrustedSpaceTarget, SPACE_DEFAULT_TARGETS, SPACE_IDENTITY_PROFILES, workspaceUrl,
} from '../../../config/space-workspaces';
import { discoverReplacement, probeSpace } from '../../../libs/space-monitor/provider';
import type { SpaceModelId, SpaceTarget } from '../../../libs/space-monitor/types';

// Tiny source fixtures exercise the real hash comparison without embedding provider code.
vi.mock('../../../config/space-workspaces', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../config/space-workspaces')>();
  const crypto = await import('node:crypto');
  return {
    ...original,
    SPACE_IDENTITY_PROFILES: original.SPACE_IDENTITY_PROFILES.map((profile) => ({
      ...profile,
      sourceHashes: Object.fromEntries(Object.keys(profile.sourceHashes).map((file) => [
        file, crypto.createHash('sha256').update(`reviewed ${profile.target.spaceId} ${file}\n`).digest('hex'),
      ])),
      codeTreeDigest: crypto.createHash('sha256').update(Object.keys(profile.sourceHashes).map((file) =>
        `${file} file ${crypto.createHash('sha1').update(`reviewed ${profile.target.spaceId} ${file}`).digest('hex')}`,
      ).sort().join('\n') + '\n').digest('hex'),
    })),
  };
});

const fetchMock = vi.fn<typeof fetch>();
const changedRevision = 'a'.repeat(40);
type Profile = (typeof SPACE_IDENTITY_PROFILES)[number];
const profileFor = (model: SpaceModelId) => SPACE_IDENTITY_PROFILES.find((profile) => profile.model === model)!;
const candidateFor = (model: SpaceModelId) => SPACE_IDENTITY_PROFILES.find((profile) =>
  profile.model === model && profile.target.spaceId !== SPACE_DEFAULT_TARGETS[model].spaceId)!;
const json = (body: unknown, status = 200, headers?: HeadersInit) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json', ...headers },
});
const metadata = (profile: Profile, overrides: Record<string, unknown> = {}) => ({
  id: profile.target.spaceId, host: profile.target.url, sha: profile.target.revision,
  private: false, disabled: false, sdk: 'gradio', models: profile.modelIds,
  cardData: { app_file: profile.appFile }, runtime: { stage: 'RUNNING' }, ...overrides,
});
const fileSchema = { type: 'object', properties: { path: { type: 'string' }, meta: { properties: { _type: { const: 'gradio.FileData' } } } } };
interface ConfigFixture {
  version: string;
  components: { id?: number; type: string; props?: Record<string, unknown>; api_info_as_input?: unknown; api_info_as_output?: unknown }[];
  dependencies: Record<string, unknown>[];
}
const config = (profile: Profile): ConfigFixture => profile.frontend === 'custom' ? {
  version: '6.14.0',
  components: [
    { id: 1, type: 'api', api_info_as_input: fileSchema },
    { id: 2, type: 'api', api_info_as_output: profile.target.spaceId === 'TencentARC/Pixal3D' ? fileSchema : { type: 'string' } },
  ],
  dependencies: [
    { api_name: profile.target.spaceId === 'TencentARC/Pixal3D' ? 'generate_3d' : 'generate_fast', inputs: [1], outputs: [2], backend_fn: true, api_visibility: 'public' },
    { api_name: profile.target.spaceId === 'TencentARC/Pixal3D' ? 'extract_glb_api' : 'extract', inputs: [2], outputs: [2], backend_fn: true, api_visibility: 'public' },
  ],
} : ({
  version: '6.14.0', dependencies: [{ outputs: [100] }],
  components: [{ type: 'image', props: { visible: true } }, ...profile.requiredControls.map((label) => ({
    type: 'button', props: { value: label, visible: true, interactive: true },
  })), ...(profile.requiredTab ? [{ type: 'tabitem', props: { label: profile.requiredTab, visible: true } }] : []),
  { id: 100, type: 'downloadbutton', props: { label: 'Download', visible: true, interactive: false } }],
});
const appDocument = (profile: Profile) => profile.frontend === 'custom'
  ? `<html><title>Pixal3D</title><input type="file" id="${profile.target.spaceId === 'TencentARC/Pixal3D' ? 'file-input' : 'imageInput'}" accept="image/*"><button id="${profile.target.spaceId === 'TencentARC/Pixal3D' ? 'generate-btn' : 'generateBtn'}"></button><button id="${profile.target.spaceId === 'TencentARC/Pixal3D' ? 'download-btn' : 'downloadBtn'}"></button></html>`
  : '<html><gradio-app></gradio-app></html>';
const treeFixture = (profile: Profile) => Object.keys(profile.sourceHashes).map((file) => ({
  path: file, type: 'file', oid: createHash('sha1').update(`reviewed ${profile.target.spaceId} ${file}`).digest('hex'),
}));
function serveProfile(profile: Profile, overrides: Record<string, unknown> = {}) {
  const data = metadata(profile, overrides);
  fetchMock.mockImplementation(async (input) => {
    const url = String(input);
    if (url === `https://huggingface.co/api/spaces/${profile.target.spaceId}`) return json(data);
    if (url === `${profile.target.url}/`) return new Response(appDocument(profile), { headers: { 'content-type': 'text/html' } });
    if (url === `${profile.target.url}/config`) return json(config(profile));
    if (url === `https://huggingface.co/api/spaces/${profile.target.spaceId}/tree/${data.sha}?recursive=true&expand=false`) return json(treeFixture(profile));
    for (const file of Object.keys(profile.sourceHashes)) {
      if (url === `https://huggingface.co/spaces/${profile.target.spaceId}/raw/${data.sha}/${file}`) {
        return new Response(`reviewed ${profile.target.spaceId} ${file}\n`);
      }
    }
    throw new Error(`Unexpected GET: ${url}`);
  });
}

beforeEach(() => vi.stubGlobal('fetch', fetchMock));
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); fetchMock.mockReset(); });

describe('workspace target boundaries', () => {
  it('exposes only the three monitored model resolvers', () => {
    expect(isSpaceModelId('pixal3d')).toBe(true);
    expect(isSpaceModelId('rodin')).toBe(false);
    expect(workspaceUrl('trellis')).toBe('/api/space-workspaces/trellis');
  });

  it.each([
    'http://victor-pixal3d-studio.hf.space', 'https://victor-pixal3d-studio.hf.space.evil.test',
    'https://127.0.0.1', 'https://user@victor-pixal3d-studio.hf.space',
    'https://victor-pixal3d-studio.hf.space:8443', 'https://victor-pixal3d-studio.hf.space/path',
    'https://victor-pixal3d-studio.hf.space?url=http://localhost',
  ])('refuses an unsafe destination without making a request: %s', async (url) => {
    const target = { ...SPACE_DEFAULT_TARGETS.pixal3d, url };
    expect(isTrustedSpaceTarget('pixal3d', target)).toBe(false);
    expect((await probeSpace('pixal3d', target)).status).toBe('unknown');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires a model-specific profile and revision for an unknown clone', () => {
    const target = { spaceId: 'example/PixalClone', url: 'https://example-pixalclone.hf.space' };
    expect(isTrustedSpaceTarget('pixal3d', target)).toBe(false);
    expect(isTrustedSpaceTarget('pixal3d', { ...target, revision: changedRevision, verifiedProfile: 'microsoft/TRELLIS.2' })).toBe(false);
    expect(isTrustedSpaceTarget('pixal3d', { ...target, revision: changedRevision, verifiedProfile: 'victor/pixal3d-studio' })).toBe(true);
  });

  it('rejects path traversal and host/Space mismatches', async () => {
    expect(isTrustedSpaceTarget('pixal3d', { spaceId: '../private', url: 'https://example-private.hf.space' })).toBe(false);
    serveProfile(profileFor('pixal3d'), { host: 'https://metadata-controlled.evil.test' });
    expect((await probeSpace('pixal3d', SPACE_DEFAULT_TARGETS.pixal3d)).status).toBe('unknown');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('public Space probing', () => {
  it.each(['pixal3d', 'trellis', 'hunyuan3d'] as const)('confirms %s frontend without inference', async (model) => {
    const profile = profileFor(model);
    serveProfile(profile);
    const result = await probeSpace(model, SPACE_DEFAULT_TARGETS[model]);
    expect(result.status).toBe('healthy');
    expect(result.target?.revision).toBe(profile.target.revision);
    expect(fetchMock.mock.calls.every(([, init]) => init?.method === 'GET' && init.redirect === 'manual' && init.credentials === 'omit')).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it.each(['BUILDING', 'SLEEPING', 'STOPPED', 'APP_STARTING', 'RUNNING_BUILDING', 'RUNNING_APP_STARTING'])('does not fail over on %s', async (stage) => {
    serveProfile(profileFor('trellis'), { runtime: { stage } });
    expect((await probeSpace('trellis', SPACE_DEFAULT_TARGETS.trellis)).status).toBe('transient');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each(['BUILD_ERROR', 'RUNTIME_ERROR', 'CONFIG_ERROR', 'NO_APP_FILE', 'PAUSED', 'DELETING'])('reports explicit unavailable state %s', async (stage) => {
    serveProfile(profileFor('trellis'), { runtime: { stage } });
    expect((await probeSpace('trellis', SPACE_DEFAULT_TARGETS.trellis)).status).toBe('unavailable');
  });

  it('preserves an unrecognized future runtime stage', async () => {
    serveProfile(profileFor('trellis'), { runtime: { stage: 'FUTURE_STATE' } });
    expect((await probeSpace('trellis', SPACE_DEFAULT_TARGETS.trellis)).status).toBe('unknown');
  });

  it.each([429, 401, 403])('does not turn metadata HTTP %s into an outage', async (status) => {
    fetchMock.mockResolvedValue(json({ error: 'Access or rate limit' }, status));
    expect((await probeSpace('trellis', SPACE_DEFAULT_TARGETS.trellis)).status).toBe(status === 429 ? 'transient' : 'unknown');
  });

  it('reports a deleted or explicitly private Space as unavailable', async () => {
    fetchMock.mockResolvedValue(json({ error: 'not found' }, 404));
    expect((await probeSpace('trellis', SPACE_DEFAULT_TARGETS.trellis)).status).toBe('unavailable');
    serveProfile(profileFor('trellis'), { private: true });
    expect((await probeSpace('trellis', SPACE_DEFAULT_TARGETS.trellis)).status).toBe('unavailable');
  });

  it('classifies network/timeout uncertainty without switching', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    expect((await probeSpace('trellis', SPACE_DEFAULT_TARGETS.trellis)).status).toBe('unknown');
  });

  it.each(['/', '/config'])('reports confirmed frontend connection failure at %s as unavailable', async (path) => {
    const profile = profileFor('trellis');
    serveProfile(profile);
    const base = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (input, init) => {
      if (String(input) === `${profile.target.url}${path}`) throw new TypeError('fetch failed');
      return base(input, init);
    });
    expect((await probeSpace('trellis', profile.target)).status).toBe('unavailable');
  });

  it('reports a full endpoint timeout after confirmed identity as unavailable', async () => {
    vi.useFakeTimers();
    const profile = profileFor('trellis');
    serveProfile(profile);
    const base = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (input, init) => String(input) === `${profile.target.url}/`
      ? new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }))
      : base(input, init));
    const result = probeSpace('trellis', profile.target);
    await vi.advanceTimersByTimeAsync(5_001);
    expect((await result).status).toBe('unavailable');
  });

  it('keeps source transport uncertainty unknown before declaring frontend downtime', async () => {
    const profile = profileFor('trellis');
    serveProfile(profile, { sha: changedRevision });
    const base = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (input, init) => {
      if (String(input).includes('/raw/')) throw new TypeError('fetch failed');
      return base(input, init);
    });
    expect((await probeSpace('trellis', profile.target)).status).toBe('unknown');
  });

  it('keeps the shortened total-operation deadline unknown', async () => {
    vi.useFakeTimers();
    const profile = profileFor('trellis');
    serveProfile(profile);
    const base = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (input, init) => {
      if (String(input).startsWith('https://huggingface.co/api/spaces/')) {
        vi.setSystemTime(Date.now() + 17_000);
        return base(input, init);
      }
      return new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }));
    });
    const result = probeSpace('trellis', profile.target);
    await vi.advanceTimersByTimeAsync(3_001);
    expect((await result).status).toBe('unknown');
  });

  it('keeps an oversized app response unknown', async () => {
    const profile = profileFor('trellis');
    serveProfile(profile);
    const base = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (input, init) => String(input) === `${profile.target.url}/`
      ? new Response('too large', { headers: { 'content-length': '9000000' } }) : base(input, init));
    expect((await probeSpace('trellis', profile.target)).status).toBe('unknown');
  });

  it('does not follow a provider redirect', async () => {
    serveProfile(profileFor('trellis'));
    const base = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (input, init) => String(input).endsWith('/config')
      ? new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/admin' } })
      : base(input, init));
    expect((await probeSpace('trellis', SPACE_DEFAULT_TARGETS.trellis)).status).toBe('unknown');
    expect(fetchMock.mock.calls.every(([url]) => !String(url).includes('127.0.0.1'))).toBe(true);
  });

  it.each([['x-frame-options', 'DENY'], ['x-frame-options', 'SAMEORIGIN'], ['content-security-policy', "frame-ancestors 'self'"]])('rejects an embed-blocking %s header', async (name, value) => {
    serveProfile(profileFor('trellis'));
    const base = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (input, init) => String(input) === `${SPACE_DEFAULT_TARGETS.trellis.url}/`
      ? new Response('<html><gradio-app></gradio-app></html>', { headers: { 'content-type': 'text/html', [name]: value } })
      : base(input, init));
    expect((await probeSpace('trellis', SPACE_DEFAULT_TARGETS.trellis)).status).toBe('unavailable');
  });

  it('keeps quota and login pages transient even when the runtime is RUNNING', async () => {
    serveProfile(profileFor('trellis'));
    const base = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (input, init) => String(input).endsWith('/config')
      ? json({ error: 'ZeroGPU quota exceeded. Sign in to continue.' }, 503)
      : base(input, init));
    expect((await probeSpace('trellis', SPACE_DEFAULT_TARGETS.trellis)).status).toBe('transient');
  });

  it('rejects disabled texture controls rather than declaring Hunyuan healthy', async () => {
    const profile = profileFor('hunyuan3d');
    serveProfile(profile);
    const base = fetchMock.getMockImplementation()!;
    const disabled = config(profile);
    const textured = disabled.components.find((component) => component.type === 'button' && component.props?.value === 'Gen Textured Shape')!;
    textured.props = { ...textured.props, interactive: false };
    fetchMock.mockImplementation(async (input, init) => String(input).endsWith('/config') ? json(disabled) : base(input, init));
    expect((await probeSpace('hunyuan3d', SPACE_DEFAULT_TARGETS.hunyuan3d)).status).toBe('unknown');
  });

  it('refuses a preview-only Gradio frontend without a download output', async () => {
    const profile = profileFor('trellis');
    serveProfile(profile);
    const base = fetchMock.getMockImplementation()!;
    const previewOnly = config(profile);
    previewOnly.components = previewOnly.components.filter((component) => component.type !== 'downloadbutton');
    fetchMock.mockImplementation(async (input, init) => String(input).endsWith('/config') ? json(previewOnly) : base(input, init));
    expect((await probeSpace('trellis', SPACE_DEFAULT_TARGETS.trellis)).status).toBe('unknown');
  });

  it('refuses a custom Pixal shell missing its real upload/download workflow', async () => {
    const profile = profileFor('pixal3d');
    serveProfile(profile);
    const base = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (input, init) => String(input) === `${profile.target.url}/`
      ? new Response('<html><title>Pixal3D proxy</title></html>', { headers: { 'content-type': 'text/html' } }) : base(input, init));
    expect((await probeSpace('pixal3d', SPACE_DEFAULT_TARGETS.pixal3d)).status).toBe('unknown');
  });

  it('refuses source drift when a reviewed Space changed revision', async () => {
    const profile = profileFor('pixal3d');
    serveProfile(profile, { sha: changedRevision });
    const base = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (input, init) => String(input).endsWith('/pixal3d_backend.py')
      ? new Response('pipeline = load("different/model")\n') : base(input, init));
    expect((await probeSpace('pixal3d', SPACE_DEFAULT_TARGETS.pixal3d)).status).toBe('unknown');
  });

  it('allows a new revision when reviewed app/backend and requirements remain identical', async () => {
    serveProfile(profileFor('pixal3d'), { sha: changedRevision });
    const result = await probeSpace('pixal3d', SPACE_DEFAULT_TARGETS.pixal3d);
    expect(result.status).toBe('healthy');
    expect(result.target?.revision).toBe(changedRevision);
    expect(fetchMock).toHaveBeenCalledTimes(7);
  });

  it('rejects changed imported model code even with identical app and requirements', async () => {
    const profile = profileFor('hunyuan3d');
    serveProfile(profile, { sha: changedRevision });
    const base = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (input, init) => String(input).includes('/tree/')
      ? json([...treeFixture(profile), { path: 'hy3dgen/pipeline.py', type: 'file', oid: 'b'.repeat(40) }]) : base(input, init));
    expect((await probeSpace('hunyuan3d', SPACE_DEFAULT_TARGETS.hunyuan3d)).status).toBe('unknown');
  });

  it('refuses an incomplete paginated tree instead of trusting a matching prefix', async () => {
    const profile = profileFor('trellis');
    serveProfile(profile, { sha: changedRevision });
    const base = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (input, init) => String(input).includes('/tree/')
      ? json(treeFixture(profile), 200, { link: '<https://huggingface.co/api/next>; rel="next"' }) : base(input, init));
    expect((await probeSpace('trellis', SPACE_DEFAULT_TARGETS.trellis)).status).toBe('unknown');
  });

  it('bounds a misleading content-length and an oversized streamed body', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { headers: { 'content-length': '90000000' } }));
    expect((await probeSpace('trellis', SPACE_DEFAULT_TARGETS.trellis)).status).toBe('unknown');
    fetchMock.mockResolvedValue(new Response('x'.repeat(300_000)));
    expect((await probeSpace('trellis', SPACE_DEFAULT_TARGETS.trellis)).status).toBe('unknown');
  });
});

describe('bounded exact-code replacement discovery', () => {
  it('prefers a reviewed healthy candidate with durable identity evidence', async () => {
    const profile = candidateFor('pixal3d');
    serveProfile(profile);
    const result = await discoverReplacement('pixal3d', SPACE_DEFAULT_TARGETS.pixal3d.spaceId);
    expect(result.target?.spaceId).toBe(profile.target.spaceId);
    expect(result.target?.verifiedProfile).toBe(profile.target.spaceId);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('accepts only an exact app and requirements clone from bounded search', async () => {
    const model = 'trellis';
    const profile = profileFor(model);
    const candidate = candidateFor(model);
    const clone: SpaceTarget = { spaceId: 'example/TRELLIS.2', url: 'https://example-trellis-2.hf.space', revision: changedRevision };
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url === `https://huggingface.co/api/spaces/${candidate.target.spaceId}`) return json(metadata(candidate, { runtime: { stage: 'PAUSED' } }));
      if (url.startsWith('https://huggingface.co/api/spaces?')) return json([{ id: clone.spaceId }]);
      if (url === `https://huggingface.co/api/spaces/${clone.spaceId}`) return json(metadata(profile, { id: clone.spaceId, host: clone.url, sha: clone.revision }));
      if (url === `https://huggingface.co/api/spaces/${clone.spaceId}/tree/${clone.revision}?recursive=true&expand=false`) return json(treeFixture(profile));
      if (url === `${clone.url}/`) return new Response('<html><gradio-app></gradio-app></html>', { headers: { 'content-type': 'text/html' } });
      if (url === `${clone.url}/config`) return json(config(profile));
      for (const file of Object.keys(profile.sourceHashes)) {
        if (url.endsWith(`/raw/${clone.revision}/${file}`)) return new Response(`reviewed ${profile.target.spaceId} ${file}\n`);
      }
      throw new Error(`Unexpected GET: ${url}`);
    });
    const result = await discoverReplacement(model, SPACE_DEFAULT_TARGETS[model].spaceId);
    expect(result.target).toEqual({ ...clone, verifiedProfile: profile.target.spaceId });
    expect(isTrustedSpaceTarget(model, result.target!)).toBe(true);
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(8);
  });

  it('rejects matching names or ancestry when dependency code differs', async () => {
    const model = 'trellis';
    const profile = profileFor(model);
    const candidate = candidateFor(model);
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url === `https://huggingface.co/api/spaces/${candidate.target.spaceId}`) return json(metadata(candidate, { runtime: { stage: 'PAUSED' } }));
      if (url.startsWith('https://huggingface.co/api/spaces?')) return json([{ id: 'example/TRELLIS.2' }]);
      if (url.endsWith('/api/spaces/example/TRELLIS.2')) return json(metadata(profile, {
        id: 'example/TRELLIS.2', host: 'https://example-trellis-2.hf.space', sha: changedRevision, duplicatedFrom: profile.target.spaceId,
      }));
      if (url.endsWith('/app.py')) return new Response(`reviewed ${profile.target.spaceId} app.py\n`);
      if (url.endsWith('/requirements.txt')) return new Response('unreviewed-model-loader\n');
      throw new Error(`Unexpected GET: ${url}`);
    });
    expect((await discoverReplacement(model, SPACE_DEFAULT_TARGETS[model].spaceId)).target).toBeNull();
  });

  it('continues after failed reviewed and search candidates to a verified healthy clone', async () => {
    const profile = profileFor('trellis');
    const reviewedCandidate = candidateFor('trellis');
    const clone = { spaceId: 'example/TRELLIS.2', url: 'https://example-trellis-2.hf.space', revision: changedRevision };
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url === `https://huggingface.co/api/spaces/${reviewedCandidate.target.spaceId}` || url.endsWith('/api/spaces/unreachable/TRELLIS.2')) throw new TypeError('fetch failed');
      if (url.startsWith('https://huggingface.co/api/spaces?')) return json([{ id: 'unreachable/TRELLIS.2' }, { id: clone.spaceId }]);
      if (url === `https://huggingface.co/api/spaces/${clone.spaceId}`) return json(metadata(profile, { id: clone.spaceId, host: clone.url, sha: clone.revision }));
      if (url.includes('/tree/')) return json(treeFixture(profile));
      if (url === `${clone.url}/`) return new Response(appDocument(profile), { headers: { 'content-type': 'text/html' } });
      if (url === `${clone.url}/config`) return json(config(profile));
      for (const file of Object.keys(profile.sourceHashes)) {
        if (url.endsWith(`/raw/${clone.revision}/${file}`)) return new Response(`reviewed ${profile.target.spaceId} ${file}\n`);
      }
      throw new Error(`Unexpected GET: ${url}`);
    });
    expect((await discoverReplacement('trellis', SPACE_DEFAULT_TARGETS.trellis.spaceId)).target).toEqual({ ...clone, verifiedProfile: profile.target.spaceId });
  });

  it('limits search entries and rejects unsafe IDs before fetching them', async () => {
    const candidate = candidateFor('trellis');
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url === `https://huggingface.co/api/spaces/${candidate.target.spaceId}`) return json(metadata(candidate, { runtime: { stage: 'PAUSED' } }));
      if (url.startsWith('https://huggingface.co/api/spaces?')) return json(Array.from({ length: 100 }, () => ({ id: '../private' })));
      throw new Error(`Unexpected GET: ${url}`);
    });
    expect((await discoverReplacement('trellis', SPACE_DEFAULT_TARGETS.trellis.spaceId)).target).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
import { createHash } from 'node:crypto';
