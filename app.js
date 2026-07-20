// ---------- Constants ----------
const STORAGE_KEY = "wordle-league-entries-v1";
const POINTS = { 1: 6, 2: 5, 3: 4, 4: 3, 5: 2, 6: 1, X: 0 };
const COLORS = {
  bg: "#121213",
  tile: "#3A3A3C",
  tileEmpty: "#1E1E1F",
  border: "#3A3A3C",
  green: "#6AAA64",
  yellow: "#C9B458",
  text: "#FFFFFF",
  dim: "#818384",
  red: "#D0021B",
};

// ---------- State ----------
let entries = loadEntries();
let activeTab = "daily";
let addMode = "paste";
let selectedDate = null;
let bulkRows = null; // rows found by the paste parser, awaiting confirmation
let singleParsed = null; // { guesses } found by single-share-text parse

// ---------- Storage ----------
function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveEntries() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    return true;
  } catch (e) {
    return false;
  }
}

function persist(successMsg) {
  const ok = saveEntries();
  showStatus(ok ? successMsg : "Save failed — your browser may be blocking storage.", ok ? "ok" : "error");
  renderAll();
}

// ---------- Date helpers ----------
function todayISO() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function formatDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function guessVal(g) {
  return g === "X" ? 7 : parseInt(g, 10);
}

// ---------- Parsing ----------
function parseShareResult(text) {
  const m = text.match(/Wordle\s+#?[\d,.]+\s+([1-6X])\/6/i);
  return m ? m[1].toUpperCase() : null;
}

// Parses a header date assuming DD/MM/YYYY (Australian WhatsApp default).
function parseHeaderDate(raw) {
  const parts = raw.split(/[\/.\-]/).map((p) => p.trim());
  if (parts.length !== 3) return null;
  let [d, m, y] = parts;
  if (y.length === 2) y = "20" + y;
  const dNum = parseInt(d, 10);
  const mNum = parseInt(m, 10);
  if (!dNum || !mNum || mNum < 1 || mNum > 12 || dNum < 1 || dNum > 31) return null;
  return `${y}-${String(mNum).padStart(2, "0")}-${String(dNum).padStart(2, "0")}`;
}

// Parses copied WhatsApp messages (iOS or Android export format).
function parseChatDump(raw) {
  const headerRe =
    /^\[?(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}),?\s+\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\s*(?:[ap]\.?\s?m\.?)?\]?\s*(?:-\s*)?([^:]+?):\s?(.*)$/i;
  const lines = raw.split(/\r?\n/);
  const messages = [];
  let current = null;
  for (const line of lines) {
    const m = line.match(headerRe);
    if (m) {
      if (current) messages.push(current);
      current = { dateRaw: m[1], sender: m[2].trim(), body: m[3] };
    } else if (current) {
      current.body += "\n" + line;
    }
  }
  if (current) messages.push(current);

  const results = [];
  for (const msg of messages) {
    if (!/Wordle/i.test(msg.body)) continue;
    const guesses = parseShareResult(msg.body);
    const date = parseHeaderDate(msg.dateRaw);
    if (guesses && date) results.push({ player: msg.sender, date, guesses });
  }
  return results;
}

// ---------- Computed views ----------
function getDates() {
  return [...new Set(entries.map((e) => e.date))].sort((a, b) => (a < b ? 1 : -1));
}

function getPlayers() {
  return [...new Set(entries.map((e) => e.player))].sort();
}

function getActiveDate() {
  const dates = getDates();
  return selectedDate ?? dates[0] ?? null;
}

function getDailyEntries(date) {
  return entries
    .filter((e) => e.date === date)
    .sort((a, b) => guessVal(a.guesses) - guessVal(b.guesses));
}

function getDailyWinners(dailyEntries) {
  const solved = dailyEntries.filter((e) => e.guesses !== "X");
  if (solved.length === 0) return new Set();
  const best = guessVal(solved[0].guesses);
  return new Set(solved.filter((e) => guessVal(e.guesses) === best).map((e) => e.player));
}

