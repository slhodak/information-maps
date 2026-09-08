import { useMemo } from "react";
import { Link } from "react-router-dom";
import { DRILLS, SUBJECT_ORDER } from "../content/registry";
import type { DrillMeta } from "../content/types";
import { getAllProgress } from "./progress";

function Card({ d }: { d: DrillMeta }) {
  const progress = getAllProgress()[d.id];
  const to = d.kind === "explorable" ? `/x/${d.id}` : `/d/${d.id}`;

  return (
    <Link
      to={to}
      className="group flex flex-col rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition-colors hover:border-slate-600 hover:bg-slate-900"
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
          {d.kind === "explorable" ? "Explore" : "Drill"}
        </span>
        {d.needsNetwork && (
          <span
            title="Loads a script from a CDN at runtime"
            className="text-[11px] text-amber-500/80"
          >
            · needs network
          </span>
        )}
        {progress?.completed && (
          <span className="text-[11px] text-emerald-400">· completed</span>
        )}
        {progress?.best != null && !progress.completed && (
          <span className="text-[11px] text-slate-400">
            · best {progress.best}
          </span>
        )}
        {progress?.visitedAt && !progress.best && !progress.completed && (
          <span className="text-[11px] text-slate-600">· visited</span>
        )}
      </div>
      <h3 className="text-base font-semibold text-slate-100 group-hover:text-white">
        {d.title}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{d.blurb}</p>
    </Link>
  );
}

export default function Catalog() {
  const bySubject = useMemo(() => {
    const map = new Map<DrillMeta["subject"], DrillMeta[]>();
    for (const d of DRILLS) {
      const list = map.get(d.subject) ?? [];
      list.push(d);
      map.set(d.subject, list);
    }
    return map;
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:py-16">
      <header className="mb-10">
        <div
          className="mb-2 text-xs font-semibold uppercase tracking-widest"
          style={{ color: "#e3a542" }}
        >
          Information Maps
        </div>
        <h1 className="text-3xl font-semibold text-slate-50">
          A learning platform
        </h1>
        <p className="mt-2 max-w-2xl text-slate-400">
          Map drills, vocabulary drills and explorables across geography, earth
          science, machine learning and music. Pick one.
        </p>
      </header>

      <div className="flex flex-col gap-10">
        {SUBJECT_ORDER.map((subject) => {
          const list = bySubject.get(subject);
          if (!list?.length) return null;
          return (
            <section key={subject}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
                {subject}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((d) => (
                  <Card key={d.id} d={d} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
