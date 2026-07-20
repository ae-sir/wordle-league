import "./styles/app.css";
import { pointsFor } from "./domain/points";
import {
  getDailyEntries,
  getDailyWinners,
  getDates,
  getPlayers,
  getSeason,
} from "./domain/season";
import { deleteEntry, mergeEntries, upsertEntry } from "./domain/upsert";
import type { BulkRow, DateLocale, Entry, Guesses } from "./domain/types";
import { formatDate, todayISO } from "./parse/dates";
import { analyzePaste } from "./parse/paste";
import { buildBackup, parseBackupFile } from "./storage/backup";
import {
  loadDateLocale,
  loadEntries,
  saveDateLocale,
  saveEntries,
} from "./storage/local";
import { $, downloadBlob, escapeHtml, showBlock } from "./ui/dom";
import { renderShareCanvas } from "./ui/shareCanvas";
import { showStatus } from "./ui/status";

// ---------- State ----------
let entries: Entry[] = [];
let activeTab = "daily";
let addMode: "paste" | "manual" = "paste";
let selectedDate: string | null = null;
let bulkRows: BulkRow[] | null = null;
let singleParsed: { guesses: Guesses } | null = null;
let manualGuesses: Guesses | "" = "";
let pendingImport: Entry[] | null = null;
let dateLocale: DateLocale = "ddmm";
/** Pending name choice when replace name differs only by casing / spelling */
let pendingNameMode: "keep" | "update" = "keep";

function getActiveDate(): string | null {
  const dates = getDates(entries);
  return selectedDate ?? dates[0] ?? null;
}

function persist(successMsg: string): void {
  const ok = saveEntries(entries);
  showStatus(
    ok ? successMsg : "Save failed — your browser may be blocking storage.",
    ok ? "ok" : "error",
  );
  renderAll();
}

function setTab(tab: string): void {
  activeTab = tab;
  document.querySelectorAll(".tab").forEach((b) => {
    const btn = b as HTMLButtonElement;
    const on = btn.dataset.tab === tab;
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-selected", on ? "true" : "false");
  });
  document.querySelectorAll(".tab-panel").forEach((p) => {
    p.classList.toggle("active", p.id === "tab-" + tab);
  });
  if (tab === "share") {
    const canvas = $("recapCanvas") as HTMLCanvasElement;
    renderShareCanvas(canvas, entries, getActiveDate());
  }
}

function renderTitleTiles(): void {
  const el = $("titleTiles");
  el.replaceChildren();
  for (const ch of "LEAGUE") {
    const d = document.createElement("div");
    d.className = "letter-tile";
    d.textContent = ch;
    el.appendChild(d);
  }
}

function renderDateSelect(): void {
  const dates = getDates(entries);
  const sel = $("dateSelect") as HTMLSelectElement;
  sel.replaceChildren();
  for (const d of dates) {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = formatDate(d);
    sel.appendChild(opt);
  }
  const active = getActiveDate();
  if (active) sel.value = active;
}

function renderDaily(): void {
  const dates = getDates(entries);
  showBlock($("dailyEmpty"), dates.length === 0);
  showBlock($("dailyContent"), dates.length > 0);
  if (dates.length === 0) return;

  renderDateSelect();
  const activeDate = getActiveDate();
  if (!activeDate) return;
  const daily = getDailyEntries(entries, activeDate);
  const winners = getDailyWinners(daily);
  $("dailyCount").textContent = `${daily.length} played`;

  const list = $("dailyList");
  list.replaceChildren();
  for (const e of daily) {
    const won = winners.has(e.player);
    const card = document.createElement("div");
    card.className = "result-card" + (won ? " winner" : "");
    card.innerHTML = `
      <div class="guess-badge ${e.guesses === "X" ? "fail" : ""}">${e.guesses === "X" ? "X" : e.guesses + "/6"}</div>
      <div style="flex:1">
        <div class="result-name">${escapeHtml(e.player)} ${won ? '<span class="win-tag">WINNER</span>' : ""}</div>
        <div class="result-points">${pointsFor(e.guesses)} pts</div>
      </div>
      <button class="result-delete" type="button" data-delete="${escapeHtml(e.id)}" aria-label="Delete entry for ${escapeHtml(e.player)}">✕</button>
    `;
    list.appendChild(card);
  }
}