function getSeason() {
  const byDate = {};
  entries.forEach((e) => (byDate[e.date] = byDate[e.date] || []).push(e));
  const winsByPlayer = {};
  Object.values(byDate).forEach((list) => {
    const solved = list.filter((e) => e.guesses !== "X");
    if (!solved.length) return;
    const best = Math.min(...solved.map((e) => guessVal(e.guesses)));
    solved.filter((e) => guessVal(e.guesses) === best).forEach((e) => {
      winsByPlayer[e.player] = (winsByPlayer[e.player] || 0) + 1;
    });
  });
  const map = {};
  entries.forEach((e) => {
    const m = (map[e.player] = map[e.player] || { player: e.player, points: 0, games: 0, solved: 0, totalGuesses: 0 });
    m.points += POINTS[e.guesses === "X" ? "X" : parseInt(e.guesses, 10)];
    m.games += 1;
    if (e.guesses !== "X") {
      m.solved += 1;
      m.totalGuesses += parseInt(e.guesses, 10);
    }
  });
  return Object.values(map)
    .map((m) => ({ ...m, wins: winsByPlayer[m.player] || 0, avg: m.solved ? (m.totalGuesses / m.solved).toFixed(2) : "—" }))
    .sort((a, b) => b.points - a.points || (parseFloat(a.avg) || 99) - (parseFloat(b.avg) || 99));
}

// ---------- Entry CRUD ----------
function upsertEntry({ player, date, guesses }, allowReplace) {
  const id = `${date}-${player.toLowerCase()}`;
  const existing = entries.find((e) => e.id === id);
  if (existing && !allowReplace) return { needsConfirm: true, existing };
  entries = entries.filter((e) => e.id !== id).concat([{ id, player: existing ? existing.player : player, date, guesses, addedAt: Date.now() }]);
  return { needsConfirm: false };
}

function deleteEntry(id) {
  entries = entries.filter((e) => e.id !== id);
  persist("Entry removed");
}

// ---------- Status line ----------
let statusTimer = null;
function showStatus(msg, type) {
  const el = document.getElementById("status");
  el.textContent = msg;
  el.className = "status-line " + type;
  clearTimeout(statusTimer);
  if (type === "ok") statusTimer = setTimeout(() => { el.textContent = ""; el.className = "status-line"; }, 4000);
}

// ---------- Tabs ----------
function setTab(tab) {
  activeTab = tab;
  document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("active", p.id === "tab-" + tab));
  if (tab === "share") renderShareCanvas();
}

// ---------- Rendering ----------
function renderTitleTiles() {
  const el = document.getElementById("titleTiles");
  el.innerHTML = "";
  "LEAGUE".split("").forEach((ch) => {
    const d = document.createElement("div");
    d.className = "letter-tile";
    d.textContent = ch;
    el.appendChild(d);
  });
}

function renderDateSelect() {
  const dates = getDates();
  const sel = document.getElementById("dateSelect");
  sel.innerHTML = "";
  dates.forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = formatDate(d);
    sel.appendChild(opt);
  });
  sel.value = getActiveDate();
}

function renderDaily() {
  const dates = getDates();
  document.getElementById("dailyEmpty").style.display = dates.length === 0 ? "block" : "none";
  document.getElementById("dailyContent").style.display = dates.length === 0 ? "none" : "block";
  if (dates.length === 0) return;

  renderDateSelect();
  const activeDate = getActiveDate();
  const daily = getDailyEntries(activeDate);
  const winners = getDailyWinners(daily);
  document.getElementById("dailyCount").textContent = `${daily.length} played`;

  const list = document.getElementById("dailyList");
  list.innerHTML = "";
  daily.forEach((e) => {
    const won = winners.has(e.player);
    const card = document.createElement("div");
    card.className = "result-card" + (won ? " winner" : "");
    card.innerHTML = `
      <div class="guess-badge ${e.guesses === "X" ? "fail" : ""}">${e.guesses === "X" ? "X" : e.guesses + "/6"}</div>
      <div style="flex:1">
        <div class="result-name">${escapeHtml(e.player)} ${won ? '<span class="win-tag">WINNER</span>' : ""}</div>
        <div class="result-points">${e.guesses === "X" ? 0 : POINTS[parseInt(e.guesses, 10)]} pts</div>
      </div>
      <button class="result-delete" data-delete="${e.id}">✕</button>
    `;
    list.appendChild(card);
  });
}

