import type {
  ThreeDGenerationResult,
  ThreeDGenerationStatus,
  ThreeDResolution,
  ThreeDTextureSize,
} from './3d';
import type { Pixal3dGeneration } from '@libs/database/schema/pixal3d-generation';

export interface AnonymousTrialInput {
  ipHash: string;
  trialToken: string;
}

export interface AnonymousTrialResult {
  allowed: boolean;
  reason?: 'trial_used';
}

export interface ThreeDGenerationRecord {
  id: string;
  userId?: string;
  anonymousKey?: string;
  inputImageUrl: string;
  prompt: string;
  provider: string;
  model: string;
  status: ThreeDGenerationStatus;
  providerTaskId: string;
  creditCost: number;
  resolution: ThreeDResolution;
  textureSize: ThreeDTextureSize;
  consumeTransactionId?: string;
  refunded?: boolean;
  result?: ThreeDGenerationResult;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

type ThreeDTaskStore = {
  anonymousTrials: Set<string>;
};

const globalTaskStore = globalThis as typeof globalThis & {
  __pixal3DTaskStore?: ThreeDTaskStore;
};

const taskStore = globalTaskStore.__pixal3DTaskStore ??= {
  anonymousTrials: new Set<string>(),
};

const anonymousTrials = taskStore.anonymousTrials;

async function getGenerationPersistenceDeps() {
  const [{ db }, { pixal3dGeneration }, { desc, eq }] = await Promise.all([
    import('@libs/database'),
    import('@libs/database/schema/pixal3d-generation'),
    import('drizzle-orm'),
  ]);

  return { db, pixal3dGeneration, desc, eq };
}

function mapGenerationRow(row: Pixal3dGeneration): ThreeDGenerationRecord {
  return {
    id: row.id,
    userId: row.userId,
    inputImageUrl: row.inputImageUrl,
    prompt: row.prompt,
    provider: row.provider,
    model: row.model,
    status: row.status,
    providerTaskId: row.providerTaskId,
    creditCost: row.creditCost,
    resolution: row.resolution,
    textureSize: row.textureSize,
    consumeTransactionId: row.consumeTransactionId ?? undefined,
    refunded: row.refunded,
    result: row.result ?? undefined,
    errorMessage: row.errorMessage ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    completedAt: row.completedAt ?? undefined,
  };
}

function getAnonymousKey(input: AnonymousTrialInput): string {
  return `${input.ipHash}:${input.trialToken}`;
}

export function reserveAnonymousTrial(input: AnonymousTrialInput): AnonymousTrialResult {
  const key = getAnonymousKey(input);
  if (anonymousTrials.has(key)) {
    return { allowed: false, reason: 'trial_used' };
  }
  anonymousTrials.add(key);
  return { allowed: true };
}

export async function create3DGenerationRecord(
  input: Omit<ThreeDGenerationRecord, 'id' | 'status' | 'createdAt' | 'updatedAt'>
): Promise<ThreeDGenerationRecord> {
  const { db, pixal3dGeneration } = await getGenerationPersistenceDeps();
  const now = new Date();
  const record: ThreeDGenerationRecord = {
    ...input,
    id: `task_3d_${crypto.randomUUID()}`,
    status: 'processing',
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(pixal3dGeneration).values({
    id: record.id,
    userId: record.userId!,
    inputImageUrl: record.inputImageUrl,
    prompt: record.prompt,
    provider: record.provider,
    model: record.model,
    status: record.status,
    providerTaskId: record.providerTaskId,
    creditCost: record.creditCost,
    resolution: record.resolution,
    textureSize: record.textureSize,
    consumeTransactionId: record.consumeTransactionId,
    refunded: record.refunded ?? false,
    result: record.result ?? null,
    errorMessage: record.errorMessage,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    completedAt: record.completedAt,
  });

  return record;
}

export async function get3DGenerationRecord(taskId: string): Promise<ThreeDGenerationRecord | undefined> {
  const { db, eq, pixal3dGeneration } = await getGenerationPersistenceDeps();
  const row = await db.query.pixal3dGeneration.findFirst({
    where: eq(pixal3dGeneration.id, taskId),
  });

  return row ? mapGenerationRow(row) : undefined;
}

export async function list3DGenerationRecordsByUser(userId: string): Promise<ThreeDGenerationRecord[]> {
  const { db, desc, eq, pixal3dGeneration } = await getGenerationPersistenceDeps();
  const rows = await db.query.pixal3dGeneration.findMany({
    where: eq(pixal3dGeneration.userId, userId),
    orderBy: [desc(pixal3dGeneration.createdAt)],
  });

  return rows.map(mapGenerationRow);
}

export async function mark3DGenerationSucceeded(
  taskId: string,
  result: ThreeDGenerationResult
): Promise<ThreeDGenerationRecord | undefined> {
  const { db, eq, pixal3dGeneration } = await getGenerationPersistenceDeps();
  const record = await get3DGenerationRecord(taskId);
  if (!record) return undefined;

  const now = new Date();
  const updated: ThreeDGenerationRecord = {
    ...record,
    status: 'succeeded',
    result,
    updatedAt: now,
    completedAt: now,
  };

  await db
    .update(pixal3dGeneration)
    .set({
      status: updated.status,
      result: updated.result,
      errorMessage: null,
      updatedAt: updated.updatedAt,
      completedAt: updated.completedAt,
    })
    .where(eq(pixal3dGeneration.id, taskId));

  return updated;
}

export async function mark3DGenerationFailed(
  taskId: string,
  errorMessage: string
): Promise<ThreeDGenerationRecord | undefined> {
  const { db, eq, pixal3dGeneration } = await getGenerationPersistenceDeps();
  const record = await get3DGenerationRecord(taskId);
  if (!record) return undefined;

  const now = new Date();
  const updated: ThreeDGenerationRecord = {
    ...record,
    status: 'failed',
    errorMessage,
    updatedAt: now,
    completedAt: now,
  };

  await db
    .update(pixal3dGeneration)
    .set({
      status: updated.status,
      errorMessage: updated.errorMessage,
      updatedAt: updated.updatedAt,
      completedAt: updated.completedAt,
    })
    .where(eq(pixal3dGeneration.id, taskId));

  return updated;
}

export async function mark3DGenerationRefunded(taskId: string): Promise<ThreeDGenerationRecord | undefined> {
  const { db, eq, pixal3dGeneration } = await getGenerationPersistenceDeps();
  const record = await get3DGenerationRecord(taskId);
  if (!record) return undefined;

  const updated: ThreeDGenerationRecord = {
    ...record,
    refunded: true,
    updatedAt: new Date(),
  };

  await db
    .update(pixal3dGeneration)
    .set({
      refunded: true,
      updatedAt: updated.updatedAt,
    })
    .where(eq(pixal3dGeneration.id, taskId));

  return updated;
}

export function resetAnonymousTrialStore() {
  anonymousTrials.clear();
}
