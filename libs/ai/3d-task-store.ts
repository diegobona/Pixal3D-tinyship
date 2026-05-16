import type { ThreeDGenerationResult, ThreeDGenerationStatus } from './3d';

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
  consumeTransactionId?: string;
  refunded?: boolean;
  result?: ThreeDGenerationResult;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

const anonymousTrials = new Set<string>();
const generationRecords = new Map<string, ThreeDGenerationRecord>();

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
