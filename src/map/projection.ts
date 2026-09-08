/**
 * Map projection + geometry helpers, factored out of the drills. Every
 * map drill carried its own copy of most of these.
 *
 * Web-Mercator convention: `mercY` returns degrees (not metres), so
 * `mercY(lat)` is directly usable as a y in a lon/lat-degree world space.
 * Lifted verbatim from earth-science/currents.
 */

const DEG = 180 / Math.PI;
const R_EARTH_KM = 6371;

/** Web-Mercator y for a latitude, in degrees. */
export const mercY = (lat: number): number =>
  Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * DEG;

/** Inverse of {@link mercY}: latitude from a Mercator y in degrees. */
export const mercLat = (y: number): number =>
  (360 / Math.PI) * Math.atan(Math.exp(y / DEG)) - 90;

/** Great-circle distance in kilometres. */
export function haversine(
  lon1: number,
  lat1: number,
  lon2: number,
  lat2: number,
): number {
  const p = Math.PI / 180;
  const a =
    0.5 -
    Math.cos((lat2 - lat1) * p) / 2 +
    (Math.cos(lat1 * p) *
      Math.cos(lat2 * p) *
      (1 - Math.cos((lon2 - lon1) * p))) /
      2;
  return 2 * R_EARTH_KM * Math.asin(Math.sqrt(a));
}

/** Fold a longitude delta into [-180, 180] — for making a polyline seamless. */
export function wrapLonDelta(d: number): number {
  if (d > 180) return d - 360;
  if (d < -180) return d + 360;
  return d;
}

/** Wrap a longitude into [-180, 180). */
export function wrapLon(lon: number): number {
  return (((lon % 360) + 540) % 360) - 180;
}

export interface SegHit {
  d: number;
  x: number;
  y: number;
}

/** Distance from point (px,py) to segment (ax,ay)-(bx,by), and the foot. */
export function segDist(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): SegHit {
  const dx = bx - ax;
  const dy = by - ay;
  const d2 = dx * dx + dy * dy;
  let t = d2 ? ((px - ax) * dx + (py - ay) * dy) / d2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const qx = ax + t * dx;
  const qy = ay + t * dy;
  return { d: Math.hypot(px - qx, py - qy), x: qx, y: qy };
}

/**
 * Nearest approach of a world-space point to a flat [x0,y0,x1,y1,…] polyline,
 * trying ±360 longitude shifts so a wrapped map has no seam. `bbox` (x0,x1)
 * is used to skip shifts that can't matter.
 */
export function nearestOnPath(
  points: ArrayLike<number>,
  bbox: { x0: number; x1: number },
  wx: number,
  wy: number,
  margin = 40,
): SegHit {
  let best: SegHit = { d: Infinity, x: 0, y: 0 };
  for (const shift of [-360, 0, 360]) {
    const x = wx + shift;
    if (x < bbox.x0 - margin || x > bbox.x1 + margin) continue;
    for (let k = 0; k + 3 < points.length; k += 2) {
      const r = segDist(
        x,
        wy,
        points[k],
        points[k + 1],
        points[k + 2],
        points[k + 3],
      );
      if (r.d < best.d) best = { d: r.d, x: r.x - shift, y: r.y };
    }
  }
  return best;
}

/** Fisher–Yates, non-mutating. */
export function shuffle<T>(a: T[]): T[] {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

export { DEG, R_EARTH_KM };
