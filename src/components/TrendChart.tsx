import { useMemo, useRef, useState } from "react";
import { buildPlayerColors } from "@/domain/colors";
import { getTrend, type PlayerTrend, type TrendPoint } from "@/domain/trend";
import type { Entry } from "@/domain/types";
import { formatDate } from "@/parse/dates";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SURFACE = "#141416"; // matches the app card background closely enough for the ring
const MUTED = "#898781";
const GRID = "#2c2c2a";

type ViewMode = "rank" | "points" | "overlay";
type LabelMode = "day" | "cumulative";

const W = 640;
const H = 280;
const PAD_L = 34;
const PAD_R = 14;
const PAD_T = 14;
const PAD_B = 30;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
function shortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${MONTHS[parseInt(m ?? "1", 10) - 1] ?? ""} ${parseInt(d ?? "1", 10)}`;
}

function niceMax(n: number): number {
  if (n <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(n)));
  const steps = [1, 2, 2.5, 5, 10];
  for (const s of steps) {
    if (n <= s * pow) return s * pow;
  }
  return 10 * pow;
}

export function TrendChart({ entries }: { entries: Entry[] }) {
  const [viewMode, setViewMode] = useState<ViewMode>("rank");
  const [showLabels, setShowLabels] = useState(false);
  const [labelMode, setLabelMode] = useState<LabelMode>("cumulative");
  const [showTable, setShowTable] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const trends = useMemo(() => getTrend(entries), [entries]);
  const dates = useMemo(() => [...new Set(entries.map((e) => e.date))].sort(), [entries]);
  const colors = useMemo(() => buildPlayerColors(trends.map((t) => t.player)), [trends]);

  const totalPlayers = trends.length;
  const maxCumPoints = useMemo(
    () =>
      niceMax(
        Math.max(1, ...trends.flatMap((t) => t.points.map((p) => p.cumPoints))),
      ),
    [trends],
  );

  if (dates.length < 2 || trends.length === 0) {
    return (
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Play a few more days to see a trend line — needs at least two dates of results.
      </p>
    );
  }

  const xAt = (date: string) => {
    const i = dates.indexOf(date);
    return PAD_L + (dates.length === 1 ? 0 : (i / (dates.length - 1)) * PLOT_W);
  };

  // Vertical padding so the best/worst lines don't sit flush on the plot edge.
  const Y_PAD_FRAC = 0.08;
  const mapY = (frac: number) => PAD_T + (Y_PAD_FRAC + frac * (1 - 2 * Y_PAD_FRAC)) * PLOT_H;

  const yForRank = (rank: number, playerCount: number) => {
    const denom = Math.max(1, totalPlayers, playerCount) - 1;
    const frac = denom === 0 ? 0 : (rank - 1) / denom;
    return mapY(frac);
  };
  const yForPoints = (points: number) => mapY(1 - points / maxCumPoints);
  const yForIndexedRank = (rank: number, playerCount: number) => {
    const denom = Math.max(1, totalPlayers, playerCount) - 1;
    const frac = denom === 0 ? 0 : (rank - 1) / denom;
    return mapY(frac);
  };
  const yForIndexedPoints = (points: number) =>
    mapY(1 - (maxCumPoints === 0 ? 0 : points / maxCumPoints));
  const yForIndexedPct = (pct: number) => mapY(1 - pct / 100);

  const linesFor = (mode: "rank" | "points") =>
    trends.map((t) => {
      const pts = t.points
        .map((p) => {
          const x = xAt(p.date);
          const y =
            mode === "rank"
              ? viewMode === "overlay"
                ? yForIndexedRank(p.rank, p.playerCount)
                : yForRank(p.rank, p.playerCount)
              : viewMode === "overlay"
                ? yForIndexedPoints(p.cumPoints)
                : yForPoints(p.cumPoints);
          return { x, y, p };
        })
        .filter((v) => Number.isFinite(v.x) && Number.isFinite(v.y));
      return { player: t.player, color: colors.get(t.player) ?? MUTED, pts };
    });

  const rankLines = viewMode !== "points" ? linesFor("rank") : [];
  const pointsLines = viewMode !== "rank" ? linesFor("points") : [];

  const pathFor = (pts: { x: number; y: number }[]) =>
    pts.map((v, i) => `${i === 0 ? "M" : "L"}${v.x.toFixed(2)},${v.y.toFixed(2)}`).join(" ");

  const handleMove = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * W;
    const frac = Math.min(1, Math.max(0, (relX - PAD_L) / PLOT_W));
    const idx = Math.round(frac * (dates.length - 1));
    setHoverIdx(idx);
  };

  const hoverDate = hoverIdx !== null ? dates[hoverIdx] : null;
  const hoverX = hoverDate ? xAt(hoverDate) : null;
  const hoverRows = hoverDate
    ? trends
        .map((t) => {
          const p = t.points.find((pt) => pt.date === hoverDate);
          if (!p) return null;
          return { player: t.player, color: colors.get(t.player) ?? MUTED, p };
        })
        .filter((r): r is { player: string; color: string; p: TrendPoint } => r !== null)
        .sort((a, b) => a.p.rank - b.p.rank)
    : [];

  // X-axis labels: thin the tick set so labels don't collide.
  const maxTicks = 6;
  const tickStep = Math.max(1, Math.ceil(dates.length / maxTicks));
  const xTicks = dates.filter((_, i) => i % tickStep === 0 || i === dates.length - 1);

  const yTicksRank =
    viewMode === "rank"
      ? Array.from({ length: totalPlayers }, (_, i) => i + 1)
      : [];
  const yTicksPoints =
    viewMode === "points"
      ? [0, maxCumPoints * 0.25, maxCumPoints * 0.5, maxCumPoints * 0.75, maxCumPoints]
      : [];
  const yTicksIndexed = viewMode === "overlay" ? [0, 25, 50, 75, 100] : [];

  const labelFor = (p: { dayPoints: number | null; cumPoints: number }) =>
    labelMode === "day" ? p.dayPoints : p.cumPoints;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-md border border-border p-0.5">
          {(
            [
              ["rank", "Rank"],
              ["points", "Points"],
              ["overlay", "Overlay"],
            ] as const
          ).map(([v, label]) => (
            <Button
              key={v}
              type="button"
              size="sm"
              variant={viewMode === v ? "secondary" : "ghost"}
              className="h-7 px-2 text-[11px] font-bold uppercase"
              onClick={() => setViewMode(v)}
            >
              {label}
            </Button>
          ))}
        </div>
        <Button
          type="button"
          size="sm"
          variant={showLabels ? "secondary" : "outline"}
          className="h-7 px-2 text-[11px] font-bold uppercase"
          onClick={() => setShowLabels((s) => !s)}
        >
          Point labels
        </Button>
        {showLabels && (
          <div className="flex gap-1 rounded-md border border-border p-0.5">
            {(
              [
                ["cumulative", "Total"],
                ["day", "That day"],
              ] as const
            ).map(([v, label]) => (
              <Button
                key={v}
                type="button"
                size="sm"
                variant={labelMode === v ? "secondary" : "ghost"}
                className="h-7 px-2 text-[11px] font-bold uppercase"
                onClick={() => setLabelMode(v)}
              >
                {label}
              </Button>
            ))}
          </div>
        )}
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none select-none"
        role="img"
        aria-label="Player standings over time"
        onPointerMove={(e) => handleMove(e.clientX)}
        onPointerDown={(e) => handleMove(e.clientX)}
        onPointerLeave={() => setHoverIdx(null)}
      >
        <rect x={0} y={0} width={W} height={H} fill="transparent" />

        {/* gridlines */}
        {viewMode === "rank" &&
          yTicksRank.map((r) => (
            <line
              key={`gr-${r}`}
              x1={PAD_L}
              x2={W - PAD_R}
              y1={yForRank(r, totalPlayers)}
              y2={yForRank(r, totalPlayers)}
              stroke={GRID}
              strokeWidth={1}
            />
          ))}
        {viewMode === "points" &&
          yTicksPoints.map((v, i) => (
            <line
              key={`gp-${i}`}
              x1={PAD_L}
              x2={W - PAD_R}
              y1={yForPoints(v)}
              y2={yForPoints(v)}
              stroke={GRID}
              strokeWidth={1}
            />
          ))}
        {viewMode === "overlay" &&
          yTicksIndexed.map((v) => (
            <line
              key={`gi-${v}`}
              x1={PAD_L}
              x2={W - PAD_R}
              y1={yForIndexedPct(v)}
              y2={yForIndexedPct(v)}
              stroke={GRID}
              strokeWidth={1}
            />
          ))}

        {/* y axis labels */}
        {viewMode === "rank" &&
          yTicksRank.map((r) => (
            <text
              key={`ylr-${r}`}
              x={PAD_L - 6}
              y={yForRank(r, totalPlayers) + 3}
              textAnchor="end"
              fontSize={9}
              fill={MUTED}
            >
              {r}
            </text>
          ))}
        {viewMode === "points" &&
          yTicksPoints.map((v, i) => (
            <text
              key={`ylp-${i}`}
              x={PAD_L - 6}
              y={yForPoints(v) + 3}
              textAnchor="end"
              fontSize={9}
              fill={MUTED}
            >
              {Math.round(v)}
            </text>
          ))}
        {viewMode === "overlay" &&
          yTicksIndexed.map((v) => (
            <text
              key={`yli-${v}`}
              x={PAD_L - 6}
              y={yForIndexedPct(v) + 3}
              textAnchor="end"
              fontSize={9}
              fill={MUTED}
            >
              {v}%
            </text>
          ))}

        {/* x axis labels */}
        {xTicks.map((d) => (
          <text
            key={`xl-${d}`}
            x={xAt(d)}
            y={H - PAD_B + 14}
            textAnchor="middle"
            fontSize={9}
            fill={MUTED}
          >
            {shortDate(d)}
          </text>
        ))}

        {/* crosshair */}
        {hoverX !== null && (
          <line
            x1={hoverX}
            x2={hoverX}
            y1={PAD_T}
            y2={H - PAD_B}
            stroke={MUTED}
            strokeWidth={1}
            strokeDasharray="2,3"
          />
        )}

        {/* rank lines (solid) */}
        {rankLines.map((l) => (
          <path
            key={`r-${l.player}`}
            d={pathFor(l.pts)}
            fill="none"
            stroke={l.color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {/* points lines (dashed, only meaningful alongside rank in overlay, or solid alone in points mode) */}
        {pointsLines.map((l) => (
          <path
            key={`p-${l.player}`}
            d={pathFor(l.pts)}
            fill="none"
            stroke={l.color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={viewMode === "overlay" ? "5,4" : undefined}
          />
        ))}

        {/* end markers */}
        {[...rankLines, ...pointsLines].map((l, li) => {
          const last = l.pts[l.pts.length - 1];
          if (!last) return null;
          return (
            <circle
              key={`end-${li}-${l.player}`}
              cx={last.x}
              cy={last.y}
              r={5}
              fill={l.color}
              stroke={SURFACE}
              strokeWidth={2}
            />
          );
        })}

        {/* point labels */}
        {showLabels &&
          (viewMode === "points" ? pointsLines : rankLines).map((l) =>
            l.pts.map((v, i) => {
              const val = labelFor(v.p);
              if (val === null) return null;
              return (
                <text
                  key={`lbl-${l.player}-${i}`}
                  x={v.x}
                  y={v.y - 8}
                  textAnchor="middle"
                  fontSize={9}
                  fill={MUTED}
                >
                  {val}
                </text>
              );
            }),
          )}

        {/* hover markers */}
        {hoverRows.map((r) => {
          const x = hoverX ?? 0;
          const y =
            viewMode === "points"
              ? yForPoints(r.p.cumPoints)
              : viewMode === "overlay"
                ? yForIndexedRank(r.p.rank, r.p.playerCount)
                : yForRank(r.p.rank, r.p.playerCount);
          return (
            <circle key={`hov-${r.player}`} cx={x} cy={y} r={4} fill={r.color} stroke={SURFACE} strokeWidth={2} />
          );
        })}
      </svg>

      {hoverRows.length > 0 && (
        <div className="rounded-md border border-border bg-card p-2 text-xs">
          <div className="mb-1 font-bold text-muted-foreground">
            {hoverDate ? formatDate(hoverDate) : ""}
          </div>
          <div className="flex flex-col gap-1">
            {hoverRows.map((r) => (
              <div key={r.player} className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: r.color }}
                />
                <span className="flex-1 truncate text-muted-foreground">{r.player}</span>
                <span className="font-bold">#{r.p.rank}</span>
                <span className="text-muted-foreground">{r.p.cumPoints} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {trends.map((t: PlayerTrend) => (
          <div key={t.player} className="flex items-center gap-1.5 text-xs">
            <span
              className="inline-block h-2 w-3 shrink-0 rounded-sm"
              style={{ backgroundColor: colors.get(t.player) ?? MUTED }}
            />
            <span className="text-muted-foreground">{t.player}</span>
          </div>
        ))}
      </div>
      {viewMode === "overlay" && (
        <p className="text-[11px] text-muted-foreground">
          Solid = rank position · dashed = points, both indexed to a 0–100% scale.
        </p>
      )}

      <button
        type="button"
        className={cn("text-[11px] font-bold uppercase text-muted-foreground underline")}
        onClick={() => setShowTable((s) => !s)}
      >
        {showTable ? "Hide" : "Show"} as table
      </button>
      {showTable && (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[420px] text-left text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="p-2 font-bold text-muted-foreground">Date</th>
                {trends.map((t) => (
                  <th key={t.player} className="p-2 font-bold text-muted-foreground">
                    {t.player}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dates.map((d) => (
                <tr key={d} className="border-b border-border last:border-0">
                  <td className="p-2 text-muted-foreground">{formatDate(d)}</td>
                  {trends.map((t) => {
                    const p = t.points.find((pt) => pt.date === d);
                    return (
                      <td key={t.player} className="p-2">
                        {p ? `#${p.rank} · ${p.cumPoints}pts` : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
