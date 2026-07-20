#!/usr/bin/env node
/**
 * Side-by-side local demo (does NOT deploy):
 *   OLD — snapshot of origin/main (pre-migration static site) → :8780
 *   NEW — this branch Vite app → :5173
 *
 * Old files are extracted to a temp dir; legacy/ is not kept in the repo.
 */
import { spawn, execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { networkInterfaces } from "node:os";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tmp = mkdtempSync(join(tmpdir(), "wordle-league-old-"));

function lanIPs() {
  const ips = [];
  for (const list of Object.values(networkInterfaces())) {
    for (const net of list ?? []) {
      if (net.family === "IPv4" && !net.internal) ips.push(net.address);
    }
  }
  return ips;
}

function run(cmd, args, name) {
  const child = spawn(cmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  child.on("exit", (code) => {
    console.error(`[${name}] exited ${code}`);
    cleanup();
    process.exit(code ?? 1);
  });
  return child;
}

function cleanup() {
  try {
    rmSync(tmp, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

try {
  execSync(`git archive origin/main | tar -x -C "${tmp}"`, {
    cwd: root,
    stdio: "inherit",
    shell: true,
  });
} catch (e) {
  console.error("Failed to extract origin/main for the old app. Fetch main first?");
  cleanup();
  process.exit(1);
}

const ips = lanIPs();
console.log(`
╔══════════════════════════════════════════════════════════════╗
║  Wordle League — dual compare (local only, no deploy)        ║
╠══════════════════════════════════════════════════════════════╣
║  OLD (origin/main static):  http://127.0.0.1:8780/           ║
║  NEW (this branch Vite):    http://127.0.0.1:5173/           ║
${ips
  .map(
    (ip) =>
      `║  OLD LAN:  http://${ip}:8780/`.padEnd(63) +
      "║\n" +
      `║  NEW LAN:  http://${ip}:5173/`.padEnd(63) +
      "║",
  )
  .join("\n")}
║  Old extract: ${tmp.slice(0, 40)}…
╠══════════════════════════════════════════════════════════════╣
║  Ctrl+C stops both.                                          ║
╚══════════════════════════════════════════════════════════════╝
`);

const legacy = run(
  "npx",
  ["--yes", "serve", tmp, "-l", "8780", "--no-port-switching", "--cors"],
  "old",
);
const vite = run("npx", ["vite", "--host", "0.0.0.0", "--port", "5173"], "new");

function shutdown() {
  legacy.kill("SIGTERM");
  vite.kill("SIGTERM");
  cleanup();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
