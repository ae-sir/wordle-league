// Fixed categorical order, validated (scripts/validate_palette.js) against this
// app's dark chart surface — never cycle or reorder per-render, identity must
// stay stable for a given player across renders and over the season.
const CATEGORICAL_DARK = [
  "#3987e5", // blue
  "#d95926", // orange
  "#199e70", // aqua
  "#c98500", // yellow
  "#d55181", // magenta
  "#4caf50", // green (shifted off the app's primary accent #6AAA64)
  "#9085e9", // violet
  "#e66767", // red
] as const;

const OTHER_COLOR = "#898781"; // muted ink — fallback past the validated slot count

/**
 * Stable player -> color assignment. `players` must be the same list (order
 * doesn't matter, it's sorted here) across calls so a player keeps one color
 * for the whole season instead of repainting when the roster changes.
 */
export function buildPlayerColors(players: string[]): Map<string, string> {
  const sorted = [...players].sort();
  const map = new Map<string, string>();
  sorted.forEach((p, i) => {
    map.set(p, CATEGORICAL_DARK[i] ?? OTHER_COLOR);
  });
  return map;
}
