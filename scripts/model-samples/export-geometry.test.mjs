import assert from "node:assert/strict";
import { mkdtemp, readFile, rmdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { exportGeometry, readGeometry } from "./export-geometry.mjs";

// Minimal, temporary verification fixtures; never copied to the public gallery.
function makeTriangleGlb({ nodes = [{ mesh: 0 }], mode = 4, extensionsUsed = [], positionStride = 12, indexed = true, degenerate = false } = {}) {
  const binary = Buffer.alloc(positionStride * 3 + (indexed ? 8 : 0));
  const positions = degenerate ? [0, 0, 0, 1, 0, 0, 2, 0, 0] : [0, 0, 0, 1, 0, 0, 0, 1, 0];
  for (let vertex = 0; vertex < 3; vertex++) {
    for (let axis = 0; axis < 3; axis++) binary.writeFloatLE(positions[vertex * 3 + axis], vertex * positionStride + axis * 4);
  }
  if (indexed) for (let i = 0; i < 3; i++) binary.writeUInt16LE(i, positionStride * 3 + i * 2);
  const json = {
    asset: { version: "2.0" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes,
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, ...(indexed ? { indices: 1 } : {}), mode }] }],
    buffers: [{ byteLength: binary.length }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: positionStride * 3, byteStride: positionStride },
      ...(indexed ? [{ buffer: 0, byteOffset: positionStride * 3, byteLength: 6 }] : []),
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 3, type: "VEC3" },
      ...(indexed ? [{ bufferView: 1, componentType: 5123, count: 3, type: "SCALAR" }] : []),
    ],
    extensionsUsed,
  };
  const sourceJson = Buffer.from(JSON.stringify(json));
  const jsonChunk = Buffer.alloc(Math.ceil(sourceJson.length / 4) * 4, 0x20);
  sourceJson.copy(jsonChunk);
  const bytes = Buffer.alloc(28 + jsonChunk.length + binary.length);
  bytes.write("glTF", 0);
  bytes.writeUInt32LE(2, 4);
  bytes.writeUInt32LE(bytes.length, 8);
  bytes.writeUInt32LE(jsonChunk.length, 12);
  bytes.writeUInt32LE(0x4e4f534a, 16);
  jsonChunk.copy(bytes, 20);
  const binOffset = 20 + jsonChunk.length;
  bytes.writeUInt32LE(binary.length, binOffset);
  bytes.writeUInt32LE(0x004e4942, binOffset + 4);
  binary.copy(bytes, binOffset + 8);
  return bytes;
}

test("applies parent translation, child rotation and scale to strided POSITION data", async () => {
  const geometry = await readGeometry(makeTriangleGlb({
    positionStride: 16,
    nodes: [
      { translation: [10, 20, 30], children: [1] },
      { mesh: 0, scale: [2, 3, 4], rotation: [0, 0, Math.SQRT1_2, Math.SQRT1_2] },
    ],
  }));
  assert.equal(geometry.triangleCount, 1);
  assert.equal(geometry.vertexCount, 3);
  const expected = [10, 20, 30, 10, 22, 30, 7, 20, 30];
  geometry.instances[0].positions.forEach((value, i) => assert.ok(Math.abs(value - expected[i]) < 1e-10));
});

test("preserves outward winding for mirrored affine matrix nodes", async () => {
  const geometry = await readGeometry(makeTriangleGlb({ nodes: [{ mesh: 0, matrix: [-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 4, 5, 6, 1] }] }));
  assert.deepEqual(Array.from(geometry.instances[0].positions), [4, 5, 6, 3, 5, 6, 4, 6, 6]);
  assert.deepEqual(Array.from(geometry.instances[0].indices), [0, 2, 1]);
});

test("reads nonindexed triangle primitives without changing their faces", async () => {
  const geometry = await readGeometry(makeTriangleGlb({ indexed: false }));
  assert.equal(geometry.triangleCount, 1);
  assert.deepEqual(Array.from(geometry.instances[0].indices), [0, 1, 2]);
});

test("rejects unsupported mesh modes, extensions, cycles and truncated files", async () => {
  await assert.rejects(readGeometry(makeTriangleGlb({ mode: 5 })), /TRIANGLES/);
  await assert.rejects(readGeometry(makeTriangleGlb({ extensionsUsed: ["EXT_mesh_gpu_instancing"] })), /Unsupported extension/);
  await assert.rejects(readGeometry(makeTriangleGlb({ nodes: [{ mesh: 0, children: [0] }] })), /cyclic/);
  await assert.rejects(readGeometry(makeTriangleGlb().subarray(0, 30)), /declared length/);
  await assert.rejects(readGeometry(makeTriangleGlb({ nodes: [{ mesh: 0, skin: 0 }] })), /skins/);
});

test("writes and verifies real OBJ and binary STL files while retaining degenerate triangles", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "pixal3d-export-verification-"));
  const input = path.join(directory, "model.glb");
  try {
    await writeFile(input, makeTriangleGlb({ degenerate: true }));
    const report = await exportGeometry(input);
    assert.equal(report.triangles, 1);
    assert.equal(report.degenerateTriangles, 1);
    assert.equal(report.stlDegenerateTrianglesAfterFloat32Encoding, 1);
    assert.equal(report.topologyRepaired, false);
    assert.equal(report.printabilityVerified, false);
    assert.equal(report.outputs.length, 2);
    const obj = await readFile(path.join(directory, "model.obj"), "utf8");
    assert.match(obj, /f 1 2 3/);
    assert.doesNotMatch(obj, /^mtllib|^usemtl|^vt /m);
    const stl = await readFile(path.join(directory, "model.stl"));
    assert.equal(stl.length, 134);
    assert.equal(stl.readUInt32LE(80), 1);
    assert.equal(stl.readFloatLE(80 + 4 + 12 + 24), 2);
    for (const output of report.outputs) {
      assert.ok(output.bytes > 0);
      assert.match(output.sha256, /^[a-f0-9]{64}$/);
    }
  } finally {
    for (const filename of ["model.glb", "model.obj", "model.stl"]) {
      await unlink(path.join(directory, filename)).catch((error) => { if (error.code !== "ENOENT") throw error; });
    }
    await rmdir(directory);
  }
});
