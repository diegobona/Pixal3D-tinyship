import { describe, expect, test } from 'vitest';
import {
  PIXAL3D_PROGRESS_CAP,
  PIXAL3D_PROGRESS_STEPS,
  createPixal3DProgressPlan,
  getPixal3DProgressSnapshot,
} from '../../../apps/next-app/lib/pixal3d-progress';

describe('Pixal3D progress planner', () => {
  test('creates the planned generation stages in product order', () => {
    const plan = createPixal3DProgressPlan(() => 0);

    expect(plan.map((step) => step.key)).toEqual([
      'submitting',
      'waitingForRunner',
      'preparingImage',
      'samplingSparseStructure',
      'samplingShapeSLat',
      'samplingTextureSLat',
      'buildingMesh',
      'finalizingPreview',
    ]);
    expect(plan[0]).toMatchObject({ startPercent: 0, endPercent: 8 });
    expect(plan.at(-1)).toMatchObject({ endPercent: PIXAL3D_PROGRESS_CAP });
    expect(PIXAL3D_PROGRESS_STEPS).toHaveLength(8);
  });

  test('keeps simulated progress below the cap until the provider completes', () => {
    const plan = createPixal3DProgressPlan(() => 1);
    const elapsedAfterPlan = plan.at(-1)!.endMs + 60_000;
    const snapshot = getPixal3DProgressSnapshot(plan, elapsedAfterPlan, 'processing');

    expect(snapshot.percent).toBe(PIXAL3D_PROGRESS_CAP);
    expect(snapshot.currentStepKey).toBe('finalizingPreview');
    expect(snapshot.completedStepCount).toBe(plan.length - 1);
  });

  test('jumps to 100 percent when generation succeeds', () => {
    const plan = createPixal3DProgressPlan(() => 0.5);
    const snapshot = getPixal3DProgressSnapshot(plan, 500, 'succeeded');

    expect(snapshot.percent).toBe(100);
    expect(snapshot.completedStepCount).toBe(plan.length);
  });
});
