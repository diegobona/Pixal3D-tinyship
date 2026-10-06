import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(path.join(repositoryRoot, "apps/next-app/package.json"));
const { Matrix4, Quaternion, Vector3 } = require("three");
let dracoPromise;

const invariant = (condition, message) => {
  if (!condition) throw new Error(message);
};
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

function readGlb(bytes) {
  invariant(bytes.length >= 20 && bytes.toString("ascii", 0, 4) === "glTF", "Input is not a GLB file");
  invariant(bytes.readUInt32LE(4) === 2, "Only GLB version 2 is supported");
  invariant(bytes.readUInt32LE(8) === bytes.length, "GLB declared length does not match its actual length");
  let json;
  let binary;
  let offset = 12;
  while (offset < bytes.length) {
    invariant(offset + 8 <= bytes.length, "Truncated GLB chunk header");
    const length = bytes.readUInt32LE(offset);
    const type = bytes.readUInt32LE(offset + 4);
    invariant(length % 4 === 0 && offset + 8 + length <= bytes.length, "Invalid GLB chunk length");
    const chunk = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === 0x4e4f534a) {
      invariant(offset === 12 && json === undefined, "GLB must begin with exactly one JSON chunk");
      json = JSON.parse(chunk.toString("utf8"));
    } else if (type === 0x004e4942) {
      invariant(binary === undefined, "Multiple GLB binary chunks are unsupported");
      binary = chunk;
    } else {
      throw new Error(`Unsupported GLB chunk type: ${type}`);
    }
    offset += 8 + length;
  }
  invariant(json?.asset?.version === "2.0" && binary, "GLB requires glTF 2.0 JSON and an embedded binary chunk");
  invariant(json.buffers?.length === 1 && !json.buffers[0].uri, "Only one embedded GLB buffer is supported");
  const declaredBufferLength = json.buffers[0].byteLength;
  invariant(Number.isInteger(declaredBufferLength) && declaredBufferLength > 0 && declaredBufferLength <= binary.length && binary.length - declaredBufferLength <= 3, "GLB buffer length is invalid");
  invariant(!json.animations?.length, "Animated models are unsupported; export requires a static model");
  for (const extension of new Set([...(json.extensionsRequired ?? []), ...(json.extensionsUsed ?? [])])) {
    invariant(extension === "KHR_draco_mesh_compression" || extension === "EXT_texture_webp" || extension === "KHR_texture_basisu" || extension === "KHR_texture_transform" || extension.startsWith("KHR_materials_"), `Unsupported extension: ${extension}`);
  }
  return { json, binary: binary.subarray(0, declaredBufferLength) };
}

function bufferView(json, binary, index) {
  const view = json.bufferViews?.[index];
  invariant(view && view.buffer === 0 && !view.extensions, `Unsupported or missing bufferView ${index}`);
  const offset = view.byteOffset ?? 0;
  invariant(Number.isInteger(offset) && offset >= 0 && Number.isInteger(view.byteLength) && view.byteLength > 0 && offset + view.byteLength <= binary.length, `Invalid bufferView ${index} range`);
  return { bytes: binary.subarray(offset, offset + view.byteLength), stride: view.byteStride };
}

