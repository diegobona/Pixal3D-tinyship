import { Pool } from 'pg';
import { config } from 'dotenv';
import { resolve } from 'path';

/**
 * Credits Seeding Helper for E2E Tests
 *
 * Directly sets a user's credit balance via SQL.
 * Used in `beforeAll` to give test users enough credits
 * for AI chat / image generation tests without running
 * the full payment flow.
 */

// Load .env from the project root
config({ path: resolve(__dirname, '../../../.env') });

/**
 * Seed credits for a user by directly updating their balance.
 * Also inserts a `bonus` transaction record for audit trail.
 */
export async function seedCredits(userId: string, amount: number): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL not set — cannot seed credits.');
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    // Update the user's credit balance
    await pool.query(
      `UPDATE "user" SET credit_balance = credit_balance + $1, updated_at = NOW() WHERE id = $2`,
      [amount, userId]
    );

    // Insert a transaction record for traceability
    const txnId = `txn_e2e_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await pool.query(
      `INSERT INTO credit_transaction (id, user_id, type, amount, balance, description, created_at)
       VALUES ($1, $2, 'bonus', $3, $3, 'E2E test credit seeding', NOW())`,
      [txnId, userId, amount.toString()]
    );

    console.log(`[credits] Seeded ${amount} credits for user ${userId}`);
  } finally {
    await pool.end();
  }
}
