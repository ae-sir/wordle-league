#!/usr/bin/env node
/**
 * Side-by-side local demo:
 *   OLD (legacy static)  → http://<lan>:8780/
 *   NEW (Vite dev)       → http://<lan>:5173/
 *
 * Does NOT deploy. Does NOT touch GitHub Pages.
 * Both use different origins → separate localStorage (seed via Backup import for parity checks).
 */
import { spawn } from "node:child_process";
import { networkInterfaces } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

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
    process.exit(code ?? 1);
  });
  return child;
}

const ips = lanIPs();
console.log(`
╔══════════════════════════════════════════════════════════════╗
║  Wordle League — dual compare (local only, no deploy)        ║
╠══════════════════════════════════════════════════════════════╣
║  OLD (legacy):  http://127.0.0.1:8780/                       ║
║  NEW (vite):    http://127.0.0.1:5173/                       ║
${ips.map((ip) => `║  OLD LAN:       http://${ip}:8780/`.padEnd(63) + "║\n" + `║  NEW LAN:       http://${ip}:5173/`.padEnd(63) + "║").join("\n")}
╠══════════════════════════════════════════════════════════════╣
║  Checklist: docs/COMPARE.md                                  ║
║  Ctrl+C stops both.                                          ║
╚══════════════════════════════════════════════════════════════╝
`);

const legacy = run(
  "npx",
  ["--yes", "serve", "legacy", "-l", "8780", "--no-port-switching", "--cors"],
  "legacy",
);
const vite = run("npx", ["vite", "--host", "0.0.0.0", "--port", "5173"], "vite");

function shutdown() {
  legacy.kill("SIGTERM");
  vite.kill("SIGTERM");
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
