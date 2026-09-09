import type { DrillMeta } from "./types";

/**
 * The catalog manifest. Adding a drill = drop its folder under
 * src/content/<subject>/<id>/ and add one entry here.
 *
 * `load` uses a static-analyzable dynamic import string so Vite can split
 * each drill into its own chunk.
 */
export const DRILLS: DrillMeta[] = [
  // ---- Geography --------------------------------------------------------
  {
    id: "india",
    subject: "Geography",
    title: "India",
    kind: "drill",
    load: () => import("./geography/india/index.jsx"),
  },
  {
    id: "africa",
    subject: "Geography",
    title: "Africa",
    kind: "drill",
    load: () => import("./geography/africa/index.tsx"),
  },
  {
    id: "brazil",
    subject: "Geography",
    title: "Brazil",
    kind: "drill",
    load: () => import("./geography/brazil/index.jsx"),
  },
  {
    id: "california",
    subject: "Geography",
    title: "California Counties",
    kind: "drill",
    load: () => import("./geography/california/index.jsx"),
  },
  {
    id: "south-america-jeep",
    subject: "Geography",
    title: "South America — Field Jeep",
    kind: "explorable",
    src: "/explorables/south-america-jeep-places.html",
    needsNetwork: true,
  },
  {
    id: "africa-jeep",
    subject: "Geography",
    title: "Africa — Field Jeep",
    kind: "explorable",
    src: "/explorables/africa-jeep-places.html",
    needsNetwork: true,
  },

  // ---- Earth Science --------------------------------------------------
  {
    id: "currents",
    subject: "Earth Science",
    title: "Ocean Currents",
    kind: "drill",
    load: () => import("./earth-science/currents/index.jsx"),
  },
  {
    id: "koppen-africa",
    subject: "Earth Science",
    title: "African Köppen Climate Zones",
    kind: "drill",
    load: () => import("./earth-science/koppen-africa/index.tsx"),
  },
  {
    id: "koppen-south-america",
    subject: "Earth Science",
    title: "South American Köppen Climate Zones",
    kind: "drill",
    load: () => import("./earth-science/koppen-south-america/index.jsx"),
  },
  {
    id: "africa-basins",
    subject: "Earth Science",
    title: "African Basins & Mountains",
    kind: "drill",
    load: () => import("./earth-science/africa-basins/index.jsx"),
  },
  {
    id: "tectonic-plates",
    subject: "Earth Science",
    title: "Tectonic Plates",
    kind: "explorable",
    src: "/explorables/tectonic-plates.html",
  },

  // ---- Machine Learning ---------------------------------------------
  {
    id: "grpo-formula",
    subject: "Machine Learning",
    title: "Group Relative Policy Optimization",
    kind: "drill",
    load: () => import("./ml/grpo-formula/index.jsx"),
  },
  {
    id: "coding-agent-rl",
    subject: "Machine Learning",
    title: "RL for Coding Agents",
    kind: "drill",
    load: () => import("./ml/coding-agent-rl/index.jsx"),
  },

  // ---- Music ------------------------------------------------------------
  {
    id: "clef-drill",
    subject: "Music",
    title: "Treble & Bass Clef Notes",
    kind: "drill",
    load: () => import("./music/clef-drill/index.tsx"),
  },
];

export const SUBJECT_ORDER: DrillMeta["subject"][] = [
  "Earth Science",
  "Geography",
  "Machine Learning",
  "Music",
];

export function drillById(id: string | undefined): DrillMeta | undefined {
  return DRILLS.find((d) => d.id === id);
}
