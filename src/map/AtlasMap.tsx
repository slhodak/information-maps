import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

/**
 * A generic pan / zoom / pinch SVG map surface, factored out of the map
 * drills (each had its own ResizeObserver + gesture + clamp code).
 *
 * You draw the map in **world coordinates** — `children` render inside a
 * `<g>` that applies the current pan/zoom. World space is whatever you say
 * it is (for the geo drills: x = lon + 180, y = a Mercator y). Taps are
 * reported back in the same world coordinates.
 *
 * Not yet adopted by any drill — see MIGRATION.md. `earth-science/currents`
 * is canvas-based and keeps its own renderer; the SVG drills
 * (koppen-*, africa-basins, and the geography five) are the intended users.
 */

export interface MapView {
  /** zoom factor, 1 = fit width */
  z: number;
  /** pan, in screen pixels */
  tx: number;
  ty: number;
}

export interface PickInfo {
  /** world-units that map to `tolerancePx` screen pixels at the current zoom */
  tolWorld: number;
  /** screen pixels per world unit at the current zoom */
  pxPerWorld: number;
  /** false when the tap fell outside the world box */
  inside: boolean;
}

export interface AtlasMapProps {
  worldWidth: number;
  worldHeight: number;
  /** rendered height / width; defaults to worldHeight / worldWidth */
  aspect?: number;
  minHeight?: number;
  maxHeight?: number;
  minZoom?: number;
  maxZoom?: number;
  /** render three copies side by side so longitude has no seam */
  wrapX?: boolean;
  tolerancePx?: number;
  onPick?: (worldX: number, worldY: number, info: PickInfo) => void;
  /** SVG content, drawn in world coordinates */
  children?: ReactNode;
  /** screen-space overlay (on top of the built-in zoom controls) */
  overlay?: ReactNode;
  className?: string;
  ariaLabel?: string;
}

const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v;

