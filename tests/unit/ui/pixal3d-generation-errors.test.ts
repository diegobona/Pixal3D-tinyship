import { describe, expect, test } from 'vitest';
import {
  Pixal3DGenerationStatusUnknownError,
  isPixal3DGenerationStatusUnknownError,
} from '../../../apps/next-app/lib/pixal3d-generation-errors';

describe('Pixal3D generation errors', () => {
  test('identifies polling and timeout errors as uncertain task status', () => {
    const error = new Pixal3DGenerationStatusUnknownError('Still checking the task.');

    expect(isPixal3DGenerationStatusUnknownError(error)).toBe(true);
  });

  test('does not classify provider failures as uncertain task status', () => {
    expect(isPixal3DGenerationStatusUnknownError(new Error('Provider failed.'))).toBe(false);
  });
});