function renderSeason() {
  const season = getSeason();
  document.getElementById("seasonEmpty").style.display = season.length === 0 ? "block" : "none";
  document.getElementById("seasonContent").style.display = season.length === 0 ? "none" : "block";
  if (season.length === 0) return;

  const list = document.getElementById("seasonList");
  list.innerHTML = "";
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

function renderPlayerChips(containerId, inputEl, currentValue) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  getPlayers().forEach((p) => {
    const chip = document.createElement("button");
    chip.className = "chip" + (p === currentValue ? " active" : "");
    chip.textContent = p;
    chip.type = "button";
    chip.onclick = () => { inputEl.value = p; renderPlayerChips(containerId, inputEl, p); };
    container.appendChild(chip);
  });
}

function renderManualGuessGrid(selected) {
  const grid = document.getElementById("manualGuessGrid");
  grid.innerHTML = "";
  ["1", "2", "3", "4", "5", "6", "X"].forEach((g) => {
    const btn = document.createElement("button");
    btn.className = "guess-btn" + (g === selected ? " active" : "");
    btn.textContent = g;
    btn.type = "button";
    btn.onclick = () => { manualGuesses = g; renderManualGuessGrid(g); };
    grid.appendChild(btn);
  });
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function renderAll() {
  renderDaily();
  renderSeason();
  renderPlayerChips("singlePlayerChips", document.getElementById("singlePlayer"), document.getElementById("singlePlayer").value);
  renderPlayerChips("manualPlayerChips", document.getElementById("manualPlayer"), document.getElementById("manualPlayer").value);
  document.getElementById("shareEmpty").style.display = entries.length === 0 ? "block" : "none";
  document.getElementById("shareContent").style.display = entries.length === 0 ? "none" : "block";
}

// ---------- Manual entry mode ----------
let manualGuesses = "";

function resetManualForm() {
  document.getElementById("manualPlayer").value = "";
  manualGuesses = "";
  document.getElementById("manualDate").value = todayISO();
  document.getElementById("manualReplace").style.display = "none";
  renderManualGuessGrid("");
  renderPlayerChips("manualPlayerChips", document.getElementById("manualPlayer"), "");
}

function saveManual(allowReplace) {
  const player = document.getElementById("manualPlayer").value.trim();
  const date = document.getElementById("manualDate").value;
  if (!player || !manualGuesses || !date) return;
  const result = upsertEntry({ player, date, guesses: manualGuesses }, allowReplace);
  if (result.needsConfirm) {
    const box = document.getElementById("manualReplace");
    const g = result.existing.guesses === "X" ? "X/6" : result.existing.guesses + "/6";
    box.innerHTML = `
      <div><strong>${escapeHtml(result.existing.player)}</strong> already has a score for ${formatDate(result.existing.date)} (${g}). Replace it?</div>
      <div class="actions">
        <button class="btn-yes" id="manualReplaceYes">Replace</button>
        <button class="btn-no" id="manualReplaceNo">Cancel</button>
      </div>
    `;
    box.style.display = "block";
    document.getElementById("manualReplaceYes").onclick = () => saveManual(true);
    document.getElementById("manualReplaceNo").onclick = () => { box.style.display = "none"; };
    return;
  }
  persist(`Saved: ${player} — ${manualGuesses === "X" ? "X/6" : manualGuesses + "/6"}`);
  resetManualForm();
  selectedDate = date;
  setTab("daily");
}

// ---------- Paste mode ----------
function resetPasteMode() {
  document.getElementById("pasteBox").value = "";
  document.getElementById("singleFallback").style.display = "none";
  document.getElementById("bulkPreview").style.display = "none";
  document.getElementById("pasteError").style.display = "none";
  singleParsed = null;
  bulkRows = null;
}

function handlePasteInput() {
  const text = document.getElementById("pasteBox").value;
  document.getElementById("pasteError").style.display = "none";
  document.getElementById("singleFallback").style.display = "none";
  document.getElementById("bulkPreview").style.display = "none";

  if (!text.trim()) return;

  const chatResults = parseChatDump(text);
  if (chatResults.length > 0) {
    const map = {};
    chatResults.forEach((r) => (map[`${r.date}-${r.player.toLowerCase()}`] = r));
    bulkRows = Object.entries(map).map(([id, r]) => {
      const existing = entries.find((e) => e.id === id);
      return { ...r, id, include: true, replaces: !!existing };
    });
    renderBulkPreview();
    return;
  }

  const guesses = parseShareResult(text);
  if (guesses) {
    singleParsed = { guesses };
    document.getElementById("singleFoundBadge").textContent =
      `Found: ${guesses === "X" ? "X/6" : guesses + "/6"} — ${guesses === "X" ? 0 : POINTS[parseInt(guesses, 10)]} pts`;
    document.getElementById("singleDate").value = todayISO();
    renderPlayerChips("singlePlayerChips", document.getElementById("singlePlayer"), "");
    document.getElementById("singleFallback").style.display = "block";
    return;
  }

  document.getElementById("pasteError").textContent =
    "Couldn't find a Wordle result in that text. Paste a share message (e.g. \"Wordle 1,489 3/6\") or a chunk of copied WhatsApp chat.";
  document.getElementById("pasteError").style.display = "block";
}

function renderBulkPreview() {
  document.getElementById("bulkPreview").style.display = "block";
  document.getElementById("bulkSummary").textContent =
    `Found ${bulkRows.length} result${bulkRows.length > 1 ? "s" : ""} — untick any you don't want.`;
  const list = document.getElementById("bulkList");
  list.innerHTML = "";
  bulkRows.forEach((r, i) => {
    const row = document.createElement("label");
    row.className = "checkbox-row" + (r.include ? " included" : "");
    row.innerHTML = `
      <input type="checkbox" ${r.include ? "checked" : ""} data-bulk-toggle="${i}" />
      <div style="flex:1">
        <span style="font-weight:700">${escapeHtml(r.player)}</span>
        <span class="dim tiny" style="margin-left:8px">${formatDate(r.date)} · ${r.guesses === "X" ? "X/6" : r.guesses + "/6"} · ${r.guesses === "X" ? 0 : POINTS[parseInt(r.guesses, 10)]} pts</span>
        ${r.replaces ? '<span class="replaces">replaces existing</span>' : ""}
      </div>
    `;
    list.appendChild(row);
  });
}

function saveBulk() {
  const toSave = bulkRows.filter((r) => r.include);
  if (!toSave.length) return;
  toSave.forEach((r) => upsertEntry({ player: r.player, date: r.date, guesses: r.guesses }, true));
  persist(`Imported ${toSave.length} score${toSave.length > 1 ? "s" : ""}`);
  resetPasteMode();
  selectedDate = toSave[0].date;
  setTab("daily");
}

function saveSingle(allowReplace) {
  const player = document.getElementById("singlePlayer").value.trim();
  const date = document.getElementById("singleDate").value;
  if (!player || !date || !singleParsed) return;
  const result = upsertEntry({ player, date, guesses: singleParsed.guesses }, allowReplace);
  if (result.needsConfirm) {
    if (!confirm(`${result.existing.player} already has a score for ${formatDate(result.existing.date)}. Replace it?`)) return;
    return saveSingle(true);
  }
  persist(`Saved: ${player} — ${singleParsed.guesses === "X" ? "X/6" : singleParsed.guesses + "/6"}`);
  resetPasteMode();
  selectedDate = date;
  setTab("daily");
}

// ---------- Share recap canvas ----------
function renderShareCanvas() {
  if (entries.length === 0) return;
  const canvas = document.getElementById("recapCanvas");
  const ctx = canvas.getContext("2d");
  const width = 720;
  const scale = 2; // render at 2x for crisp share images

  const activeDate = getActiveDate();
  const daily = getDailyEntries(activeDate);
  const winners = getDailyWinners(daily);
  const season = getSeason();

  const padX = 32;
  let y = 40;
  y += 34; // title tiles
  y += 26; // subtitle
  y += 26; // "today's results" label
  y += daily.length * 54;
  y += 30; // gap
  y += 24; // "season standings" label
  y += 26; // header row
  y += season.length * 44;
  y += 40; // footer
  const height = y + 20;

  canvas.width = width * scale;
  canvas.height = height * scale;
  ctx.scale(scale, scale);

  // background
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, "#17171A");
  grad.addColorStop(1, COLORS.bg);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  let cy = 40;

  // title tiles: R E C A P
  const letters = "RECAP".split("");
  const tileSize = 30, gap = 4;
  const totalW = letters.length * tileSize + (letters.length - 1) * gap;
  let tx = (width - totalW) / 2;
  ctx.font = "800 16px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  letters.forEach((ch) => {
    ctx.fillStyle = COLORS.green;
    roundRect(ctx, tx, cy, tileSize, tileSize, 3);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillText(ch, tx + tileSize / 2, cy + tileSize / 2 + 1);
    tx += tileSize + gap;
  });
  cy += tileSize + 18;

  // subtitle
  ctx.fillStyle = COLORS.dim;
  ctx.font = "12px Arial, sans-serif";
  ctx.fillText(activeDate ? formatDate(activeDate) : "", width / 2, cy);
  cy += 30;

  // Today's results label
  ctx.fillStyle = COLORS.dim;
  ctx.font = "700 11px Arial, sans-serif";
  ctx.fillText("TODAY'S RESULTS", width / 2, cy);
  cy += 20;

  daily.forEach((e) => {
    const won = winners.has(e.player);
    const rowH = 46;
    const rowW = width - padX * 2;
    ctx.fillStyle = won ? "rgba(106,170,100,0.12)" : "transparent";
    if (won) { roundRect(ctx, padX, cy, rowW, rowH, 6); ctx.fill(); }
    ctx.strokeStyle = won ? COLORS.green : COLORS.border;
    ctx.lineWidth = 1;
    roundRect(ctx, padX, cy, rowW, rowH, 6);
    ctx.stroke();

    // badge
    const badgeSize = 30;
    const badgeX = padX + 10, badgeY = cy + (rowH - badgeSize) / 2;
    ctx.fillStyle = e.guesses === "X" ? COLORS.tile : COLORS.green;
    roundRect(ctx, badgeX, badgeY, badgeSize, badgeSize, 3);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "800 12px Arial, sans-serif";
    ctx.fillText(e.guesses === "X" ? "X" : e.guesses + "/6", badgeX + badgeSize / 2, badgeY + badgeSize / 2 + 1);

    // name
    ctx.textAlign = "left";
    ctx.fillStyle = "#fff";
    ctx.font = "700 14px Arial, sans-serif";
    const nameX = badgeX + badgeSize + 12;
    ctx.fillText(e.player + (won ? "  👑" : ""), nameX, cy + rowH / 2 + 1);

    // points
    ctx.textAlign = "right";
    ctx.fillStyle = COLORS.dim;
    ctx.font = "700 12px Arial, sans-serif";
    ctx.fillText(`${e.guesses === "X" ? 0 : POINTS[parseInt(e.guesses, 10)]} pts`, padX + rowW - 12, cy + rowH / 2 + 1);
    ctx.textAlign = "center";

    cy += rowH + 8;
  });

  cy += 14;

  // Season standings label
  ctx.fillStyle = COLORS.dim;
  ctx.font = "700 11px Arial, sans-serif";
  ctx.fillText("SEASON STANDINGS", width / 2, cy);
  cy += 22;

  // header row
  const cols = [padX + 14, padX + 40, width - padX - 130, width - padX - 80, width - padX - 20];
  ctx.textAlign = "left";
  ctx.fillStyle = COLORS.dim;
  ctx.font = "700 10px Arial, sans-serif";
  ctx.fillText("#", cols[0], cy);
  ctx.fillText("PLAYER", cols[1], cy);
  ctx.textAlign = "right";
  ctx.fillText("PTS", cols[2], cy);
  ctx.fillText("WINS", cols[3], cy);
  ctx.fillText("AVG", cols[4], cy);
  cy += 18;

  season.forEach((m, i) => {
    const rowH = 36;
    const rowW = width - padX * 2;
    const first = i === 0;
    ctx.fillStyle = first ? "rgba(106,170,100,0.12)" : "transparent";
    if (first) { roundRect(ctx, padX, cy, rowW, rowH, 5); ctx.fill(); }
    ctx.strokeStyle = first ? COLORS.green : COLORS.border;
    roundRect(ctx, padX, cy, rowW, rowH, 5);
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.fillStyle = first ? COLORS.green : COLORS.dim;
    ctx.font = "800 13px Arial, sans-serif";
    ctx.fillText(String(i + 1), cols[0], cy + rowH / 2 + 1);

    ctx.fillStyle = "#fff";
    ctx.font = "700 13px Arial, sans-serif";
    ctx.fillText(m.player, cols[1], cy + rowH / 2 + 1);

    ctx.textAlign = "right";
    ctx.fillStyle = first ? COLORS.green : "#fff";
    ctx.font = "800 13px Arial, sans-serif";
    ctx.fillText(String(m.points), cols[2], cy + rowH / 2 + 1);

    ctx.fillStyle = COLORS.dim;
    ctx.font = "12px Arial, sans-serif";
    ctx.fillText(String(m.wins), cols[3], cy + rowH / 2 + 1);
    ctx.fillText(m.avg, cols[4], cy + rowH / 2 + 1);

    cy += rowH + 6;
  });

  cy += 20;
  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.dim;
  ctx.font = "10px Arial, sans-serif";
  ctx.fillText("Wordle League · auto-generated", width / 2, cy);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

