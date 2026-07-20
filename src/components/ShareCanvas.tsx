import { useEffect, useRef } from "react";
import { pointsFor } from "@/domain/points";
import { getDailyEntries, getDailyWinners, getSeason } from "@/domain/season";
import type { Entry } from "@/domain/types";
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

  let y = 40 + 34 + 26 + 26 + daily.length * 54 + 30 + 24 + 26 + season.length * 44 + 40;
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
  ctx.fillText("SEASON STANDINGS", width / 2, cy);
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

  cy += 20;
  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.dim;
  ctx.font = "10px Arial, sans-serif";
  ctx.fillText("Wordle League · auto-generated", width / 2, cy);
}

export function ShareCanvas({
  entries,
  activeDate,
  className,
  id,
}: {
  entries: Entry[];
  activeDate: string | null;
  className?: string;
  id?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (ref.current) paint(ref.current, entries, activeDate);
  }, [entries, activeDate]);

  return (
    <canvas
      id={id}
      ref={ref}
      className={className}
      aria-label="League recap image"
    />
  );
}
