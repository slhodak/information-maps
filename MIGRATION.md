# Migration plan & status

Refactor of the loose one-file study apps into one platform. Phases are
independent enough to stop after any of them.

## Phase 1 — scaffold + catalog · **done**

- Vite + React + TypeScript + React Router + Tailwind.
- `src/content/<subject>/<id>/index.*` — each former single file, moved
  verbatim, data co-located.
- `src/content/registry.ts` — the manifest the catalog renders from.
- `src/app/Catalog.tsx` — home screen grouped by subject.
- Route-level `React.lazy` per drill (`/d/:id`), so the catalog ships ~15 KB
  of JS and a drill's geometry blob loads only when opened.
- The two full-page HTML explorables run in an iframe (`/x/:id`) from
  `public/explorables/`. They can't be React routes (own `<head>`, fixed HUD,
  `overflow:hidden` body). Folding them in properly is Phase 7.

## Phase 2 — shared UI + persistence · **done**

- `src/app/progress.ts` — localStorage-backed per-drill record
  (`visitedAt`, `best`, `completed`, `lastScore`). `src/app/result-context.tsx`
  lets a drill report results; `<DrillPage>` wires it to the store.
- Catalog cards show `visited` / `best N` / `completed`.
- `src/ui/` — `SegButton`, `SegRow`, `Toggle`, `Panel`, `DrillHeading`,
  factored from the near-identical copies each drill carried. Used by the
  shell and by ported drills; legacy drills keep their inline versions until
  they're ported (Phase 5).

## Phase 3 — quiz engine · **partly done**

- `src/engine/match.ts` — `normalizeAnswer` / `levenshtein` / `makeMatcher`,
  the `norm`+`lev`+`matches` trio every drill re-implemented. Parametrised by
  stop words and typo tolerance.
- `src/engine/useQuizSession.ts` — the headless
  `queue / solved / phase / score / tries` state machine, with `practice` and
  `complete` (Drift / climb / journey) flavours. Reports score + completion
  through the result context automatically.
- **Adopted so far:** `earth-science/currents` uses `match.ts` and reports
  progress. Its `queue/solved/phase` cluster is *not yet* on `useQuizSession`
  (see recipe below).

## Phase 4 — map kit · **partly done**

- `src/map/projection.ts` — `mercY`, `mercLat`, `haversine`, `wrapLon`,
  `segDist`, `nearestOnPath`, `shuffle`. Pure, lifted from `currents`.
- `src/map/AtlasMap.tsx` — a generic pan / zoom / pinch / wheel / resize SVG
  surface. Children draw in world coordinates; taps report back in world
  coordinates with a tolerance. `wrapX` renders repeating copies for a
  seamless longitude. **Not yet adopted** — `currents` is canvas-based and
  keeps its renderer; the SVG drills are the intended users.
- **Adopted so far:** `currents` uses `projection.ts` (`mercY`, `mercLat`,
  `haversine`, `segDist`, `shuffle`) in place of its private copies.

---

## Recipe: port a map drill onto the engine

The koppen drills and `currents` share almost the same session code. To move
one onto `useQuizSession`:

1. Delete the local `queue` / `solved` / `phase` / `score` / `tries`
   `useState`s and the `succeed` / `fail` / `advance` / `again` / `switchSession`
   helpers.
2. ```jsx
   const q = useQuizSession({
     allIds,
     session: session === "practice" ? "practice" : "complete",
     total: TOTAL,
   });
   ```
3. Map the old names: `q.target`, `q.solved`, `q.phase`, `q.score`, `q.tries`,
   `q.done`. Call `q.succeed(id)` / `q.fail()` from the answer handlers, and
   `q.advance()` / `q.retry()` (or `q.next()`) from the outcome buttons.
4. Keep the view state (`flash`, `note`, `detail`, `nudge`, `typed`) local —
   set it alongside the `q.*` calls as before.
5. Replace the local `norm` / `matches` with
   `makeMatcher({ stopWords: [...] })`.
6. Drop the progress-reporting `useEffect` — the hook does it.

## Recipe: port a drill's map onto `<AtlasMap>` (SVG drills only)

1. Pick a world space (the geo drills: `x = lon + 180`,
   `y = TOPY - mercY(lat)`), and pass `worldWidth` / `worldHeight`.
2. Move the SVG map content into `<AtlasMap>`'s children — it already sits
   inside the pan/zoom `<g>`, so draw in world units and drop the local
   transform math.
3. Replace the local ResizeObserver + gesture `useEffect`s with `AtlasMap`.
4. Convert the tap handler to `onPick={(wx, wy, { tolWorld, inside }) => …}`.
   Reuse `nearestOnPath` for polyline hit-testing.

## Remaining phases (not started)

- **5** — collapse the geography drills (`india`, `africa-cities`, `brazil`,
  `california`): convert from inline-`S` styles to Tailwind + `src/ui`, put
  them on the engine + map kit. They differ (counties vs cities vs states,
  elevation layers) so aim for a thin per-region component over the shared
  kit, not one mega-component.
- **6** — fold `music/clef-drill` and the two `ml/*` drills onto the engine
  (session + scoring + persistence) while keeping their bespoke renderers.
- **7** — bring the two explorables in properly: strip their chrome, mount the
  canvas in the shell, `npm install three` instead of the CDN script.
- **8** — delete the dead duplicated code; document the content-module format.
