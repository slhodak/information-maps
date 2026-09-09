import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { DRILLS, SUBJECT_ORDER } from "../content/registry";
import type { DrillMeta } from "../content/types";
import { getAllProgress } from "./progress";
import { NetworkBadge } from "../ui";
import { MarginArt } from "./MarginArt";

/**
 * Catalog in the margin-art language: hard edges, no radius, system
 * monospace, near-black ground, and a single vermilion hairline doing all
 * the structural work. Subject bars are white cards that lift on hover with
 * a riso-misregistered red drop; quizzes read as an indented terminal index
 * that inverts (black -> white) under the pointer.
 */

function Tag({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "muted" | "done";
}) {
  const rest =
    tone === "done"
      ? "text-emerald-400"
      : "text-slate-500 group-hover:text-slate-400";
  return (
    <span
      className={`font-mono text-[10px] uppercase tracking-[0.2em] ${rest}`}
    >
      [{children}]
    </span>
  );
}

function Card({ d }: { d: DrillMeta }) {
  const progress = getAllProgress()[d.id];
  const to = d.kind === "explorable" ? `/x/${d.id}` : `/d/${d.id}`;

  return (
    <Link
      to={to}
      className="group flex items-center gap-3 border border-[#ff3b20]/35 bg-[#0b0e14] px-5 py-3 transition-[transform,border-color,background-color] duration-75 hover:translate-x-[2px] hover:border-[#ff3b20]/80 hover:bg-[#ff3b20]/[0.06]"
    >
      <span className="font-mono text-xs text-[#ff3b20]/70 group-hover:text-[#ff3b20]">
        &gt;&gt;
      </span>
      <span className="font-mono text-[13px] uppercase tracking-[0.14em] text-slate-400 group-hover:text-slate-100">
        {d.title}
      </span>
      <span className="ml-auto flex items-center gap-3">
        {d.needsNetwork && <NetworkBadge />}
        {progress?.completed && <Tag tone="done">done</Tag>}
        {progress?.best != null && !progress.completed && (
          <Tag tone="muted">best&middot;{progress.best}</Tag>
        )}
      </span>
    </Link>
  );
}

function SubjectRow({
  ordinal,
  subject,
  list,
  open,
  onToggle,
}: {
  ordinal: number;
  subject: DrillMeta["subject"];
  list: DrillMeta[];
  open: boolean;
  onToggle: () => void;
}) {
  const panelId = `subject-${subject.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <section>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="group flex w-full items-center gap-4 border border-[#ff3b20] bg-white px-5 py-4 text-left transition-[transform,box-shadow] duration-100 hover:-translate-x-[3px] hover:-translate-y-[3px] hover:shadow-[6px_6px_0_0_#ff3b20]"
      >
        <span className="font-mono text-xs tabular-nums text-[#ff3b20]">
          {String(ordinal).padStart(2, "0")}
        </span>
        <span className="font-mono text-sm text-[#ff3b20]">
          {open ? "[–]" : "[+]"}
        </span>
        <span className="font-mono text-sm font-bold uppercase tracking-[0.22em] text-black">
          {subject}
        </span>
        <span className="ml-auto font-mono text-[11px] uppercase tracking-[0.18em] text-black/45">
          {String(list.length).padStart(2, "0")}{" "}
          {list.length === 1 ? "quiz" : "quizzes"}
        </span>
      </button>

      {open && (
        <div
          id={panelId}
          className="ml-[18px] mt-2 flex flex-col gap-2 border-l border-[#ff3b20]/35 pl-5"
        >
          {list.map((d) => (
            <Card key={d.id} d={d} />
          ))}
        </div>
      )}
    </section>
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

  const [openSubjects, setOpenSubjects] = useState<Set<DrillMeta["subject"]>>(
    () => new Set(),
  );

  const toggle = (subject: DrillMeta["subject"]) => {
    setOpenSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(subject)) next.delete(subject);
      else next.add(subject);
      return next;
    });
  };

  const shown = SUBJECT_ORDER.filter((s) => bySubject.get(s)?.length);

  return (
    <>
      <MarginArt />
      <div className="mx-auto max-w-5xl px-5 py-10 sm:py-16">
        <header className="mb-12">
          <div className="relative inline-block">
            <span
              aria-hidden
              className="block font-mono text-3xl font-bold uppercase tracking-tight text-[#ff3b20] sm:text-4xl"
            >
              Information Maps
            </span>
            <h1 className="absolute -left-[3px] -top-[3px] font-mono text-3xl font-bold uppercase tracking-tight text-white sm:text-4xl">
              Information Maps
            </h1>
          </div>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.4em] text-slate-500">
            Memorize anything
          </p>
          <div className="mt-6 h-px w-full bg-[#ff3b20]/50" />
        </header>

        <div className="flex flex-col gap-3">
          {shown.map((subject, i) => {
            const list = bySubject.get(subject)!;
            return (
              <SubjectRow
                key={subject}
                ordinal={i + 1}
                subject={subject}
                list={list}
                open={openSubjects.has(subject)}
                onToggle={() => toggle(subject)}
              />
            );
          })}
        </div>
      </div>
    </>
  );
}