function accessorData(json, binary, index, position) {
  const accessor = json.accessors?.[index];
  invariant(accessor && !accessor.sparse && !accessor.extensions && !accessor.normalized && Number.isInteger(accessor.count) && accessor.count > 0, `Unsupported accessor ${index}`);
  const components = position ? 3 : 1;
  invariant(accessor.type === (position ? "VEC3" : "SCALAR"), `Accessor ${index} has the wrong type`);
  const readers = { 5121: [1, "readUInt8"], 5123: [2, "readUInt16LE"], 5125: [4, "readUInt32LE"], 5126: [4, "readFloatLE"] };
  const reader = readers[accessor.componentType];
  invariant(reader && (position ? accessor.componentType === 5126 : accessor.componentType !== 5126), `Unsupported accessor ${index} component type`);
  const { bytes, stride } = bufferView(json, binary, accessor.bufferView);
  const elementBytes = components * reader[0];
  const step = stride ?? elementBytes;
  const offset = accessor.byteOffset ?? 0;
  invariant(Number.isInteger(offset) && offset >= 0 && Number.isInteger(step) && step >= elementBytes && step % reader[0] === 0 && offset % reader[0] === 0 && offset + (accessor.count - 1) * step + elementBytes <= bytes.length, `Invalid accessor ${index} range or stride`);
  const values = position ? new Float32Array(accessor.count * components) : new Uint32Array(accessor.count);
  for (let i = 0; i < accessor.count; i++) {
    for (let component = 0; component < components; component++) {
      const value = bytes[reader[1]](offset + i * step + component * reader[0]);
      invariant(Number.isFinite(value), `Accessor ${index} contains a non-finite value`);
      values[i * components + component] = value;
    }
  }
  return values;
}

async function getDraco() {
  if (!dracoPromise) {
    dracoPromise = (async () => {
      const decoderPath = require.resolve("three/examples/jsm/libs/draco/gltf/draco_decoder.js");
      const context = { module: { exports: {} }, exports: {}, require, process, console, setTimeout, clearTimeout, Buffer, __dirname: path.dirname(decoderPath) };
      vm.runInNewContext(await readFile(decoderPath, "utf8"), context, { filename: decoderPath });
      return context.module.exports();
    })();
  }
  return dracoPromise;
}

async function decodeDraco(json, binary, primitive) {
  const draco = await getDraco();
  const extension = primitive.extensions.KHR_draco_mesh_compression;
  const compressed = bufferView(json, binary, extension.bufferView).bytes;
  const decoder = new draco.Decoder();
  const decoderBuffer = new draco.DecoderBuffer();
  const mesh = new draco.Mesh();
  const floats = new draco.DracoFloat32Array();
  const face = new draco.DracoInt32Array();
  try {
    decoderBuffer.Init(new Int8Array(compressed.buffer, compressed.byteOffset, compressed.byteLength), compressed.length);
    invariant(decoder.GetEncodedGeometryType(decoderBuffer) === draco.TRIANGULAR_MESH, "Draco primitive is not a triangle mesh");
    const status = decoder.DecodeBufferToMesh(decoderBuffer, mesh);
    invariant(status.ok(), `Draco decode failed: ${status.error_msg()}`);
    const positionId = extension.attributes?.POSITION;
    invariant(Number.isInteger(positionId), "Draco primitive is missing POSITION");
    const attribute = decoder.GetAttributeByUniqueId(mesh, positionId);
    invariant(attribute?.ptr && attribute.num_components() === 3, "Draco POSITION must have three components");
    invariant(decoder.GetAttributeFloatForAllPoints(mesh, attribute, floats), "Could not decode Draco positions");
    const positions = new Float32Array(mesh.num_points() * 3);
    invariant(floats.size() === positions.length && json.accessors?.[primitive.attributes.POSITION]?.count === mesh.num_points(), "Draco decoded position count differs from the GLB accessor");
    for (let i = 0; i < positions.length; i++) {
      positions[i] = floats.GetValue(i);
      invariant(Number.isFinite(positions[i]), "Draco POSITION contains a non-finite value");
    }
    const indices = new Uint32Array(mesh.num_faces() * 3);
    invariant(json.accessors?.[primitive.indices]?.count === indices.length, "Draco decoded index count differs from the GLB accessor");
    for (let i = 0; i < mesh.num_faces(); i++) {
      invariant(decoder.GetFaceFromMesh(mesh, i, face), "Could not decode a Draco triangle");
      for (let component = 0; component < 3; component++) indices[i * 3 + component] = face.GetValue(component);
    }
    return { positions, indices };
  } finally {
    for (const object of [face, floats, mesh, decoderBuffer, decoder]) draco.destroy(object);
  }
}

