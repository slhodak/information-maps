import { createContext, useContext } from "react";
import type { DrillResult } from "./progress";

/**
 * <DrillPage> provides this; engine-ported drills call `report(...)` to
 * persist scores/streaks/completion. Drills not yet ported simply never
 * call it, and only their visit is recorded.
 */
export const DrillResultContext = createContext<(r: DrillResult) => void>(
  () => {},
);

export function useReportResult(): (r: DrillResult) => void {
  return useContext(DrillResultContext);
}
