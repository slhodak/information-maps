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
    title: "India — Atlas Drill",
    blurb: "Indian cities and states, with an elevation layer.",
    kind: "drill",
    load: () => import("./geography/india/index.jsx"),
  },
  {
    id: "africa-cities",
    subject: "Geography",
    title: "African Cities",
    blurb:
      "Every seat of government, plus the economic capital where it differs. Cape to Cairo journey.",
    kind: "drill",
    load: () => import("./geography/africa-cities/index.tsx"),
  },
  {
    id: "brazil",
    subject: "Geography",
    title: "Brazil — Atlas Drill",
    blurb: "Brazilian states and cities, with relief.",
    kind: "drill",
    load: () => import("./geography/brazil/index.jsx"),
  },
  {
    id: "california",
    subject: "Geography",
    title: "California Counties",
    blurb: "All 58 counties. Borders off by default.",
    kind: "drill",
    load: () => import("./geography/california/index.jsx"),
  },
  {
    id: "south-america-jeep",
    subject: "Geography",
    title: "South America — Field Jeep",
    blurb: "Drive a 3D relief map of South America and its named places. Exploration, no quiz.",
    kind: "explorable",
    src: "/explorables/south-america-jeep-places.html",
    needsNetwork: true,
  },

  // ---- Earth Science --------------------------------------------------
  {
    id: "currents",
    subject: "Earth Science",
    title: "The Ocean Currents",
    blurb:
      "Surface, deep and circumpolar currents on a Mercator world. Name it or trace it; run the Drift.",
    kind: "drill",
    load: () => import("./earth-science/currents/index.jsx"),
  },
  {
    id: "koppen-africa",
    subject: "Earth Science",
    title: "Köppen Zones — Africa",
    blurb: "Climate patches across Africa. Tap or name; climb through every zone.",
    kind: "drill",
    load: () => import("./earth-science/koppen-africa/index.tsx"),
  },
  {
    id: "koppen-south-america",
    subject: "Earth Science",
    title: "Köppen Zones — South America",
    blurb: "Climate patches across South America.",
    kind: "drill",
    load: () => import("./earth-science/koppen-south-america/index.jsx"),
  },
  {
    id: "africa-basins",
    subject: "Earth Science",
    title: "Africa — Basins & Mountains",
    blurb: "Drainage basins, ranges and rivers of Africa.",
    kind: "drill",
    load: () => import("./earth-science/africa-basins/index.jsx"),
  },
  {
    id: "tectonic-plates",
    subject: "Earth Science",
    title: "Tectonic Plates",
    blurb:
      "Identify each plate and its motion vectors on a seamless world map. Goal mode locks plates in.",
    kind: "explorable",
    src: "/explorables/tectonic-plates.html",
  },

  // ---- Machine Learning ---------------------------------------------
  {
    id: "grpo-formula",
    subject: "Machine Learning",
    title: "GRPO Objective Drill",
    blurb:
      "Match formulas to what they do, learn the vocabulary, then place every symbol in the objective.",
    kind: "drill",
    load: () => import("./ml/grpo-formula/index.jsx"),
  },
  {
    id: "coding-agent-rl",
    subject: "Machine Learning",
    title: "RL for Coding Agents",
    blurb: "Fill in the rollout and loss vocabulary — functions and variables.",
    kind: "drill",
    load: () => import("./ml/coding-agent-rl/index.jsx"),
  },

  // ---- Music ------------------------------------------------------------
  {
    id: "clef-drill",
    subject: "Music",
    title: "Clef Drill",
    blurb: "Read notes on the bass and treble staff. Streaks, timing, weak-note weighting.",
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