async function shareRecap() {
  const canvas = document.getElementById("recapCanvas");
  canvas.toBlob(async (blob) => {
    if (!blob) { showStatus("Could not generate the image.", "error"); return; }
    const filename = `wordle-league-${todayISO()}.png`;
    const file = new File([blob], filename, { type: "image/png" });
    const shareNote = document.getElementById("shareNote");
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Wordle League", text: `Wordle League — ${formatDate(getActiveDate())}` });
        shareNote.style.display = "none";
      } catch (err) {
        // user cancelled the share sheet — not an error
      }
    } else {
      downloadBlob(blob, filename);
      shareNote.textContent = "Your browser can't share images directly — downloaded instead. Attach it in WhatsApp yourself.";
      shareNote.style.display = "block";
    }
  }, "image/png");
}

function downloadRecap() {
  const canvas = document.getElementById("recapCanvas");
  canvas.toBlob((blob) => {
    if (!blob) return;
    downloadBlob(blob, `wordle-league-${todayISO()}.png`);
  }, "image/png");
}

// ---------- Backup: export / import ----------
let pendingImport = null;

function exportBackup() {
  const payload = { schema: 1, exportedAt: new Date().toISOString(), entries };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  downloadBlob(blob, `wordle-league-backup-${todayISO()}.json`);
  showStatus("Backup downloaded", "ok");
}

