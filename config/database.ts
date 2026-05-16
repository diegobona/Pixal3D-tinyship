/**
 * Database Configuration
 */
import { requireEnvForService } from './utils';

export const databaseConfig = {
  // Required core service, using error instead of warning
  get url() {
    return requireEnvForService('DATABASE_URL', 'Database', 'postgresql://username:password@localhost:5432/database_name');
  }
} as const;