async function decodePrimitive(json, binary, primitive) {
  invariant((primitive.mode ?? 4) === 4, "Only TRIANGLES primitives are supported");
  invariant(!primitive.targets?.length, "Morph target geometry is unsupported");
  invariant(Number.isInteger(primitive.attributes?.POSITION), "Mesh primitive is missing POSITION");
  for (const extension of Object.keys(primitive.extensions ?? {})) {
    invariant(extension === "KHR_draco_mesh_compression", `Unsupported primitive extension: ${extension}`);
  }
  const geometry = primitive.extensions?.KHR_draco_mesh_compression
    ? await decodeDraco(json, binary, primitive)
    : {
      positions: accessorData(json, binary, primitive.attributes.POSITION, true),
      indices: primitive.indices === undefined ? undefined : accessorData(json, binary, primitive.indices, false),
    };
  const vertices = geometry.positions.length / 3;
  if (!geometry.indices) geometry.indices = Uint32Array.from({ length: vertices }, (_, i) => i);
  invariant(geometry.indices.length > 0 && geometry.indices.length % 3 === 0, "Primitive does not contain complete triangles");
  for (const index of geometry.indices) invariant(index < vertices, "Triangle index is outside POSITION accessor");
  return geometry;
}

function nodeMatrix(node) {
  invariant(!node.extensions && node.skin === undefined && !node.weights?.length, "Node extensions, skins and morph weights are unsupported");
  const matrix = new Matrix4();
  if (node.matrix !== undefined) {
    invariant(Array.isArray(node.matrix) && node.matrix.length === 16 && node.matrix.every(Number.isFinite) && node.translation === undefined && node.rotation === undefined && node.scale === undefined, "Invalid node matrix");
    matrix.fromArray(node.matrix);
    invariant(node.matrix[3] === 0 && node.matrix[7] === 0 && node.matrix[11] === 0 && node.matrix[15] === 1, "Only affine node matrices are supported");
  } else {
    const translation = node.translation ?? [0, 0, 0];
    const rotation = node.rotation ?? [0, 0, 0, 1];
    const scale = node.scale ?? [1, 1, 1];
    invariant(translation.length === 3 && rotation.length === 4 && scale.length === 3 && [...translation, ...rotation, ...scale].every(Number.isFinite), "Invalid node TRS transform");
    const quaternion = new Quaternion().fromArray(rotation);
    invariant(Math.abs(quaternion.length() - 1) < 0.0001, "Node rotation quaternion is not normalized");
    matrix.compose(new Vector3().fromArray(translation), quaternion, new Vector3().fromArray(scale));
  }
  invariant(matrix.determinant() !== 0, "Singular node transform cannot be exported");
  return matrix;
}

