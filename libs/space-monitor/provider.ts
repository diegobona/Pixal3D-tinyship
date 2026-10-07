import {
  expectedSpaceOrigin, isSpaceModelId, isTrustedSpaceTarget, isValidSpaceId,
  SPACE_IDENTITY_PROFILES, type SpaceIdentityProfile,
} from '../../config/space-workspaces';
import type { ProbeResult, ReplacementResult, SpaceModelId, SpaceTarget } from './types';

const HUB = 'https://huggingface.co';
const METADATA_BYTES = 256_000;
const APP_BYTES = 512_000;
const REQUEST_TIMEOUT_MS = 5_000;
const SEARCH_LIMIT = 4;
const TRANSIENT_STAGES = new Set(['SLEEPING', 'STOPPED', 'BUILDING', 'APP_STARTING', 'RUNNING_BUILDING', 'RUNNING_APP_STARTING']);
const UNAVAILABLE_STAGES = new Set(['NO_APP_FILE', 'CONFIG_ERROR', 'BUILD_ERROR', 'RUNTIME_ERROR', 'PAUSED', 'DELETING']);

interface RequestBudget { remaining: number; deadline: number }
interface PublicResponse { status: number; headers: Headers; body: string }
type ObjectValue = Record<string, unknown>;
class PublicRequestError extends Error {
  constructor(readonly kind: 'budget' | 'size' | 'endpoint-timeout' | 'transport') {
    super(`public-get-${kind}`);
  }
}

function object(value: unknown): ObjectValue | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as ObjectValue : null;
}

function parseObject(text: string): ObjectValue | null {
  try { return object(JSON.parse(text)); } catch { return null; }
}

function budget(maximum: number, durationMs: number): RequestBudget {
  return { remaining: maximum, deadline: Date.now() + durationMs };
}

/** Public GET only: no cookies, tokens, redirect following, inference or remote code execution. */
async function publicGet(url: string, maxBytes: number, requests: RequestBudget): Promise<PublicResponse> {
  const timeLeft = requests.deadline - Date.now();
  if (requests.remaining-- <= 0 || timeLeft <= 0) throw new PublicRequestError('budget');
  const controller = new AbortController();
  let timeoutTriggered = false;
  const limitedByOperationDeadline = timeLeft < REQUEST_TIMEOUT_MS;
  const timer = setTimeout(() => { timeoutTriggered = true; controller.abort(); }, Math.min(REQUEST_TIMEOUT_MS, timeLeft));
  try {
    const response = await fetch(url, {
      method: 'GET', redirect: 'manual', credentials: 'omit', cache: 'no-store', signal: controller.signal,
      headers: { Accept: 'application/json, text/html, text/plain;q=0.9' },
    });
    const contentLength = response.headers.get('content-length');
    if (contentLength && Number(contentLength) > maxBytes) {
      try { await response.body?.cancel(); } catch { /* Preserve the size failure classification. */ }
      throw new PublicRequestError('size');
    }
    let bytes = 0;
    let body = '';
    if (response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      try {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          bytes += chunk.value.byteLength;
          if (bytes > maxBytes) {
            try { await reader.cancel(); } catch { /* Preserve the size failure classification. */ }
            throw new PublicRequestError('size');
          }
          body += decoder.decode(chunk.value, { stream: true });
        }
        body += decoder.decode();
      } finally { reader.releaseLock(); }
    }
    return { status: response.status, headers: response.headers, body };
  } catch (error) {
    if (error instanceof PublicRequestError) throw error;
    if (timeoutTriggered) throw new PublicRequestError(limitedByOperationDeadline ? 'budget' : 'endpoint-timeout');
    throw new PublicRequestError('transport');
  } finally { clearTimeout(timer); }
}

function accessCondition(response: PublicResponse): boolean {
  // Inspect error responses/pages only. A normal app's helper copy can mention quota/login.
  return /(?:quota (?:exceeded|exhausted)|exceeded .*quota|zerogpu .*quota|sign in to (?:continue|access)|log in to (?:continue|access)|space is (?:sleeping|starting|building)|too many requests)/i.test(response.body);
}

