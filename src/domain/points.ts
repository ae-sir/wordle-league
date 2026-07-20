import type { Guesses } from "./types";

const POINTS: Record<Guesses, number> = {
  "1": 6,
  "2": 5,
  "3": 4,
  "4": 3,
  "5": 2,
  "6": 1,
  X: 0,
};

export function pointsFor(guesses: Guesses): number {
  return POINTS[guesses];
}

export function isGuesses(value: string): value is Guesses {
  return value === "X" || /^[1-6]$/.test(value);
}

export function guessVal(g: Guesses): number {
  return g === "X" ? 7 : parseInt(g, 10);
}
