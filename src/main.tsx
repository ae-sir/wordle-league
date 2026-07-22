import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Linked as plain runtime strings (not static <link> tags in index.html) so Vite's
// HTML asset pipeline never fingerprints these — they must keep their stable public/
// filenames, since manifest.json's own icon paths are relative to it on disk.
function linkPwaAssets() {
  const base = import.meta.env.BASE_URL;
  const add = (rel: string, href: string) => {
    const link = document.createElement("link");
    link.rel = rel;
    link.href = href;
    document.head.appendChild(link);
  };
  add("manifest", `${base}manifest.json`);
  add("icon", `${base}icon-192.png`);
  add("apple-touch-icon", `${base}icon-192.png`);
}
linkPwaAssets();

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
