import { useEffect, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { drillById } from "../content/registry";
import { markVisited } from "./progress";
import { NotFound } from "./NotFound";

/**
 * The two legacy HTML explorables are full documents (own <head>, fixed HUD,
 * overflow:hidden body). They can't be React routes, so they run in an
 * iframe. Plan phase 7 strips their chrome and mounts the canvas directly.
 */
export default function ExplorablePage() {
  const { id } = useParams();
  const meta = drillById(id);

  const visited = useRef(false);
  useEffect(() => {
    if (meta && !visited.current) {
      visited.current = true;
      markVisited(meta.id);
    }
  }, [meta]);

  if (!meta || meta.kind !== "explorable" || !meta.src) {
    return <NotFound what={id} />;
  }

  return (
    <div className="flex h-screen flex-col">
      <div className="flex items-center gap-3 border-b border-slate-800 bg-[#0b0e14] px-4 py-2">
        <Link
          to="/"
          className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-200"
        >
          ← All drills
        </Link>
        <span className="truncate text-xs text-slate-500">{meta.title}</span>
        {meta.needsNetwork && (
          <span className="text-[11px] text-amber-500/80">
            loads a CDN script — needs network
          </span>
        )}
      </div>
      <iframe
        title={meta.title}
        src={meta.src}
        className="min-h-0 flex-1 border-0"
        // the jeep explorable wants pointer capture + fullscreen-ish behaviour
        allow="fullscreen; accelerometer; gyroscope"
      />
    </div>
  );
}