function renderSeason(): void {
  const season = getSeason(entries);
  showBlock($("seasonEmpty"), season.length === 0);
  showBlock($("seasonContent"), season.length > 0);
  if (season.length === 0) return;

  const list = $("seasonList");
  list.replaceChildren();
  season.forEach((m, i) => {
    const row = document.createElement("div");
    row.className = "season-row" + (i === 0 ? " first" : "");
    row.innerHTML = `
      <span class="rank">${i + 1}</span>
      <span class="name">${escapeHtml(m.player)}</span>
      <span class="pts">${m.points}</span>
      <span class="stat">${m.wins}</span>
      <span class="stat">${m.avg}</span>
      <span class="stat">${m.games}</span>
    `;
    list.appendChild(row);
  });
}

function renderPlayerChips(
  containerId: string,
  inputEl: HTMLInputElement,
  currentValue: string,
): void {
  const container = $(containerId);
  container.replaceChildren();
  for (const p of getPlayers(entries)) {
    const chip = document.createElement("button");
    chip.className = "chip" + (p === currentValue ? " active" : "");
    chip.textContent = p;
    chip.type = "button";
    chip.addEventListener("click", () => {
      inputEl.value = p;
      renderPlayerChips(containerId, inputEl, p);
    });
    container.appendChild(chip);
  }
}

function renderManualGuessGrid(selected: string): void {
  const grid = $("manualGuessGrid");
  grid.replaceChildren();
  for (const g of ["1", "2", "3", "4", "5", "6", "X"] as const) {
    const btn = document.createElement("button");
    btn.className = "guess-btn" + (g === selected ? " active" : "");
    btn.textContent = g;
    btn.type = "button";
    btn.addEventListener("click", () => {
      manualGuesses = g;
      renderManualGuessGrid(g);
    });
    grid.appendChild(btn);
  }
}

function renderAll(): void {
  renderDaily();
  renderSeason();
  renderPlayerChips(
    "singlePlayerChips",
    $("singlePlayer") as HTMLInputElement,
    ($("singlePlayer") as HTMLInputElement).value,
  );
  renderPlayerChips(
    "manualPlayerChips",
    $("manualPlayer") as HTMLInputElement,
    ($("manualPlayer") as HTMLInputElement).value,
  );
  showBlock($("shareEmpty"), entries.length === 0);
  showBlock($("shareContent"), entries.length > 0);
  if (activeTab === "share" && entries.length > 0) {
    renderShareCanvas($("recapCanvas") as HTMLCanvasElement, entries, getActiveDate());
  }
}

function resetManualForm(): void {
  ($("manualPlayer") as HTMLInputElement).value = "";
  manualGuesses = "";
  ($("manualDate") as HTMLInputElement).value = todayISO();
  showBlock($("manualReplace"), false);
  pendingNameMode = "keep";
  renderManualGuessGrid("");
  renderPlayerChips("manualPlayerChips", $("manualPlayer") as HTMLInputElement, "");
}

function resetPasteMode(): void {
  ($("pasteBox") as HTMLTextAreaElement).value = "";
  showBlock($("singleFallback"), false);
  showBlock($("bulkPreview"), false);
  showBlock($("pasteError"), false);
  singleParsed = null;
  bulkRows = null;
  pendingNameMode = "keep";
}

