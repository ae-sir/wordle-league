import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Download,
  Pencil,
  RefreshCw,
  Share2,
  Trash2,
  Upload,
} from "lucide-react";
import { ShareCanvas } from "@/components/ShareCanvas";
import { TrendChart } from "@/components/TrendChart";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { pointsFor } from "@/domain/points";
import {
  getDailyEntries,
  getDailyWinners,
  getDates,
  getPlayers,
  getSeason,
} from "@/domain/season";
import { deleteEntry, entryId, mergeEntries, upsertEntry } from "@/domain/upsert";
import {
  finalizePlayerMerge,
  findFirstNameMatches,
  planPlayerMerge,
  type NameMatchSuggestion,
  type PlayerMergePlan,
} from "@/domain/players";
import type { BulkRow, DateLocale, Entry, Guesses } from "@/domain/types";
import { formatDate, todayISO } from "@/parse/dates";
import { analyzePaste } from "@/parse/paste";
import { buildBackup, parseBackupFile } from "@/storage/backup";
import {
  loadDateLocale,
  loadEntries,
  saveDateLocale,
  saveEntries,
} from "@/storage/local";
import { cn } from "@/lib/utils";

type Status = { msg: string; type: "ok" | "error" } | null;
type AddMode = "paste" | "manual";

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

