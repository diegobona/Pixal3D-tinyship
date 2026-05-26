import { config } from '@config';
import { resolveFixedConsumption } from '../../config/credits';
import type {
  ThreeDDecimationTarget,
  ThreeDProviderName,
  ThreeDQuality,
  ThreeDResolution,
  ThreeDTextureSize,
} from '../../config/ai3d';

export type {
  ThreeDDecimationTarget,
  ThreeDProviderName,
  ThreeDQuality,
  ThreeDResolution,
  ThreeDTextureSize,
} from '../../config/ai3d';

export type ThreeDGenerationStatus = 'processing' | 'succeeded' | 'failed';

export interface ThreeDGenerationOptions {
  imageUrl: string;
  prompt: string;
  provider?: ThreeDProviderName;
  model?: string;
  quality?: ThreeDQuality;
  resolution?: ThreeDResolution;
  textureSize?: ThreeDTextureSize;
  decimationTarget?: ThreeDDecimationTarget;
  seed?: number;
  meshScale?: number;
  remesh?: boolean;
  maxNumTokens?: number;
  sparseStructureSteps?: number;
  sparseStructureGuidanceStrength?: number;
  sparseStructureGuidanceRescale?: number;
  sparseStructureRescaleT?: number;
  shapeSteps?: number;
  shapeGuidanceStrength?: number;
  shapeGuidanceRescale?: number;
  shapeRescaleT?: number;
  textureSteps?: number;
  textureGuidanceStrength?: number;
  textureGuidanceRescale?: number;
  textureRescaleT?: number;
}

export interface ThreeDGenerationResult {
  modelUrl: string;
  format: 'glb';
  provider: ThreeDProviderName;
  model: string;
  thumbnailUrl?: string;
}

export interface ThreeDTask {
  provider: ThreeDProviderName;
  model: string;
  providerTaskId: string;
}

export interface ThreeDTaskStatus {
  status: ThreeDGenerationStatus;
  result?: ThreeDGenerationResult;
  errorMessage?: string;
}

interface WiroRunResponse {
  result?: boolean;
  errors?: Array<string | { message?: string; code?: string | number }>;
  taskid?: string;
  socketaccesstoken?: string;
}

interface WiroTaskOutput {
  name?: string;
  contenttype?: string;
  url?: string;
}

interface WiroTaskDetail {
  status?: string;
  pexit?: string;
  outputs?: WiroTaskOutput[];
  debugoutput?: string;
}

interface WiroTaskDetailResponse {
  result?: boolean;
  errors?: Array<string | { message?: string; code?: string | number }>;
  tasklist?: WiroTaskDetail[];
}

interface FalSubmitResponse {
  request_id?: string;
  response_url?: string;
  status_url?: string;
  cancel_url?: string;
}

interface FalStatusResponse {
  status?: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED';
  error?: string | { message?: string };
  logs?: Array<{ message?: string }>;
}

interface FalFile {
  url?: string;
  content_type?: string;
  file_name?: string;
  file_size?: number;
}

interface FalResultResponse {
  model_glb?: FalFile;
  seed?: number;
}

interface MockTaskRecord {
  provider: ThreeDProviderName;
  model: string;
  createdAt: number;
}

const mockTasks = new Map<string, MockTaskRecord>();

function resolveProvider(provider?: ThreeDProviderName): ThreeDProviderName {
  return provider || config.ai3d.defaultProvider;
}

function resolveModel(provider: ThreeDProviderName, model?: string): string {
  return model || config.ai3d.defaultModels[provider];
}

export function isSupported3DProvider(provider: string): provider is ThreeDProviderName {
  return Object.prototype.hasOwnProperty.call(config.ai3d.availableModels, provider);
}

export function isSupported3DModel(provider: string, model: string): boolean {
  if (!isSupported3DProvider(provider)) {
    return false;
  }

  return (config.ai3d.availableModels[provider] as readonly string[]).includes(model);
}

