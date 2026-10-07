import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { generateSpaceSamples } from "./generate-space-samples.mjs";
import { refreshManifest } from "./refresh-manifest.mjs";

const sample = { id: "mushroom", seed: 2026100601, prompt: "Original offline test input" };
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const quota = { error: "You have exceeded your ZeroGPU quota (120s requested vs. 108s left)", title: "ZeroGPU quota exceeded" };
const result = { ok: true, asset: { id: "offline", source_space: "victor/pixal3d-studio", model_url: "https://victor-pixal3d-studio.hf.space/offline.glb" } };
const model = Buffer.alloc(20);
model.write("glTF");
model.writeUInt32LE(2, 4);
model.writeUInt32LE(model.length, 8);

async function fixture(t) {
  const directory = await mkdtemp(path.join(tmpdir(), "pixal3d-generation-safety-"));
  t.after(async () => {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(tmpdir()));
    assert.ok(path.basename(directory).startsWith("pixal3d-generation-safety-"));
    await rm(directory, { recursive: true, force: true });
  });
  const outputRoot = path.join(directory, "public", "model-samples");
  const folder = path.join(outputRoot, sample.id);
  await mkdir(folder, { recursive: true });
  const reference = Buffer.from("original offline reference bytes");
  await writeFile(path.join(folder, "reference.png"), reference);
  const record = { id: sample.id, sourceSpace: "https://huggingface.co/spaces/victor/pixal3d-studio", sourceRevision: "offline", input: { sha256: sha256(reference) }, health: { ok: true, mock: false, fast_final: true, fast_backend: "local" }, parameters: sample };
  const recordPath = path.join(folder, "generation.json");
  return { directory, outputRoot, folder, record, recordPath, readRecord: async () => JSON.parse(await readFile(recordPath, "utf8")) };
}

function provider({ submit, stream, download } = {}) {
  const calls = { submissions: 0, downloads: 0 };
  const request = async (url, options) => {
    if (url.includes("/api/spaces/")) return Response.json({ sha: "offline" });
    if (url.endsWith("/health")) return Response.json({ ok: true, mock: false, fast_final: true, fast_backend: "local" });
    if (url.endsWith("/gradio_api/upload")) return Response.json(["/tmp/offline-reference.png"]);
    if (url.endsWith("/call/v2/generate_fast")) {
      assert.equal(options.method, "POST");
      calls.submissions++;
      return submit ? submit(calls.submissions) : Response.json({ event_id: "offline-event" });
    }
    if (url.endsWith("/call/generate_fast/offline-event")) return stream ? stream() : new Response(`event: complete\ndata: ${JSON.stringify([result])}\n\n`);
    if (url.endsWith("/offline.glb")) {
      calls.downloads++;
      return download ? download(calls.downloads) : new Response(model);
    }
    throw new Error(`Unexpected offline request: ${url}`);
  };
  return { request, calls };
}

const run = (f, p, retryFailed = false) => generateSpaceSamples({ outputRoot: f.outputRoot, request: p.request, retryFailed, sampleList: [sample], log: () => {} });

test("only an explicit retry repeats a confirmed Gradio quota failure and retains its evidence", async (t) => {
  const f = await fixture(t);
  let fail = true;
  const p = provider({ stream: () => new Response(fail ? `event: error\ndata: ${JSON.stringify(quota)}\n\n` : `event: complete\ndata: ${JSON.stringify([result])}\n\n`) });
  await assert.rejects(run(f, p), /ZeroGPU quota/);
  const failed = await f.readRecord();
  assert.equal(failed.status, "provider_failed");
  assert.equal(failed.providerFailure.kind, "gradio-error");
  assert.deepEqual(failed.providerFailure.payload, quota);
  await assert.rejects(run(f, p), /retry-failed/);
  assert.equal(p.calls.submissions, 1);
  fail = false;
  await run(f, p, true);
  const completed = await f.readRecord();
  assert.equal(completed.status, "complete");
  assert.deepEqual(completed.priorAttempts[0].providerFailure.payload, quota);
  assert.equal(p.calls.submissions, 2);
});

