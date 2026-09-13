import { useEffect, useMemo, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks";
import type { Diagram, NodeKind } from "@/data/learn";

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

const KIND_LABEL: Record<NodeKind, string> = {
  client: "Client",
  edge: "Edge / CDN",
  service: "Service",
  data: "Data store",
  queue: "Queue / stream",
  external: "External",
};

const LAYER_GAP = 150;

export function LayeredDiagram({ diagram, id }: { diagram: Diagram; id: string }) {
  const reduced = usePrefersReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);

  const [tilt, setTilt] = useState({ x: 54, y: -8 });
  const [dragging, setDragging] = useState(false);
  const [active, setActive] = useState(0);

  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    if (reduced || dragging) return;
    const t = setInterval(() => setActive((i) => (i + 1) % diagram.columns.length), 1400);
    return () => clearInterval(t);
  }, [reduced, dragging, diagram.columns.length]);

  const [travel, setTravel] = useState(0);
  useEffect(() => {
    if (reduced || dragging) return;
    let raf = 0;
    const started = performance.now();
    const step = (now: number) => {
      setTravel(Math.min(1, ((now - started) % 1400) / 900));
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [reduced, dragging, active]);

  const onDown = (e: React.PointerEvent) => {
    if ((e.target as Element).closest("button")) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDragging(true);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setTilt((t) => ({
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
          background: "var(--plate)",
          border: "1px solid var(--rule-2)",
          cursor: dragging ? "grabbing" : "grab",
          touchAction: "none",
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

                <div
                  aria-hidden
                  className="absolute left-1/2 top-1/2"
                  style={{
                    width: 300,
                    height: 108,
                    marginLeft: -150,
                    marginTop: -54,
                    border: `1px solid ${lit ? "var(--accent)" : "var(--rule-2)"}`,
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
                      color: lit ? "var(--accent)" : "var(--text-mid)",
                      transition: "color .35s",
                    }}
                  >
                    {layerLabel[ci]}
                  </div>
                  {col.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPicked((cur) => (cur === n.id ? null : n.id));
                      }}
                      aria-pressed={picked === n.id}
                      className="mono text-center px-2.5 py-1.5 cursor-pointer"
                      style={{
                        minWidth: 132,
                        fontSize: 11,
                        background: KIND_COLOR[n.kind ?? "service"],
                        border: `1px solid ${KIND_EDGE[n.kind ?? "service"]}`,
                        color: "var(--text-hi)",
                        boxShadow: lit ? "0 6px 20px rgba(0,0,0,0.45)" : "0 2px 8px rgba(0,0,0,0.3)",
                        transition: "box-shadow .35s",
                      }}
                    >
                      {n.label}
                      {n.sub && (
                        <div style={{ fontSize: 9, opacity: 0.72, marginTop: 2 }}>{n.sub}</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {!reduced && diagram.columns.length > 1 && (
          <div
            aria-hidden
            className="absolute left-1/2 pointer-events-none"
            style={{
              top: `${18 + (Math.min(active + travel, diagram.columns.length - 1) / Math.max(1, diagram.columns.length - 1)) * 64}%`,
              width: 9,
              height: 9,
              marginLeft: -4.5,
              borderRadius: "50%",
              background: "var(--accent)",
              boxShadow: "0 0 12px var(--accent)",
              transition: "none",
            }}
          />
        )}

        <div
          className="absolute left-12 bottom-8 mono pointer-events-none"
          style={{ fontSize: 10, color: "var(--text-mid)" }}
        >
          {picked ? "tap again to dismiss" : "drag to rotate, tap a component"}
        </div>
      </div>
      {picked && (() => {
        const node = diagram.columns.flat().find((n) => n.id === picked);
        if (!node) return null;
        const edgesOut = diagram.edges.filter((e) => e.from === picked);
        const edgesIn = diagram.edges.filter((e) => e.to === picked);
        return (
          <div
            role="status"
            className="mt-8 p-12"
            style={{ background: "var(--ink-2)", border: "1px solid var(--rule-3)" }}
          >
            <div className="mono text-m2" style={{ color: "var(--text-hi)" }}>
              {node.label}
              {node.sub ? ` · ${node.sub}` : ""}
              <span style={{ color: "var(--text-mid)" }}> · {KIND_LABEL[node.kind ?? "service"]}</span>
            </div>
            {(edgesIn.length > 0 || edgesOut.length > 0) && (
              <div className="mono text-m3 mt-1.5" style={{ color: "var(--text-mid)" }}>
                {edgesIn.map((e, i) => (
                  <div key={`i${i}`}>
                    ← from {diagram.columns.flat().find((n) => n.id === e.from)?.label}
                    {e.label ? `: ${e.label}` : ""}
                    {e.async ? " (asynchronous)" : ""}
                  </div>
                ))}
                {edgesOut.map((e, i) => (
                  <div key={`o${i}`}>
                    → to {diagram.columns.flat().find((n) => n.id === e.to)?.label}
                    {e.label ? `: ${e.label}` : ""}
                    {e.async ? " (asynchronous)" : ""}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      <figcaption id={`${id}-layered-cap`} className="mono text-m2 mt-8" style={{ color: "var(--text-mid)" }}>
        {diagram.caption} · front to back is the path a request takes
      </figcaption>
    </figure>
  );
}