function responseProblem(response: PublicResponse, kind: 'metadata' | 'app' | 'source'): ProbeResult | null {
  if (response.status === 429) return { status: 'transient', reason: `${kind}-rate-limited` };
  if (response.status >= 300 && response.status < 400) return { status: 'unknown', reason: `${kind}-redirect-not-followed` };
  if (response.status === 401 || response.status === 403) return { status: 'unknown', reason: `${kind}-access-uncertain` };
  if (response.status < 200 || response.status >= 300) {
    if (accessCondition(response)) return { status: 'transient', reason: `${kind}-quota-login-or-startup` };
    if (kind === 'source') return { status: 'unknown', reason: 'identity-source-unavailable' };
    if (response.status === 404 || response.status === 410 || (kind === 'app' && response.status >= 500)) {
      return { status: 'unavailable', reason: `${kind}-http-${response.status}` };
    }
    return { status: 'unknown', reason: `${kind}-http-${response.status}` };
  }
  return null;
}

function frameProblem(headers: Headers): ProbeResult | null {
  if (headers.get('x-frame-options')) return { status: 'unavailable', reason: 'iframe-x-frame-options' };
  const policy = headers.get('content-security-policy');
  if (!policy) return null;
  // Multiple policies are conjunctive. Explicit host restrictions need a site-specific review.
  const ancestorRules = [...policy.matchAll(/(?:^|[;,])\s*frame-ancestors\s+([^;,]+)/gi)];
  if (ancestorRules.some((rule) => !rule[1].trim().split(/\s+/).some((value) => value === '*' || value === 'https:'))) {
    return { status: 'unavailable', reason: 'iframe-frame-ancestors-restricted' };
  }
  return null;
}

function metadataProblem(data: ObjectValue, spaceId: string): ProbeResult | null {
  if (data.id !== spaceId) return { status: 'unknown', reason: 'metadata-space-id-mismatch' };
  if (data.private === true || data.disabled === true || data.gated === true || typeof data.gated === 'string') {
    return { status: 'unavailable', reason: 'space-private-disabled-or-gated' };
  }
  const stage = object(data.runtime)?.stage;
  if (typeof stage !== 'string') return { status: 'unknown', reason: 'runtime-stage-missing' };
  if (TRANSIENT_STAGES.has(stage)) return { status: 'transient', reason: `runtime-${stage.toLowerCase()}` };
  if (UNAVAILABLE_STAGES.has(stage)) return { status: 'unavailable', reason: `runtime-${stage.toLowerCase()}` };
  if (stage !== 'RUNNING') return { status: 'unknown', reason: 'runtime-stage-unrecognized' };
  if (data.sdk !== 'gradio') return { status: 'unknown', reason: 'unreviewed-app-sdk' };
  if (typeof data.sha !== 'string' || !/^[a-f0-9]{40}$/.test(data.sha)) return { status: 'unknown', reason: 'source-revision-missing' };
  return null;
}

function metadataOrigin(data: ObjectValue): string | null {
  if (typeof data.host !== 'string') return null;
  const value = data.host.startsWith('https://') ? data.host : `https://${data.host}`;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port || parsed.search || parsed.hash || parsed.pathname !== '/') return null;
    return parsed.origin;
  } catch { return null; }
}

async function sourceHash(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text.replace(/\r\n/g, '\n'));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), (value) => value.toString(16).padStart(2, '0')).join('');
}

