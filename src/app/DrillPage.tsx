import { Suspense, lazy, useEffect, useMemo, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { drillById } from "../content/registry";
import { markVisited, reportResult, type DrillResult } from "./progress";
import { DrillResultContext } from "./result-context";
import { NotFound } from "./NotFound";

function BackBar({ title }: { title: string }) {
  return (
    <div className="sticky top-0 z-50 flex items-center gap-3 border-b border-slate-800 bg-[#0b0e14]/90 px-4 py-2 backdrop-blur">
      <Link
        to="/"
        className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-200"
      >
        ← All drills
      </Link>
      <span className="truncate text-xs text-slate-500">{title}</span>
    </div>
  );
}

export default function DrillPage() {
  const { id } = useParams();
  const meta = drillById(id);

  const Lazy = useMemo(
    () => (meta?.load ? lazy(meta.load) : null),
    // meta.load identity is stable per module load
    [meta?.id], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Persist a visit once per mount; scores come through the context below.
  const visited = useRef(false);
  useEffect(() => {
    if (meta && !visited.current) {
      visited.current = true;
      markVisited(meta.id);
    }
  }, [meta]);

  const report = useMemo(() => {
    const drillId = meta?.id;
    return (r: DrillResult) => {
      if (drillId) reportResult(drillId, r);
    };
  }, [meta?.id]);

  if (!meta || meta.kind !== "drill" || !Lazy) {
    return <NotFound what={id} />;
  }

  return (
    <div className="min-h-full">
      <BackBar title={meta.title} />
      <DrillResultContext.Provider value={report}>
        <Suspense
          fallback={
            <div className="p-10 text-sm text-slate-500">Loading drill…</div>
          }
        >
          <Lazy />
        </Suspense>
      </DrillResultContext.Provider>
    </div>
  );
}