function parseBackupFile(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return { error: "That file isn't valid JSON." };
  }
  const list = Array.isArray(data) ? data : Array.isArray(data.entries) ? data.entries : null;
  if (!list) return { error: "Couldn't find a list of results in that file." };

  const valid = [];
  let skipped = 0;
  list.forEach((e) => {
    const player = e && typeof e.player === "string" ? e.player.trim() : "";
    const date = e && typeof e.date === "string" ? e.date : "";
    const guesses = e && typeof e.guesses === "string" ? e.guesses.toUpperCase() : "";
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date);
    const validGuess = guesses === "X" || /^[1-6]$/.test(guesses);
    if (player && validDate && validGuess) {
      valid.push({ id: `${date}-${player.toLowerCase()}`, player, date, guesses, addedAt: e.addedAt || Date.now() });
    } else {
      skipped += 1;
    }
  });
  return { valid, skipped };
}

function handleImportFile(file) {
  if (!file) return;
  document.getElementById("importError").style.display = "none";
  document.getElementById("importPreview").style.display = "none";
  const reader = new FileReader();
  reader.onload = () => {
    const result = parseBackupFile(reader.result);
    if (result.error || result.valid.length === 0) {
      document.getElementById("importError").textContent =
        result.error || `Found ${result.skipped} row(s) but none were valid backup entries.`;
      document.getElementById("importError").style.display = "block";
      return;
    }
    pendingImport = result.valid;
    const dates = result.valid.map((e) => e.date).sort();
    const overlapping = result.valid.filter((e) => entries.some((existing) => existing.id === e.id)).length;
    document.getElementById("importSummary").textContent =
      `Found ${result.valid.length} result${result.valid.length > 1 ? "s" : ""} (${formatDate(dates[0])} → ${formatDate(dates[dates.length - 1])})` +
      (result.skipped > 0 ? `, skipped ${result.skipped} invalid row(s)` : "") +
      (overlapping > 0 ? `. ${overlapping} will overwrite an existing entry with the same player and date.` : ". None overlap with what's already here.");
    document.getElementById("importPreview").style.display = "block";
  };
  reader.onerror = () => {
    document.getElementById("importError").textContent = "Couldn't read that file.";
    document.getElementById("importError").style.display = "block";
  };
  reader.readAsText(file);
}

