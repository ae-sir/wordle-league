import { defineConfig } from "vitest/config";

// Local demo defaults to "/". For a GH Pages-shaped build later:
//   VITE_BASE=/wordle-league/ npm run build
// Do not enable Pages deploy from this branch without explicit instruction.
const base = process.env.VITE_BASE || "/";

export default defineConfig({
  base,
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
    strictPort: true,
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
