# Information Maps

A single learning platform that gathers the study drills that were previously
separate one-file apps: map drills, vocabulary drills, and a couple of
explorables, across geography, earth science, machine learning and music.

## Run it

```sh
./start.sh          # installs deps on first run, then starts the dev server
```

or directly:

```sh
npm install
npm run dev         # http://localhost:5173
npm run build       # production build into dist/
npm run preview     # serve the production build
npm run typecheck   # tsc --noEmit (see note below)
```

## Layout

```
src/
  app/        shell — routing, catalog, layout, progress store (localStorage)
  ui/         shared primitives (SegButton, Toggle, Panel, headings)
  engine/     headless quiz session hook + answer matching
  map/        projection helpers + a generic pan/zoom SVG map surface
  content/
    registry.ts            the catalog manifest — one entry per drill
    <subject>/<id>/index.*  each drill, data co-located, lazily loaded
public/
  explorables/  the two legacy full-page HTML explorables (served in an iframe)
```

Every drill is a route-level lazy chunk, so opening the catalog loads none of
the (sometimes hundreds of KB) embedded map geometry until a drill is picked.

## State of the refactor

See `MIGRATION.md` for the plan and what's done. In short:

- **Phase 1–2 (done):** unified app shell, catalog grouped by subject,
  per-drill progress persisted and shown on cards, shared UI primitives, the
  two HTML explorables folded in behind iframe routes.
- **Phase 3–4 (in progress):** `src/engine` and `src/map` are extracted and
  documented. `earth-science/currents` uses the shared projection + matching
  helpers and reports progress. The remaining map drills still carry their
  own copies — `MIGRATION.md` has the port recipe.

## Notes

- `npm run typecheck` still reports errors inside the migrated drill files
  (`src/content/**`). They predate this project's TS setup; dev and build go
  through esbuild and never type-check, so the app runs regardless. Porting a
  drill onto `src/engine` + `src/map` is what cleans it up.
- The South America jeep explorable loads `three.js` from a CDN — it needs
  network. Vendoring it is part of a later phase.
- Original single-file sources are preserved in git history (they were moved
  from `claude-projects/` into `src/content/**` and `public/explorables/`).
