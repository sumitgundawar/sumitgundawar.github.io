import { useEffect, useMemo, useState, useRef, type CSSProperties } from "react";
import { LABEL_EM_PER_CHAR, LABEL_PX, NODE_TEXT_WIDTH, wrapSub } from "@/data/learn/types";
import { usePrefersReducedMotion } from "@/lib/hooks";
import type { Diagram, DiagramNode, NodeKind } from "@/data/learn";

const KIND_COLOR: Record<NodeKind, { fill: string; edge: string; text: string }> = {
  client: { fill: "var(--n-client)", edge: "var(--n-client-edge)", text: "var(--n-client-text)" },
  edge: { fill: "var(--n-edge)", edge: "var(--n-edge-edge)", text: "var(--n-edge-text)" },
  service: { fill: "var(--n-service)", edge: "var(--n-service-edge)", text: "var(--n-service-text)" },
  data: { fill: "var(--n-data)", edge: "var(--n-data-edge)", text: "var(--n-data-text)" },
  queue: { fill: "var(--n-queue)", edge: "var(--n-queue-edge)", text: "var(--n-queue-text)" },
  external: { fill: "var(--n-external)", edge: "var(--n-external-edge)", text: "var(--n-external-text)" },
};

function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const on = () => setNarrow(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return narrow;
}

const KIND_LABEL: Record<NodeKind, string> = {
  client: "Client",
  edge: "Edge / CDN",
  service: "Service",
  data: "Data store",
  queue: "Queue / stream",
  external: "External",
};

function fit(text: string, emPerChar: number, px: number, maxWidth: number): string {
  const max = Math.floor(maxWidth / (px * emPerChar));
  return text.length <= max ? text : text.slice(0, Math.max(1, max - 1)) + "…";
}

const W = 168;

const H = 74;
const GAP_X = 132;
const GAP_Y = 34;
const PAD = 18;
const DEPTH = 3;

interface Placed extends DiagramNode {
  x: number;
  y: number;
  col: number;
}

