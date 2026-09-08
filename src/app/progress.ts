/**
 * Per-drill progress, persisted to localStorage. Deliberately small and
 * schema-loose: drills report whatever they have. The catalog reads it back
 * to annotate cards.
 *
 * Drills that have been ported onto the shared engine (src/engine) report
 * real scores automatically via <DrillPage>. Others currently only record
 * `visitedAt`.
 */
export interface DrillProgress {
  visitedAt?: number;
  /** Best streak / run the drill has reported. */
  best?: number;
  /** Completion flag for "journey"-style completionist modes. */
  completed?: boolean;
  /** Most recent score the drill reported. */
  lastScore?: { right: number; total: number };
}

export interface DrillResult {
  best?: number;
  completed?: boolean;
  score?: { right: number; total: number };
}

const KEY = "information-maps:progress:v1";

type Store = Record<string, DrillProgress>;

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function write(store: Store): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* private mode / quota — progress is a nicety, not load-bearing */
  }
}

export function getProgress(id: string): DrillProgress | undefined {
  return read()[id];
}

export function getAllProgress(): Store {
  return read();
}

export function markVisited(id: string): void {
  const store = read();
  store[id] = { ...store[id], visitedAt: Date.now() };
  write(store);
}

export function reportResult(id: string, result: DrillResult): void {
  const store = read();
  const prev = store[id] ?? {};
  store[id] = {
    ...prev,
    visitedAt: Date.now(),
    best:
      result.best != null
        ? Math.max(result.best, prev.best ?? 0)
        : prev.best,
    completed: result.completed || prev.completed,
    lastScore: result.score ?? prev.lastScore,
  };
  write(store);
}
