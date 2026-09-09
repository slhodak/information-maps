/**
 * Decorative op-art in the desktop margins of the catalog: one long
 * self-crossing polyline per side — straight runs, sharp angles, a few
 * smooth arcs — flood-filled with the even-odd rule so every place the line
 * laps over itself flips between black and white.
 *
 * Static (an earlier drift version was too distracting). Two independent
 * compositions (different seeds, same rule set), one flush to each window
 * edge. Fixed behind the content (z-index -1), pointer-events-none,
 * hard-edged (no fades), shown only once the gutters outside the centred
 * column are wide enough to hold it.
 */

const W = 240;
const H = 1400;
const PAD = 16;

type Pt = { x: number; y: number; curve: boolean };

/** Small deterministic PRNG so each side's shape is stable across loads. */
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A drunk walk that is *meant* to cross itself. Short steps and frequent
 * hard corners keep it dense and self-lapping; a weak pull toward a target
 * that snakes slowly down the strip spreads the tangle over the full height
 * instead of letting it bunch up.
 */
function buildPoints(seed: number): Pt[] {
  const rng = mulberry32(seed);
  const pts: Pt[] = [];
  let x = W / 2 + (rng() - 0.5) * 40;
  let y = PAD + 6;
  let heading = Math.PI / 2;
  const n = 108 + Math.floor(rng() * 28);

  for (let i = 0; i < n; i++) {
    const r = rng();
    let len: number;
    let curve = false;

    if (r < 0.3) {
      // hard corner — frequent, this is what makes the line lap over itself
      heading +=
        (rng() < 0.5 ? -1 : 1) * (Math.PI * 0.5 + rng() * Math.PI * 0.55);
      len = 14 + rng() * 34;
    } else if (r < 0.46) {
      // straight run
      heading += (rng() - 0.5) * 0.08;
      len = 46 + rng() * 92;
    } else if (r < 0.7) {
      // smooth arc
      heading += (rng() - 0.5) * 1.5;
      len = 18 + rng() * 46;
      curve = true;
    } else {
      // tight wander
      heading += (rng() - 0.5) * 1.25;
      len = 14 + rng() * 52;
    }

    // weak global guidance: a target that snakes down the strip, so the
    // tangle fills the whole height rather than piling up at the top.
    const prog = i / n;
    const tx = W / 2 + Math.sin(prog * Math.PI * 3.3 + seed) * (W * 0.3);
    const ty = PAD + prog * (H - 2 * PAD);
    let toTarget = Math.atan2(ty - y, tx - x) - heading;
    toTarget = Math.atan2(Math.sin(toTarget), Math.cos(toTarget));
    heading += toTarget * 0.1;

    x += Math.cos(heading) * len;
    y += Math.sin(heading) * len;

    // bounce off the strip edges so the walk stays in frame
    if (x < PAD) {
      x = PAD + (PAD - x);
      heading = Math.PI - heading;
    }
    if (x > W - PAD) {
      x = W - PAD - (x - (W - PAD));
      heading = Math.PI - heading;
    }
    if (y < PAD) {
      y = PAD + (PAD - y);
      heading = -heading;
    }
    if (y > H - PAD) {
      y = H - PAD - (y - (H - PAD));
      heading = -heading;
    }

    pts.push({ x, y, curve });
  }
  return pts;
}

/** Serialise the walk to a single closed path. */
function toPath(p: Pt[]): string {
  let d = `M ${p[0].x.toFixed(1)} ${p[0].y.toFixed(1)}`;
  for (let k = 1; k < p.length; k++) {
    const cur = p[k];
    if (cur.curve) {
      const prev = p[k - 1];
      const cx = (prev.x + cur.x) / 2 + (cur.y - prev.y) * 0.28;
      const cy = (prev.y + cur.y) / 2 - (cur.x - prev.x) * 0.28;
      d += ` Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${cur.x.toFixed(1)} ${cur.y.toFixed(1)}`;
    } else {
      d += ` L ${cur.x.toFixed(1)} ${cur.y.toFixed(1)}`;
    }
  }
  return d + " Z";
}

function Strip({ seed, side }: { seed: number; side: "left" | "right" }) {
  const d = toPath(buildPoints(seed));

  // Explicit class strings per side — Tailwind only emits classes it can see
  // literally in the source, so `left-0` / `right-0` can't be interpolated.
  const wrap =
    side === "left"
      ? "pointer-events-none fixed inset-y-0 left-0 hidden overflow-hidden min-[1500px]:block"
      : "pointer-events-none fixed inset-y-0 right-0 hidden overflow-hidden min-[1500px]:block";

  return (
    <div
      aria-hidden
      className={wrap}
      style={{
        width: "clamp(180px, calc((100vw - 1120px) / 2), 300px)",
        zIndex: -1,
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio={`${side === "left" ? "xMinYMid" : "xMaxYMid"} slice`}
      >
        <rect x="0" y="0" width={W} height={H} fill="#fff" />
        <path
          d={d}
          fill="#000"
          fillRule="evenodd"
          stroke="#000"
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function MarginArt() {
  return (
    <>
      <Strip seed={0x9e3779b9} side="left" />
      <Strip seed={0x85ebca6b} side="right" />
    </>
  );
}
