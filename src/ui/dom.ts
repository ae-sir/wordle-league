export function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[c] ?? c;
  });
}

export function setVisible(el: HTMLElement, visible: boolean): void {
  el.style.display = visible ? "" : "none";
  if (visible && el.style.display === "") {
    // restore block for elements that used style=display:none in markup
    if (getComputedStyle(el).display === "none") {
      el.style.display = "block";
    }
  }
}

export function showBlock(el: HTMLElement, show: boolean): void {
  el.style.display = show ? "block" : "none";
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
