// Offline posters of the verified local GLBs. No generation or external assets.
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertReferenceIntegrity } from "./generate-space-samples.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(path.join(root, "apps/next-app/package.json"));
const defaultOutputRoot = path.join(root, "apps/next-app/public/model-samples");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const settings = {
  width: 768, height: 768, deviceScaleFactor: 1,
  cameraOrbit: "30deg 70deg auto", fieldOfView: "30deg",
  environmentImage: "neutral", exposure: 1, shadowIntensity: 1,
  shadowSoftness: 1, background: "#f4f1ea", animation: false,
};

export async function verifiedPreview({ folder, id, glbSha256 }) {
  let record;
  try { record = JSON.parse(await readFile(path.join(folder, "preview-provenance.json"), "utf8")); }
  catch (error) { if (error.code === "ENOENT") return undefined; throw error; }
  const previewPath = `/model-samples/${id}/preview.png`;
  if (record.input?.path !== `/model-samples/${id}/model.glb` || record.input.sha256 !== glbSha256 || record.output?.path !== previewPath) {
    throw new Error(`Preview source integrity check failed for ${id}; render its current verified GLB again.`);
  }
  const bytes = await readFile(path.join(folder, "preview.png"));
  if (sha256(bytes) !== record.output.sha256 || bytes.length !== record.output.bytes) {
    throw new Error(`Preview image integrity check failed for ${id}; render its current verified GLB again.`);
  }
  return previewPath;
}

function pageHtml() {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
html,body { margin:0; width:100%; height:100%; overflow:hidden; }
model-viewer { width:${settings.width}px; height:${settings.height}px; background:${settings.background}; --poster-color:transparent; }
</style></head><body><script type="module">
import { ModelViewerElement } from '/model-viewer.js';
ModelViewerElement.dracoDecoderLocation = '/draco/';
const viewer = document.createElement('model-viewer');
for (const [name, value] of Object.entries({src:'/model.glb', 'camera-orbit':'${settings.cameraOrbit}', 'field-of-view':'${settings.fieldOfView}', 'environment-image':'${settings.environmentImage}', exposure:'${settings.exposure}', 'shadow-intensity':'${settings.shadowIntensity}', 'shadow-softness':'${settings.shadowSoftness}', 'interaction-prompt':'none', loading:'eager'})) viewer.setAttribute(name, value);
viewer.addEventListener('error', (event) => { window.renderError = JSON.stringify(event.detail); });
document.body.appendChild(viewer);
</script></body></html>`;
}

export async function renderPreviews({ outputRoot = defaultOutputRoot, log = console.log } = {}) {
  const { chromium } = require("@playwright/test");
  const viewerFile = require.resolve("@google/model-viewer");
  const viewerVersion = JSON.parse(await readFile(path.resolve(path.dirname(viewerFile), "../package.json"), "utf8")).version;
  const threeRoot = path.resolve(path.dirname(require.resolve("three")), "..");
  const dracoRoot = path.join(threeRoot, "examples/jsm/libs/draco/gltf");
  const localAssets = new Map([
    ["/model-viewer.js", { bytes: await readFile(viewerFile), mime: "text/javascript" }],
    ...await Promise.all(["draco_wasm_wrapper.js", "draco_decoder.wasm", "draco_decoder.js"].map(async (name) => [`/draco/${name}`, { bytes: await readFile(path.join(dracoRoot, name)), mime: name.endsWith(".wasm") ? "application/wasm" : "text/javascript" }])),
  ]);
  let currentModel;
  const server = createServer((request, response) => {
    const pathname = new URL(request.url, "http://localhost").pathname;
    const asset = pathname === "/" ? { bytes: pageHtml(), mime: "text/html" }
      : pathname === "/model.glb" ? { bytes: currentModel, mime: "model/gltf-binary" }
        : localAssets.get(pathname);
    if (!asset?.bytes) { response.writeHead(404).end(); return; }
    response.writeHead(200, { "Content-Type": asset.mime, "Cache-Control": "no-store" }).end(asset.bytes);
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  let browser;
  const rendered = [];
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.E2E_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.E2E_CHROMIUM_EXECUTABLE_PATH } : {}), args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
    const origin = `http://127.0.0.1:${server.address().port}`;
    for (const id of ["mushroom", "teapot", "chair", "crate"]) {
      const folder = path.join(outputRoot, id);
      let generation;
      try { generation = JSON.parse(await readFile(path.join(folder, "generation.json"), "utf8")); }
      catch (error) { if (error.code === "ENOENT") continue; throw error; }
      if (generation.status !== "complete") continue;
      if (!generation.result?.ok || generation.health?.mock || generation.result.asset?.source_space !== "victor/pixal3d-studio") throw new Error(`Unverified generation source for ${id}`);
      assertReferenceIntegrity(generation, await readFile(path.join(folder, "reference.png")), id);
      currentModel = await readFile(path.join(folder, "model.glb"));
      const inputHash = sha256(currentModel);
      if (inputHash !== generation.output?.sha256 || currentModel.length !== generation.output.bytes) throw new Error(`Generation integrity check failed for ${id}`);
      const page = await browser.newPage({ viewport: { width: settings.width, height: settings.height }, deviceScaleFactor: settings.deviceScaleFactor });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route("**/*", async (route) => {
        if (new URL(route.request().url()).origin === origin) await route.continue();
        else { errors.push(`External request refused: ${route.request().url()}`); await route.abort(); }
      });
      await page.goto(origin);
      await page.waitForFunction(() => window.renderError || document.querySelector("model-viewer")?.loaded, null, { timeout: 60_000 });
      const framing = await page.evaluate(async () => {
        if (window.renderError) throw new Error(window.renderError);
        const viewer = document.querySelector("model-viewer");
        await viewer.updateFraming();
        viewer.jumpCameraToGoal();
        // toBlob forces a completed render before the background-inclusive screenshot.
        await viewer.toBlob({ mimeType: "image/png" });
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return { orbit: viewer.getCameraOrbit(), target: viewer.getCameraTarget(), dimensions: viewer.getDimensions() };
      });
      const png = await page.locator("model-viewer").screenshot({ type: "png", animations: "disabled" });
      await page.close();
      if (errors.length) throw new Error(`${id} rendering failed: ${errors.join("; ")}`);
      const record = {
        renderedAt: new Date().toISOString(),
        method: "Local GLB rendered with model-viewer in Chromium; no image synthesis or reference overlay",
        renderer: { modelViewer: viewerVersion, chromium: browser.version(), backend: "SwiftShader", script: "scripts/model-samples/render-previews.mjs" },
        settings, framing,
        input: { path: `/model-samples/${id}/model.glb`, bytes: currentModel.length, sha256: inputHash },
        output: { path: `/model-samples/${id}/preview.png`, bytes: png.length, sha256: sha256(png), width: settings.width, height: settings.height },
      };
      await writeFile(path.join(folder, "preview.png"), png);
      await writeFile(path.join(folder, "preview-provenance.json"), JSON.stringify(record, null, 2) + "\n");
      await verifiedPreview({ folder, id, glbSha256: inputHash });
      rendered.push(record);
      log(`${id}: rendered ${settings.width} × ${settings.height} real GLB poster, SHA-256 ${record.output.sha256}`);
    }
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
  return rendered;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await renderPreviews();
}