function createMock3DTask(options: ThreeDGenerationOptions): ThreeDTask {
  const provider = resolveProvider(options.provider);
  const model = resolveModel(provider, options.model);
  const providerTaskId = `mock_3d_${crypto.randomUUID()}`;

  mockTasks.set(providerTaskId, {
    provider,
    model,
    createdAt: Date.now(),
  });

  return { provider, model, providerTaskId };
}

function queryMock3DTask(providerTaskId: string): ThreeDTaskStatus {
  const task = mockTasks.get(providerTaskId);
  if (!task) {
    return {
      status: 'failed',
      errorMessage: 'Mock 3D task was not found.',
    };
  }

  const elapsed = Date.now() - task.createdAt;
  if (elapsed < config.ai3d.mock.processingDelayMs) {
    return { status: 'processing' };
  }

  return {
    status: 'succeeded',
    result: {
      modelUrl: config.ai3d.mock.modelUrl,
      format: 'glb',
      provider: task.provider,
      model: task.model,
      thumbnailUrl: config.ai3d.mock.thumbnailUrl,
    },
  };
}

function getFalApiKey(): string {
  return process.env.FAL_API_KEY || process.env.FAL_KEY || '';
}

function getFalBaseUrl(): string {
  return process.env.FAL_BASE_URL || config.ai3d.fal.baseUrl;
}

function createFalHeaders(includeJson = false): Record<string, string> {
  const apiKey = getFalApiKey();
  if (!apiKey) {
    throw new Error('FAL_API_KEY or FAL_KEY is not configured.');
  }

  return {
    Authorization: `Key ${apiKey}`,
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
  };
}

function appendOptionalJsonNumber(
  input: Record<string, string | number | boolean>,
  key: string,
  value: number | undefined
) {
  if (value !== undefined && Number.isFinite(value)) {
    input[key] = value;
  }
}

function getFalResolution(resolution?: ThreeDResolution): 1024 | 1536 {
  return resolution === 1536 ? 1536 : 1024;
}

function getFalTextureSize(textureSize?: ThreeDTextureSize): 1024 | 2048 | 4096 {
  if (textureSize === 8192) {
    return 4096;
  }
  if (textureSize === 1024 || textureSize === 4096) {
    return textureSize;
  }
  return 2048;
}

function buildFalPixal3DInput(options: ThreeDGenerationOptions): Record<string, string | number | boolean> {
  const input: Record<string, string | number | boolean> = {
    image_url: options.imageUrl.trim(),
    resolution: getFalResolution(options.resolution),
    texture_size: getFalTextureSize(options.textureSize),
    decimation_target: options.decimationTarget || config.ai3d.defaults.decimationTarget,
  };

  appendOptionalJsonNumber(input, 'seed', options.seed);
  appendOptionalJsonNumber(input, 'mesh_scale', options.meshScale);
  if (options.remesh !== undefined) {
    input.remesh = options.remesh;
  }
  appendOptionalJsonNumber(input, 'max_num_tokens', options.maxNumTokens);
  appendOptionalJsonNumber(input, 'ss_sampling_steps', options.sparseStructureSteps);
  appendOptionalJsonNumber(input, 'ss_guidance_strength', options.sparseStructureGuidanceStrength);
  appendOptionalJsonNumber(input, 'ss_guidance_rescale', options.sparseStructureGuidanceRescale);
  appendOptionalJsonNumber(input, 'ss_rescale_t', options.sparseStructureRescaleT);
  appendOptionalJsonNumber(input, 'shape_slat_sampling_steps', options.shapeSteps);
  appendOptionalJsonNumber(input, 'shape_slat_guidance_strength', options.shapeGuidanceStrength);
  appendOptionalJsonNumber(input, 'shape_slat_guidance_rescale', options.shapeGuidanceRescale);
  appendOptionalJsonNumber(input, 'shape_slat_rescale_t', options.shapeRescaleT);
  appendOptionalJsonNumber(input, 'tex_slat_sampling_steps', options.textureSteps);
  appendOptionalJsonNumber(input, 'tex_slat_guidance_strength', options.textureGuidanceStrength);
  appendOptionalJsonNumber(input, 'tex_slat_guidance_rescale', options.textureGuidanceRescale);
  appendOptionalJsonNumber(input, 'tex_slat_rescale_t', options.textureRescaleT);

  return input;
}

