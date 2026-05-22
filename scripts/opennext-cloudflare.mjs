import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { chmodSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";

const args = process.argv.slice(2);
const shimDir = join(tmpdir(), "pixal3d-pnpm-shim");
const require = createRequire(join(process.cwd(), "package.json"));
const pgCloudflareDistIndexFallback = `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudflareSocket = void 0;
const { EventEmitter } = require("events");
class CloudflareSocket extends EventEmitter {
  constructor(ssl) {
    super();
    this.ssl = ssl;
    this.writable = false;
    this.destroyed = false;
    this._upgrading = false;
    this._upgraded = false;
    this._cfSocket = null;
    this._cfWriter = null;
    this._cfReader = null;
  }
  setNoDelay() {
    return this;
  }
  setKeepAlive() {
    return this;
  }
  ref() {
    return this;
  }
  unref() {
    return this;
  }
  async connect(port, host, connectListener) {
    try {
      if (connectListener) {
        this.once("connect", connectListener);
      }
      const { connect } = await import("cloudflare:sockets");
      const options = this.ssl ? { secureTransport: "starttls" } : {};
      this._cfSocket = connect(String(host) + ":" + String(port), options);
      this._cfWriter = this._cfSocket.writable.getWriter();
      this._addClosedHandler();
      this._cfReader = this._cfSocket.readable.getReader();
      if (this.ssl) {
        this._listenOnce().catch((error) => this.emit("error", error));
      } else {
        this._listen().catch((error) => this.emit("error", error));
      }
      await this._cfWriter.ready;
      this.writable = true;
      this.emit("connect");
      return this;
    } catch (error) {
      this.emit("error", error);
    }
  }
  async _listen() {
    while (true) {
      const { done, value } = await this._cfReader.read();
      if (done) {
        break;
      }
      this.emit("data", Buffer.from(value));
    }
  }
  async _listenOnce() {
    const { value } = await this._cfReader.read();
    this.emit("data", Buffer.from(value));
  }
  write(data, encoding = "utf8", callback = () => {}) {
    if (data.length === 0) {
      callback();
      return true;
    }
    const payload = typeof data === "string" ? Buffer.from(data, encoding) : data;
    this._cfWriter.write(payload).then(
      () => callback(),
      (error) => callback(error),
    );
    return true;
  }
  end(data = Buffer.alloc(0), encoding = "utf8", callback = () => {}) {
    this.write(data, encoding, (error) => {
      this._cfSocket.close();
      callback(error);
    });
    return this;
  }
  destroy(reason) {
    this.destroyed = true;
    return this.end();
  }
  startTls(options) {
    if (this._upgraded) {
      this.emit("error", "Cannot call startTls() more than once on a socket");
      return;
    }
    this._cfWriter.releaseLock();
    this._cfReader.releaseLock();
    this._upgrading = true;
    this._cfSocket = this._cfSocket.startTls(options);
    this._cfWriter = this._cfSocket.writable.getWriter();
    this._cfReader = this._cfSocket.readable.getReader();
    this._addClosedHandler();
    this._listen().catch((error) => this.emit("error", error));
  }
  _addClosedHandler() {
    this._cfSocket.closed.then(() => {
      if (!this._upgrading) {
        this._cfSocket = null;
        this.emit("close");
      } else {
        this._upgrading = false;
        this._upgraded = true;
      }
    }).catch((error) => this.emit("error", error));
  }
}
exports.CloudflareSocket = CloudflareSocket;
`;

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
  const versionMarker = "pixal3d-pg-cloudflare-fallback-v3";
  const source = readFileSync(bundleServerPath, "utf8");
  if (source.includes(versionMarker)) {
    return;
  }

  const callTarget = 'const outputPath = path.join(outputDir, "server-functions", "default");';
  const callPatched = `${callTarget}
    patchPgCloudflareWorkerdPackage(buildOpts, outputPath);`;

  const helperTarget = "/**\n * Bundle the Open Next server.\n */";
  const helper = `// ${versionMarker}
function patchPgCloudflareWorkerdPackage(buildOpts, outputPath) {
    const fallbackEntry = ${JSON.stringify(pgCloudflareDistIndexFallback)};
    const sourceEntry = findPgCloudflareDistIndex(buildOpts);
    const nodeModulesDir = path.join(outputPath, "node_modules");
    if (!fs.existsSync(nodeModulesDir)) {
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
            stack.push(fullPath);
        }
    }
    for (const packageDir of packageDirs) {
        const distDir = path.join(packageDir, "dist");
        const targetEntry = path.join(distDir, "index.js");
        if (fs.existsSync(targetEntry)) {
            continue;
        }
        fs.mkdirSync(distDir, { recursive: true });
        if (sourceEntry) {
            fs.copyFileSync(sourceEntry, targetEntry);
        }
        else {
            fs.writeFileSync(targetEntry, fallbackEntry, "utf8");
        }
    }
}

function findPgCloudflareDistIndex(buildOpts) {
    const nodeModulesDirs = [
        path.join(buildOpts.appPath, "node_modules"),
        path.join(buildOpts.monorepoRoot ?? buildOpts.appPath, "node_modules"),
    ];
    const directCandidates = nodeModulesDirs.map((nodeModulesDir) => path.join(nodeModulesDir, "pg-cloudflare", "dist", "index.js"));
    for (const candidate of directCandidates) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }
    for (const nodeModulesDir of nodeModulesDirs) {
        const found = findPgCloudflareDistIndexUnder(path.join(nodeModulesDir, ".pnpm"));
        if (found) {
            return found;
        }
    }
}

function findPgCloudflareDistIndexUnder(startDir) {
    if (!fs.existsSync(startDir)) {
        return undefined;
    }
    const stack = [startDir];
    while (stack.length > 0) {
        const current = stack.pop();
        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
            const fullPath = path.join(current, entry.name);
            if (entry.isFile() && entry.name === "index.js" && current.endsWith(\`\${path.sep}pg-cloudflare\${path.sep}dist\`)) {
                return fullPath;
            }
            if (entry.isDirectory()) {
                stack.push(fullPath);
            }
        }
    }
    return undefined;
}

${helperTarget}`;

  let patched = source;
  if (!patched.includes("patchPgCloudflareWorkerdPackage(buildOpts, outputPath);")) {
    patched = patched.replace(callTarget, callPatched);
  }

  if (patched.includes(marker)) {
    const helperStart = patched.indexOf(marker);
    const helperEnd = patched.indexOf(helperTarget, helperStart);
    if (helperStart === -1 || helperEnd === -1) {
      console.warn("[opennext] Unable to refresh pg-cloudflare generated dependency patch.");
      return;
    }
    patched = `${patched.slice(0, helperStart)}${helper.replace(helperTarget, "")}${patched.slice(helperEnd)}`;
  } else {
    patched = patched.replace(helperTarget, helper);
  }

  if (patched === source || !patched.includes(versionMarker)) {
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
