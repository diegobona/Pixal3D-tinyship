import { describe, expect, test } from 'vitest';
import { mergeMyAssetStatusUpdate } from '../../../apps/next-app/lib/my-assets-status-updates';
import type { MyAssetItem } from '../../../apps/next-app/components/my-assets-grid';

const baseItems: MyAssetItem[] = [
  {
    id: 'task_processing',
    prompt: 'Generate a model',
    status: 'processing',
    resolution: 1024,
    textureSize: 1024,
    creditsConsumed: 1000,
    createdAtLabel: 'May 31, 2026',
  },
];

describe('mergeMyAssetStatusUpdate', () => {
  test('updates a processing asset when status polling returns a completed GLB', () => {
    const merged = mergeMyAssetStatusUpdate(baseItems, {
      id: 'task_processing',
      status: 'succeeded',
      result: {
        modelUrl: 'https://fal.media/model.glb',
      },
    });

    expect(merged[0]).toMatchObject({
      id: 'task_processing',
      status: 'succeeded',
      modelUrl: 'https://fal.media/model.glb',
    });
  });

  test('keeps other assets unchanged when the status update is for a different task', () => {
    const merged = mergeMyAssetStatusUpdate(baseItems, {
      id: 'task_other',
      status: 'failed',
      errorMessage: 'Failed elsewhere',
    });

    expect(merged).toEqual(baseItems);
  });
});