async function createFal3DTask(options: ThreeDGenerationOptions): Promise<ThreeDTask> {
  if (!options.imageUrl.trim()) {
    throw new Error('Image URL is required for 3D generation.');
  }

  const model = resolveModel('fal', options.model);
  const response = await fetch(`${getFalBaseUrl()}/${model}`, {
    method: 'POST',
    headers: createFalHeaders(true),
    body: JSON.stringify(buildFalPixal3DInput(options)),
  });

  const data = await response.json() as FalSubmitResponse;
  if (!response.ok || !data.request_id) {
    throw new Error(`fal Pixal3D task creation failed: ${JSON.stringify(data)}`);
  }

  return {
    provider: 'fal',
    model,
    providerTaskId: data.request_id,
  };
}

async function queryFal3DTask(model: string, providerTaskId: string): Promise<ThreeDTaskStatus> {
  const statusResponse = await fetch(`${getFalBaseUrl()}/${model}/requests/${providerTaskId}/status`, {
    method: 'GET',
    headers: createFalHeaders(),
  });

  const statusData = await statusResponse.json() as FalStatusResponse;
  if (!statusResponse.ok) {
    return {
      status: 'failed',
      errorMessage: `fal Pixal3D status query failed: ${JSON.stringify(statusData)}`,
    };
  }

  if (statusData.status === 'IN_QUEUE' || statusData.status === 'IN_PROGRESS') {
    return { status: 'processing' };
  }

  if (statusData.error) {
    const errorMessage =
      typeof statusData.error === 'string'
        ? statusData.error
        : statusData.error.message;
    return {
      status: 'failed',
      errorMessage: errorMessage || 'fal Pixal3D task failed.',
    };
  }

  if (statusData.status !== 'COMPLETED') {
    return {
      status: 'failed',
      errorMessage: `fal Pixal3D task returned unknown status: ${statusData.status || 'unknown'}.`,
    };
  }

  const resultResponse = await fetch(`${getFalBaseUrl()}/${model}/requests/${providerTaskId}`, {
    method: 'GET',
    headers: createFalHeaders(),
  });

  const resultData = await resultResponse.json() as FalResultResponse;
  if (!resultResponse.ok || !resultData.model_glb?.url) {
    return {
      status: 'failed',
      errorMessage: `fal Pixal3D result query failed: ${JSON.stringify(resultData)}`,
    };
  }

  return {
    status: 'succeeded',
    result: {
      modelUrl: resultData.model_glb.url,
      format: 'glb',
      provider: 'fal',
      model,
    },
  };
}

function getWiroApiKey(): string {
  return process.env.WIRO_API_KEY || '';
}

function getWiroApiSecret(): string {
  return process.env.WIRO_API_SECRET || '';
}

function getWiroBaseUrl(): string {
  return process.env.WIRO_BASE_URL || config.ai3d.wiro.baseUrl;
}

function formatWiroErrors(errors: WiroRunResponse['errors'] | WiroTaskDetailResponse['errors']): string {
  if (!errors || errors.length === 0) {
    return 'Unknown Wiro API error.';
  }

  return errors
    .map((error) => {
      if (typeof error === 'string') return error;
      return error.message || String(error.code || 'Unknown Wiro API error');
    })
    .join('; ');
}

