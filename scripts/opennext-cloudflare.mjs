import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";

const args = process.argv.slice(2);
const shimDir = join(tmpdir(), "pixal3d-pnpm-shim");
const require = createRequire(join(process.cwd(), "package.json"));

patchOpenNextWindowsCopy();
patchOpenNextServerBundleExternals();
patchPgCloudflareStaticRequire();

mkdirSync(shimDir, { recursive: true });
writeFileSync(join(shimDir, "pnpm.cmd"), "@echo off\r\ncorepack pnpm %*\r\n", "utf8");

const pnpmShim = join(shimDir, "pnpm");
writeFileSync(pnpmShim, "#!/bin/sh\nexec corepack pnpm \"$@\"\n", "utf8");
try {
  chmodSync(pnpmShim, 0o755);
} catch {
  // Windows does not need chmod.
}

const env = {
  ...process.env,
  PATH: `${shimDir}${delimiter}${process.env.PATH ?? ""}`,
};

const child = spawn(
  "corepack",
  ["pnpm", "exec", "opennextjs-cloudflare", ...args],
  {
    cwd: process.cwd(),
    env,
    shell: process.platform === "win32",
    stdio: "inherit",
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

function patchOpenNextWindowsCopy() {
  if (process.platform !== "win32") {
    return;
  }

  let helperPath;
  try {
    helperPath = require.resolve("@opennextjs/aws/build/helper.js");
  } catch {
    return;
  }

  const original = "fs.cpSync(options.tempBuildDir, buildDir, { recursive: true });";
  const patched = `for (const entry of fs.readdirSync(options.tempBuildDir, { withFileTypes: true })) {
        const sourcePath = path.join(options.tempBuildDir, entry.name);
        const targetPath = path.join(buildDir, entry.name);
        if (entry.isDirectory()) {
            fs.cpSync(sourcePath, targetPath, { recursive: true });
        }
        else {
            fs.copyFileSync(sourcePath, targetPath);
        }
    }`;

  const source = readFileSync(helperPath, "utf8");
  if (!source.includes(original) || source.includes("sourcePath = path.join(options.tempBuildDir")) {
    return;
  }

  writeFileSync(helperPath, source.replace(original, patched), "utf8");
}

function patchOpenNextServerBundleExternals() {
  let serverBundlePath;
  try {
    serverBundlePath = require.resolve("@opennextjs/aws/build/createServerBundle.js");
  } catch {
    return;
  }

  const source = readFileSync(serverBundlePath, "utf8");
  const patched = source.replace(/external:\s*\[[^\]]+\],/, (match) => {
    const packages = [...match.matchAll(/"([^"]+)"/g)].map((entry) => entry[1]);
    const externalPackages = [...new Set(packages.filter((entry) => entry !== "proxy-agent"))];

    if (!externalPackages.includes("pg-cloudflare")) {
      externalPackages.push("pg-cloudflare");
    }

    return `external: [${externalPackages.map((entry) => `"${entry}"`).join(", ")}],`;
  });

  if (patched === source) {
    console.warn("[opennext] Unable to patch server bundle externals.");
    return;
  }

  writeFileSync(serverBundlePath, patched, "utf8");
}

function patchPgCloudflareStaticRequire() {
  let pgStreamPath;
  try {
    pgStreamPath = require.resolve("pg/lib/stream.js");
  } catch {
    return;
  }

  const original = "const { CloudflareSocket } = require('pg-cloudflare')";
  const patched = `const cloudflareSocketPackage = 'pg-cloudflare'
    const { CloudflareSocket } = require(cloudflareSocketPackage)`;

  const source = readFileSync(pgStreamPath, "utf8");
  if (source.includes(patched)) {
    return;
  }

  if (!source.includes(original)) {
    console.warn("[opennext] Unable to patch pg-cloudflare require.");
    return;
  }

  writeFileSync(pgStreamPath, source.replace(original, patched), "utf8");
}