export function AtlasMap({
  worldWidth,
  worldHeight,
  aspect,
  minHeight = 240,
  maxHeight = 620,
  minZoom = 1,
  maxZoom = 18,
  wrapX = false,
  tolerancePx = 22,
  onPick,
  children,
  overlay,
  className,
  ariaLabel,
}: AtlasMapProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const ratio = aspect ?? worldHeight / worldWidth;

  const [size, setSize] = useState({ w: 360, h: clamp(360 * ratio, minHeight, maxHeight) });
  const [view, setView] = useState<MapView>({ z: 1, tx: 0, ty: 0 });

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const cw = e.contentRect.width;
      if (cw > 0) {
        setSize({ w: cw, h: clamp(cw * ratio, minHeight, maxHeight) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ratio, minHeight, maxHeight]);

  // base scale: world fits the width at z = 1
  const baseScale = size.w / worldWidth;
  const scale = baseScale * view.z;

  const clampView = useCallback(
    (v: MapView): MapView => {
      const z = clamp(v.z, minZoom, maxZoom);
      const s = baseScale * z;
      const contentW = worldWidth * s;
      const contentH = worldHeight * s;
      // keep the map covering the viewport (or centred if smaller)
      const clampAxis = (t: number, content: number, view: number) => {
        if (content <= view) return (view - content) / 2;
        return clamp(t, view - content, 0);
      };
      return {
        z,
        tx: wrapX ? v.tx : clampAxis(v.tx, contentW, size.w),
        ty: clampAxis(v.ty, contentH, size.h),
      };
    },
    [baseScale, worldWidth, worldHeight, size.w, size.h, minZoom, maxZoom, wrapX],
  );

  useEffect(() => {
    setView((v) => clampView(v));
  }, [clampView]);

  const zoomAbout = useCallback(
    (cx: number, cy: number, factor: number) => {
      setView((v) => {
        const z = clamp(v.z * factor, minZoom, maxZoom);
        const k = z / v.z;
        return clampView({
          z,
          tx: cx - (cx - v.tx) * k,
          ty: cy - (cy - v.ty) * k,
        });
      });
    },
    [clampView, minZoom, maxZoom],
  );

  // ---- gestures (unified pointer events) -------------------------------
  const gesture = useRef<{
    pointers: Map<number, { x: number; y: number }>;
    mode: "idle" | "maybe" | "pan" | "pinch";
    start: { x: number; y: number; tx: number; ty: number };
    moved: number;
    pinchD0: number;
    pinchZ0: number;
  }>({
    pointers: new Map(),
    mode: "idle",
    start: { x: 0, y: 0, tx: 0, ty: 0 },
    moved: 0,
    pinchD0: 0,
    pinchZ0: 1,
  });

  const localPoint = (e: { clientX: number; clientY: number }) => {
    const r = boxRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    const g = gesture.current;
    g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.target as Element).setPointerCapture?.(e.pointerId);
    if (g.pointers.size === 2) {
      const [a, b] = [...g.pointers.values()];
      g.mode = "pinch";
      g.pinchD0 = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      g.pinchZ0 = view.z;
    } else {
      const p = localPoint(e);
      g.mode = "maybe";
      g.moved = 0;
      g.start = { x: p.x, y: p.y, tx: view.tx, ty: view.ty };
    }
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const g = gesture.current;
    if (!g.pointers.has(e.pointerId)) return;
    g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (g.mode === "pinch" && g.pointers.size >= 2) {
      const [a, b] = [...g.pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const r = boxRef.current!.getBoundingClientRect();
      const cx = (a.x + b.x) / 2 - r.left;
      const cy = (a.y + b.y) / 2 - r.top;
      const z = clamp((g.pinchZ0 * d) / g.pinchD0, minZoom, maxZoom);
      setView((v) => {
        const k = z / v.z;
        return clampView({
          z,
          tx: cx - (cx - v.tx) * k,
          ty: cy - (cy - v.ty) * k,
        });
      });
      return;
    }

    if (g.mode === "maybe" || g.mode === "pan") {
      const p = localPoint(e);
      const dx = p.x - g.start.x;
      const dy = p.y - g.start.y;
      g.moved = Math.max(g.moved, Math.hypot(dx, dy));
      if (g.moved > 8) {
        g.mode = "pan";
        setView(() =>
          clampView({ z: view.z, tx: g.start.tx + dx, ty: g.start.ty + dy }),
        );
      }
    }
  };

  const endPointer = (e: ReactPointerEvent) => {
    const g = gesture.current;
    const wasTap = g.mode === "maybe" && g.moved <= 8;
    g.pointers.delete(e.pointerId);
    if (wasTap && onPick) {
      const p = localPoint(e);
      const pxPerWorld = scale;
      const wx = (p.x - view.tx) / scale;
      const wy = (p.y - view.ty) / scale;
      const inside = wx >= 0 && wx <= worldWidth && wy >= 0 && wy <= worldHeight;
      onPick(wx, wy, {
        tolWorld: tolerancePx / pxPerWorld,
        pxPerWorld,
        inside,
      });
    }
    if (g.pointers.size === 0) g.mode = "idle";
    else if (g.pointers.size === 1) g.mode = "maybe";
  };

  const onWheel = (e: React.WheelEvent) => {
    const p = localPoint(e);
    zoomAbout(p.x, p.y, e.deltaY < 0 ? 1.15 : 1 / 1.15);
  };

  // ---- render ---------------------------------------------------------
  const copies = useMemo(() => {
    if (!wrapX) return [0];
    const span = worldWidth * scale;
    const k0 = Math.floor((0 - view.tx) / span) - 1;
    const k1 = Math.ceil((size.w - view.tx) / span) + 1;
    const out: number[] = [];
    for (let k = k0; k <= k1; k++) out.push(k);
    return out;
  }, [wrapX, worldWidth, scale, view.tx, size.w]);

  return (
    <div
      ref={boxRef}
      className={className}
      style={{ position: "relative", width: "100%", touchAction: "none" }}
    >
      <svg
        width={size.w}
        height={size.h}
        role="img"
        aria-label={ariaLabel}
        style={{ display: "block", cursor: "crosshair", userSelect: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onWheel={onWheel}
      >
        {copies.map((k) => (
          <g
            key={k}
            transform={`translate(${view.tx + k * worldWidth * scale} ${view.ty}) scale(${scale})`}
          >
            {children}
          </g>
        ))}
      </svg>

      <div
        style={{
          position: "absolute",
          right: 10,
          top: 10,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <MapButton label="Zoom in" onClick={() => zoomAbout(size.w / 2, size.h / 2, 1.6)}>
          +
        </MapButton>
        <MapButton
          label="Zoom out"
          onClick={() => zoomAbout(size.w / 2, size.h / 2, 1 / 1.6)}
        >
          −
        </MapButton>
      </div>
      {view.z > 1.02 && (
        <button
          type="button"
          onClick={() => setView(clampView({ z: 1, tx: 0, ty: 0 }))}
          style={{
            position: "absolute",
            right: 10,
            bottom: 10,
            fontSize: 12,
            padding: "6px 10px",
            borderRadius: 7,
            border: "1px solid #2a3648",
            background: "rgba(14,23,32,.92)",
            color: "#8b93a7",
            cursor: "pointer",
          }}
        >
          Reset
        </button>
      )}
      {overlay}
    </div>
  );
}

function MapButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{
        width: 32,
        height: 32,
        fontSize: 17,
        borderRadius: 7,
        border: "1px solid #2a3648",
        background: "rgba(14,23,32,.92)",
        color: "#8b93a7",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}
