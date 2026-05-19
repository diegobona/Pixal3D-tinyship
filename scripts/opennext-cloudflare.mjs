import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";

const args = process.argv.slice(2);
const shimDir = join(tmpdir(), "pixal3d-pnpm-shim");
const require = createRequire(join(process.cwd(), "package.json"));

patchOpenNextWindowsCopy();

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
