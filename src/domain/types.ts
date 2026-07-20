export type Guesses = "1" | "2" | "3" | "4" | "5" | "6" | "X";

export type Entry = {
  id: string;
  player: string;
  date: string; // YYYY-MM-DD
  guesses: Guesses;
  addedAt: number;
};

export type SeasonRow = {
  player: string;
  points: number;
  games: number;
  solved: number;
  totalGuesses: number;
  wins: number;
  avg: string;
};

export type BulkRow = {
  id: string;
  player: string;
  date: string;
  guesses: Guesses;
  include: boolean;
  replaces: boolean;
};

export type PasteResult =
  | { kind: "bulk"; rows: BulkRow[] }
  | { kind: "single"; guesses: Guesses }
  | { kind: "error"; message: string }
  | { kind: "empty" };

export type DateLocale = "ddmm" | "mmdd";

export type UpsertResult =
  | { needsConfirm: true; existing: Entry }
  | { needsConfirm: false; entries: Entry[] };

export type NameReplacePolicy = "keep" | "update" | "ask";