function confirmImport() {
  if (!pendingImport) return;
  pendingImport.forEach((e) => {
    entries = entries.filter((existing) => existing.id !== e.id).concat([e]);
  });
  const count = pendingImport.length;
  pendingImport = null;
  document.getElementById("importPreview").style.display = "none";
  document.getElementById("importInput").value = "";
  persist(`Imported ${count} score${count > 1 ? "s" : ""} from backup`);
}

function cancelImport() {
  pendingImport = null;
  document.getElementById("importPreview").style.display = "none";
  document.getElementById("importInput").value = "";
}

// ---------- Wiring ----------
document.addEventListener("DOMContentLoaded", () => {
  renderTitleTiles();
  document.getElementById("manualDate").value = todayISO();
  renderManualGuessGrid("");
  renderAll();

  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => setTab(btn.dataset.tab));
  });
  document.querySelectorAll("[data-goto]").forEach((btn) => {
    btn.addEventListener("click", () => setTab(btn.dataset.goto));
  });

  document.getElementById("syncBtn").addEventListener("click", () => {
    entries = loadEntries();
    renderAll();
    showStatus("Up to date", "ok");
  });

  document.getElementById("dateSelect").addEventListener("change", (e) => {
    selectedDate = e.target.value;
    renderDaily();
  });

  document.getElementById("dailyList").addEventListener("click", (e) => {
    const id = e.target.dataset.delete;
    if (id) deleteEntry(id);
  });

  // mode toggle
  document.querySelectorAll(".mode-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      addMode = btn.dataset.mode;
      document.querySelectorAll(".mode-btn").forEach((b) => b.classList.toggle("active", b === btn));
      document.getElementById("mode-paste").style.display = addMode === "paste" ? "block" : "none";
      document.getElementById("mode-manual").style.display = addMode === "manual" ? "block" : "none";
    });
  });

  // paste mode
  document.getElementById("pasteBox").addEventListener("input", handlePasteInput);
  document.getElementById("singleSaveBtn").addEventListener("click", () => saveSingle(false));
  document.getElementById("bulkList").addEventListener("change", (e) => {
    const idx = e.target.dataset.bulkToggle;
    if (idx !== undefined) {
      bulkRows[idx].include = !bulkRows[idx].include;
      renderBulkPreview();
    }
  });
  document.getElementById("bulkSaveBtn").addEventListener("click", saveBulk);

  // manual mode
  document.getElementById("manualSaveBtn").addEventListener("click", () => saveManual(false));

  // share
  document.getElementById("shareBtn").addEventListener("click", shareRecap);
  document.getElementById("downloadBtn").addEventListener("click", downloadRecap);

  // backup
  document.getElementById("exportBtn").addEventListener("click", exportBackup);
  document.getElementById("importInput").addEventListener("change", (e) => handleImportFile(e.target.files?.[0]));
  document.getElementById("importConfirmBtn").addEventListener("click", confirmImport);
  document.getElementById("importCancelBtn").addEventListener("click", cancelImport);
});