function saveManual(allowReplace: boolean): void {
  const player = ($("manualPlayer") as HTMLInputElement).value.trim();
  const date = ($("manualDate") as HTMLInputElement).value;
  if (!player || !manualGuesses || !date) {
    showStatus("Fill player, guesses, and date.", "error");
    return;
  }
  const result = upsertEntry(
    entries,
    { player, date, guesses: manualGuesses },
    allowReplace,
    pendingNameMode,
  );
  if (result.needsConfirm) {
    const box = $("manualReplace");
    const g =
      result.existing.guesses === "X" ? "X/6" : result.existing.guesses + "/6";
    const nameDiffers =
      result.existing.player.toLowerCase() === player.toLowerCase() &&
      result.existing.player !== player;
    box.innerHTML = `
      <div><strong>${escapeHtml(result.existing.player)}</strong> already has a score for ${formatDate(result.existing.date)} (${g}). Replace it?</div>
      ${
        nameDiffers
          ? `<label class="dim tiny" style="display:block;margin-top:8px">
              <input type="checkbox" id="manualUpdateName" /> Update display name to “${escapeHtml(player)}”
            </label>`
          : ""
      }
      <div class="actions">
        <button class="btn-yes" type="button" id="manualReplaceYes">Replace</button>
        <button class="btn-no" type="button" id="manualReplaceNo">Cancel</button>
      </div>
    `;
    showBlock(box, true);
    $("manualReplaceYes").addEventListener("click", () => {
      const cb = document.getElementById("manualUpdateName") as HTMLInputElement | null;
      pendingNameMode = cb?.checked ? "update" : "keep";
      saveManual(true);
    });
    $("manualReplaceNo").addEventListener("click", () => {
      showBlock(box, false);
      pendingNameMode = "keep";
    });
    return;
  }
  entries = result.entries;
  persist(`Saved: ${player} — ${manualGuesses === "X" ? "X/6" : manualGuesses + "/6"}`);
  resetManualForm();
  selectedDate = date;
  setTab("daily");
}

function handlePasteInput(): void {
  const text = ($("pasteBox") as HTMLTextAreaElement).value;
  showBlock($("pasteError"), false);
  showBlock($("singleFallback"), false);
  showBlock($("bulkPreview"), false);

  const result = analyzePaste(text, entries, dateLocale);
  if (result.kind === "empty") return;

  if (result.kind === "bulk") {
    bulkRows = result.rows;
    renderBulkPreview();
    return;
  }

  if (result.kind === "single") {
    singleParsed = { guesses: result.guesses };
    $("singleFoundBadge").textContent =
      `Found: ${result.guesses === "X" ? "X/6" : result.guesses + "/6"} — ${pointsFor(result.guesses)} pts`;
    ($("singleDate") as HTMLInputElement).value = todayISO();
    renderPlayerChips("singlePlayerChips", $("singlePlayer") as HTMLInputElement, "");
    showBlock($("singleFallback"), true);
    return;
  }

  $("pasteError").textContent = result.message;
  showBlock($("pasteError"), true);
}

function renderBulkPreview(): void {
  if (!bulkRows) return;
  showBlock($("bulkPreview"), true);
  $("bulkSummary").textContent =
    `Found ${bulkRows.length} result${bulkRows.length > 1 ? "s" : ""} — untick any you don't want.`;
  const list = $("bulkList");
  list.replaceChildren();
  bulkRows.forEach((r, i) => {
    const row = document.createElement("label");
    row.className = "checkbox-row" + (r.include ? " included" : "");
    row.innerHTML = `
      <input type="checkbox" ${r.include ? "checked" : ""} data-bulk-toggle="${i}" />
      <div style="flex:1">
        <span style="font-weight:700">${escapeHtml(r.player)}</span>
        <span class="dim tiny" style="margin-left:8px">${formatDate(r.date)} · ${r.guesses === "X" ? "X/6" : r.guesses + "/6"} · ${pointsFor(r.guesses)} pts</span>
        ${r.replaces ? '<span class="replaces">replaces existing</span>' : ""}
      </div>
    `;
    list.appendChild(row);
  });
}

function saveBulk(): void {
  if (!bulkRows) return;
  const toSave = bulkRows.filter((r) => r.include);
  if (!toSave.length) {
    showStatus("Select at least one result to import.", "error");
    return;
  }
  for (const r of toSave) {
    const result = upsertEntry(
      entries,
      { player: r.player, date: r.date, guesses: r.guesses },
      true,
      "keep",
    );
    if (!result.needsConfirm) entries = result.entries;
  }
  persist(`Imported ${toSave.length} score${toSave.length > 1 ? "s" : ""}`);
  resetPasteMode();
  selectedDate = toSave[0]?.date ?? null;
  setTab("daily");
}

