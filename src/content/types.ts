import type { ComponentType } from "react";

export type Subject =
  | "Geography"
  | "Earth Science"
  | "Machine Learning"
  | "Music";

/**
 * A catalog entry. Two kinds:
 *  - "drill": a React component, lazily imported so its (often large) chunk
 *    loads only when the route is opened.
 *  - "explorable": a self-contained HTML document served from /public and
 *    shown in an iframe. These predate the platform and keep their own
 *    canvas/WebGL renderers (plan phase 7 folds them in properly).
 */
export interface DrillMeta {
  id: string;
  subject: Subject;
  title: string;
  blurb: string;
  kind: "drill" | "explorable";
  /** kind === "drill" */
  load?: () => Promise<{ default: ComponentType<unknown> }>;
  /** kind === "explorable" — path under /public */
  src?: string;
  /** Needs network at runtime (e.g. a CDN script). Surfaced on the card. */
  needsNetwork?: boolean;
}
