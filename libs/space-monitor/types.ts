export type SpaceModelId = 'pixal3d' | 'trellis' | 'hunyuan3d';

export interface SpaceTarget {
  spaceId: string;
  url: string;
  revision?: string;
  /** Server-written identity evidence; never accept this field from public/admin input. */
  verifiedProfile?: string;
}

export interface ProbeResult {
  status: 'healthy' | 'unavailable' | 'transient' | 'unknown';
  reason: string;
  target?: SpaceTarget;
}

export interface ReplacementResult {
  target: SpaceTarget | null;
  reason: string;
}
