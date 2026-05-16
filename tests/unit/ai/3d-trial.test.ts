import { describe, expect, test, beforeEach } from 'vitest';

describe('Pixal3D anonymous trial guard', () => {
  beforeEach(async () => {
    const { resetAnonymousTrialStore } = await import('@libs/ai/3d-task-store');
    resetAnonymousTrialStore();
  });

  test('allows the first anonymous trial and rejects the second for the same visitor', async () => {
    const { reserveAnonymousTrial } = await import('@libs/ai/3d-task-store');

    const first = reserveAnonymousTrial({
      ipHash: 'ip-a',
      trialToken: 'trial-token-a',
    });
    const second = reserveAnonymousTrial({
      ipHash: 'ip-a',
      trialToken: 'trial-token-a',
    });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(false);
    expect(second.reason).toBe('trial_used');
  });
});
