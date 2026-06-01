import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Cloudflare yearly credits cron wiring', () => {
  it('deploys the OpenNext worker with a daily Cron Trigger and scheduled patch', () => {
    const wranglerConfig = readFileSync('apps/next-app/wrangler.jsonc', 'utf8');
    const buildScript = readFileSync('scripts/opennext-cloudflare.mjs', 'utf8');

    expect(wranglerConfig).toContain('"main": ".open-next/worker.js"');
    expect(wranglerConfig).toContain('"triggers"');
    expect(wranglerConfig).toContain('"crons": ["0 8 * * *"]');
    expect(buildScript).toContain('patchOpenNextCronWorker');
    expect(buildScript).toContain('/api/cron/refresh-yearly-credits');
    expect(buildScript).toContain('scheduled(controller, env, ctx)');
  });
});
