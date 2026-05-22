import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { chmodSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";

const args = process.argv.slice(2);
const shimDir = join(tmpdir(), "pixal3d-pnpm-shim");
const require = createRequire(join(process.cwd(), "package.json"));

if (args[0] === "build") {
  rmSync(join(process.cwd(), ".open-next"), { recursive: true, force: true });
}

patchOpenNextWindowsCopy();
patchOpenNextServerBundleExternals();
patchOpenNextInstallDepsBinCheck();
patchOpenNextMinifierBrokenSymlink();
patchOpenNextMinifierMangle();
patchPgCloudflareStaticRequire();
patchOpenNextPgCloudflareGeneratedDeps();
patchNextInstrumentationForCloudflare();

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
    const externalPackages = [
      ...new Set(packages.filter((entry) => !["proxy-agent", "pg-cloudflare"].includes(entry))),
    ];

    return `external: [${externalPackages.map((entry) => `"${entry}"`).join(", ")}],`;
  });

  if (patched === source) {
    return;
  }

  writeFileSync(serverBundlePath, patched, "utf8");
}

function patchOpenNextInstallDepsBinCheck() {
  let installDepsPath;
  try {
    installDepsPath = require.resolve("@opennextjs/aws/build/installDeps.js");
  } catch {
    return;
  }

  const original = `for (const fileName of fs.readdirSync(tempBinDir)) {
            const symlinkPath = path.join(tempBinDir, fileName);
            const stat = fs.lstatSync(symlinkPath);
            if (stat.isSymbolicLink()) {
                const linkTarget = fs.readlinkSync(symlinkPath);
                const realFilePath = path.resolve(tempBinDir, linkTarget);
                const outputFilePath = path.join(outputBinDir, fileName);
                if (fs.existsSync(outputFilePath)) {
                    fs.unlinkSync(outputFilePath);
                }
                fs.copyFileSync(realFilePath, outputFilePath);
                fs.chmodSync(outputFilePath, "755");
                logger.debug(\`Replaced symlink \${fileName} with actual file\`);
            }
        }`;
  const patched = `if (fs.existsSync(tempBinDir)) {
            fs.mkdirSync(outputBinDir, { recursive: true });
            for (const fileName of fs.readdirSync(tempBinDir)) {
                const symlinkPath = path.join(tempBinDir, fileName);
                const stat = fs.lstatSync(symlinkPath);
                if (stat.isSymbolicLink()) {
                    const linkTarget = fs.readlinkSync(symlinkPath);
                    const realFilePath = path.resolve(tempBinDir, linkTarget);
                    const outputFilePath = path.join(outputBinDir, fileName);
                    if (fs.existsSync(outputFilePath)) {
                        fs.unlinkSync(outputFilePath);
                    }
                    fs.copyFileSync(realFilePath, outputFilePath);
                    fs.chmodSync(outputFilePath, "755");
                    logger.debug(\`Replaced symlink \${fileName} with actual file\`);
                }
            }
        }`;

  const source = readFileSync(installDepsPath, "utf8");
  if (source.includes("fs.existsSync(tempBinDir)")) {
    return;
  }

  if (!source.includes(original)) {
    console.warn("[opennext] Unable to patch dependency bin handling.");
    return;
  }

  writeFileSync(installDepsPath, source.replace(original, patched), "utf8");
}

function patchOpenNextMinifierBrokenSymlink() {
  let minifierPath;
  try {
    minifierPath = require.resolve("@opennextjs/aws/minimize-js.js");
  } catch {
    return;
  }

  const original = "const stat = await fs.stat(filePath);";
  const patched = `let stat;
        try {
            stat = await fs.stat(filePath);
        }
        catch (error) {
            if (error?.code === "ENOENT") {
                continue;
            }
            throw error;
        }`;

  const source = readFileSync(minifierPath, "utf8");
  if (source.includes('error?.code === "ENOENT"')) {
    return;
  }

  if (!source.includes(original)) {
    console.warn("[opennext] Unable to patch minifier broken symlink handling.");
    return;
  }

  writeFileSync(minifierPath, source.replace(original, patched), "utf8");
}

function patchOpenNextMinifierMangle() {
  let minifierPath;
  try {
    minifierPath = require.resolve("@opennextjs/aws/minimize-js.js");
  } catch {
    return;
  }

  const original = "mangle: options.mangle,";
  const patched = "mangle: false,";

  const source = readFileSync(minifierPath, "utf8");
  if (source.includes(patched)) {
    return;
  }

  if (!source.includes(original)) {
    console.warn("[opennext] Unable to patch minifier mangle option.");
    return;
  }

  writeFileSync(minifierPath, source.replace(original, patched), "utf8");
}

function patchPgCloudflareStaticRequire() {
  let pgStreamPath;
  try {
    pgStreamPath = require.resolve("pg/lib/stream.js");
  } catch {
    return;
  }

  const dynamicRequire = `const cloudflareSocketPackage = 'pg-cloudflare'
    const { CloudflareSocket } = require(cloudflareSocketPackage)`;
  const staticRequire = "const { CloudflareSocket } = require('pg-cloudflare')";

  const source = readFileSync(pgStreamPath, "utf8");
  if (source.includes(dynamicRequire)) {
    writeFileSync(pgStreamPath, source.replace(dynamicRequire, staticRequire), "utf8");
    return;
  }

  if (!source.includes(staticRequire)) {
    console.warn("[opennext] Unable to patch pg-cloudflare require.");
  }
}

