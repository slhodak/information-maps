import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useOnline } from "./use-online";

/**
 * Shared UI primitives, factored out of the drill files (the `SegButton` /
 * `ModeButton` / `Toggle` / panel chrome that nearly every drill had its own
 * copy of). The app shell and engine-ported drills use these; the legacy
 * drills keep their inline versions until they're ported (plan phase 5).
 */

const ACCENT = "#e3a542";

function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/** A single button in a segmented control. */
export function SegButton({
  active,
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cx(
        "flex-1 rounded-md px-3.5 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-accent/20 text-accent"
          : "text-slate-400 hover:text-slate-200",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/** A row of segmented buttons. */
export function SegRow({
  label,
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex gap-1 rounded-lg border border-slate-700 bg-slate-900 p-1"
    >
      {children}
    </div>
  );
}

/** A boolean pill toggle (borders on/off, hints on/off, …). */
export function Toggle({
  on,
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { on?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      className={cx(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        on
          ? "border-slate-500 text-slate-200"
          : "border-slate-700 text-slate-500 hover:text-slate-300",
        className,
      )}
      {...rest}
    >
      <span
        aria-hidden
        className="h-2 w-2 rounded-full"
        style={{ background: on ? "#7c88a3" : "transparent", boxShadow: on ? "none" : "inset 0 0 0 1px #3a4252" }}
      />
      {children}
    </button>
  );
}

/** Card-style container matching the drills' panel look. */
export function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "rounded-2xl border border-slate-800 bg-slate-900/60 p-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Eyebrow + title + optional subtitle, the header every drill opens with. */
export function DrillHeading({
  eyebrow,
  title,
  sub,
}: {
  eyebrow?: string;
  title: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <header className="mb-4">
      {eyebrow && (
        <div
          className="mb-1 text-xs font-semibold uppercase tracking-widest"
          style={{ color: ACCENT }}
        >
          {eyebrow}
        </div>
      )}
      <h1 className="text-2xl font-semibold text-slate-50">{title}</h1>
      {sub && <p className="mt-1 text-sm text-slate-400">{sub}</p>}
    </header>
  );
}

/**
 * Live network indicator for drills that pull a CDN script at runtime.
 * Reads "Network detected" (good wifi icon) or "Network required" (no wifi
 * icon) and flips in real time on the browser's online/offline events.
 */
export function NetworkBadge({ className }: { className?: string }) {
  const online = useOnline();

  return (
    <span
      title={
        online
          ? "Network detected — this drill's CDN script can load"
          : "Network required — this drill loads a script from a CDN at runtime"
      }
      className={cx(
        "inline-flex items-center gap-1 text-[11px]",
        online ? "text-emerald-400" : "text-amber-500/80",
        className,
      )}
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3 w-3"
      >
        {online ? (
          <>
            <path d="M5 13a10 10 0 0 1 14 0" />
            <path d="M8.5 16.5a5 5 0 0 1 7 0" />
            <path d="M2 8.82a15 15 0 0 1 20 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </>
        ) : (
          <>
            <line x1="2" y1="2" x2="22" y2="22" />
            <path d="M8.5 16.5a5 5 0 0 1 7 0" />
            <path d="M2 8.82a15 15 0 0 1 4.17-2.65" />
            <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76" />
            <path d="M16.85 11.25a10 10 0 0 1 2.22 1.68" />
            <path d="M5 13a10 10 0 0 1 5.24-2.76" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </>
        )}
      </svg>
      {online ? "Network detected" : "Network required"}
    </span>
  );
}

export { ACCENT };
