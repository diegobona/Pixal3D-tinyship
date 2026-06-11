import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const rootDir = path.resolve(import.meta.dirname, "..");
const publicDir = path.join(rootDir, "apps", "next-app", "public");
const sourceSvgPath = path.join(publicDir, "logo.svg");

const pngTargets = [
  { fileName: "favicon-16x16.png", size: 16 },
  { fileName: "favicon-32x32.png", size: 32 },
  { fileName: "apple-touch-icon.png", size: 180 },
  { fileName: "android-chrome-192x192.png", size: 192 },
  { fileName: "android-chrome-512x512.png", size: 512 },
];

function pngToIco(pngBuffer, width, height) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const entry = Buffer.alloc(16);
  entry.writeUInt8(width >= 256 ? 0 : width, 0);
  entry.writeUInt8(height >= 256 ? 0 : height, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(pngBuffer.length, 8);
  entry.writeUInt32LE(header.length + entry.length, 12);

  return Buffer.concat([header, entry, pngBuffer]);
}

async function main() {
  const sourceSvg = await fs.readFile(sourceSvgPath);

  for (const target of pngTargets) {
    const outputPath = path.join(publicDir, target.fileName);
    const pngBuffer = await sharp(sourceSvg)
      .resize(target.size, target.size)
      .png()
      .toBuffer();

    await fs.writeFile(outputPath, pngBuffer);
    console.log(`generated ${target.fileName}`);
  }

  const faviconPng = await sharp(sourceSvg)
    .resize(32, 32)
    .png()
    .toBuffer();

  const faviconIco = pngToIco(faviconPng, 32, 32);
  await fs.writeFile(path.join(publicDir, "favicon.ico"), faviconIco);
  console.log("generated favicon.ico");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
