import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReportResult } from "../app/result-context";

/**
 * The queue / solved / phase / score state machine that every map drill
 * re-implements. Lifted from the common shape in earth-science/currents and
 * earth-science/koppen-*.
 *
 * Two session flavours:
 *  - "practice": endless. The queue reshuffles when it runs low; `solved`
 *    stays empty; `done` is never true.
 *  - "complete": the completionist runs (the Drift / the climb / a journey).
 *    A correct answer moves the id into `solved` and out of the queue; a
 *    wrong answer sends it to the back. `done` is true once every id is
 *    solved.
 *
 * View state (flash / note / detail / nudge / typed) stays in the component —
 * it's presentation, and every drill shapes it differently.
 *
 * Scores and completion are persisted automatically via <DrillPage>. Pass
 * `onResult` to observe them too (or when using the hook outside a DrillPage).
 */

export type Phase = "ask" | "right" | "wrong";
export type SessionKind = "practice" | "complete";

export interface QuizSessionResult {
  score: { right: number; total: number };
  completed: boolean;
}

export interface QuizSessionOptions<TId> {
  allIds: TId[];
  session: SessionKind;
  /** Defaults to allIds.length. */
  total?: number;
  /** Deterministic shuffle hook, mainly for tests. Default Math.random-based. */
  shuffle?: (ids: TId[]) => TId[];
  onResult?: (r: QuizSessionResult) => void;
}

export interface QuizSession<TId> {
  target: TId | null;
  queue: TId[];
  solved: Set<TId>;
  phase: Phase;
  score: { right: number; total: number };
  /** Total answers given (right + wrong). Some drills call this "guesses". */
  tries: number;
  done: boolean;
  /** Record a correct answer for `id` and enter the "right" phase. */
  succeed: (id: TId) => void;
  /** Record a wrong answer and enter the "wrong" phase. */
  fail: () => void;
  /** From the "right" panel — drop the answered id and move on. */
  advance: () => void;
  /** From the "wrong" panel — requeue the id (complete mode) and move on. */
  retry: () => void;
  /** One button for both: dispatches on the current phase. */
  next: () => void;
  /** Restart the whole session (new shuffle, cleared score). */
  restart: () => void;
  /** Clear transient phase without touching progress (mode switches). */
  clearPhase: () => void;
}

function defaultShuffle<T>(a: T[]): T[] {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

export function useQuizSession<TId>(
  opts: QuizSessionOptions<TId>,
): QuizSession<TId> {
  const { allIds, session } = opts;
  const total = opts.total ?? allIds.length;
  const shuffle = opts.shuffle ?? defaultShuffle;
  const report = useReportResult();

  // Latest values, without forcing callbacks to depend on them.
  const shuffleRef = useRef(shuffle);
  shuffleRef.current = shuffle;
  const allIdsRef = useRef(allIds);
  allIdsRef.current = allIds;
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const onResultRef = useRef(opts.onResult);
  onResultRef.current = opts.onResult;

  const [queue, setQueue] = useState<TId[]>(() => shuffle(allIds));
  const [solved, setSolved] = useState<Set<TId>>(() => new Set());
  const [phase, setPhase] = useState<Phase>("ask");
  const [score, setScore] = useState({ right: 0, total: 0 });
  const [tries, setTries] = useState(0);

  const scoreRef = useRef(score);
  scoreRef.current = score;
  const solvedRef = useRef(solved);
  solvedRef.current = solved;

  // Re-seed whenever the session flavour or the id set changes.
  const seedKey = useMemo(
    () => `${session}:${allIds.length}`,
    [session, allIds.length],
  );
  const firstSeed = useRef(true);
  useEffect(() => {
    if (firstSeed.current) {
      firstSeed.current = false;
      return;
    }
    setQueue(shuffleRef.current(allIdsRef.current));
    setSolved(new Set());
    setPhase("ask");
    setScore({ right: 0, total: 0 });
    setTries(0);
  }, [seedKey]);

  const target = queue.length ? queue[0] : null;
  const done = session === "complete" && solved.size >= total;

  const publish = useCallback(
    (nextScore: { right: number; total: number }, solvedCount: number) => {
      const completed =
        sessionRef.current === "complete" && solvedCount >= total;
      const payload: QuizSessionResult = { score: nextScore, completed };
      report(payload);
      onResultRef.current?.(payload);
    },
    [report, total],
  );

  const succeed = useCallback(
    (id: TId) => {
      const nextScore = {
        right: scoreRef.current.right + 1,
        total: scoreRef.current.total + 1,
      };
      let solvedCount = solvedRef.current.size;
      setTries((g) => g + 1);
      setScore(nextScore);
      if (sessionRef.current === "complete" && !solvedRef.current.has(id)) {
        const n = new Set(solvedRef.current);
        n.add(id);
        solvedCount = n.size;
        setSolved(n);
      }
      setPhase("right");
      publish(nextScore, solvedCount);
    },
    [publish],
  );

  const fail = useCallback(() => {
    const nextScore = {
      right: scoreRef.current.right,
      total: scoreRef.current.total + 1,
    };
    setTries((g) => g + 1);
    setScore(nextScore);
    setPhase("wrong");
    publish(nextScore, solvedRef.current.size);
  }, [publish]);

  const lowWaterReshuffle = useCallback((rest: TId[]): TId[] => {
    return rest.length <= 1 ? shuffleRef.current(allIdsRef.current) : rest;
  }, []);

  const advance = useCallback(() => {
    setPhase("ask");
    setQueue((q) => {
      const rest = q.slice(1);
      return sessionRef.current === "complete" ? rest : lowWaterReshuffle(rest);
    });
  }, [lowWaterReshuffle]);

  const retry = useCallback(() => {
    setPhase("ask");
    setQueue((q) => {
      const rest = q.slice(1);
      if (sessionRef.current === "complete") return [...rest, q[0]];
      return lowWaterReshuffle(rest);
    });
  }, [lowWaterReshuffle]);

  const next = useCallback(() => {
    if (phase === "wrong") retry();
    else advance();
  }, [phase, retry, advance]);

  const restart = useCallback(() => {
    setQueue(shuffleRef.current(allIdsRef.current));
    setSolved(new Set());
    setPhase("ask");
    setScore({ right: 0, total: 0 });
    setTries(0);
  }, []);

  const clearPhase = useCallback(() => setPhase("ask"), []);

  return {
    target,
    queue,
    solved,
    phase,
    score,
    tries,
    done,
    succeed,
    fail,
    advance,
    retry,
    next,
    restart,
    clearPhase,
  };
}
