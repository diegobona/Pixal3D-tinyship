// Generate the public manifest from completed, verified outputs only.
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exportGeometry } from "./export-geometry.mjs";
import { assertReferenceIntegrity } from "./generate-space-samples.mjs";
import { verifiedPreview } from "./render-previews.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const defaultPublicRoot = path.join(root, "apps/next-app/public");
const defaultManifestPath = path.join(root, "config/model-sample-manifest.json");

export async function refreshManifest({ publicRoot = defaultPublicRoot, manifestPath = defaultManifestPath, exportModelGeometry = exportGeometry, log = console.log } = {}) {
  const samples = [];
  const ids = ["mushroom", "teapot", "chair", "crate"];
  for (const id of ids) {
    const folder = path.join(publicRoot, "model-samples", id);
    let record;
    try { record = JSON.parse(await readFile(path.join(folder, "generation.json"), "utf8")); }
    catch (error) { if (error.code === "ENOENT") continue; throw error; }
    if (record.status !== "complete") continue;
    if (!record.result?.ok || record.health?.mock || record.result.asset.source_space !== "victor/pixal3d-studio") throw new Error(`Unverified generation source for ${id}`);
    assertReferenceIntegrity(record, await readFile(path.join(folder, "reference.png")), id);
    const glbPath = path.join(folder, "model.glb");
    const glb = await readFile(glbPath);
    const hash = createHash("sha256").update(glb).digest("hex");
    if (hash !== record.output.sha256 || glb.length !== record.output.bytes) throw new Error(`Generation integrity check failed for ${id}`);
    const previewImage = await verifiedPreview({ folder, id, glbSha256: hash });
    if (!previewImage) throw new Error(`Missing verified preview for ${id}; run scripts/model-samples/render-previews.mjs before publishing the manifest.`);
    const report = await exportModelGeometry(glbPath);
    const files = [
      { format: "GLB", path: `/model-samples/${id}/model.glb`, filename: `pixal3d-${id}.glb`, bytes: glb.length, sha256: hash },
      ...report.outputs.map((file) => ({ format: file.format.toUpperCase(), path: `/model-samples/${id}/model.${file.format}`, filename: `pixal3d-${id}.${file.format}`, bytes: file.bytes, sha256: file.sha256 })),
    ];
    const publicReport = { ...report, inputPath: `/model-samples/${id}/model.glb`, outputs: files.slice(1) };
    await writeFile(path.join(folder, "geometry-exports.json"), JSON.stringify(publicReport, null, 2) + "\n");
    samples.push({ id, referenceImage: `/model-samples/${id}/reference.png`, previewImage, sourceUrl: record.sourceSpace, licenseUrl: "/model-samples/usage.txt", files });
  }
  await writeFile(manifestPath, JSON.stringify(samples, null, 2) + "\n");
  log(`Manifest refreshed: ${samples.length} verified samples, ${samples.reduce((sum, sample) => sum + sample.files.length, 0)} real files.`);
  return samples;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await refreshManifest();
}