export async function readGeometry(bytes) {
  const { json, binary } = readGlb(bytes);
  const sceneIndex = json.scene ?? 0;
  const scene = json.scenes?.[sceneIndex];
  invariant(scene && !scene.extensions, "A supported default scene is required");
  const instances = [];
  const visited = new Set();
  const decodedMeshes = new Map();
  const point = new Vector3();
  const bounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
  async function visit(index, parentMatrix) {
    invariant(Number.isInteger(index) && json.nodes?.[index] && !visited.has(index), "Scene node reference is invalid, cyclic or has multiple parents");
    visited.add(index);
    const node = json.nodes[index];
    const world = parentMatrix.clone().multiply(nodeMatrix(node));
    if (node.mesh !== undefined) {
      invariant(Number.isInteger(node.mesh) && json.meshes?.[node.mesh], "Scene references a missing mesh");
      if (!decodedMeshes.has(node.mesh)) {
        const mesh = json.meshes[node.mesh];
        invariant(!mesh.extensions && !mesh.weights?.length && mesh.primitives?.length, "Unsupported or empty mesh");
        decodedMeshes.set(node.mesh, await Promise.all(mesh.primitives.map((primitive) => decodePrimitive(json, binary, primitive))));
      }
      for (const geometry of decodedMeshes.get(node.mesh)) {
        const positions = new Float64Array(geometry.positions.length);
        for (let i = 0; i < positions.length; i += 3) {
          point.fromArray(geometry.positions, i).applyMatrix4(world);
          const coordinates = [point.x, point.y, point.z];
          invariant(coordinates.every(Number.isFinite), "Node transform produced a non-finite position");
          positions.set(coordinates, i);
          for (let axis = 0; axis < 3; axis++) {
            bounds.min[axis] = Math.min(bounds.min[axis], coordinates[axis]);
            bounds.max[axis] = Math.max(bounds.max[axis], coordinates[axis]);
          }
        }
        // A mirrored node reverses orientation. Reverse the face winding too,
        // so the exported surface has the same outward orientation as glTF.
        const indices = world.determinant() < 0 ? geometry.indices.slice() : geometry.indices;
        if (world.determinant() < 0) {
          for (let i = 0; i < indices.length; i += 3) [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
        }
        instances.push({ positions, indices });
      }
    }
    for (const child of node.children ?? []) await visit(child, world);
  }
  for (const index of scene.nodes ?? []) await visit(index, new Matrix4());
  const vertexCount = instances.reduce((sum, instance) => sum + instance.positions.length / 3, 0);
  const triangleCount = instances.reduce((sum, instance) => sum + instance.indices.length / 3, 0);
  invariant(vertexCount > 0 && triangleCount > 0 && triangleCount <= 0xffffffff, "The selected scene has no exportable triangles or exceeds STL limits");
  return { instances, sceneIndex, vertexCount, triangleCount, bounds };
}

function encodeObj(geometry) {
  const lines = ["# Geometry-only export from GLB; no materials, textures or UV coordinates", "# Node transforms applied; source units preserved; printability not assessed"];
  let vertexOffset = 1;
  for (let instanceIndex = 0; instanceIndex < geometry.instances.length; instanceIndex++) {
    const { positions, indices } = geometry.instances[instanceIndex];
    lines.push(`o mesh_${instanceIndex + 1}`);
    for (let i = 0; i < positions.length; i += 3) lines.push(`v ${positions[i]} ${positions[i + 1]} ${positions[i + 2]}`);
    for (let i = 0; i < indices.length; i += 3) lines.push(`f ${indices[i] + vertexOffset} ${indices[i + 1] + vertexOffset} ${indices[i + 2] + vertexOffset}`);
    vertexOffset += positions.length / 3;
  }
  return Buffer.from(`${lines.join("\n")}\n`, "utf8");
}

function encodeStl(geometry) {
  const bytes = Buffer.alloc(84 + geometry.triangleCount * 50);
  bytes.write("GLB geometry export; source units preserved; printability not assessed", 0, 80, "ascii");
  bytes.writeUInt32LE(geometry.triangleCount, 80);
  let offset = 84;
  let degenerateTriangles = 0;
  let float32CollapsedTriangles = 0;
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  const edge = new Vector3();
  const normal = new Vector3();
  for (const { positions, indices } of geometry.instances) {
    for (let i = 0; i < indices.length; i += 3) {
      a.fromArray(positions, indices[i] * 3);
      b.fromArray(positions, indices[i + 1] * 3);
      c.fromArray(positions, indices[i + 2] * 3);
      normal.subVectors(b, a).cross(edge.subVectors(c, a));
      if (normal.lengthSq() === 0) degenerateTriangles++;
      normal.normalize();
      const values = [normal.x, normal.y, normal.z, a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z];
      for (let component = 0; component < values.length; component++) {
        invariant(Number.isFinite(Math.fround(values[component])), "A coordinate exceeds the binary STL float32 range");
        bytes.writeFloatLE(values[component], offset + component * 4);
      }
      // STL stores float32 coordinates. Report any additional collapses rather
      // than moving vertices, discarding triangles, or repairing the mesh.
      a.set(bytes.readFloatLE(offset + 12), bytes.readFloatLE(offset + 16), bytes.readFloatLE(offset + 20));
      b.set(bytes.readFloatLE(offset + 24), bytes.readFloatLE(offset + 28), bytes.readFloatLE(offset + 32));
      c.set(bytes.readFloatLE(offset + 36), bytes.readFloatLE(offset + 40), bytes.readFloatLE(offset + 44));
      normal.subVectors(b, a).cross(edge.subVectors(c, a));
      if (normal.lengthSq() === 0) float32CollapsedTriangles++;
      offset += 50;
    }
  }
  invariant(offset === bytes.length && bytes.readUInt32LE(80) === geometry.triangleCount, "Binary STL length or triangle count verification failed");
  return { bytes, degenerateTriangles, float32CollapsedTriangles };
}

export async function exportGeometry(inputPath, { checkOnly = false } = {}) {
  const absoluteInput = path.resolve(inputPath);
  invariant(path.extname(absoluteInput).toLowerCase() === ".glb", "Exporter requires a .glb input");
  const input = await readFile(absoluteInput);
  const geometry = await readGeometry(input);
  const baseReport = {
    inputPath: absoluteInput,
    inputBytes: input.length,
    inputSha256: sha256(input),
    sceneIndex: geometry.sceneIndex,
    meshInstances: geometry.instances.length,
    exportedVertices: geometry.vertexCount,
    triangles: geometry.triangleCount,
    bounds: geometry.bounds,
    geometryOnly: true,
    materialAndTextureFiles: [],
    units: "Source glTF units preserved; no rescaling applied",
    topologyRepaired: false,
    printabilityVerified: false,
  };
  if (checkOnly) return { ...baseReport, checkOnly: true, outputs: [] };
  const obj = encodeObj(geometry);
  const stl = encodeStl(geometry);
  const directory = path.dirname(absoluteInput);
  const objPath = path.join(directory, `${path.parse(absoluteInput).name}.obj`);
  const stlPath = path.join(directory, `${path.parse(absoluteInput).name}.stl`);
  await writeFile(objPath, obj);
  await writeFile(stlPath, stl.bytes);
  // Verify the actual saved files before reporting their hashes and sizes.
  const [savedObj, savedStl] = await Promise.all([readFile(objPath), readFile(stlPath)]);
  const objText = savedObj.toString("utf8");
  invariant(savedObj.equals(obj) && (objText.match(/^v /gm) ?? []).length === geometry.vertexCount && (objText.match(/^f /gm) ?? []).length === geometry.triangleCount, "Saved OBJ verification failed");
  invariant(savedStl.equals(stl.bytes) && savedStl.length === 84 + savedStl.readUInt32LE(80) * 50 && savedStl.readUInt32LE(80) === geometry.triangleCount, "Saved STL verification failed");
  return {
    ...baseReport,
    degenerateTriangles: stl.degenerateTriangles,
    stlDegenerateTrianglesAfterFloat32Encoding: stl.float32CollapsedTriangles,
    outputs: [
      { format: "obj", path: objPath, bytes: savedObj.length, sha256: sha256(savedObj) },
      { format: "stl", path: stlPath, bytes: savedStl.length, sha256: sha256(savedStl) },
    ],
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const checkOnly = args.includes("--check-only");
  const inputs = args.filter((arg) => arg !== "--check-only");
  if (!inputs.length || inputs.some((arg) => arg.startsWith("--"))) {
    console.error("Usage: node scripts/model-samples/export-geometry.mjs [--check-only] <model.glb> [<model.glb> ...]");
    process.exitCode = 1;
  } else {
    try {
      const reports = [];
      for (const input of inputs) reports.push(await exportGeometry(input, { checkOnly }));
      console.log(JSON.stringify(reports, null, 2));
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  }
}
