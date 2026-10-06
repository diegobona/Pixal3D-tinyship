// Operator-only production script. Never called by page views or public APIs.
// Run only for the four samples explicitly authorized by the site owner.
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const defaultOutputRoot = path.join(root, "apps/next-app/public/model-samples");
const origin = "https://victor-pixal3d-studio.hf.space";
const source = "https://huggingface.co/spaces/victor/pixal3d-studio";
const samples = [
  { id: "mushroom", seed: 2026100601, prompt: "A single red-capped mushroom with cream spots and a pale stem, matching the input illustration." },
  { id: "teapot", seed: 2026100602, prompt: "A single green ceramic teapot with its lid, curved spout and handle, matching the input illustration." },
  { id: "chair", seed: 2026100603, prompt: "A single wooden chair with a blue upholstered seat, matching the input illustration." },
  { id: "crate", seed: 2026100604, prompt: "A single unbranded wooden shipping crate with planks and braces, matching the input illustration." },
];
const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

export function assertReferenceIntegrity(record, reference, id = record.id) {
  if (!record.input?.sha256 || record.input.sha256 !== sha256(reference)) {
    throw new Error(`Reference integrity check failed for ${id}; restore the original source image before resuming or publishing.`);
  }
}

function redactSecrets(value) {
  const token = process.env.HF_TOKEN;
  const message = String(value);
  return token ? message.split(token).join("[redacted HF_TOKEN]") : message;
}

function confirmedProviderFailure(record) {
  if (["gradio-error", "result-error"].includes(record.providerFailure?.kind)) return record.providerFailure;
  // Only this exact legacy terminal rejection is known to have stopped before generation.
  const prefix = "Gradio generation error: ";
  if (record.status !== "failed" || !record.error?.startsWith(prefix)) return undefined;
  try {
    const payload = JSON.parse(record.error.slice(prefix.length));
    if (payload.title === "ZeroGPU quota exceeded" && payload.error?.startsWith("You have exceeded your ZeroGPU quota (")) {
      return { kind: "gradio-error", payload, legacy: true };
    }
  } catch { /* Unparseable legacy records require recovery, never a new GPU call. */ }
  return undefined;
}

function providerFailure(message, kind, payload) {
  const error = new Error(redactSecrets(message));
  error.providerFailure = { kind, payload: JSON.parse(redactSecrets(JSON.stringify(payload))) };
  return error;
}

async function checkedFetch(url, options = {}) {
  const headers = new Headers(options.headers);
  // Optional credentials are read only from the operator's environment, never printed or persisted.
  if (process.env.HF_TOKEN && new URL(url).origin === origin) headers.set("Authorization", `Bearer ${process.env.HF_TOKEN}`);
  const response = await fetch(url, { ...options, headers, signal: AbortSignal.timeout(600_000) });
  if (!response.ok) throw new Error(redactSecrets(`HTTP ${response.status} at ${new URL(url).pathname}: ${(await response.text()).slice(0, 800)}`));
  return response;
}