async function verifySource(
  data: ObjectValue, profiles: readonly SpaceIdentityProfile[], requests: RequestBudget,
): Promise<SpaceIdentityProfile | null> {
  const hashes = new Map<string, string | null>();
  const appFile = object(data.cardData)?.app_file;
  for (const profile of profiles) {
    if (appFile !== profile.appFile) continue;
    let matches = true;
    for (const [file, expected] of Object.entries(profile.sourceHashes)) {
      if (!hashes.has(file)) {
        const response = await publicGet(`${HUB}/spaces/${data.id}/raw/${data.sha}/${file}`, APP_BYTES, requests);
        hashes.set(file, responseProblem(response, 'source') ? null : await sourceHash(response.body));
      }
      if (hashes.get(file) !== expected) { matches = false; break; }
    }
    if (matches) {
      const tree = await publicGet(`${HUB}/api/spaces/${data.id}/tree/${data.sha}?recursive=true&expand=false`, APP_BYTES, requests);
      if (responseProblem(tree, 'source') || tree.headers.get('link')) return null;
      let entries: unknown;
      try { entries = JSON.parse(tree.body); } catch { return null; }
      // Never trust the first page of an incomplete tree. Oversized repos require review.
      if (!Array.isArray(entries) || entries.length === 0 || entries.length >= 1_000) return null;
      const rows: string[] = [];
      const paths = new Set<string>();
      for (const entry of entries) {
        const item = object(entry);
        if (!item || typeof item.path !== 'string' || !item.path || item.path.length > 512 || /[\r\n\0]/.test(item.path)
          || (item.type !== 'file' && item.type !== 'directory') || typeof item.oid !== 'string' || !/^[a-f0-9]{40}$/.test(item.oid)
          || paths.has(item.path)) return null;
        paths.add(item.path);
        if (item.path !== 'README.md') rows.push(`${item.path} ${item.type} ${item.oid}`);
      }
      const digest = await sourceHash(rows.sort().join('\n') + '\n');
      return digest === profile.codeTreeDigest ? profile : null;
    }
  }
  return null;
}

function validConfig(data: ObjectValue | null, profile: SpaceIdentityProfile): boolean {
  if (!data || typeof data.version !== 'string' || !Array.isArray(data.components) || data.components.length === 0 || !Array.isArray(data.dependencies)) return false;
  const components = data.components.map(object).filter((item): item is ObjectValue => !!item);
  const dependencies = data.dependencies.map(object).filter((item): item is ObjectValue => !!item);
  if (profile.frontend === 'custom') {
    const workflow = profile.customWorkflow;
    if (!workflow) return false;
    const generation = dependencies.find((dependency) => dependency.api_name === workflow.generateApi && dependency.backend_fn === true && dependency.api_visibility === 'public');
    const extraction = dependencies.find((dependency) => dependency.api_name === workflow.exportApi && dependency.backend_fn === true && dependency.api_visibility === 'public');
    if (!generation || !extraction || !Array.isArray(generation.inputs) || !Array.isArray(extraction.outputs) || !extraction.outputs.length) return false;
    const input = components.find((component) => component.id === (generation.inputs as unknown[])[0]);
    const inputSchema = object(input?.api_info_as_input);
    if (!isFileSchema(inputSchema)) return false;
    return extraction.outputs.some((id) => {
      const output = components.find((component) => component.id === id);
      const schema = object(output?.api_info_as_output);
      return workflow.exportSchema === 'file' ? isFileSchema(schema) : schema?.type === 'string';
    });
  }
  if (!components.some((component) => component.type === 'image' && object(component.props)?.visible !== false)) return false;
  for (const label of profile.requiredControls) {
    if (!components.some((component) => component.type === 'button' && object(component.props)?.value === label
      && object(component.props)?.visible !== false && object(component.props)?.interactive === true)) return false;
  }
  if (profile.requiredTab && !components.some((component) =>
    (component.type === 'tabitem' || component.type === 'tab') && object(component.props)?.label === profile.requiredTab
    && object(component.props)?.visible !== false)) return false;
  // Download controls can initially be disabled until a model exists (e.g. Hunyuan).
  return components.some((component) => component.type === 'downloadbutton' && object(component.props)?.visible !== false
    && dependencies.some((dependency) => Array.isArray(dependency.outputs) && dependency.outputs.includes(component.id)));
}