function saveSingle(allowReplace: boolean): void {
  const player = ($("singlePlayer") as HTMLInputElement).value.trim();
  const date = ($("singleDate") as HTMLInputElement).value;
  if (!player || !date || !singleParsed) {
    showStatus("Fill player and date for the found result.", "error");
    return;
  }
  const result = upsertEntry(
    entries,
    { player, date, guesses: singleParsed.guesses },
    allowReplace,
    pendingNameMode,
  );
  if (result.needsConfirm) {
    const nameDiffers =
      result.existing.player.toLowerCase() === player.toLowerCase() &&
      result.existing.player !== player;
    let msg = `${result.existing.player} already has a score for ${formatDate(result.existing.date)}. Replace it?`;
    if (nameDiffers) {
      msg += `\n\nAlso update display name to “${player}”? (OK = yes, Cancel = keep “${result.existing.player}” then confirm replace…)`;
      // Two-step: first ask name, then replace
      const updateName = window.confirm(
        `${result.existing.player} already has a score for ${formatDate(result.existing.date)}.\n\nUpdate display name to “${player}” when replacing?`,
      );
      pendingNameMode = updateName ? "update" : "keep";
      if (!window.confirm(`Replace existing score for ${formatDate(result.existing.date)}?`)) {
        pendingNameMode = "keep";
        return;
      }
      return saveSingle(true);
    }
    if (!window.confirm(msg)) return;
    pendingNameMode = "keep";
    return saveSingle(true);
  }
  entries = result.entries;
  persist(
    `Saved: ${player} — ${singleParsed.guesses === "X" ? "X/6" : singleParsed.guesses + "/6"}`,
  );
  resetPasteMode();
  selectedDate = date;
  setTab("daily");
}

async function shareRecap(): Promise<void> {
  const canvas = $("recapCanvas") as HTMLCanvasElement;
  canvas.toBlob(async (blob) => {
    if (!blob) {
      showStatus("Could not generate the image.", "error");
      return;
    }
    const filename = `wordle-league-${todayISO()}.png`;
    const file = new File([blob], filename, { type: "image/png" });
    const shareNote = $("shareNote");
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        const d = getActiveDate();
        await navigator.share({
          files: [file],
          title: "Wordle League",
          text: `Wordle League — ${d ? formatDate(d) : ""}`,
        });
        showBlock(shareNote, false);
      } catch {
        // user cancelled
      }
    } else {
      downloadBlob(blob, filename);
      shareNote.textContent =
        "Your browser can't share images directly — downloaded instead. Attach it in WhatsApp yourself.";
      showBlock(shareNote, true);
    }
  }, "image/png");
}

function downloadRecap(): void {
  const canvas = $("recapCanvas") as HTMLCanvasElement;
  canvas.toBlob((blob) => {
    if (!blob) return;
    downloadBlob(blob, `wordle-league-${todayISO()}.png`);
  }, "image/png");
}

function exportBackup(): void {
  const payload = buildBackup(entries);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  downloadBlob(blob, `wordle-league-backup-${todayISO()}.json`);
  showStatus("Backup downloaded", "ok");
}

function handleImportFile(file: File | undefined): void {
  if (!file) return;
  showBlock($("importError"), false);
  showBlock($("importPreview"), false);
  if (file.size > 2 * 1024 * 1024) {
    $("importError").textContent = "Backup file is too large (max 2 MB).";
    showBlock($("importError"), true);
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const text = typeof reader.result === "string" ? reader.result : "";
    const result = parseBackupFile(text, file.size);
    if (!result.ok) {
      $("importError").textContent = result.error;
      showBlock($("importError"), true);
      return;
    }
    pendingImport = result.valid;
    const dates = result.valid.map((e) => e.date).sort();
    const overlapping = result.valid.filter((e) =>
      entries.some((existing) => existing.id === e.id),
    ).length;
    const first = dates[0];
    const last = dates[dates.length - 1];
    $("importSummary").textContent =
      `Found ${result.valid.length} result${result.valid.length > 1 ? "s" : ""}` +
      (first && last ? ` (${formatDate(first)} → ${formatDate(last)})` : "") +
      (result.skipped > 0 ? `, skipped ${result.skipped} invalid row(s)` : "") +
      (overlapping > 0
        ? `. ${overlapping} will overwrite an existing entry with the same player and date.`
        : ". None overlap with what's already here.");
    showBlock($("importPreview"), true);
  };
  reader.onerror = () => {
    $("importError").textContent = "Couldn't read that file.";
    showBlock($("importError"), true);
  };
  reader.readAsText(file);
}