test("legacy exact Gradio quota rejection is migrated conservatively for an authorized retry", async (t) => {
  const f = await fixture(t);
  await writeFile(f.recordPath, JSON.stringify({ ...f.record, status: "failed", eventId: "legacy-event", error: `Gradio generation error: ${JSON.stringify(quota)}` }));
  const p = provider();
  await run(f, p, true);
  const completed = await f.readRecord();
  assert.equal(completed.priorAttempts[0].providerFailure.legacy, true);
  assert.deepEqual(completed.priorAttempts[0].providerFailure.payload, quota);
  assert.equal(p.calls.submissions, 1);
});

test("legacy transport errors and ambiguous quota text cannot authorize a fresh submission", async (t) => {
  for (const error of ["connection lost after POST", "ZeroGPU quota exceeded", 'Gradio generation error: {"error":"You have exceeded your ZeroGPU quota (120s requested vs. 108s left)"}']) {
    const f = await fixture(t);
    await writeFile(f.recordPath, JSON.stringify({ ...f.record, status: "failed", error }));
    const p = provider();
    await assert.rejects(run(f, p, true), /uncertain.*recover/i);
    assert.equal(p.calls.submissions, 0);
  }
});

test("an explicit unsuccessful completion is stored as provider failure", async (t) => {
  const f = await fixture(t);
  const failure = { ok: false, error: "Generation could not complete" };
  const p = provider({ stream: () => new Response(`event: complete\ndata: ${JSON.stringify([failure])}\n\n`) });
  await assert.rejects(run(f, p), /could not complete/);
  const saved = await f.readRecord();
  assert.equal(saved.status, "provider_failed");
  assert.equal(saved.providerFailure.kind, "result-error");
  assert.deepEqual(saved.providerFailure.payload, failure);
});

test("provider failure evidence cannot persist a local HF token reflected in a response", async (t) => {
  const f = await fixture(t);
  const previousToken = process.env.HF_TOKEN;
  process.env.HF_TOKEN = "hf_offline_secret_not_a_credential";
  t.after(() => { if (previousToken === undefined) delete process.env.HF_TOKEN; else process.env.HF_TOKEN = previousToken; });
  const payload = { ...quota, detail: process.env.HF_TOKEN };
  const p = provider({ stream: () => new Response(`event: error\ndata: ${JSON.stringify(payload)}\n\n`) });
  await assert.rejects(run(f, p), (error) => !error.message.includes(process.env.HF_TOKEN));
  const saved = await readFile(f.recordPath, "utf8");
  assert.ok(!saved.includes(process.env.HF_TOKEN));
  assert.ok(saved.includes("[redacted HF_TOKEN]"));
});

for (const [name, options] of [
  ["POST transport failure without an event ID", { submit: () => { throw new Error("connection lost after POST"); } }],
  ["POST response parse failure without an event ID", { submit: () => new Response("unparseable submission response") }],
  ["accepted stream transport failure", { stream: () => new Response(new ReadableStream({ start(controller) { controller.error(new Error("stream connection lost")); } })) }],
  ["accepted completion parse failure", { stream: () => new Response("event: complete\ndata: invalid JSON\n\n") }],
]) {
  test(`${name} cannot be resubmitted with --retry-failed`, async (t) => {
    const f = await fixture(t);
    const p = provider(options);
    await assert.rejects(run(f, p));
    const uncertain = await f.readRecord();
    assert.equal(uncertain.status, "delivery_uncertain");
    assert.equal(uncertain.providerFailure, undefined);
    assert.ok(uncertain.submissionStartedAt);
    await assert.rejects(run(f, p, true), /recover|uncertain/i);
    assert.equal(p.calls.submissions, 1);
  });
}

test("a recovered result resumes its download without another generation call", async (t) => {
  const f = await fixture(t);
  const p = provider({ download: (attempt) => { if (attempt === 1) throw new Error("download connection lost"); return new Response(model); } });
  await assert.rejects(run(f, p), /download connection lost/);
  const pending = await f.readRecord();
  assert.equal(pending.status, "delivery_pending");
  assert.deepEqual(pending.result, result);
  await run(f, p, true);
  assert.equal((await f.readRecord()).status, "complete");
  assert.equal(p.calls.submissions, 1);
  assert.equal(p.calls.downloads, 2);
});

test("an existing successful result in a legacy failed record downloads without resubmission", async (t) => {
  const f = await fixture(t);
  await writeFile(f.recordPath, JSON.stringify({ ...f.record, status: "failed", result, error: "Unexpected output origin" }));
  const p = provider();
  await run(f, p);
  assert.equal((await f.readRecord()).status, "complete");
  assert.equal(p.calls.submissions, 0);
  assert.equal(p.calls.downloads, 1);
});