export function FlowDiagram({ diagram, id }: { diagram: Diagram; id: string }) {
  const [hovered, setHovered] = useState<string | null>(null);

  const frameRef = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);

  useEffect(() => {
    const onChange = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFull = () => {
    const el = frameRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});

    else void el.requestFullscreen?.().catch(() => {});
  };
  const narrow = useNarrow();

  const reducedMotion = usePrefersReducedMotion();

  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || reducedMotion) return;

    const paths = Array.from(svg.querySelectorAll<SVGPathElement>(".edge-path"));
    paths.forEach((path, i) => {
      const len = path.getTotalLength();
      path.style.setProperty("--edge-len", `${Math.round(len)}`);
      path.style.setProperty("--edge-delay", `${180 + Math.min(i * 70, 700)}ms`);
    });

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add("diagram-draw");
          io.unobserve(e.target);
        });
      },
      { threshold: 0.15 },
    );
    io.observe(svg);
    return () => io.disconnect();
  }, [reducedMotion, diagram]);

  const { placed, width, height, byId } = useMemo(() => {
    const cols = narrow ? diagram.columns.flat().map((n) => [n]) : diagram.columns;
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
          x: narrow ? PAD : PAD + ci * (W + GAP_X),
          y: narrow ? PAD + ci * (H + GAP_Y) : PAD + offset + ri * (H + GAP_Y),
        });
      });
    });

    const byId = Object.fromEntries(placed.map((p) => [p.id, p]));

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
      width: narrow ? PAD * 2 + W : PAD * 2 + cols.length * W + (cols.length - 1) * GAP_X,
      height: narrow
        ? PAD * 2 + cols.length * H + (cols.length - 1) * GAP_Y + DEPTH
        : PAD * 2 + full + DEPTH + above + below,
    };
  }, [diagram, narrow]);

  const bezierMid = (
    p0: [number, number],
    p1: [number, number],
    p2: [number, number],
    p3: [number, number],
  ): [number, number] => [
    (p0[0] + 3 * p1[0] + 3 * p2[0] + p3[0]) / 8,
    (p0[1] + 3 * p1[1] + 3 * p2[1] + p3[1]) / 8,
  ];

  const route = (from: Placed, to: Placed, laneOffset: number) => {
    const fy = from.y + H / 2;
    const ty = to.y + H / 2;

    if (narrow) {
      const x = from.x + W / 2;
      const bow = x + 26 + laneOffset;
      const p0: [number, number] = [x, from.y + H];
      const p3: [number, number] = [to.x + W / 2, to.y];
      const p1: [number, number] = [bow, p0[1] + 18];
      const p2: [number, number] = [bow, p3[1] - 18];
      return {
        d: `M ${p0[0]} ${p0[1]} C ${p1[0]} ${p1[1]}, ${p2[0]} ${p2[1]}, ${p3[0]} ${p3[1]}`,
        mid: bezierMid(p0, p1, p2, p3),
      };
    }

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

      const between = placed.filter((n) => n.col > to.col && n.col < from.col);
      const bottom = Math.max(from.y, to.y, ...between.map((n) => n.y));
      const dip = bottom + H + 30 + laneOffset;
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
      const skipped = placed.filter((n) => n.col > from.col && n.col < to.col);
      const top = Math.min(from.y, to.y, ...skipped.map((n) => n.y));
      const lift = top - 26 - laneOffset;
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
  const hasAlternatives = diagram.columns.some((col) => col.some((n) => n.alternative));

  return (
    <figure className="my-6">
      <div
        ref={frameRef}
        className="relative overflow-x-auto rounded-lg border"
        style={{
          borderColor: "var(--rule-2)",
          background: "var(--plate)",
          ...(full ? { display: "flex", alignItems: "center", height: "100%" } : null),
        }}
      >

        {hoveredNode?.why && (
          <div
            className="absolute left-2 bottom-2 z-10 max-w-[min(30em,calc(100%-1rem))] p-3.5"
            style={{
              background: "var(--ink-2)",
              border: "1px solid var(--rule-3)",
              boxShadow: "0 8px 28px rgba(0,0,0,0.45)",
            }}
            role="status"
          >
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-t1 font-medium" style={{ color: "var(--text-hi)" }}>
                {hoveredNode.label}
              </span>
              {hoveredNode.sub && (
                <span className="mono text-m2" style={{ color: "var(--accent)" }}>
                  {hoveredNode.sub}
                </span>
              )}
              <span className="mono text-m3 uppercase tracking-[0.08em] ml-auto" style={{ color: "var(--text-mid)" }}>
                {KIND_LABEL[hoveredNode.kind ?? "service"]}
              </span>
            </div>
            <p className="text-t2 leading-relaxed mt-2" style={{ color: "var(--text-mid)" }}>
              {hoveredNode.why}
            </p>
            {hoveredNode.setup && (
              <>
                <div className="mono text-m3 uppercase tracking-[0.09em] mt-3 mb-1" style={{ color: "var(--accent)" }}>
                  running it
                </div>
                <p className="text-t2 leading-relaxed" style={{ color: "var(--text-mid)" }}>
                  {hoveredNode.setup}
                </p>
              </>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={toggleFull}
          aria-label={full ? "Leave full screen" : "View full screen"}
          className="absolute top-2 right-2 z-10 mono uppercase tracking-[0.08em] px-2.5 min-h-[44px] inline-flex items-center gap-2"
          style={{
            fontSize: "var(--m3)",
            color: "var(--text-hi)",
            background: "var(--ink-2)",
            border: "1px solid var(--rule-3)",
          }}
        >
          {full ? "exit" : "full screen"}
        </button>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          role="group"
          aria-label={diagram.caption}
          style={{ minWidth: narrow ? undefined : width, display: "block" }}
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
              <path d="M 0 1 L 8 4 L 0 7 z" fill="var(--text-mid)" />
            </marker>
          </defs>

          {diagram.edges.map((e, i) => {
            const from = byId[e.from];
            const to = byId[e.to];
            if (!from || !to) return null;
            const pid = `${id}-e${i}`;
            const dim = hovered !== null && hovered !== e.from && hovered !== e.to;

            const { d, mid } = route(from, to, (i % 3) * 13);
            const label = e.label ?? "";
            const labelW = label.length * 5.6 + 10;

            return (
              <g key={pid} opacity={dim ? 0.22 : 1} style={{ transition: "opacity .18s" }}>
                <path
                  id={pid}
                  className="edge-path"
                  d={d}
                  fill="none"
                  stroke="var(--text-mid)"
                  strokeWidth={1.25}
                  strokeDasharray={e.async ? "5 4" : undefined}
                  markerEnd={`url(#arrow-${id})`}
                  opacity={0.5}
                />

                {!reducedMotion && <circle r={3.2} fill={e.async ? "var(--accent)" : "var(--accent)"}>
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

                    <rect
                      x={mid[0] - labelW / 2}
                      y={mid[1] - 8}
                      width={labelW}
                      height={16}
                      rx={3}
                      fill="var(--plate)"
                    />
                    <text
                      x={mid[0]}
                      y={mid[1] + 3.5}
                      fontSize={10.5}
                      fill="var(--text-mid)"
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

          {placed.map((n, ni) => {
            const kind = n.kind ?? "service";
            const c = KIND_COLOR[kind];
            const active = hovered === n.id;
            const dim = hovered !== null && !active;
            return (
              <g
                key={n.id}
                className="node-fade"
                style={{ "--node-delay": `${Math.min(ni * 55, 640)}ms` } as CSSProperties}
              >
              <g
                opacity={dim ? 0.4 : 1}
                onMouseEnter={() => setHovered(n.id)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(n.id)}
                onBlur={() => setHovered(null)}

                onClick={() => setHovered((cur) => (cur === n.id ? null : n.id))}
                tabIndex={0}
                role="img"
                aria-label={`${n.label}${n.sub ? `, ${n.sub}` : ""}. ${KIND_LABEL[kind]}.`}
                style={{ cursor: "pointer", transition: "opacity .18s" }}
              >

                <rect
                  x={n.x + DEPTH}
                  y={n.y + DEPTH}
                  width={W}
                  height={H}
                  rx={9}
                  fill={c.edge}
                  opacity={0.18}
                />

                <rect
                  x={n.x}
                  y={n.y - (active ? 2 : 0)}
                  width={W}
                  height={H}
                  rx={9}
                  fill={n.alternative ? "rgba(232,178,58,0.08)" : c.fill}
                  stroke={n.alternative ? "var(--warn)" : c.edge}
                  strokeWidth={active ? 1.8 : 1}
                  strokeDasharray={n.alternative ? "5 4" : undefined}
                  style={{ transition: "y .18s, stroke-width .18s" }}
                />
                <text
                  x={n.x + 14}
                  y={n.y + (n.sub ? 26 : 42) - (active ? 2 : 0)}
                  fontSize={13.5}
                  fontWeight={550}
                  fill={n.alternative ? "var(--warn)" : c.text}
                >
                  {fit(n.label, LABEL_EM_PER_CHAR, LABEL_PX, NODE_TEXT_WIDTH)}
                </text>
                {n.sub &&
                  wrapSub(n.sub).map((line, li) => (
                    <text
                      key={li}
                      x={n.x + 14}
                      y={n.y + 45 + li * 13 - (active ? 2 : 0)}
                      fontSize={11}
                      fill={c.text}
                      opacity={0.72}
                      className="mono"
                    >
                      {line}
                    </text>
                  ))}
              </g>
              </g>
            );
          })}
        </svg>
      </div>

      <figcaption className="mt-2.5 text-m2" style={{ color: "var(--text-mid)" }}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mono text-m2 mb-2">
          {([...new Set(diagram.columns.flat().map((n) => n.kind ?? "service"))] as NodeKind[]).map(
            (k) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 2,
                    background: KIND_COLOR[k].fill,
                    border: `1px solid ${KIND_COLOR[k].edge}`,
                  }}
                />
                {KIND_LABEL[k]}
              </span>
            ),
          )}
          <span className="opacity-80">dashed = asynchronous</span>
          {hasAlternatives && (
            <span className="inline-flex items-center gap-1.5" style={{ color: "var(--warn)" }}>
              <span aria-hidden style={{ width: 9, height: 9, border: "1px dashed var(--warn)" }} />
              considered, not chosen
            </span>
          )}
        </div>
        <span>{diagram.caption}</span>
        {hoveredNode && !hoveredNode.why && (
          <span className="mono text-m2 ml-3" style={{ color: "var(--accent)" }}>
            {hoveredNode.label}
            {hoveredNode.sub ? ` · ${hoveredNode.sub}` : ""} · {KIND_LABEL[hoveredNode.kind ?? "service"]}
          </span>
        )}
      </figcaption>
    </figure>
  );
}
