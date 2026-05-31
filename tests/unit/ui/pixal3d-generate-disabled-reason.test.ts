import { describe, expect, test } from 'vitest';
import { getPixal3DGenerateDisabledReason } from '../../../apps/next-app/lib/pixal3d-generate-disabled-reason';

const labels = {
  signInRequired: 'Sign in to generate with credits',
  insufficientCredits: 'Need {required} credits. You have {balance}.',
  imageRequired: 'Upload an image first',
  readingImage: 'Reading image...',
};

describe('getPixal3DGenerateDisabledReason', () => {
  test('asks unauthenticated users to sign in first', () => {
    expect(getPixal3DGenerateDisabledReason({
      isSessionPending: false,
      isAuthenticated: false,
      hasImage: false,
      creditBalance: 0,
      requiredCredits: 1100,
      isReadingFile: false,
      isProcessing: false,
      labels,
    })).toBe('Sign in to generate with credits');
  });

  test('shows the selected resolution cost and current balance when credits are insufficient', () => {
    expect(getPixal3DGenerateDisabledReason({
      isSessionPending: false,
      isAuthenticated: true,
      hasImage: true,
      creditBalance: 250,
      requiredCredits: 1600,
      isReadingFile: false,
      isProcessing: false,
      labels,
    })).toBe('Need 1,600 credits. You have 250.');
  });

  test('asks users with enough credits to upload an image before generating', () => {
    expect(getPixal3DGenerateDisabledReason({
      isSessionPending: false,
      isAuthenticated: true,
      hasImage: false,
      creditBalance: 1200,
      requiredCredits: 1100,
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
      requiredCredits: 1100,
      isReadingFile: true,
      isProcessing: false,
      labels,
    })).toBe('Reading image...');
  });
});
