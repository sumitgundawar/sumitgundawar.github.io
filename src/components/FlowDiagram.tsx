import { useMemo, useState } from "react";
import type { Diagram, DiagramNode, NodeKind } from "@/data/learn";

/* Renders an architecture diagram from nodes and edges.

   Two things it does that a static image cannot: packets travel the edges so
   the direction of flow is visible without reading labels, and every box can
   be hovered for the reasoning behind it. Depth comes from a stacked base
   plate under each box rather than literal 3D, which stays legible at 390px
   where an isometric projection would not. */

const KIND_COLOR: Record<NodeKind, { fill: string; edge: string; text: string }> = {
  client: { fill: "var(--n-client)", edge: "var(--n-client-edge)", text: "var(--n-client-text)" },
  edge: { fill: "var(--n-edge)", edge: "var(--n-edge-edge)", text: "var(--n-edge-text)" },
  service: { fill: "var(--n-service)", edge: "var(--n-service-edge)", text: "var(--n-service-text)" },
  data: { fill: "var(--n-data)", edge: "var(--n-data-edge)", text: "var(--n-data-text)" },
  queue: { fill: "var(--n-queue)", edge: "var(--n-queue-edge)", text: "var(--n-queue-text)" },
  external: { fill: "var(--n-external)", edge: "var(--n-external-edge)", text: "var(--n-external-text)" },
};

const KIND_LABEL: Record<NodeKind, string> = {
  client: "Client",
  edge: "Edge / CDN",
  service: "Service",
  data: "Data store",
  queue: "Queue / stream",
  external: "External",
};

const W = 168;
const H = 62;
const GAP_X = 132; // wide enough that edge labels sit between boxes, not on them
const GAP_Y = 34;
const PAD = 18;
const DEPTH = 5; // base-plate offset that reads as thickness

interface Placed extends DiagramNode {
  x: number;
  y: number;
  col: number;
}

