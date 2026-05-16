/**
 * Playwright Global Teardown
 *
 * Runs after all E2E tests finish.
 * Deletes test users (email matching `e2e-*@example.com`) from the database.
 *
 * All related records (account, session, order, subscription, credit_transaction)
 * are cascade-deleted automatically thanks to `onDelete: 'cascade'` foreign keys.
 */

import { Pool } from 'pg';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from the project root so DATABASE_URL is available
config({ path: resolve(__dirname, '../../.env') });

const E2E_EMAIL_PATTERN = 'e2e-%@example.com';

export default async function globalTeardown() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.warn('[teardown] DATABASE_URL not set — skipping test user cleanup.');
    return;
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    const result = await pool.query(
      `DELETE FROM "user" WHERE email LIKE $1`,
      [E2E_EMAIL_PATTERN]
    );

    const count = result.rowCount ?? 0;
    if (count > 0) {
      console.log(`[teardown] Cleaned up ${count} E2E test user(s).`);
    } else {
      console.log('[teardown] No E2E test users to clean up.');
    }
  } catch (error) {
    console.error('[teardown] Failed to clean up test users:', error);
  } finally {
    await pool.end();
  }
}
