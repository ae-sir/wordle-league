import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

// Local default "/". Production Pages build uses VITE_BASE=./ (relative assets).
const base = process.env.VITE_BASE || "/";

/**
 * After CI publishes a production index.html (hashed ./assets/*), local
 * `vite` / `vite build` still need the TypeScript entry. Strip bundle tags
 * and ensure /src/main.tsx is the module entry for the Vite pipeline.
 */
function ensureViteEntry(): Plugin {
  return {
    name: "ensure-vite-entry",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        let next = html
          .replace(/<script type="module"[^>]*src="\.\/assets\/[^"]*"[^>]*><\/script>\s*/gi, "")
          .replace(/<link[^>]*href="\.\/assets\/[^"]*\.css"[^>]*>\s*/gi, "");
        if (!/src\/main\.tsx/.test(next)) {
          next = next.replace(
            /<\/body>/i,
            '    <script type="module" src="/src/main.tsx"></script>\n  </body>',
          );
        }
        return next;
      },
    },
  };
}

export default defineConfig({
  base,
  plugins: [ensureViteEntry(), react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
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
