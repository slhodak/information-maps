/**
 * Answer matching, factored out of the drills. Every drill had its own
 * `norm` + `lev` + `matches` trio; this is the generalised version.
 *
 * Extracted from earth-science/currents, which is the strictest user
 * (accent-folding, stop-word stripping, typo tolerance scaled to word
 * length). Other drills pass different stop words.
 */

export interface MatcherOptions {
  /** Words stripped before comparing, e.g. ["the", "current", "ocean", "sea"]. */
  stopWords?: string[];
  /**
   * Allow a Levenshtein slip on aliases at least this long. 0 disables fuzzy
   * matching (exact-after-normalise only). Default 6.
   */
  fuzzyMinLength?: number;
}

const COMBINING_MARKS = /[̀-ͯ]/g;

export function normalizeAnswer(s: string, stopWords: string[] = []): string {
  let out = s
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ");
  if (stopWords.length) {
    const re = new RegExp(`\\b(${stopWords.join("|")})\\b`, "g");
    out = out.replace(re, " ");
  }
  return out.replace(/\s+/g, " ").trim();
}

export function levenshtein(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const m = a.length;
  const n = b.length;
  let prev = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[n];
}

/**
 * Build a matcher bound to a set of options. Returns `(typed, aliases) =>
 * boolean` — true when `typed` matches any alias after normalisation,
 * forgiving a typo or two on longer aliases.
 */
export function makeMatcher(opts: MatcherOptions = {}) {
  const stop = opts.stopWords ?? [];
  const fuzzyMin = opts.fuzzyMinLength ?? 6;
  return function matches(typed: string, aliases: string[]): boolean {
    const t = normalizeAnswer(typed, stop);
    if (!t) return false;
    for (const a of aliases) {
      const k = normalizeAnswer(a, stop);
      if (!k) continue;
      if (t === k) return true;
      if (
        fuzzyMin > 0 &&
        k.length >= fuzzyMin &&
        levenshtein(t, k) <= (k.length >= 12 ? 3 : 2)
      ) {
        return true;
      }
    }
    return false;
  };
}