export function FlowDiagram({ diagram, id }: { diagram: Diagram; id: string }) {
  const [hovered, setHovered] = useState<string | null>(null);

  const { placed, width, height, byId } = useMemo(() => {
    const cols = diagram.columns;
    const tallest = Math.max(...cols.map((c) => c.length));
    const colHeight = (n: number) => n * H + (n - 1) * GAP_Y;
    const full = colHeight(tallest);

    const placed: Placed[] = [];
    cols.forEach((col, ci) => {
      const offset = (full - colHeight(col.length)) / 2;
      col.forEach((node, ri) => {
        placed.push({
          ...node,
          col: ci,
          x: PAD + ci * (W + GAP_X),
          y: PAD + offset + ri * (H + GAP_Y),
        });
      });
    });

    const byId = Object.fromEntries(placed.map((p) => [p.id, p]));
    return {
      placed,
      byId,
      width: PAD * 2 + cols.length * W + (cols.length - 1) * GAP_X,
      height: PAD * 2 + full + DEPTH,
    };
  }, [diagram]);

  /** Edges route out of the right face and into the left face when moving
   *  forward; backward edges bow underneath so they never sit on top of a box. */
  const path = (from: Placed, to: Placed) => {
    const forward = to.col > from.col;
    const backward = to.col < from.col;
    if (backward) {
      const x1 = from.x + W / 2;
      const x2 = to.x + W / 2;
      const dip = Math.max(from.y, to.y) + H + 34;
      return `M ${x1} ${from.y + H} C ${x1} ${dip}, ${x2} ${dip}, ${x2} ${to.y + H}`;
    }
    if (!forward) {
      // same column: hop around the right side
      const x = from.x + W;
      const mid = (from.y + to.y) / 2 + H / 2;
      return `M ${x} ${from.y + H / 2} C ${x + 40} ${from.y + H / 2}, ${x + 40} ${mid}, ${x} ${to.y + H / 2}`;
    }
    const x1 = from.x + W;
    const x2 = to.x;
    const y1 = from.y + H / 2;
    const y2 = to.y + H / 2;
    const mx = (x1 + x2) / 2;
    return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
  };

  const hoveredNode = hovered ? byId[hovered] : null;

  return (
    <figure className="my-6">
      <div
        className="relative overflow-x-auto rounded-lg border"
        style={{ borderColor: "var(--hair)", background: "var(--diagram-bg)" }}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          role="img"
          aria-label={diagram.caption}
          style={{ minWidth: Math.min(width, 620), display: "block" }}
        >
          <defs>
            <marker
              id={`arrow-${id}`}
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 8 4 L 0 7 z" fill="var(--c-text-dim)" />
            </marker>
          </defs>

          {diagram.edges.map((e, i) => {
            const from = byId[e.from];
            const to = byId[e.to];
            if (!from || !to) return null;
            const pid = `${id}-e${i}`;
            const dim = hovered !== null && hovered !== e.from && hovered !== e.to;

            // SVG renders textPath along the path's own direction, so a
            // right-to-left path prints the label upside down. Draw such paths
            // forwards and move the arrowhead to the start instead.
            const flip = to.x < from.x;
            const d = flip ? path(to, from) : path(from, to);

            return (
              <g key={pid} opacity={dim ? 0.22 : 1} style={{ transition: "opacity .18s" }}>
                <path
                  id={pid}
                  d={d}
                  fill="none"
                  stroke="var(--c-text-dim)"
                  strokeWidth={1.25}
                  strokeDasharray={e.async ? "5 4" : undefined}
                  markerEnd={flip ? undefined : `url(#arrow-${id})`}
                  markerStart={flip ? `url(#arrow-${id})` : undefined}
                  opacity={0.5}
                />
                {/* the packet: this is what makes the direction readable */}
                <circle r={3.2} fill={e.async ? "var(--accent-2)" : "var(--accent)"}>
                  <animateMotion
                    dur={e.async ? "3.4s" : "2.2s"}
                    begin={`${(i % 5) * 0.45}s`}
                    repeatCount="indefinite"
                    /* a flipped path is drawn backwards, so travel it in
                       reverse to keep the packet moving the way data does */
                    keyPoints={flip ? "1;0" : "0;1"}
                    keyTimes="0;1"
                    calcMode="linear"
                  >
                    <mpath href={`#${pid}`} />
                  </animateMotion>
                  <animate
                    attributeName="opacity"
                    values="0;1;1;0"
                    keyTimes="0;0.12;0.88;1"
                    dur={e.async ? "3.4s" : "2.2s"}
                    begin={`${(i % 5) * 0.45}s`}
                    repeatCount="indefinite"
                  />
                </circle>
                {e.label && (
                  <text dy={-6} fontSize={10.5} textAnchor="middle" className="mono">
                    {/* stroked copy underneath so the label stays readable
                        where it crosses an edge or a box border */}
                    <textPath href={`#${pid}`} startOffset="50%">
                      <tspan
                        stroke="var(--diagram-bg)"
                        strokeWidth={3.5}
                        strokeLinejoin="round"
                        fill="var(--diagram-bg)"
                      >
                        {e.label}
                      </tspan>
                    </textPath>
                  </text>
                )}
                {e.label && (
                  <text dy={-6} fontSize={10.5} fill="var(--c-text-dim)" textAnchor="middle" className="mono">
                    <textPath href={`#${pid}`} startOffset="50%">
                      {e.label}
                    </textPath>
                  </text>
                )}
              </g>
            );
          })}

          {placed.map((n) => {
            const kind = n.kind ?? "service";
            const c = KIND_COLOR[kind];
            const active = hovered === n.id;
            const dim = hovered !== null && !active;
            return (
              <g
                key={n.id}
                opacity={dim ? 0.4 : 1}
                onMouseEnter={() => setHovered(n.id)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(n.id)}
                onBlur={() => setHovered(null)}
                tabIndex={0}
                style={{ cursor: "pointer", transition: "opacity .18s", outline: "none" }}
              >
                {/* base plate reads as thickness without an isometric projection */}
                <rect
                  x={n.x + DEPTH}
                  y={n.y + DEPTH}
                  width={W}
                  height={H}
                  rx={9}
                  fill={c.edge}
                  opacity={0.45}
                />
                <rect
                  x={n.x}
                  y={n.y - (active ? 2 : 0)}
                  width={W}
                  height={H}
                  rx={9}
                  fill={c.fill}
                  stroke={c.edge}
                  strokeWidth={active ? 1.8 : 1}
                  style={{ transition: "y .18s, stroke-width .18s" }}
                />
                <text
                  x={n.x + 14}
                  y={n.y + (n.sub ? 26 : 36) - (active ? 2 : 0)}
                  fontSize={13.5}
                  fontWeight={550}
                  fill={c.text}
                >
                  {n.label}
                </text>
                {n.sub && (
                  <text
                    x={n.x + 14}
                    y={n.y + 44 - (active ? 2 : 0)}
                    fontSize={11}
                    fill={c.text}
                    opacity={0.72}
                    className="mono"
                  >
                    {n.sub}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <figcaption
        className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px]"
        style={{ color: "var(--c-text-dim)" }}
      >
        <span>{diagram.caption}</span>
        <span className="mono text-[11.5px] opacity-80">dashed = asynchronous</span>
        {hoveredNode && (
          <span className="mono text-[11.5px]" style={{ color: "var(--accent)" }}>
            {hoveredNode.label}
            {hoveredNode.sub ? ` · ${hoveredNode.sub}` : ""} · {KIND_LABEL[hoveredNode.kind ?? "service"]}
          </span>
        )}
      </figcaption>
    </figure>
  );
}
