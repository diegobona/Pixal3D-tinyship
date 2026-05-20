import { config } from '@config';
import { S3Provider, createR2Provider } from './providers/s3';
import type { StorageProvider } from './types';

export type StorageProviderType = 's3' | 'r2';

/**
 * Create storage provider instance
 * @param provider Storage provider type
 * @returns Storage provider instance
 */
export function createStorageProvider<T extends StorageProviderType>(
  provider: T
): StorageProvider {
  switch (provider) {
    case 's3':
      return new S3Provider();
    case 'r2':
      return createR2Provider();
    default:
      throw new Error(`Unsupported storage provider: ${provider}`);
  }
}

function normalizeStorageProvider(provider: string | undefined): StorageProviderType {
  return provider === 's3' || provider === 'r2' ? provider : 'r2';
}

// Export types and provider implementations for convenience
export * from './types';
export { S3Provider, createR2Provider };

// Default storage instance for easy usage
// Uses the defaultProvider from config, which can be set via STORAGE_PROVIDER env var
export const storage = createStorageProvider(normalizeStorageProvider(config.storage.defaultProvider));