function patchOpenNextPgCloudflareGeneratedDeps() {
  let bundleServerPath;
  try {
    bundleServerPath = join(
      dirname(require.resolve("@opennextjs/cloudflare")),
      "../cli/build/bundle-server.js",
    );
  } catch {
    return;
  }

  const marker = "function patchPgCloudflareWorkerdPackage(buildOpts, outputPath)";
  const source = readFileSync(bundleServerPath, "utf8");
  if (source.includes(marker)) {
    return;
  }

  const callTarget = 'const outputPath = path.join(outputDir, "server-functions", "default");';
  const callPatched = `${callTarget}
    patchPgCloudflareWorkerdPackage(buildOpts, outputPath);`;

  const helperTarget = "/**\n * Bundle the Open Next server.\n */";
  const helper = `function patchPgCloudflareWorkerdPackage(buildOpts, outputPath) {
    const sourceCandidates = [
        path.join(buildOpts.appPath, "node_modules", "pg-cloudflare", "dist", "index.js"),
        path.join(buildOpts.monorepoRoot ?? buildOpts.appPath, "node_modules", "pg-cloudflare", "dist", "index.js"),
    ];
    const sourceEntry = sourceCandidates.find((candidate) => fs.existsSync(candidate));
    const nodeModulesDir = path.join(outputPath, "node_modules");
    if (!sourceEntry || !fs.existsSync(nodeModulesDir)) {
        return;
    }
    const packageDirs = [];
    const stack = [nodeModulesDir];
    while (stack.length > 0) {
        const current = stack.pop();
        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
            if (!entry.isDirectory()) {
                continue;
            }
            const fullPath = path.join(current, entry.name);
            if (entry.name === "pg-cloudflare" && fs.existsSync(path.join(fullPath, "package.json"))) {
                packageDirs.push(fullPath);
                continue;
            }
            if (entry.name === ".pnpm" || entry.name === "node_modules" || current.includes(\`\${path.sep}.pnpm\${path.sep}\`)) {
                stack.push(fullPath);
            }
        }
    }
    for (const packageDir of packageDirs) {
        const distDir = path.join(packageDir, "dist");
        const targetEntry = path.join(distDir, "index.js");
        if (fs.existsSync(targetEntry)) {
            continue;
        }
        fs.mkdirSync(distDir, { recursive: true });
        fs.copyFileSync(sourceEntry, targetEntry);
    }
}

${helperTarget}`;

  const patched = source.replace(callTarget, callPatched).replace(helperTarget, helper);

  if (patched === source || !patched.includes(marker)) {
    console.warn("[opennext] Unable to patch pg-cloudflare generated dependencies.");
    return;
  }

  writeFileSync(bundleServerPath, patched, "utf8");
}

function patchNextInstrumentationForCloudflare() {
  const files = [];

  try {
    files.push(
      require.resolve(
        "next/dist/server/lib/router-utils/instrumentation-globals.external.js",
      ),
    );
  } catch {
    // Ignore if Next changes this internal path.
  }

  try {
    files.push(
      require.resolve(
        "next/dist/esm/server/lib/router-utils/instrumentation-globals.external.js",
      ),
    );
  } catch {
    // Ignore if Next changes this internal path.
  }

  for (const filePath of files) {
    const source = readFileSync(filePath, "utf8");

    if (source.includes("Skipping instrumentation hook in Cloudflare runtime")) {
      continue;
    }

    const cjsOriginal = `if ((0, _iserror.default)(err) && err.code !== 'ENOENT' && err.code !== 'MODULE_NOT_FOUND' && err.code !== 'ERR_MODULE_NOT_FOUND') {
            throw err;
        }`;
    const cjsPatched = `if (typeof WebSocketPair !== "undefined") {
            console.warn("[next] Skipping instrumentation hook in Cloudflare runtime:", err?.message ?? err);
            return;
        }
        if ((0, _iserror.default)(err) && err.code !== 'ENOENT' && err.code !== 'MODULE_NOT_FOUND' && err.code !== 'ERR_MODULE_NOT_FOUND') {
            throw err;
        }`;

    const esmOriginal = `if (isError(err) && err.code !== 'ENOENT' && err.code !== 'MODULE_NOT_FOUND' && err.code !== 'ERR_MODULE_NOT_FOUND') {
            throw err;
        }`;
    const esmPatched = `if (typeof WebSocketPair !== "undefined") {
            console.warn("[next] Skipping instrumentation hook in Cloudflare runtime:", err?.message ?? err);
            return;
        }
        if (isError(err) && err.code !== 'ENOENT' && err.code !== 'MODULE_NOT_FOUND' && err.code !== 'ERR_MODULE_NOT_FOUND') {
            throw err;
        }`;

    const patched = source.replace(cjsOriginal, cjsPatched).replace(esmOriginal, esmPatched);

    if (patched === source) {
      console.warn("[opennext] Unable to patch Next instrumentation handling.");
      continue;
    }

    writeFileSync(filePath, patched, "utf8");
  }
}