for (const status of ["complete", "delivery_pending"]) {
  test(`changed source image refuses ${status} skip or resume`, async (t) => {
    const f = await fixture(t);
    await writeFile(f.recordPath, JSON.stringify({ ...f.record, status, result, output: { bytes: model.length, sha256: sha256(model) } }));
    await writeFile(path.join(f.folder, "model.glb"), model);
    await writeFile(path.join(f.folder, "reference.png"), "different source image");
    const p = provider();
    await assert.rejects(run(f, p, true), /reference.*integrity|source image.*hash/i);
    assert.equal(p.calls.submissions, 0);
    assert.equal(p.calls.downloads, 0);
  });
}

test("manifest publication refuses a changed source image before writing exports or manifest", async (t) => {
  const f = await fixture(t);
  await writeFile(f.recordPath, JSON.stringify({ ...f.record, status: "complete", result, output: { bytes: model.length, sha256: sha256(model) } }));
  await writeFile(path.join(f.folder, "model.glb"), model);
  await writeFile(path.join(f.folder, "reference.png"), "different source image");
  const manifestPath = path.join(f.directory, "manifest.json");
  await writeFile(manifestPath, "[]\n");
  let exports = 0;
  await assert.rejects(refreshManifest({ publicRoot: path.join(f.directory, "public"), manifestPath, exportModelGeometry: async () => { exports++; return { outputs: [] }; }, log: () => {} }), /reference.*integrity|source image.*hash/i);
  assert.equal(exports, 0);
  assert.equal(await readFile(manifestPath, "utf8"), "[]\n");
});

test("manifest refresh retains a poster only when its bytes and source GLB match provenance", async (t) => {
  const f = await fixture(t);
  await writeFile(f.recordPath, JSON.stringify({ ...f.record, status: "complete", result, output: { bytes: model.length, sha256: sha256(model) } }));
  await writeFile(path.join(f.folder, "model.glb"), model);
  const manifestPath = path.join(f.directory, "manifest.json");
  const options = { publicRoot: path.join(f.directory, "public"), manifestPath, exportModelGeometry: async () => ({ outputs: [] }), log: () => {} };
  await assert.rejects(refreshManifest(options), /missing verified preview.*render-previews/i);
  const poster = Buffer.from("offline poster fixture");
  const previewPath = "/model-samples/mushroom/preview.png";
  await writeFile(path.join(f.folder, "preview.png"), poster);
  await writeFile(path.join(f.folder, "preview-provenance.json"), JSON.stringify({ input: { path: "/model-samples/mushroom/model.glb", sha256: sha256(model) }, output: { path: previewPath, bytes: poster.length, sha256: sha256(poster) } }));
  assert.equal((await refreshManifest(options))[0].previewImage, previewPath);
  assert.equal((await refreshManifest(options))[0].previewImage, previewPath);
});

for (const changed of ["source GLB", "poster bytes"]) {
  test(`manifest refuses stale preview after changed ${changed}`, async (t) => {
    const f = await fixture(t);
    await writeFile(f.recordPath, JSON.stringify({ ...f.record, status: "complete", result, output: { bytes: model.length, sha256: sha256(model) } }));
    await writeFile(path.join(f.folder, "model.glb"), model);
    const poster = Buffer.from("offline poster fixture");
    await writeFile(path.join(f.folder, "preview.png"), changed === "poster bytes" ? Buffer.from("changed offline poster") : poster);
    await writeFile(path.join(f.folder, "preview-provenance.json"), JSON.stringify({ input: { path: "/model-samples/mushroom/model.glb", sha256: changed === "source GLB" ? sha256(Buffer.from("older model")) : sha256(model) }, output: { path: "/model-samples/mushroom/preview.png", bytes: poster.length, sha256: sha256(poster) } }));
    const manifestPath = path.join(f.directory, "manifest.json");
    await writeFile(manifestPath, "[]\n");
    let exports = 0;
    await assert.rejects(refreshManifest({ publicRoot: path.join(f.directory, "public"), manifestPath, exportModelGeometry: async () => { exports++; return { outputs: [] }; }, log: () => {} }), /preview.*integrity/i);
    assert.equal(exports, 0);
    assert.equal(await readFile(manifestPath, "utf8"), "[]\n");
  });
}
