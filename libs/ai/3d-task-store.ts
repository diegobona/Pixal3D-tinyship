import type {
  ThreeDGenerationResult,
  ThreeDGenerationStatus,
  ThreeDResolution,
  ThreeDTextureSize,
} from './3d';

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
  generationRecords: Map<string, ThreeDGenerationRecord>;
};

const globalTaskStore = globalThis as typeof globalThis & {
  __pixal3DTaskStore?: ThreeDTaskStore;
};

const taskStore = globalTaskStore.__pixal3DTaskStore ??= {
  anonymousTrials: new Set<string>(),
  generationRecords: new Map<string, ThreeDGenerationRecord>(),
};

const anonymousTrials = taskStore.anonymousTrials;
const generationRecords = taskStore.generationRecords;

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

export function create3DGenerationRecord(
  input: Omit<ThreeDGenerationRecord, 'id' | 'status' | 'createdAt' | 'updatedAt'>
): ThreeDGenerationRecord {
  const now = new Date();
  const record: ThreeDGenerationRecord = {
    ...input,
    id: `task_3d_${crypto.randomUUID()}`,
    status: 'processing',
    createdAt: now,
    updatedAt: now,
  };
  generationRecords.set(record.id, record);
  return record;
}

export function get3DGenerationRecord(taskId: string): ThreeDGenerationRecord | undefined {
  return generationRecords.get(taskId);
}

export function list3DGenerationRecordsByUser(userId: string): ThreeDGenerationRecord[] {
  return Array.from(generationRecords.values())
    .filter((record) => record.userId === userId)
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
}

export function mark3DGenerationSucceeded(
  taskId: string,
  result: ThreeDGenerationResult
): ThreeDGenerationRecord | undefined {
  const record = generationRecords.get(taskId);
  if (!record) return undefined;

  const updated: ThreeDGenerationRecord = {
    ...record,
    status: 'succeeded',
    result,
    updatedAt: new Date(),
    completedAt: new Date(),
  };
  generationRecords.set(taskId, updated);
  return updated;
}

export function mark3DGenerationFailed(
  taskId: string,
  errorMessage: string
): ThreeDGenerationRecord | undefined {
  const record = generationRecords.get(taskId);
  if (!record) return undefined;

  const updated: ThreeDGenerationRecord = {
    ...record,
    status: 'failed',
    errorMessage,
    updatedAt: new Date(),
    completedAt: new Date(),
  };
  generationRecords.set(taskId, updated);
  return updated;
}

export function mark3DGenerationRefunded(taskId: string): ThreeDGenerationRecord | undefined {
  const record = generationRecords.get(taskId);
  if (!record) return undefined;

  const updated: ThreeDGenerationRecord = {
    ...record,
    refunded: true,
    updatedAt: new Date(),
  };
  generationRecords.set(taskId, updated);
  return updated;
}

export function resetAnonymousTrialStore() {
  anonymousTrials.clear();
  generationRecords.clear();
}
