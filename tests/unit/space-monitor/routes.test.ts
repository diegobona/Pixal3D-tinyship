import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const monitor = vi.hoisted(() => ({ resolve: vi.fn(), read: vi.fn(), run: vi.fn() }));
vi.mock('@libs/space-monitor', () => ({
  resolveSpaceTarget: monitor.resolve,
  readSpaceState: monitor.read,
  runSpaceMonitor: monitor.run,
}));

import { GET as resolveWorkspace } from '../../../apps/next-app/app/api/space-workspaces/[model]/route';
import { GET as getStatus, POST as checkWorkspace } from '../../../apps/next-app/app/api/cron/space-monitor/[model]/route';

const context = (model = 'trellis') => ({ params: Promise.resolve({ model }) });
const target = { spaceId: 'microsoft/TRELLIS.2', url: 'https://microsoft-trellis-2.hf.space' };
const now = new Date('2026-10-07T08:00:03.000Z');
function request(method: 'GET' | 'POST', options: { secret?: string; query?: string; headers?: Record<string, string> } = {}) {
  return new Request('http://localhost/api/cron/space-monitor/trellis' + (options.query ?? ''), {
    method,
    headers: { ...(options.secret ? { 'x-cron-secret': options.secret } : {}), ...options.headers },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('SPACE_MONITOR_SECRET', 'monitor-test-secret');
  monitor.resolve.mockResolvedValue(target);
  monitor.read.mockResolvedValue(null);
  monitor.run.mockResolvedValue({ outcome: 'not_due' });
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('public workspace resolver route', () => {
  it.each(['pixal3d', 'trellis', 'hunyuan3d'])('allows anonymous %s iframe requests and never starts a check', async (model) => {
    vi.stubEnv('SPACE_MONITOR_SECRET', '');
    const response = await resolveWorkspace(new Request('http://localhost/api/space-workspaces/' + model), context(model));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(target.url);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    expect(await response.text()).toBe('');
    expect(monitor.resolve).toHaveBeenCalledExactlyOnceWith(model);
    expect(monitor.run).not.toHaveBeenCalled();
    expect(monitor.read).not.toHaveBeenCalled();
  });

  it.each(['rodin', 'constructor', '__proto__', 'TRELLIS', 'https://attacker.invalid'])('rejects unknown model %s before resolving a destination', async (model) => {
    const response = await resolveWorkspace(new Request('http://localhost/api/space-workspaces/invalid'), context(model));
    expect(response.status).toBe(404);
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(monitor.resolve).not.toHaveBeenCalled();
  });

  it('ignores caller URL and source overrides and only uses the trusted resolver result', async () => {
    const response = await resolveWorkspace(new Request('http://localhost/api/space-workspaces/trellis?url=https://attacker.invalid&target=https://attacker.invalid&space=other/model'), context());
    expect(response.headers.get('location')).toBe(target.url);
    expect(monitor.resolve).toHaveBeenCalledExactlyOnceWith('trellis');
  });
});

describe('protected monitor routes', () => {
  it('does not activate monitor access with the unrelated yearly-credit secret', async () => {
    vi.stubEnv('SPACE_MONITOR_SECRET', '');
    vi.stubEnv('CRON_SECRET', 'yearly-credit-only');
    const response = await checkWorkspace(request('POST', { secret: 'yearly-credit-only' }), context());
    expect(response.status).toBe(503);
    expect(monitor.run).not.toHaveBeenCalled();
  });

  for (const [method, handler] of [['GET', getStatus], ['POST', checkWorkspace]] as const) {
    it(method + ' rejects absent or invalid caller credentials without storage/provider access', async () => {
      for (const secret of [undefined, 'wrong', 'x'.repeat(4097)]) {
        const response = await handler(request(method, { secret }), context());
        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({ error: 'unauthorized' });
        expect(response.headers.get('cache-control')).toContain('no-store');
      }
      expect(monitor.read).not.toHaveBeenCalled();
      expect(monitor.run).not.toHaveBeenCalled();
    });

    it(method + ' fails safely when no server secret is configured', async () => {
      vi.stubEnv('SPACE_MONITOR_SECRET', '');
      const response = await handler(request(method, { secret: 'monitor-test-secret' }), context());
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ error: 'monitor_secret_not_configured' });
      expect(monitor.read).not.toHaveBeenCalled();
      expect(monitor.run).not.toHaveBeenCalled();
    });

    it(method + ' validates model only after successful authorization', async () => {
      const response = await handler(request(method, { secret: 'monitor-test-secret' }), context('constructor'));
      expect(response.status).toBe(404);
      expect(monitor.read).not.toHaveBeenCalled();
      expect(monitor.run).not.toHaveBeenCalled();
    });
  }

  it('returns authorized status without the live lease token', async () => {
    monitor.read.mockResolvedValue({ model: 'trellis', activeTarget: target, lastCheckedAt: now.toISOString(), leaseToken: 'internal-lease' });
    const response = await getStatus(request('GET', { headers: { authorization: 'Bearer monitor-test-secret' } }), context());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ model: 'trellis', status: { activeTarget: target } });
    expect(JSON.stringify(body)).not.toContain('internal-lease');
    expect(body.status).not.toHaveProperty('leaseToken');
    expect(monitor.read).toHaveBeenCalledExactlyOnceWith('trellis');
    expect(monitor.run).not.toHaveBeenCalled();
  });

  it('returns an empty status before the model has persistent state', async () => {
    const response = await getStatus(request('GET', { secret: 'monitor-test-secret' }), context());
    expect(await response.json()).toEqual({ model: 'trellis', status: null });
  });

  it('does not expose storage exceptions in the status response', async () => {
    monitor.read.mockRejectedValue(new Error('private connection details'));
    const response = await getStatus(request('GET', { secret: 'monitor-test-secret' }), context());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'monitor_storage_unavailable' });
  });

  it('uses the recent fixed trigger time for the shared due calculation', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const scheduled = new Date('2026-10-07T08:00:00.000Z');
    const response = await checkWorkspace(request('POST', { secret: 'monitor-test-secret', headers: { 'x-cron-scheduled-time': String(scheduled.getTime()) } }), context());
    expect(response.status).toBe(200);
    expect(monitor.run).toHaveBeenCalledExactlyOnceWith('trellis', scheduled, 'check');
    expect(await response.json()).toEqual({ model: 'trellis', result: { outcome: 'not_due' } });
  });

  it.each(['0', 'invalid', String(now.getTime() + 60 * 60_000)])('ignores invalid or stale trigger time %s', async (timestamp) => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    await checkWorkspace(request('POST', { secret: 'monitor-test-secret', headers: { 'x-cron-scheduled-time': timestamp } }), context());
    expect(monitor.run).toHaveBeenCalledExactlyOnceWith('trellis', now, 'check');
  });

  it('rejects unsupported actions without starting a check', async () => {
    const response = await checkWorkspace(request('POST', { secret: 'monitor-test-secret', query: '?action=force&url=https://attacker.invalid' }), context());
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_action' });
    expect(monitor.run).not.toHaveBeenCalled();
  });

  it.each([['rolled_back', 200], ['rollback_rejected', 409], ['lease_lost', 409]] as const)('passes explicit rollback through and maps %s', async (outcome, status) => {
    monitor.run.mockResolvedValue({ outcome });
    const response = await checkWorkspace(request('POST', { secret: 'monitor-test-secret', query: '?action=rollback' }), context());
    expect(response.status).toBe(status);
    expect(monitor.run).toHaveBeenCalledWith('trellis', expect.any(Date), 'rollback');
  });

  it('does not expose provider or storage exceptions in the check response', async () => {
    monitor.run.mockRejectedValue(new Error('private provider details'));
    const response = await checkWorkspace(request('POST', { secret: 'monitor-test-secret' }), context());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'monitor_check_failed' });
  });
});