function isFileSchema(schema: ObjectValue | null): boolean {
  const properties = object(schema?.properties);
  const metaType = object(object(object(properties?.meta)?.properties)?._type)?.const;
  return schema?.type === 'object' && !!object(properties?.path) && metaType === 'gradio.FileData';
}

function hasCustomWorkflow(html: string, profile: SpaceIdentityProfile): boolean {
  const workflow = profile.customWorkflow;
  if (!workflow) return false;
  const tags = html.match(/<(?:input|button|a)\b[^>]*>/gi) ?? [];
  const tagWithId = (tag: string, id: string) => new RegExp(`\\bid=["']${id}["']`, 'i').test(tag);
  const upload = tags.some((tag) => /^<input\b/i.test(tag) && tagWithId(tag, workflow.imageInputId)
    && /\btype=["']file["']/i.test(tag) && /\baccept=["'][^"']*image\//i.test(tag));
  return upload && tags.some((tag) => tagWithId(tag, workflow.generateControlId))
    && tags.some((tag) => tagWithId(tag, workflow.downloadControlId));
}

async function inspectFrontend(target: SpaceTarget, profile: SpaceIdentityProfile, requests: RequestBudget): Promise<ProbeResult> {
  try {
    const document = await publicGet(`${target.url}/`, APP_BYTES, requests);
    const documentProblem = responseProblem(document, 'app') ?? frameProblem(document.headers);
    if (documentProblem) return documentProblem;
    const html = document.headers.get('content-type')?.includes('text/html') && /<html[\s>]/i.test(document.body);
    const shell = profile.frontend === 'custom' ? /pixal3d/i.test(document.body) && hasCustomWorkflow(document.body, profile) : /gradio-app|window\.gradio_config/i.test(document.body);
    if (!html || !shell) return { status: accessCondition(document) ? 'transient' : 'unknown', reason: 'app-document-unrecognized' };
    const config = await publicGet(`${target.url}/config`, APP_BYTES, requests);
    const configProblem = responseProblem(config, 'app');
    if (configProblem) return configProblem;
    if (!validConfig(parseObject(config.body), profile)) {
      return { status: accessCondition(config) ? 'transient' : 'unknown', reason: 'app-config-controls-unverified' };
    }
    return { status: 'healthy', reason: 'frontend-available-inference-untested', target };
  } catch (error) {
    // Caller has already confirmed RUNNING metadata, origin and model identity.
    // Engine requires a second independent unavailable probe before discovery/failover.
    if (error instanceof PublicRequestError && (error.kind === 'transport' || error.kind === 'endpoint-timeout')) {
      return { status: 'unavailable', reason: `app-${error.kind}` };
    }
    throw error;
  }
}

async function probeWithBudget(model: SpaceModelId, target: SpaceTarget, requests: RequestBudget): Promise<ProbeResult> {
  if (!isTrustedSpaceTarget(model, target)) return { status: 'unknown', reason: 'untrusted-space-target' };
  const metadata = await publicGet(`${HUB}/api/spaces/${target.spaceId}`, METADATA_BYTES, requests);
  const problem = responseProblem(metadata, 'metadata');
  if (problem) return problem;
  const data = parseObject(metadata.body);
  if (!data) return { status: 'unknown', reason: 'metadata-invalid-json' };
  const state = metadataProblem(data, target.spaceId);
  if (state) return state;
  if (metadataOrigin(data) !== target.url) return { status: 'unknown', reason: 'metadata-host-mismatch' };
  const knownProfile = SPACE_IDENTITY_PROFILES.find((profile) => profile.model === model && profile.target.spaceId === target.spaceId);
  const baseline = knownProfile ?? SPACE_IDENTITY_PROFILES.find((profile) => profile.model === model && profile.target.spaceId === target.verifiedProfile);
  if (!baseline) return { status: 'unknown', reason: 'identity-profile-missing' };
  let profile: SpaceIdentityProfile | null = baseline;
  // New clones are rechecked on every probe; a recorded evidence string is not an attestation.
  if (!knownProfile || data.sha !== knownProfile.target.revision) profile = await verifySource(data, [baseline], requests);
  else if (object(data.cardData)?.app_file !== baseline.appFile) profile = null;
  if (!profile) return { status: 'unknown', reason: 'identity-source-drift-or-unverified' };
  const verifiedTarget: SpaceTarget = { spaceId: target.spaceId, url: target.url, revision: data.sha as string, verifiedProfile: profile.target.spaceId };
  return inspectFrontend(verifiedTarget, profile, requests);
}

export async function probeSpace(model: SpaceModelId, target: SpaceTarget): Promise<ProbeResult> {
  try { return await probeWithBudget(model, target, budget(7, 20_000)); }
  catch { return { status: 'unknown', reason: 'probe-network-size-or-time-budget' }; }
}

export async function discoverReplacement(model: SpaceModelId, excludedSpaceId: string): Promise<ReplacementResult> {
  if (!isSpaceModelId(model)) return { target: null, reason: 'unsupported-model' };
  // At most 29 GETs here + two 7-GET source-drift probes = 43 per model check.
  const requests = budget(29, 30_000);
  const profiles = SPACE_IDENTITY_PROFILES.filter((profile) => profile.model === model);
  const seen = new Set([excludedSpaceId]);
  try {
    for (const profile of profiles) {
      if (seen.has(profile.target.spaceId)) continue;
      seen.add(profile.target.spaceId);
      try {
        const result = await probeWithBudget(model, profile.target, requests);
        if (result.status === 'healthy' && result.target) return { target: result.target, reason: 'reviewed-same-model-frontend-available' };
      } catch {
        if (requests.remaining <= 0 || requests.deadline <= Date.now()) return { target: null, reason: 'discovery-budget-exhausted' };
      }
    }
    const searchTerm = model === 'pixal3d' ? 'Pixal3D' : model === 'trellis' ? 'TRELLIS.2' : 'Hunyuan3D-2.1';
    const search = await publicGet(`${HUB}/api/spaces?search=${encodeURIComponent(searchTerm)}&limit=${SEARCH_LIMIT}&sort=likes&direction=-1`, METADATA_BYTES, requests);
    if (responseProblem(search, 'metadata')) return { target: null, reason: 'discovery-search-unavailable' };
    let entries: unknown;
    try { entries = JSON.parse(search.body); } catch { return { target: null, reason: 'discovery-search-invalid' }; }
    if (!Array.isArray(entries)) return { target: null, reason: 'discovery-search-invalid' };
    for (const entry of entries.slice(0, SEARCH_LIMIT)) {
      const id = object(entry)?.id;
      if (!isValidSpaceId(id) || seen.has(id)) continue;
      seen.add(id);
      try {
        const response = await publicGet(`${HUB}/api/spaces/${id}`, METADATA_BYTES, requests);
        if (responseProblem(response, 'metadata')) continue;
        const data = parseObject(response.body);
        if (!data || metadataProblem(data, id)) continue;
        const origin = metadataOrigin(data);
        if (!origin || origin !== expectedSpaceOrigin(id)) continue;
        const declaredModels = Array.isArray(data.models) ? data.models : [];
        const eligibleProfiles = profiles.filter((profile) => profile.modelIds.some((modelId) => declaredModels.includes(modelId)));
        const profile = await verifySource(data, eligibleProfiles, requests);
        if (!profile) continue;
        const target: SpaceTarget = { spaceId: id, url: origin, revision: data.sha as string, verifiedProfile: profile.target.spaceId };
        if (!isTrustedSpaceTarget(model, target)) continue;
        const health = await inspectFrontend(target, profile, requests);
        if (health.status === 'healthy') return { target, reason: 'exact-reviewed-code-clone-frontend-available' };
      } catch {
        if (requests.remaining <= 0 || requests.deadline <= Date.now()) return { target: null, reason: 'discovery-budget-exhausted' };
      }
    }
    return { target: null, reason: 'no-verified-same-model-replacement' };
  } catch { return { target: null, reason: 'discovery-network-size-or-time-budget' }; }
}
