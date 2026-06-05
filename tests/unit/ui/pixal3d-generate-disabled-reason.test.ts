import { describe, expect, test } from 'vitest';
import { en } from '../../../libs/i18n/locales/en';
import { getPixal3DGenerateDisabledReason } from '../../../apps/next-app/lib/pixal3d-generate-disabled-reason';

const labels = {
  signInRequired: 'Sign in and subscribe for faster, stable generation, never offline. Free trial is available above.',
  insufficientCredits: 'Not enough credits.',
  imageRequired: 'Upload an image first',
  readingImage: 'Reading image...',
};

describe('getPixal3DGenerateDisabledReason', () => {
  test('uses a simple insufficient credits label in the home generator copy', () => {
    const copy = en.pixal3d.generator.errors.generateDisabledInsufficientCredits;

    expect(copy).toBe('Not enough credits.');
    expect(copy).not.toContain('{required}');
    expect(copy).not.toContain('{balance}');
  });

  test('asks unauthenticated users to sign in first', () => {
    expect(getPixal3DGenerateDisabledReason({
      isSessionPending: false,
      isAuthenticated: false,
      hasImage: false,
      creditBalance: 0,
      requiredCredits: 1000,
      isReadingFile: false,
      isProcessing: false,
      labels,
    })).toBe('Sign in and subscribe for faster, stable generation, never offline. Free trial is available above.');
  });

  test('shows a simple insufficient credits message without exposing cost details', () => {
    expect(getPixal3DGenerateDisabledReason({
      isSessionPending: false,
      isAuthenticated: true,
      hasImage: true,
      creditBalance: 250,
      requiredCredits: 1500,
      isReadingFile: false,
      isProcessing: false,
      labels,
    })).toBe('Not enough credits.');
  });

  test('asks users with enough credits to upload an image before generating', () => {
    expect(getPixal3DGenerateDisabledReason({
      isSessionPending: false,
      isAuthenticated: true,
      hasImage: false,
      creditBalance: 1200,
      requiredCredits: 1000,
      isReadingFile: false,
      isProcessing: false,
      labels,
    })).toBe('Upload an image first');
  });

  test('prioritizes the reading image state after the main requirements are met', () => {
    expect(getPixal3DGenerateDisabledReason({
      isSessionPending: false,
      isAuthenticated: true,
      hasImage: false,
      creditBalance: 1200,
      requiredCredits: 1000,
      isReadingFile: true,
      isProcessing: false,
      labels,
    })).toBe('Reading image...');
  });
});