async function waitForResult(eventId, request) {
  const response = await request(`${origin}/gradio_api/call/generate_fast/${encodeURIComponent(eventId)}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffered = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffered += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
    let end;
    while ((end = buffered.indexOf("\n\n")) >= 0) {
      const record = buffered.slice(0, end);
      buffered = buffered.slice(end + 2);
      const event = record.match(/^event:\s*(.*)$/m)?.[1];
      const data = record.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trimStart()).join("\n");
      if (event === "error") {
        let payload;
        try { payload = JSON.parse(data); } catch { payload = { raw: data }; }
        throw providerFailure(`Gradio generation error: ${data}`, "gradio-error", payload);
      }
      if (event === "complete") {
        const payload = JSON.parse(data);
        const result = Array.isArray(payload) ? payload[0] : payload;
        return typeof result === "string" ? JSON.parse(result) : result;
      }
    }
  }
  throw new Error("Generation stream ended without a completed result.");
}

export async function generateSpaceSamples({ outputRoot = defaultOutputRoot, request = checkedFetch, retryFailed = false, sampleList = samples, log = console.log } = {}) {
  const metadata = await (await request("https://huggingface.co/api/spaces/victor/pixal3d-studio")).json();
  const health = await (await request(`${origin}/health`)).json();
  if (!health.ok || !health.fast_final || health.mock || health.fast_backend !== "local") {
    throw new Error("The approved real local fast backend is unavailable; no substitute generation was started.");
  }

  for (const sample of sampleList) {
    const folder = path.join(outputRoot, sample.id);
    const resultPath = path.join(folder, "generation.json");
    let previous;
    try {
      previous = JSON.parse(await readFile(resultPath, "utf8"));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    const reference = await readFile(path.join(folder, "reference.png"));
    if (previous) assertReferenceIntegrity(previous, reference, sample.id);
    if (previous?.status === "complete") {
      const existing = await readFile(path.join(folder, "model.glb"));
      if (previous.output.sha256 !== sha256(existing) || previous.output.bytes !== existing.length) throw new Error("An existing model/provenance pair did not verify; inspect it before another run.");
      log(`${sample.id}: using verified completed output`);
      continue;
    }
    let priorAttempts;
    if (previous && !previous.result?.ok) {
      const failure = confirmedProviderFailure(previous);
      if (!failure || !["failed", "provider_failed"].includes(previous.status)) throw new Error(`Uncertain delivery for ${sample.id}; recover the existing submission before another GPU job. --retry-failed cannot resubmit it, even if no event ID was received.`);
      if (!retryFailed) throw new Error(`Confirmed provider failure for ${sample.id}; after resolving its cause, --retry-failed permits an authorized new attempt.`);
      priorAttempts = [...(previous.priorAttempts || []), { eventId: previous.eventId, startedAt: previous.startedAt, submissionStartedAt: previous.submissionStartedAt, failedAt: previous.failedAt, error: previous.error, providerFailure: failure }];
      previous = undefined;
    }
    const startedAt = new Date().toISOString();
    const record = previous || { id: sample.id, status: "started", sourceSpace: source, sourceRevision: metadata.sha, startedAt,
      input: { path: `/model-samples/${sample.id}/reference.png`, sha256: sha256(reference), origin: "Original vector drawing in scripts/model-samples/create-references.mjs" },
      parameters: { prompt: sample.prompt, seed: sample.seed, resolution: 1024, quality: "draft", manual_fov: -1, share_to_community: false },
      health, ...(priorAttempts ? { priorAttempts } : {}),
    };
    await writeFile(resultPath, JSON.stringify(record, null, 2) + "\n");
    log(`${sample.id}: ${previous ? "saving its already completed generation" : "uploading original input and starting real generation"}`);
    try {
      if (!record.result?.ok) {
        const form = new FormData();
        form.append("files", new Blob([reference], { type: "image/png" }), `${sample.id}-reference.png`);
        const uploaded = await (await request(`${origin}/gradio_api/upload`, { method: "POST", body: form })).json();
        if (!Array.isArray(uploaded) || typeof uploaded[0] !== "string") throw new Error("Unexpected Gradio upload response.");
        const image = { path: uploaded[0], url: null, size: reference.length, orig_name: `${sample.id}-reference.png`, mime_type: "image/png", is_stream: false, meta: { _type: "gradio.FileData" } };
        // Persist uncertainty before POST: the provider can accept a job before any response reaches us.
        record.submissionStartedAt = new Date().toISOString();
        record.status = "submission_pending";
        await writeFile(resultPath, JSON.stringify(record, null, 2) + "\n");
        const submitted = await (await request(`${origin}/gradio_api/call/v2/generate_fast`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image, ...record.parameters }),
        })).json();
        if (typeof submitted.event_id !== "string") throw new Error("Generation response did not include an event ID.");
        record.eventId = submitted.event_id;
        record.status = "accepted";
        await writeFile(resultPath, JSON.stringify(record, null, 2) + "\n");
        const result = await waitForResult(submitted.event_id, request);
        if (result?.ok === false) throw providerFailure(result.error || "The Space declared generation failure.", "result-error", result);
        if (result?.ok !== true) throw new Error("The completed response did not confirm a generation result; recover the existing submission.");
        record.result = result;
        record.status = "generated";
        await writeFile(resultPath, JSON.stringify(record, null, 2) + "\n");
      }
      const result = record.result;
      if (!result.asset?.model_url) throw new Error("The completed result has no model URL; recover its output before another GPU job.");
      const url = new URL(result.asset.model_url, origin);
      // The inspected Space source persists its own outputs into this public HF bucket.
      const bucketPrefix = `https://huggingface.co/buckets/victor/pixal3d-community/resolve/assets/${result.asset.id}/`;
      if (url.origin !== origin && !url.href.startsWith(bucketPrefix)) throw new Error("Unexpected output origin; inspect the result before downloading.");
      const binary = Buffer.from(await (await request(url.href)).arrayBuffer());
      if (binary.length < 20 || binary.toString("ascii", 0, 4) !== "glTF" || binary.readUInt32LE(4) !== 2 || binary.readUInt32LE(8) !== binary.length) {
        throw new Error("The generated download is not a valid GLB v2 container.");
      }
      await writeFile(path.join(folder, "model.glb"), binary);
      Object.assign(record, { status: "complete", completedAt: new Date().toISOString(), result,
        output: { path: `/model-samples/${sample.id}/model.glb`, bytes: binary.length, sha256: sha256(binary) } });
      if (record.error) { record.recoveredDeliveryIssue = record.error; delete record.error; delete record.failedAt; }
      await writeFile(resultPath, JSON.stringify(record, null, 2) + "\n");
      log(`${sample.id}: complete, ${binary.length} bytes, SHA-256 ${record.output.sha256}`);
    } catch (error) {
      error.message = redactSecrets(error.message);
      const status = error.providerFailure ? "provider_failed" : record.result?.ok ? "delivery_pending" : record.submissionStartedAt ? "delivery_uncertain" : "preparation_failed";
      Object.assign(record, { status, failedAt: new Date().toISOString(), error: error.message });
      if (error.providerFailure) record.providerFailure = error.providerFailure;
      else record.deliveryFailure = { at: record.failedAt, message: error.message };
      await writeFile(resultPath, JSON.stringify(record, null, 2) + "\n");
      throw error; // No automatic retries or paid fallback after a provider failure.
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await generateSpaceSamples({ retryFailed: process.argv.includes("--retry-failed") });
}
