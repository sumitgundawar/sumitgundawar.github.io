import { useEffect, useMemo, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks";
import type { Diagram, NodeKind } from "@/data/learn";

/* The same architecture, seen down the Z axis instead of across the page.
 *
 * A flat diagram draws a request as a line moving left to right, which is a
 * convention you have to already know. Standing the columns up as planes and
 * pushing them back in space shows the thing the convention stands for: the
 * request enters at the front, passes through the edge, through the services,
 * and reaches storage at the back. Depth is doing real work here, which is the
 * only reason to spend it: a box that merely rotates is decoration, and the
 * flat view stays the default for that reason.
 *
 * Built on CSS 3D rather than WebGL. three.js would be roughly 600kB for what
 * amounts to a dozen rectangles on parallel planes, and it would not survive a
 * 390px screen. transform-style: preserve-3d composites on the GPU, degrades to
 * a plain stack when 3D is unsupported, and costs nothing to download. */

const KIND_COLOR: Record<NodeKind, string> = {
  client: "var(--n-client)",
  edge: "var(--n-edge)",
  service: "var(--n-service)",
  data: "var(--n-data)",
  queue: "var(--n-queue)",
  external: "var(--n-external)",
};

const KIND_EDGE: Record<NodeKind, string> = {
  client: "var(--n-client-edge)",
  edge: "var(--n-edge-edge)",
  service: "var(--n-service-edge)",
  data: "var(--n-data-edge)",
  queue: "var(--n-queue-edge)",
  external: "var(--n-external-edge)",
};

/* Separation comes from rotateX, not rotateY.
   The first attempt used a three-quarter view and the planes slid across each
   other: with the scene centred, rotateY moves every layer along the same
   screen axis, so they overlapped and the labels became unreadable. Tilting
   back instead maps translateZ onto screen Y, so each layer lands in its own
   horizontal band, like looking down a stack of glass sheets. */
const LAYER_GAP = 150; // px of Z between planes

export function LayeredDiagram({ diagram, id }: { diagram: Diagram; id: string }) {
  const reduced = usePrefersReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);

  /* Resting angle is a three-quarter view: enough rotation to read the depth,
     not so much that the front plane occludes the ones behind it. */
  const [tilt, setTilt] = useState({ x: 54, y: -8 });
  const [dragging, setDragging] = useState(false);
  const [active, setActive] = useState(0);

  /* Walk the pulse through the layers so the direction of flow is legible
     without hovering anything. Paused entirely under reduced motion, where a
     looping highlight is exactly the kind of thing people turn it off for. */
  useEffect(() => {
    if (reduced || dragging) return;
    const t = setInterval(() => setActive((i) => (i + 1) % diagram.columns.length), 1400);
    return () => clearInterval(t);
  }, [reduced, dragging, diagram.columns.length]);

  /* Pointer drag rotates the scene. Pointer events cover mouse, pen and touch
     with one path, and setPointerCapture keeps the drag alive when the cursor
     leaves the element mid-gesture. */
  const onDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDragging(true);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setTilt((t) => ({
      // Clamped so the stack cannot be rotated into a state where the layers
      // occlude each other, which is the failure the tilt-back fixes.
      x: Math.max(28, Math.min(70, t.x - e.movementY * 0.35)),
      y: Math.max(-26, Math.min(26, t.y + e.movementX * 0.35)),
    }));
  };
  const onUp = () => setDragging(false);

  const layerLabel = useMemo(
    () =>
      diagram.columns.map((col) => {
        const kinds = [...new Set(col.map((n) => n.kind ?? "service"))];
        return kinds.length === 1 ? kinds[0] : "mixed";
      }),
    [diagram.columns],
  );

  return (
    <figure className="my-7" aria-labelledby={`${id}-layered-cap`}>
      <div
        ref={wrapRef}
        className="relative w-full overflow-hidden select-none"
        style={{
          height: `${Math.max(340, 150 + diagram.columns.length * 118)}px`,
          perspective: "1100px",
          background: "var(--diagram-bg)",
          border: "1px solid var(--hair)",
          cursor: dragging ? "grabbing" : "grab",
          touchAction: "none", // let the drag rotate instead of scrolling the page
        }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <div
          className="absolute inset-0 grid place-items-center"
          style={{
            transformStyle: "preserve-3d",
            transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            transition: dragging ? "none" : "transform .5s cubic-bezier(0.2,0.7,0.2,1)",
          }}
        >
          {diagram.columns.map((col, ci) => {
            const z = -(ci - (diagram.columns.length - 1) / 2) * LAYER_GAP;
            const lit = !reduced && ci === active;
            return (
              <div
                key={ci}
                className="absolute"
                style={{
                  transform: `translateZ(${z}px)`,
                  transformStyle: "preserve-3d",
                  transition: "opacity .35s",
                  opacity: reduced ? 1 : lit ? 1 : 0.72,
                }}
              >
                {/* the plane itself, so the layer reads as a surface */}
                <div
                  aria-hidden
                  className="absolute left-1/2 top-1/2"
                  style={{
                    width: 300,
                    height: 108,
                    marginLeft: -150,
                    marginTop: -54,
                    border: `1px solid ${lit ? "var(--accent)" : "var(--hair)"}`,
                    background: lit ? "rgba(61,214,140,0.05)" : "transparent",
                    transition: "border-color .35s, background .35s",
                  }}
                />
                <div className="relative flex flex-col items-center gap-1.5">
                  <div
                    className="mono uppercase"
                    style={{
                      fontSize: 9,
                      letterSpacing: "0.12em",
                      color: lit ? "var(--accent)" : "var(--c-text-dim)",
                      transition: "color .35s",
                    }}
                  >
                    {layerLabel[ci]}
                  </div>
                  {col.map((n) => (
                    <div
                      key={n.id}
                      className="mono text-center px-2.5 py-1.5"
                      style={{
                        minWidth: 132,
                        fontSize: 11,
                        background: KIND_COLOR[n.kind ?? "service"],
                        border: `1px solid ${KIND_EDGE[n.kind ?? "service"]}`,
                        color: "var(--c-text)",
                        boxShadow: lit ? "0 6px 20px rgba(0,0,0,0.45)" : "0 2px 8px rgba(0,0,0,0.3)",
                        transition: "box-shadow .35s",
                      }}
                    >
                      {n.label}
                      {n.sub && (
                        <div style={{ fontSize: 9, opacity: 0.72, marginTop: 2 }}>{n.sub}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div
          className="absolute left-3 bottom-2 mono pointer-events-none"
          style={{ fontSize: 10, color: "var(--c-text-dim)" }}
        >
          drag to rotate
        </div>
      </div>
      <figcaption id={`${id}-layered-cap`} className="mono text-[12px] mt-2" style={{ color: "var(--c-text-dim)" }}>
        {diagram.caption} · front to back is the path a request takes
      </figcaption>
    </figure>
  );
}
