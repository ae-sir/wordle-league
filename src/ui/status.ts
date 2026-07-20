import { $ } from "./dom";

let statusTimer: ReturnType<typeof setTimeout> | null = null;

export function showStatus(msg: string, type: "ok" | "error" | "saving" | ""): void {
  const el = $("status");
  el.textContent = msg;
  el.className = "status-line" + (type ? ` ${type}` : "");
  if (statusTimer) clearTimeout(statusTimer);
  if (type === "ok") {
    statusTimer = setTimeout(() => {
      el.textContent = "";
      el.className = "status-line";
    }, 4000);
  }
}