async function createWiroHeaders(includeJson = false): Promise<Record<string, string>> {
  const apiKey = getWiroApiKey();
  if (!apiKey) {
    throw new Error('WIRO_API_KEY is not configured.');
  }

  const headers: Record<string, string> = {
    'x-api-key': apiKey,
  };

  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }

  const apiSecret = getWiroApiSecret();
  if (!apiSecret) {
    return headers;
  }

  const nonce = String(Date.now());
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(apiKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${apiSecret}${nonce}`)
  );
  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  headers['x-nonce'] = nonce;
  headers['x-signature'] = signature;
  return headers;
}

function appendOptionalNumber(form: FormData, key: string, value: number | undefined) {
  if (value !== undefined && Number.isFinite(value)) {
    form.append(key, String(value));
  }
}

async function appendWiroImageInput(form: FormData, imageUrl: string) {
  if (/^data:image\/(png|jpe?g|webp|bmp);base64,/i.test(imageUrl)) {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    form.append('inputImage', blob, 'input-image');
    return;
  }

  form.append('inputImage', imageUrl);
}

function getWiroPipelineType(resolution?: ThreeDResolution): '1024_cascade' | '1536_cascade' {
  return resolution === 1536 ? '1536_cascade' : '1024_cascade';
}

async function createWiro3DTask(options: ThreeDGenerationOptions): Promise<ThreeDTask> {
  if (!options.imageUrl.trim()) {
    throw new Error('Image URL is required for 3D generation.');
  }

  const model = resolveModel('wiro', options.model);
  const form = new FormData();
  await appendWiroImageInput(form, options.imageUrl.trim());
  form.append('pipeline_type', getWiroPipelineType(options.resolution));
  form.append('texture_size', String(options.textureSize || config.ai3d.defaults.textureSize));
  form.append('decimation_target', String(options.decimationTarget || config.ai3d.defaults.decimationTarget));

  appendOptionalNumber(form, 'seed', options.seed);
  appendOptionalNumber(form, 'max_num_tokens', options.maxNumTokens);
  appendOptionalNumber(form, 'ss_steps', options.sparseStructureSteps);
  appendOptionalNumber(form, 'ss_guidance_strength', options.sparseStructureGuidanceStrength);
  appendOptionalNumber(form, 'ss_guidance_rescale', options.sparseStructureGuidanceRescale);
  appendOptionalNumber(form, 'ss_rescale_t', options.sparseStructureRescaleT);
  appendOptionalNumber(form, 'shape_steps', options.shapeSteps);
  appendOptionalNumber(form, 'shape_guidance_strength', options.shapeGuidanceStrength);
  appendOptionalNumber(form, 'shape_guidance_rescale', options.shapeGuidanceRescale);
  appendOptionalNumber(form, 'shape_rescale_t', options.shapeRescaleT);
  appendOptionalNumber(form, 'tex_steps', options.textureSteps);
  appendOptionalNumber(form, 'tex_guidance_strength', options.textureGuidanceStrength);
  appendOptionalNumber(form, 'tex_guidance_rescale', options.textureGuidanceRescale);
  appendOptionalNumber(form, 'tex_rescale_t', options.textureRescaleT);

  const response = await fetch(`${getWiroBaseUrl()}/Run/${config.ai3d.wiro.ownerSlug}/${config.ai3d.wiro.modelSlug}`, {
    method: 'POST',
    headers: await createWiroHeaders(),
    body: form,
  });

  const data = await response.json() as WiroRunResponse;
  if (!response.ok || data.result === false || !data.taskid) {
    throw new Error(`Wiro Pixal3D task creation failed: ${formatWiroErrors(data.errors)}`);
  }

  return {
    provider: 'wiro',
    model,
    providerTaskId: data.taskid,
  };
}

function findWiroGlbOutput(outputs: WiroTaskOutput[] = []): WiroTaskOutput | undefined {
  return outputs.find((output) => {
    const url = output.url || '';
    const contentType = output.contenttype || '';
    const name = output.name || '';
    return /\.glb(?:\?|$)/i.test(url)
      || /\.glb$/i.test(name)
      || contentType === 'model/gltf-binary'
      || contentType === 'model/glb';
  });
}

function findWiroThumbnailOutput(outputs: WiroTaskOutput[] = []): WiroTaskOutput | undefined {
  return outputs.find((output) => {
    const contentType = output.contenttype || '';
    const url = output.url || '';
    return contentType.startsWith('image/') || /\.(png|jpe?g|webp)(?:\?|$)/i.test(url);
  });
}

async function queryWiro3DTask(model: string, providerTaskId: string): Promise<ThreeDTaskStatus> {
  const response = await fetch(`${getWiroBaseUrl()}/Task/Detail`, {
    method: 'POST',
    headers: await createWiroHeaders(true),
    body: JSON.stringify({ taskid: providerTaskId }),
  });

  const data = await response.json() as WiroTaskDetailResponse;
  if (!response.ok || data.result === false) {
    return {
      status: 'failed',
      errorMessage: `Wiro Pixal3D status query failed: ${formatWiroErrors(data.errors)}`,
    };
  }

  const task = data.tasklist?.[0];
  if (!task) {
    return {
      status: 'failed',
      errorMessage: 'Wiro Pixal3D task was not found.',
    };
  }

  if (task.status === 'task_postprocess_end') {
    if (task.pexit && task.pexit !== '0') {
      return {
        status: 'failed',
        errorMessage: task.debugoutput || `Wiro Pixal3D task failed with exit code ${task.pexit}.`,
      };
    }

    const glb = findWiroGlbOutput(task.outputs);
    if (!glb?.url) {
      return {
        status: 'failed',
        errorMessage: 'Wiro Pixal3D task completed without a GLB output.',
      };
    }

    const thumbnail = findWiroThumbnailOutput(task.outputs);
    return {
      status: 'succeeded',
      result: {
        modelUrl: glb.url,
        format: 'glb',
        provider: 'wiro',
        model,
        thumbnailUrl: thumbnail?.url,
      },
    };
  }

  if (task.status === 'task_cancel') {
    return {
      status: 'failed',
      errorMessage: 'Wiro Pixal3D task was cancelled.',
    };
  }

  return { status: 'processing' };
}

export async function create3DTask(options: ThreeDGenerationOptions): Promise<ThreeDTask> {
  const provider = resolveProvider(options.provider);

  if (!options.imageUrl.trim()) {
    throw new Error('Image URL is required for 3D generation.');
  }

  if (provider === 'mock') {
    return createMock3DTask(options);
  }

  if (provider === 'fal') {
    return createFal3DTask(options);
  }

  if (provider === 'wiro') {
    return createWiro3DTask(options);
  }

  throw new Error(`Unsupported 3D provider: ${provider}`);
}

export async function query3DTask(
  providerOrTaskId: ThreeDProviderName | string,
  model?: string,
  providerTaskId?: string
): Promise<ThreeDTaskStatus> {
  if (!providerTaskId) {
    return queryMock3DTask(providerOrTaskId);
  }

  if (providerOrTaskId === 'mock') {
    return queryMock3DTask(providerTaskId);
  }

  if (providerOrTaskId === 'fal') {
    return queryFal3DTask(model || resolveModel('fal'), providerTaskId);
  }

  if (providerOrTaskId === 'wiro') {
    return queryWiro3DTask(model || resolveModel('wiro'), providerTaskId);
  }

  return {
    status: 'failed',
    errorMessage: `Unsupported 3D provider: ${providerOrTaskId}`,
  };
}

export function calculate3DCreditCost(options: {
  provider?: ThreeDProviderName;
  model?: string;
  resolution?: ThreeDResolution;
}): number {
  const provider = resolveProvider(options.provider);
  const model = resolveModel(provider, options.model);
  return resolveFixedConsumption(
    config.credits.fixedConsumption.ai3d,
    model,
    options.resolution
  );
}