function TitleTiles() {
  return (
    <div className="flex gap-1">
      {"LEAGUE".split("").map((ch, i) => (
        <div
          key={i}
          className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary text-sm font-extrabold text-primary-foreground"
        >
          {ch}
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [tab, setTab] = useState("daily");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const [dateLocale, setDateLocale] = useState<DateLocale>("ddmm");
  const [addMode, setAddMode] = useState<AddMode>("paste");

  // paste
  const [pasteText, setPasteText] = useState("");
  const [bulkRows, setBulkRows] = useState<BulkRow[] | null>(null);
  const [singleGuesses, setSingleGuesses] = useState<Guesses | null>(null);
  const [singlePlayer, setSinglePlayer] = useState("");
  const [singleDate, setSingleDate] = useState(todayISO());
  const [pasteError, setPasteError] = useState<string | null>(null);

  // manual
  const [manualPlayer, setManualPlayer] = useState("");
  const [manualGuesses, setManualGuesses] = useState<Guesses | "">("");
  const [manualDate, setManualDate] = useState(todayISO());

  // dialogs
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [clearAllOpen, setClearAllOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // player rename / merge
  const [renamingPlayer, setRenamingPlayer] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [selectedForMerge, setSelectedForMerge] = useState<Set<string>>(new Set());
  const [mergeTargetName, setMergeTargetName] = useState("");
  const [mergePlan, setMergePlan] = useState<PlayerMergePlan | null>(null);
  const [mergeChoices, setMergeChoices] = useState<Record<string, Entry>>({});
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [replaceExisting, setReplaceExisting] = useState<Entry | null>(null);
  const [replaceSource, setReplaceSource] = useState<"manual" | "single">("manual");
  const [updateName, setUpdateName] = useState(false);

  // import
  const [pendingImport, setPendingImport] = useState<Entry[] | null>(null);
  const [importSummary, setImportSummary] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importNameSuggestions, setImportNameSuggestions] = useState<NameMatchSuggestion[]>([]);
  const [confirmedRenames, setConfirmedRenames] = useState<Set<number>>(new Set());
  const [shareNote, setShareNote] = useState<string | null>(null);

  const showStatus = useCallback((msg: string, type: "ok" | "error") => {
    setStatus({ msg, type });
  }, []);

  useEffect(() => {
    if (!status || status.type !== "ok") return;
    const t = setTimeout(() => setStatus(null), 4000);
    return () => clearTimeout(t);
  }, [status]);

  useEffect(() => {
    const loaded = loadEntries();
    setEntries(loaded.entries);
    setDateLocale(loadDateLocale());
    if (loaded.dropped > 0) {
      showStatus(
        `Loaded league data — dropped ${loaded.dropped} invalid row(s) from storage.`,
        "error",
      );
    }
  }, [showStatus]);

  const persist = useCallback(
    (next: Entry[], successMsg: string) => {
      const ok = saveEntries(next);
      setEntries(next);
      showStatus(
        ok ? successMsg : "Save failed — your browser may be blocking storage.",
        ok ? "ok" : "error",
      );
    },
    [showStatus],
  );

  const dates = useMemo(() => getDates(entries), [entries]);
  const activeDate = selectedDate ?? dates[0] ?? null;
  const players = useMemo(() => getPlayers(entries), [entries]);
  const season = useMemo(() => getSeason(entries), [entries]);
  const daily = useMemo(
    () => (activeDate ? getDailyEntries(entries, activeDate) : []),
    [entries, activeDate],
  );
  const winners = useMemo(() => getDailyWinners(daily), [daily]);

  const reload = () => {
    const again = loadEntries();
    setEntries(again.entries);
    showStatus(
      again.dropped > 0
        ? `Up to date — ${again.dropped} invalid row(s) ignored`
        : "Up to date",
      again.dropped > 0 ? "error" : "ok",
    );
  };

  const handlePaste = (text: string) => {
    setPasteText(text);
    setPasteError(null);
    setBulkRows(null);
    setSingleGuesses(null);
    const result = analyzePaste(text, entries, dateLocale);
    if (result.kind === "empty") return;
    if (result.kind === "bulk") {
      setBulkRows(result.rows);
      return;
    }
    if (result.kind === "single") {
      setSingleGuesses(result.guesses);
      setSingleDate(todayISO());
      return;
    }
    setPasteError(result.message);
  };

  const commitUpsert = (
    input: { player: string; date: string; guesses: Guesses },
    allowReplace: boolean,
    nameMode: "keep" | "update",
    source: "manual" | "single",
  ) => {
    const result = upsertEntry(entries, input, allowReplace, nameMode);
    if (result.needsConfirm) {
      setReplaceExisting(result.existing);
      setReplaceSource(source);
      setUpdateName(false);
      setReplaceOpen(true);
      return;
    }
    const wasEditing = editingId !== null;
    let nextEntries = result.entries;
    if (editingId) {
      const newId = entryId(input.date, input.player);
      if (newId !== editingId) {
        nextEntries = nextEntries.filter((e) => e.id !== editingId);
      }
      setEditingId(null);
    }
    const label =
      input.guesses === "X" ? "X/6" : `${input.guesses}/6`;
    persist(nextEntries, `${wasEditing ? "Updated" : "Saved"}: ${input.player} — ${label}`);
    if (source === "manual") {
      setManualPlayer("");
      setManualGuesses("");
      setManualDate(todayISO());
    } else {
      setPasteText("");
      setSingleGuesses(null);
      setSinglePlayer("");
      setBulkRows(null);
    }
    setSelectedDate(input.date);
    setTab("daily");
  };

  const saveManual = (allowReplace?: boolean, nameMode?: "keep" | "update") => {
    const player = manualPlayer.trim();
    if (!player || !manualGuesses || !manualDate) {
      showStatus("Fill player, guesses, and date.", "error");
      return;
    }
    const input = { player, date: manualDate, guesses: manualGuesses };
    const isSelfEdit = editingId !== null && editingId === entryId(input.date, player);
    commitUpsert(
      input,
      allowReplace ?? isSelfEdit,
      nameMode ?? (editingId ? "update" : "keep"),
      "manual",
    );
  };

  const startEditEntry = (entry: Entry) => {
    setManualPlayer(entry.player);
    setManualGuesses(entry.guesses);
    setManualDate(entry.date);
    setEditingId(entry.id);
    setAddMode("manual");
    setTab("add");
  };

  const cancelEditEntry = () => {
    setEditingId(null);
    setManualPlayer("");
    setManualGuesses("");
    setManualDate(todayISO());
  };

  const saveSingle = (allowReplace = false, nameMode: "keep" | "update" = "keep") => {
    const player = singlePlayer.trim();
    if (!player || !singleDate || !singleGuesses) {
      showStatus("Fill player and date for the found result.", "error");
      return;
    }
    commitUpsert(
      { player, date: singleDate, guesses: singleGuesses },
      allowReplace,
      nameMode,
      "single",
    );
  };

  const confirmReplace = () => {
    const nameMode = updateName ? "update" : "keep";
    setReplaceOpen(false);
    if (replaceSource === "manual") saveManual(true, nameMode);
    else saveSingle(true, nameMode);
  };

  const saveBulk = () => {
    if (!bulkRows) return;
    const toSave = bulkRows.filter((r) => r.include);
    if (!toSave.length) {
      showStatus("Select at least one result to import.", "error");
      return;
    }
    let next = entries;
    for (const r of toSave) {
      const result = upsertEntry(
        next,
        { player: r.player, date: r.date, guesses: r.guesses },
        true,
        "keep",
      );
      if (!result.needsConfirm) next = result.entries;
    }
    persist(next, `Imported ${toSave.length} score${toSave.length > 1 ? "s" : ""}`);
    setPasteText("");
    setBulkRows(null);
    setSelectedDate(toSave[0]?.date ?? null);
    setTab("daily");
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    const next = deleteEntry(entries, deleteId);
    setDeleteId(null);
    persist(next, "Entry removed");
  };

  const confirmClearAll = () => {
    setClearAllOpen(false);
    persist([], "Leaderboard cleared");
  };

  const startMerge = (sourceNames: string[], targetNameRaw: string) => {
    const targetName = targetNameRaw.trim();
    if (!targetName) {
      showStatus("Enter a name to merge into.", "error");
      return;
    }
    const plan = planPlayerMerge(entries, sourceNames, targetName);
    if (plan.conflicts.length === 0) {
      const next = finalizePlayerMerge(plan, targetName, {});
      persist(next, `Merged into ${targetName}`);
      setRenamingPlayer(null);
      setSelectedForMerge(new Set());
      setMergeTargetName("");
      setMergePlan(null);
      return;
    }
    setMergePlan(plan);
    setMergeTargetName(targetName);
    const defaults: Record<string, Entry> = {};
    for (const c of plan.conflicts) {
      const first = c.options[0];
      if (first) defaults[c.date] = first;
    }
    setMergeChoices(defaults);
  };

  const confirmMerge = () => {
    if (!mergePlan) return;
    const next = finalizePlayerMerge(mergePlan, mergeTargetName, mergeChoices);
    persist(next, `Merged into ${mergeTargetName}`);
    setRenamingPlayer(null);
    setSelectedForMerge(new Set());
    setMergeTargetName("");
    setMergePlan(null);
    setMergeChoices({});
  };

  const cancelMerge = () => {
    setMergePlan(null);
    setMergeChoices({});
  };

  const exportBackup = () => {
    const payload = buildBackup(entries);
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    downloadBlob(blob, `wordle-league-backup-${todayISO()}.json`);
    showStatus("Backup downloaded", "ok");
  };

  const handleImportFile = (file: File | undefined) => {
    if (!file) return;
    setImportError(null);
    setPendingImport(null);
    setImportNameSuggestions([]);
    setConfirmedRenames(new Set());
    if (file.size > 2 * 1024 * 1024) {
      setImportError("Backup file is too large (max 2 MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const result = parseBackupFile(text, file.size);
      if (!result.ok) {
        setImportError(result.error);
        return;
      }
      setPendingImport(result.valid);
      const ds = result.valid.map((e) => e.date).sort();
      const overlapping = result.valid.filter((e) =>
        entries.some((x) => x.id === e.id),
      ).length;
      const first = ds[0];
      const last = ds[ds.length - 1];
      setImportSummary(
        `Found ${result.valid.length} result${result.valid.length > 1 ? "s" : ""}` +
          (first && last ? ` (${formatDate(first)} → ${formatDate(last)})` : "") +
          (result.skipped > 0 ? `, skipped ${result.skipped} invalid row(s)` : "") +
          (overlapping > 0
            ? `. ${overlapping} will overwrite an existing entry with the same player and date.`
            : ". None overlap with what's already here."),
      );
      const incomingNames = [...new Set(result.valid.map((e) => e.player))];
      const suggestions = findFirstNameMatches(players, incomingNames);
      setImportNameSuggestions(suggestions);
      setConfirmedRenames(new Set(suggestions.map((_, i) => i)));
    };
    reader.onerror = () => setImportError("Couldn't read that file.");
    reader.readAsText(file);
  };

  const confirmImport = () => {
    if (!pendingImport) return;
    const renameMap = new Map<string, string>();
    importNameSuggestions.forEach((s, i) => {
      if (confirmedRenames.has(i)) renameMap.set(s.incoming, s.existing);
    });
    const toImport = renameMap.size
      ? pendingImport.map((e) => {
          const target = renameMap.get(e.player);
          return target ? { ...e, player: target, id: entryId(e.date, target) } : e;
        })
      : pendingImport;
    const next = mergeEntries(entries, toImport);
    const count = toImport.length;
    const mergedCount = renameMap.size;
    setPendingImport(null);
    setImportNameSuggestions([]);
    setConfirmedRenames(new Set());
    persist(
      next,
      `Imported ${count} score${count > 1 ? "s" : ""} from backup` +
        (mergedCount > 0
          ? ` (merged ${mergedCount} matching name${mergedCount > 1 ? "s" : ""})`
          : ""),
    );
  };

  const shareRecap = async () => {
    const canvas = document.getElementById("recapCanvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, "image/png"),
    );
    if (!blob) {
      showStatus("Could not generate the image.", "error");
      return;
    }
    const filename = `wordle-league-${todayISO()}.png`;
    const file = new File([blob], filename, { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "Wordle League",
          text: `Wordle League — ${activeDate ? formatDate(activeDate) : ""}`,
        });
        setShareNote(null);
      } catch {
        /* cancelled */
      }
    } else {
      downloadBlob(blob, filename);
      setShareNote(
        "Your browser can't share images directly — downloaded instead. Attach it in WhatsApp yourself.",
      );
    }
  };

  const downloadRecap = async () => {
    const canvas = document.getElementById("recapCanvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, "image/png"),
    );
    if (blob) downloadBlob(blob, `wordle-league-${todayISO()}.png`);
  };

  const nameDiffers =
    replaceExisting &&
    (replaceSource === "manual" ? manualPlayer : singlePlayer).trim().toLowerCase() ===
      replaceExisting.player.toLowerCase() &&
    (replaceSource === "manual" ? manualPlayer : singlePlayer).trim() !==
      replaceExisting.player;

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 pb-12">
      <header className="flex items-center justify-between border-b border-border py-7">
        <TitleTiles />
        <Button
          variant="outline"
          size="icon"
          onClick={reload}
          aria-label="Reload from storage"
          title="Reload from storage"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </header>

      <div
        className={cn(
          "min-h-5 py-2 text-xs",
          status?.type === "ok" && "text-primary",
          status?.type === "error" && "text-destructive",
        )}
        role="status"
        aria-live="polite"
      >
        {status?.msg ?? ""}
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-5 gap-1 bg-transparent p-0">
          {(
            [
              ["daily", "Today"],
              ["season", "Board"],
              ["add", "+ Add"],
              ["share", "Share"],
              ["backup", "Backup"],
            ] as const
          ).map(([value, label]) => (
            <TabsTrigger
              key={value}
              value={value}
              className="rounded-md border border-border px-1 py-2 text-[10px] font-bold uppercase tracking-wide data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* TODAY */}
        <TabsContent value="daily" className="mt-4 space-y-3">
          {dates.length === 0 ? (
            <EmptyState
              text="No scores yet. Add today's first result to start the league."
              onAdd={() => setTab("add")}
            />
          ) : (
            <>
              <div className="flex items-center gap-3">
                <Select
                  value={activeDate ?? undefined}
                  onValueChange={(v: string) => setSelectedDate(v)}
                >
                  <SelectTrigger className="w-full font-bold">
                    <SelectValue placeholder="Select date" />
                  </SelectTrigger>
                  <SelectContent>
                    {dates.map((d) => (
                      <SelectItem key={d} value={d}>
                        {formatDate(d)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {daily.length} played
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {daily.map((e) => {
                  const won = winners.has(e.player);
                  return (
                    <Card
                      key={e.id}
                      className={cn(
                        "border-border bg-card py-0",
                        won && "border-primary bg-primary/10",
                      )}
                    >
                      <CardContent className="flex items-center gap-3 p-3">
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-sm font-extrabold text-white",
                            e.guesses === "X" ? "bg-muted" : "bg-primary",
                          )}
                        >
                          {e.guesses === "X" ? "X" : `${e.guesses}/6`}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-bold">
                            {e.player}{" "}
                            {won && (
                              <Badge
                                variant="outline"
                                className="ml-1 border-primary text-primary"
                              >
                                WINNER
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {pointsFor(e.guesses)} pts
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground"
                          aria-label={`Edit entry for ${e.player}`}
                          onClick={() => startEditEntry(e)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground"
                          aria-label={`Delete entry for ${e.player}`}
                          onClick={() => setDeleteId(e.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </TabsContent>

        {/* LEADERBOARD */}
        <TabsContent value="season" className="mt-4 space-y-3">
          {season.length === 0 ? (
            <EmptyState
              text="No scores yet. The table builds as results come in."
              onAdd={() => setTab("add")}
            />
          ) : (
            <>
              <div className="grid grid-cols-[28px_1fr_48px_40px_40px_44px] gap-2 px-3 text-[11px] uppercase tracking-wide text-muted-foreground">
                <span>#</span>
                <span>Player</span>
                <span className="text-right">Pts</span>
                <span className="text-right">Wins</span>
                <span className="text-right">Avg</span>
                <span className="text-right">Games</span>
              </div>
              <div className="flex flex-col gap-2">
                {season.map((m, i) => (
                  <Card
                    key={m.player}
                    className={cn(
                      "border-border bg-card py-0",
                      i === 0 && "border-primary bg-primary/10",
                    )}
                  >
                    <CardContent className="grid grid-cols-[28px_1fr_48px_40px_40px_44px] items-center gap-2 p-3 text-sm">
                      <span
                        className={cn(
                          "font-extrabold text-muted-foreground",
                          i === 0 && "text-primary",
                        )}
                      >
                        {i + 1}
                      </span>
                      <span className="truncate font-bold">{m.player}</span>
                      <span
                        className={cn(
                          "text-right font-extrabold",
                          i === 0 && "text-primary",
                        )}
                      >
                        {m.points}
                      </span>
                      <span className="text-right text-muted-foreground">{m.wins}</span>
                      <span className="text-right text-muted-foreground">{m.avg}</span>
                      <span className="text-right text-muted-foreground">{m.games}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Scoring: 1/6 = 6 pts · 2/6 = 5 · 3/6 = 4 · 4/6 = 3 · 5/6 = 2 · 6/6 = 1 · X
                = 0. Ties break by average guesses.
              </p>

              <div className="border-t border-border pt-4">
                <h2 className="mb-2 text-xs font-extrabold uppercase tracking-wide">
                  Position over time
                </h2>
                <TrendChart entries={entries} />
              </div>
            </>
          )}
        </TabsContent>

        {/* ADD */}
        <TabsContent value="add" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-1">
            <Button
              variant={addMode === "paste" ? "secondary" : "outline"}
              className="text-xs font-bold uppercase"
              onClick={() => {
                setAddMode("paste");
                if (editingId) cancelEditEntry();
              }}
            >
              Paste chat text
            </Button>
            <Button
              variant={addMode === "manual" ? "secondary" : "outline"}
              className="text-xs font-bold uppercase"
              onClick={() => setAddMode("manual")}
            >
              Manual entry
            </Button>
          </div>

          {addMode === "paste" ? (
            <div className="space-y-3">
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Paste one person&apos;s Wordle share message, or a chunk of copied WhatsApp
                messages — either works.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="dateLocale">Chat date format</Label>
                <Select
                  value={dateLocale}
                  onValueChange={(v: string) => {
                    const loc = v === "mmdd" ? "mmdd" : "ddmm";
                    setDateLocale(loc);
                    saveDateLocale(loc);
                    if (pasteText) handlePaste(pasteText);
                  }}
                >
                  <SelectTrigger id="dateLocale" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ddmm">DD/MM/YYYY (AU default)</SelectItem>
                    <SelectItem value="mmdd">MM/DD/YYYY (US)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                rows={8}
                className="font-mono text-xs"
                placeholder={"Wordle 1,489 3/6\n\nor WhatsApp chat…"}
                value={pasteText}
                onChange={(e) => handlePaste(e.target.value)}
              />
              {singleGuesses && (
                <Card className="border-primary bg-card">
                  <CardContent className="space-y-3 p-4">
                    <div className="font-extrabold">
                      Found: {singleGuesses === "X" ? "X/6" : `${singleGuesses}/6`} —{" "}
                      {pointsFor(singleGuesses)} pts
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="singlePlayer">Player</Label>
                      <Input
                        id="singlePlayer"
                        value={singlePlayer}
                        onChange={(e) => setSinglePlayer(e.target.value)}
                        placeholder="Who played?"
                      />
                      <PlayerChips
                        players={players}
                        current={singlePlayer}
                        onPick={setSinglePlayer}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="singleDate">Date</Label>
                      <Input
                        id="singleDate"
                        type="date"
                        value={singleDate}
                        onChange={(e) => setSingleDate(e.target.value)}
                      />
                    </div>
                    <Button className="w-full font-extrabold uppercase" onClick={() => saveSingle()}>
                      Save score
                    </Button>
                  </CardContent>
                </Card>
              )}
              {bulkRows && (
                <Card className="border-primary bg-card">
                  <CardContent className="space-y-3 p-4">
                    <p className="text-sm text-muted-foreground">
                      Found {bulkRows.length} result{bulkRows.length > 1 ? "s" : ""} — untick
                      any you don&apos;t want.
                    </p>
                    <div className="flex flex-col gap-2">
                      {bulkRows.map((r, i) => (
                        <label
                          key={r.id}
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-md border border-border bg-background p-3",
                            r.include && "border-primary",
                          )}
                        >
                          <Checkbox
                            checked={r.include}
                            onCheckedChange={(c: boolean | "indeterminate") => {
                              setBulkRows((rows) =>
                                rows
                                  ? rows.map((row, idx) =>
                                      idx === i ? { ...row, include: c === true } : row,
                                    )
                                  : rows,
                              );
                            }}
                          />
                          <div className="min-w-0 flex-1 text-sm">
                            <span className="font-bold">{r.player}</span>
                            <span className="ml-2 text-[11px] text-muted-foreground">
                              {formatDate(r.date)} ·{" "}
                              {r.guesses === "X" ? "X/6" : `${r.guesses}/6`} ·{" "}
                              {pointsFor(r.guesses)} pts
                            </span>
                            {r.replaces && (
                              <Badge variant="outline" className="ml-2 text-[10px] text-yellow-500">
                                replaces existing
                              </Badge>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                    <Button className="w-full font-extrabold uppercase" onClick={saveBulk}>
                      Import results
                    </Button>
                  </CardContent>
                </Card>
              )}
              {pasteError && <p className="text-xs text-destructive">{pasteError}</p>}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="manualPlayer">Player</Label>
                <Input
                  id="manualPlayer"
                  value={manualPlayer}
                  onChange={(e) => setManualPlayer(e.target.value)}
                  placeholder="Who played?"
                />
                <PlayerChips
                  players={players}
                  current={manualPlayer}
                  onPick={setManualPlayer}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Guesses it took</Label>
                <div className="flex flex-wrap gap-1.5">
                  {(["1", "2", "3", "4", "5", "6", "X"] as const).map((g) => (
                    <Button
                      key={g}
                      type="button"
                      variant={manualGuesses === g ? "default" : "outline"}
                      className="h-11 w-11 font-extrabold"
                      onClick={() => setManualGuesses(g)}
                    >
                      {g}
                    </Button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">X = didn&apos;t solve it</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="manualDate">Date</Label>
                <Input
                  id="manualDate"
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                />
              </div>
              {editingId && (
                <p className="text-[11px] text-muted-foreground">Editing an existing result.</p>
              )}
              <div className="flex gap-2">
                <Button
                  className="w-full font-extrabold uppercase"
                  onClick={() => saveManual()}
                >
                  {editingId ? "Update score" : "Save score"}
                </Button>
                {editingId && (
                  <Button variant="outline" className="font-bold" onClick={cancelEditEntry}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* SHARE */}
        <TabsContent value="share" className="mt-4 space-y-3">
          {entries.length === 0 ? (
            <EmptyState text="Nothing to share yet — add a score first." onAdd={() => setTab("add")} />
          ) : (
            <>
              <div className="overflow-hidden rounded-lg border border-border">
                <ShareCanvas
                  id="recapCanvas"
                  entries={entries}
                  activeDate={activeDate}
                  className="block w-full"
                />
              </div>
              <Button className="w-full font-extrabold uppercase" onClick={() => void shareRecap()}>
                <Share2 className="mr-2 h-4 w-4" />
                Share to WhatsApp
              </Button>
              <Button
                variant="outline"
                className="w-full font-bold"
                onClick={() => void downloadRecap()}
              >
                <Download className="mr-2 h-4 w-4" />
                Download image
              </Button>
              {shareNote && (
                <p className="text-[11px] text-muted-foreground">{shareNote}</p>
              )}
            </>
          )}
        </TabsContent>

        {/* BACKUP */}
        <TabsContent value="backup" className="mt-4 space-y-3">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Everything&apos;s stored in this browser only — clearing site data, reinstalling, or
            switching phones wipes it. Export a backup now and then. Importing merges into
            what&apos;s already here; matching player+date entries get overwritten.
          </p>
          <Button className="w-full font-extrabold uppercase" onClick={exportBackup}>
            <Download className="mr-2 h-4 w-4" />
            Export backup (JSON)
          </Button>
          <label className="flex w-full cursor-pointer items-center justify-center rounded-md border border-border px-4 py-2.5 text-sm font-bold text-muted-foreground hover:bg-accent">
            <Upload className="mr-2 h-4 w-4" />
            Import backup
            <input
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => handleImportFile(e.target.files?.[0])}
            />
          </label>
          {pendingImport && (
            <Card className="border-primary">
              <CardContent className="space-y-3 p-4">
                <p className="text-sm text-muted-foreground">{importSummary}</p>
                {importNameSuggestions.length > 0 && (
                  <div className="space-y-2 rounded-md border border-yellow-500 p-3">
                    <p className="text-xs text-muted-foreground">
                      These incoming names look like they might be existing players — untick
                      any that are actually different people.
                    </p>
                    <div className="flex flex-col gap-1">
                      {importNameSuggestions.map((s, i) => (
                        <label
                          key={`${s.incoming}-${s.existing}`}
                          className="flex cursor-pointer items-center gap-2 rounded-md border border-border p-2 text-sm"
                        >
                          <Checkbox
                            checked={confirmedRenames.has(i)}
                            onCheckedChange={(c: boolean | "indeterminate") =>
                              setConfirmedRenames((prev) => {
                                const next = new Set(prev);
                                if (c === true) next.add(i);
                                else next.delete(i);
                                return next;
                              })
                            }
                          />
                          <span className="flex-1 truncate">
                            <span className="font-bold">{s.incoming}</span>
                            <span className="text-muted-foreground"> → merge into </span>
                            <span className="font-bold">{s.existing}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button onClick={confirmImport}>Import</Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPendingImport(null);
                      setImportSummary("");
                      setImportNameSuggestions([]);
                      setConfirmedRenames(new Set());
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          {importError && <p className="text-xs text-destructive">{importError}</p>}

          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Rename a player, or tick two or more names that are really the same person and
              merge them into one.
            </p>
            {players.length === 0 ? (
              <p className="text-xs text-muted-foreground">No players yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {players.map((p) => (
                  <div
                    key={p}
                    className="flex items-center gap-2 rounded-md border border-border p-2"
                  >
                    <Checkbox
                      aria-label={`Select ${p} for merge`}
                      checked={selectedForMerge.has(p)}
                      onCheckedChange={(c: boolean | "indeterminate") =>
                        setSelectedForMerge((prev) => {
                          const next = new Set(prev);
                          if (c === true) next.add(p);
                          else next.delete(p);
                          return next;
                        })
                      }
                    />
                    {renamingPlayer === p ? (
                      <>
                        <Input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          className="h-8 flex-1"
                        />
                        <Button size="sm" onClick={() => startMerge([p], renameValue)}>
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRenamingPlayer(null)}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 truncate text-sm font-bold">{p}</span>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Rename ${p}`}
                          onClick={() => {
                            setRenamingPlayer(p);
                            setRenameValue(p);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
            {selectedForMerge.size >= 2 && (
              <Card className="border-primary bg-card">
                <CardContent className="space-y-2 p-3">
                  <p className="text-xs text-muted-foreground">
                    Merge {selectedForMerge.size} selected names into:
                  </p>
                  <Input
                    value={mergeTargetName}
                    onChange={(e) => setMergeTargetName(e.target.value)}
                    placeholder="Final player name"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        startMerge(
                          [...selectedForMerge],
                          mergeTargetName || [...selectedForMerge][0] || "",
                        )
                      }
                    >
                      Merge
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedForMerge(new Set());
                        setMergeTargetName("");
                      }}
                    >
                      Clear selection
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            {mergePlan && mergePlan.conflicts.length > 0 && (
              <Card className="border-yellow-500 bg-card">
                <CardContent className="space-y-3 p-3">
                  <p className="text-xs text-muted-foreground">
                    These dates have more than one result among the names being merged — pick
                    which one to keep for each. You can fine-tune the score afterwards from the
                    Today tab.
                  </p>
                  {mergePlan.conflicts.map((c) => (
                    <div key={c.date} className="space-y-1">
                      <p className="text-[11px] font-bold uppercase text-muted-foreground">
                        {formatDate(c.date)}
                      </p>
                      <div className="flex flex-col gap-1">
                        {c.options.map((opt) => (
                          <label
                            key={opt.id}
                            className="flex cursor-pointer items-center gap-2 rounded-md border border-border p-2 text-sm"
                          >
                            <input
                              type="radio"
                              name={`merge-${c.date}`}
                              checked={mergeChoices[c.date]?.id === opt.id}
                              onChange={() =>
                                setMergeChoices((prev) => ({ ...prev, [c.date]: opt }))
                              }
                            />
                            <span className="flex-1 truncate">{opt.player}</span>
                            <span className="text-muted-foreground">
                              {opt.guesses === "X" ? "X/6" : `${opt.guesses}/6`}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={confirmMerge}>
                      Confirm merge
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelMerge}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Clearing wipes every result from this browser. There&apos;s no undo — export a
              backup first if you might want this data again.
            </p>
            <Button
              variant="destructive"
              className="mt-2 w-full font-extrabold uppercase"
              disabled={entries.length === 0}
              onClick={() => setClearAllOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear leaderboard
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Clear leaderboard confirm */}
      <AlertDialog open={clearAllOpen} onOpenChange={setClearAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear the entire leaderboard?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes all {entries.length} result{entries.length === 1 ? "" : "s"} from this
              browser. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClearAll}>Clear everything</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o: boolean) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Replace confirm */}
      <AlertDialog open={replaceOpen} onOpenChange={setReplaceOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace existing score?</AlertDialogTitle>
            <AlertDialogDescription>
              {replaceExisting && (
                <>
                  <strong>{replaceExisting.player}</strong> already has a score for{" "}
                  {formatDate(replaceExisting.date)} (
                  {replaceExisting.guesses === "X"
                    ? "X/6"
                    : `${replaceExisting.guesses}/6`}
                  ).
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {nameDiffers && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={updateName}
                onCheckedChange={(c: boolean | "indeterminate") => setUpdateName(c === true)}
              />
              Update display name to “
              {(replaceSource === "manual" ? manualPlayer : singlePlayer).trim()}”
            </label>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReplace}>Replace</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EmptyState({ text, onAdd }: { text: string; onAdd: () => void }) {
  return (
    <div className="px-5 py-14 text-center text-muted-foreground">
      <p className="mb-4 text-sm leading-relaxed">{text}</p>
      <Button onClick={onAdd} className="font-extrabold uppercase">
        + Add score
      </Button>
    </div>
  );
}

function PlayerChips({
  players,
  current,
  onPick,
}: {
  players: string[];
  current: string;
  onPick: (p: string) => void;
}) {
  if (!players.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {players.map((p) => (
        <Button
          key={p}
          type="button"
          size="sm"
          variant={p === current ? "default" : "outline"}
          className="h-7 rounded-full px-3 text-xs font-bold"
          onClick={() => onPick(p)}
        >
          {p}
        </Button>
      ))}
    </div>
  );
}
