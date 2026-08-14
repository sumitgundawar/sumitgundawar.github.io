import { useMemo, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks";
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
  // The packets are SMIL, and CSS animation properties do not touch SMIL —
  // the reduced-motion block in index.css never stopped them. Not rendering
  // them is the only thing that actually does.
  const reducedMotion = usePrefersReducedMotion();

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

    // Skip-column edges arc above the rows and backward edges dip below, so the
    // viewBox has to make room or they are clipped at the frame.
    const colOf = (nid: string) => byId[nid]?.col;
    let above = 0;
    let below = 0;
    diagram.edges.forEach((e) => {
      const a = colOf(e.from);
      const b = colOf(e.to);
      if (a === undefined || b === undefined) return;
      if (b - a > 1) above = 72;
      if (b < a || b === a) below = 82;
    });

    return {
      placed: placed.map((p) => ({ ...p, y: p.y + above })),
      byId: Object.fromEntries(
        placed.map((p) => [p.id, { ...p, y: p.y + above }]),
      ),
      width: PAD * 2 + cols.length * W + (cols.length - 1) * GAP_X,
      height: PAD * 2 + full + DEPTH + above + below,
    };
  }, [diagram]);

  /** Cubic bezier midpoint — where a label sits. Computing it means labels are
   *  ordinary horizontal text rather than textPath, which rotates every glyph
   *  to the tangent and is unreadable on anything but a shallow curve. */
  const bezierMid = (
    p0: [number, number],
    p1: [number, number],
    p2: [number, number],
    p3: [number, number],
  ): [number, number] => [
    (p0[0] + 3 * p1[0] + 3 * p2[0] + p3[0]) / 8,
    (p0[1] + 3 * p1[1] + 3 * p2[1] + p3[1]) / 8,
  ];

  /**
   * Route an edge and report where its label goes.
   *
   * Four cases, and the previous version only really handled one. Forward
   * adjacent edges go right face to left face. Forward edges that skip a column
   * arc above the row so they do not pass under the boxes in between — that is
   * what hid the Netflix diagram's "video segments" label behind a node.
   * Backward edges bow underneath. Same-column edges bow out to the right.
   */
  const route = (from: Placed, to: Placed, laneOffset: number) => {
    const fy = from.y + H / 2;
    const ty = to.y + H / 2;

    if (to.col === from.col) {
      const x = from.x + W;
      const bulge = x + 46 + laneOffset;
      const p0: [number, number] = [x, fy];
      const p3: [number, number] = [x, ty];
      const p1: [number, number] = [bulge, fy];
      const p2: [number, number] = [bulge, ty];
      return {
        d: `M ${p0[0]} ${p0[1]} C ${p1[0]} ${p1[1]}, ${p2[0]} ${p2[1]}, ${p3[0]} ${p3[1]}`,
        mid: bezierMid(p0, p1, p2, p3),
      };
    }

    if (to.col < from.col) {
      const x1 = from.x + W / 2;
      const x2 = to.x + W / 2;
      const dip = Math.max(from.y, to.y) + H + 30 + laneOffset;
      const p0: [number, number] = [x1, from.y + H];
      const p3: [number, number] = [x2, to.y + H];
      const p1: [number, number] = [x1, dip];
      const p2: [number, number] = [x2, dip];
      return {
        d: `M ${p0[0]} ${p0[1]} C ${p1[0]} ${p1[1]}, ${p2[0]} ${p2[1]}, ${p3[0]} ${p3[1]}`,
        mid: bezierMid(p0, p1, p2, p3),
      };
    }

    const p0: [number, number] = [from.x + W, fy];
    const p3: [number, number] = [to.x, ty];

    if (to.col - from.col > 1) {
      // arc over the intervening column rather than through it
      const lift = Math.min(from.y, to.y) - 26 - laneOffset;
      const p1: [number, number] = [p0[0] + 60, lift];
      const p2: [number, number] = [p3[0] - 60, lift];
      return {
        d: `M ${p0[0]} ${p0[1]} C ${p1[0]} ${p1[1]}, ${p2[0]} ${p2[1]}, ${p3[0]} ${p3[1]}`,
        mid: bezierMid(p0, p1, p2, p3),
      };
    }

    const mx = (p0[0] + p3[0]) / 2;
    const p1: [number, number] = [mx, p0[1]];
    const p2: [number, number] = [mx, p3[1]];
    return {
      d: `M ${p0[0]} ${p0[1]} C ${p1[0]} ${p1[1]}, ${p2[0]} ${p2[1]}, ${p3[0]} ${p3[1]}`,
      mid: bezierMid(p0, p1, p2, p3),
    };
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

            // Fan parallel edges apart so several leaving the same node do not
            // stack into one line with their labels on top of each other.
            const { d, mid } = route(from, to, (i % 3) * 13);
            const label = e.label ?? "";
            const labelW = label.length * 5.6 + 10;

            return (
              <g key={pid} opacity={dim ? 0.22 : 1} style={{ transition: "opacity .18s" }}>
                <path
                  id={pid}
                  d={d}
                  fill="none"
                  stroke="var(--c-text-dim)"
                  strokeWidth={1.25}
                  strokeDasharray={e.async ? "5 4" : undefined}
                  markerEnd={`url(#arrow-${id})`}
                  opacity={0.5}
                />
                {/* the packet: this is what makes the direction readable */}
                {!reducedMotion && <circle r={3.2} fill={e.async ? "var(--accent-2)" : "var(--accent)"}>
                  <animateMotion
                    dur={e.async ? "3.4s" : "2.2s"}
                    begin={`${(i % 5) * 0.45}s`}
                    repeatCount="indefinite"
                    keyPoints="0;1"
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
                </circle>}
                {label && (
                  <g>
                    {/* opaque plate rather than a text stroke: a stroke halo
                        punched a visible hole through whatever border it
                        crossed, which read as a rendering fault */}
                    <rect
                      x={mid[0] - labelW / 2}
                      y={mid[1] - 8}
                      width={labelW}
                      height={16}
                      rx={3}
                      fill="var(--diagram-bg)"
                    />
                    <text
                      x={mid[0]}
                      y={mid[1] + 3.5}
                      fontSize={10.5}
                      fill="var(--c-text-dim)"
                      textAnchor="middle"
                      className="mono"
                    >
                      {label}
                    </text>
                  </g>
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