function confirmImport(): void {
  if (!pendingImport) return;
  entries = mergeEntries(entries, pendingImport);
  const count = pendingImport.length;
  pendingImport = null;
  showBlock($("importPreview"), false);
  ($("importInput") as HTMLInputElement).value = "";
  persist(`Imported ${count} score${count > 1 ? "s" : ""} from backup`);
}

function cancelImport(): void {
  pendingImport = null;
  showBlock($("importPreview"), false);
  ($("importInput") as HTMLInputElement).value = "";
}

function boot(): void {
  const loaded = loadEntries();
  entries = loaded.entries;
  dateLocale = loadDateLocale();
  ($("dateLocale") as HTMLSelectElement).value = dateLocale;

  renderTitleTiles();
  ($("manualDate") as HTMLInputElement).value = todayISO();
  renderManualGuessGrid("");
  renderAll();

  if (loaded.dropped > 0) {
    showStatus(
      `Loaded league data — dropped ${loaded.dropped} invalid row(s) from storage.`,
      "error",
    );
  }

  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = (btn as HTMLElement).dataset.tab;
      if (tab) setTab(tab);
    });
  });
  document.querySelectorAll("[data-goto]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = (btn as HTMLElement).dataset.goto;
      if (tab) setTab(tab);
    });
  });

  $("syncBtn").addEventListener("click", () => {
    const again = loadEntries();
    entries = again.entries;
    renderAll();
    showStatus(
      again.dropped > 0
        ? `Up to date — ${again.dropped} invalid row(s) ignored`
        : "Up to date",
      again.dropped > 0 ? "error" : "ok",
    );
  });

  $("dateSelect").addEventListener("change", (e) => {
    selectedDate = (e.target as HTMLSelectElement).value;
    renderDaily();
  });

  $("dailyList").addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    const id = t.dataset.delete;
    if (!id) return;
    if (!window.confirm("Delete this entry? This cannot be undone.")) return;
    entries = deleteEntry(entries, id);
    persist("Entry removed");
  });

  document.querySelectorAll(".mode-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      addMode = ((btn as HTMLElement).dataset.mode as "paste" | "manual") || "paste";
      document.querySelectorAll(".mode-btn").forEach((b) =>
        b.classList.toggle("active", b === btn),
      );
      showBlock($("mode-paste"), addMode === "paste");
      showBlock($("mode-manual"), addMode === "manual");
    });
  });

  $("dateLocale").addEventListener("change", (e) => {
    dateLocale = (e.target as HTMLSelectElement).value === "mmdd" ? "mmdd" : "ddmm";
    saveDateLocale(dateLocale);
    handlePasteInput();
  });

  $("pasteBox").addEventListener("input", handlePasteInput);
  $("singleSaveBtn").addEventListener("click", () => saveSingle(false));
  $("bulkList").addEventListener("change", (e) => {
    const t = e.target as HTMLInputElement;
    const idx = t.dataset.bulkToggle;
    if (idx !== undefined && bulkRows) {
      const i = parseInt(idx, 10);
      const row = bulkRows[i];
      if (row) {
        row.include = t.checked;
        renderBulkPreview();
      }
    }
  });
  $("bulkSaveBtn").addEventListener("click", saveBulk);
  $("manualSaveBtn").addEventListener("click", () => saveManual(false));
  $("shareBtn").addEventListener("click", () => void shareRecap());
  $("downloadBtn").addEventListener("click", downloadRecap);
  $("exportBtn").addEventListener("click", exportBackup);
  $("importInput").addEventListener("change", (e) => {
    const files = (e.target as HTMLInputElement).files;
    handleImportFile(files?.[0]);
  });
  $("importConfirmBtn").addEventListener("click", confirmImport);
  $("importCancelBtn").addEventListener("click", cancelImport);
}

boot();
