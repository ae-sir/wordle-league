import { useEffect, useRef } from "react";
import { buildPlayerColors } from "@/domain/colors";
import { pointsFor } from "@/domain/points";
import { getDailyEntries, getDailyWinners, getSeason } from "@/domain/season";
import { getTrend, niceMax } from "@/domain/trend";
import type { Entry } from "@/domain/types";
import type { TrendViewMode } from "@/components/TrendChart";
import { formatDate } from "@/parse/dates";

const COLORS = {
  bg: "#121213",
  tile: "#3A3A3C",
  border: "#3A3A3C",
  green: "#6AAA64",
  dim: "#818384",
} as const;

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function paint(
  canvas: HTMLCanvasElement,
  entries: Entry[],
  activeDate: string | null,
  trendMode: TrendViewMode,
): void {
  if (entries.length === 0) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = 420;
  const scale = 2;
  const daily = activeDate ? getDailyEntries(entries, activeDate) : [];
  const winners = getDailyWinners(daily);
  const season = getSeason(entries);
  const padX = 20;

  const trendDates = [...new Set(entries.map((e) => e.date))].sort();
  const trend = trendDates.length >= 2 ? getTrend(entries) : [];
  const trendColors = buildPlayerColors(trend.map((t) => t.player));
  const maxCumPoints = niceMax(
    Math.max(1, ...trend.flatMap((t) => t.points.map((p) => p.cumPoints))),
  );
  const CHART_H = 110;
  const legendRows = trend.length > 0 ? Math.ceil(trend.length / 2) : 0;
  const trendBlockH =
    trend.length > 0
      ? 26 + 10 + CHART_H + 14 + legendRows * 16 + 10 + (trendMode === "overlay" ? 14 : 0)
      : 0;

  let y =
    40 + 34 + 26 + 26 + daily.length * 54 + 30 + 24 + 26 + season.length * 44 + 40 + trendBlockH;
  const height = y + 20;

  canvas.width = width * scale;
  canvas.height = height * scale;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(scale, scale);

  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, "#17171A");
  grad.addColorStop(1, COLORS.bg);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  let cy = 40;
  const letters = "RECAP".split("");
  const tileSize = 30;
  const gap = 4;
  const totalW = letters.length * tileSize + (letters.length - 1) * gap;
  let tx = (width - totalW) / 2;
  ctx.font = "800 16px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const ch of letters) {
    ctx.fillStyle = COLORS.green;
    roundRect(ctx, tx, cy, tileSize, tileSize, 3);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillText(ch, tx + tileSize / 2, cy + tileSize / 2 + 1);
    tx += tileSize + gap;
  }
  cy += tileSize + 18;

  ctx.fillStyle = COLORS.dim;
  ctx.font = "12px Arial, sans-serif";
  ctx.fillText(activeDate ? formatDate(activeDate) : "", width / 2, cy);
  cy += 30;

  ctx.fillStyle = COLORS.dim;
  ctx.font = "700 11px Arial, sans-serif";
  ctx.fillText("TODAY'S RESULTS", width / 2, cy);
  cy += 20;

  for (const e of daily) {
    const won = winners.has(e.player);
    const rowH = 46;
    const rowW = width - padX * 2;
    if (won) {
      ctx.fillStyle = "rgba(106,170,100,0.12)";
      roundRect(ctx, padX, cy, rowW, rowH, 6);
      ctx.fill();
    }
    ctx.strokeStyle = won ? COLORS.green : COLORS.border;
    ctx.lineWidth = 1;
    roundRect(ctx, padX, cy, rowW, rowH, 6);
    ctx.stroke();

    const badgeSize = 30;
    const badgeX = padX + 10;
    const badgeY = cy + (rowH - badgeSize) / 2;
    ctx.fillStyle = e.guesses === "X" ? COLORS.tile : COLORS.green;
    roundRect(ctx, badgeX, badgeY, badgeSize, badgeSize, 3);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "800 12px Arial, sans-serif";
    ctx.fillText(
      e.guesses === "X" ? "X" : `${e.guesses}/6`,
      badgeX + badgeSize / 2,
      badgeY + badgeSize / 2 + 1,
    );

    ctx.textAlign = "left";
    ctx.fillStyle = "#fff";
    ctx.font = "700 14px Arial, sans-serif";
    ctx.fillText(e.player + (won ? "  👑" : ""), badgeX + badgeSize + 12, cy + rowH / 2 + 1);

    ctx.textAlign = "right";
    ctx.fillStyle = COLORS.dim;
    ctx.font = "700 12px Arial, sans-serif";
    ctx.fillText(`${pointsFor(e.guesses)} pts`, padX + rowW - 12, cy + rowH / 2 + 1);
    ctx.textAlign = "center";
    cy += rowH + 8;
  }

  cy += 14;
  ctx.fillStyle = COLORS.dim;
  ctx.font = "700 11px Arial, sans-serif";
  ctx.fillText("OVERALL STANDINGS", width / 2, cy);
  cy += 22;

  const cols = [padX + 14, padX + 40, width - padX - 130, width - padX - 80, width - padX - 20];
  ctx.textAlign = "left";
  ctx.fillStyle = COLORS.dim;
  ctx.font = "700 10px Arial, sans-serif";
  ctx.fillText("#", cols[0] ?? 0, cy);
  ctx.fillText("PLAYER", cols[1] ?? 0, cy);
  ctx.textAlign = "right";
  ctx.fillText("PTS", cols[2] ?? 0, cy);
  ctx.fillText("WINS", cols[3] ?? 0, cy);
  ctx.fillText("AVG", cols[4] ?? 0, cy);
  cy += 18;

  season.forEach((m, i) => {
    const rowH = 36;
    const rowW = width - padX * 2;
    const first = i === 0;
    if (first) {
      ctx.fillStyle = "rgba(106,170,100,0.12)";
      roundRect(ctx, padX, cy, rowW, rowH, 5);
      ctx.fill();
    }
    ctx.strokeStyle = first ? COLORS.green : COLORS.border;
    roundRect(ctx, padX, cy, rowW, rowH, 5);
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.fillStyle = first ? COLORS.green : COLORS.dim;
    ctx.font = "800 13px Arial, sans-serif";
    ctx.fillText(String(i + 1), cols[0] ?? 0, cy + rowH / 2 + 1);
    ctx.fillStyle = "#fff";
    ctx.font = "700 13px Arial, sans-serif";
    ctx.fillText(m.player, cols[1] ?? 0, cy + rowH / 2 + 1);
    ctx.textAlign = "right";
    ctx.fillStyle = first ? COLORS.green : "#fff";
    ctx.font = "800 13px Arial, sans-serif";
    ctx.fillText(String(m.points), cols[2] ?? 0, cy + rowH / 2 + 1);
    ctx.fillStyle = COLORS.dim;
    ctx.font = "12px Arial, sans-serif";
    ctx.fillText(String(m.wins), cols[3] ?? 0, cy + rowH / 2 + 1);
    ctx.fillText(m.avg, cols[4] ?? 0, cy + rowH / 2 + 1);
    cy += rowH + 6;
  });

  if (trend.length > 0) {
    cy += 14;
    ctx.textAlign = "center";
    ctx.fillStyle = COLORS.dim;
    ctx.font = "700 11px Arial, sans-serif";
    const title =
      trendMode === "rank"
        ? "POSITION OVER TIME"
        : trendMode === "points"
          ? "POINTS OVER TIME"
          : "POSITION & POINTS OVER TIME";
    ctx.fillText(title, width / 2, cy);
    cy += 22;

    const chartX0 = padX + 18;
    const chartX1 = width - padX;
    const chartY0 = cy;
    const chartY1 = cy + CHART_H;
    const totalPlayers = trend.length;
    const Y_PAD = 10; // top/bottom padding so the best/worst lines aren't flush on the edge

    // frac: 0 = top of the plot, 1 = bottom
    const rankFrac = (rank: number) => (rank - 1) / Math.max(1, totalPlayers - 1);
    const pointsFrac = (points: number) => 1 - points / maxCumPoints;
    const yAtFrac = (frac: number) =>
      chartY0 + Y_PAD + frac * (chartY1 - chartY0 - 2 * Y_PAD);

    const xAt = (date: string) => {
      const i = trendDates.indexOf(date);
      return (
        chartX0 +
        (trendDates.length <= 1 ? 0 : (i / (trendDates.length - 1)) * (chartX1 - chartX0))
      );
    };

    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1;
    ctx.textAlign = "right";
    ctx.fillStyle = COLORS.dim;
    ctx.font = "700 9px Arial, sans-serif";

    if (trendMode === "rank") {
      for (let r = 1; r <= totalPlayers; r++) {
        const gy = yAtFrac(rankFrac(r));
        ctx.beginPath();
        ctx.moveTo(chartX0, gy);
        ctx.lineTo(chartX1, gy);
        ctx.stroke();
        ctx.fillText(String(r), chartX0 - 6, gy + 3);
      }
    } else if (trendMode === "points") {
      for (const v of [0, 0.25, 0.5, 0.75, 1]) {
        const gy = yAtFrac(1 - v);
        ctx.beginPath();
        ctx.moveTo(chartX0, gy);
        ctx.lineTo(chartX1, gy);
        ctx.stroke();
        ctx.fillText(String(Math.round(v * maxCumPoints)), chartX0 - 6, gy + 3);
      }
    } else {
      for (const pct of [0, 25, 50, 75, 100]) {
        const gy = yAtFrac(1 - pct / 100);
        ctx.beginPath();
        ctx.moveTo(chartX0, gy);
        ctx.lineTo(chartX1, gy);
        ctx.stroke();
        ctx.fillText(`${pct}%`, chartX0 - 6, gy + 3);
      }
    }

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const t of trend) {
      const color = trendColors.get(t.player) ?? COLORS.dim;

      const drawLine = (frac: (p: (typeof t.points)[number]) => number, dashed: boolean) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash(dashed ? [5, 4] : []);
        ctx.beginPath();
        t.points.forEach((p, i) => {
          const px = xAt(p.date);
          const py = yAtFrac(frac(p));
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
        ctx.setLineDash([]);

        const last = t.points[t.points.length - 1];
        if (last) {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(xAt(last.date), yAtFrac(frac(last)), 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = COLORS.bg;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      };

      if (trendMode === "rank") {
        drawLine((p) => rankFrac(p.rank), false);
      } else if (trendMode === "points") {
        drawLine((p) => pointsFrac(p.cumPoints), false);
      } else {
        drawLine((p) => rankFrac(p.rank), false);
        drawLine((p) => pointsFrac(p.cumPoints), true);
      }
    }

    cy = chartY1 + 14;

    ctx.textAlign = "left";
    ctx.font = "700 10px Arial, sans-serif";
    const legendColW = (width - padX * 2) / 2;
    trend.forEach((t, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const lx = padX + col * legendColW;
      const ly = cy + row * 16;
      ctx.fillStyle = trendColors.get(t.player) ?? COLORS.dim;
      roundRect(ctx, lx, ly - 8, 12, 8, 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      const name = t.player.length > 16 ? `${t.player.slice(0, 15)}…` : t.player;
      ctx.fillText(name, lx + 18, ly - 1);
    });
    cy += legendRows * 16 + 10;

    if (trendMode === "overlay") {
      ctx.textAlign = "center";
      ctx.fillStyle = COLORS.dim;
      ctx.font = "10px Arial, sans-serif";
      ctx.fillText("Solid = rank · dashed = points, indexed to 0–100%", width / 2, cy);
      cy += 14;
    }
  }

  cy += trend.length > 0 ? 6 : 20;
  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.dim;
  ctx.font = "10px Arial, sans-serif";
  ctx.fillText("Wordle League · auto-generated", width / 2, cy);
}

export function ShareCanvas({
  entries,
  activeDate,
  trendMode = "rank",
  className,
  id,
}: {
  entries: Entry[];
  activeDate: string | null;
  trendMode?: TrendViewMode;
  className?: string;
  id?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (ref.current) paint(ref.current, entries, activeDate, trendMode);
  }, [entries, activeDate, trendMode]);

  return (
    <canvas
      id={id}
      ref={ref}
      className={className}
      aria-label="League recap image"
    />
  );
}
