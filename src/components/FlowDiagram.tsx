import { useEffect, useMemo, useState, useRef, type CSSProperties, type ReactNode } from "react";
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

const NARROW_QUERY = "(max-width: 619px)";

function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(
    () => typeof window !== "undefined" && window.matchMedia(NARROW_QUERY).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(NARROW_QUERY);
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

const EDGE_LABEL_PX = 10.5;
const EDGE_CHAR = 5.6;

function wrapLabel(text: string, maxWidth: number, maxLines: number): string[] {
  const perLine = Math.max(6, Math.floor(maxWidth / EDGE_CHAR));
  if (text.length <= perLine) return [text];
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (next.length <= perLine) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    line = word;
    if (lines.length === maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length > maxLines) lines.length = maxLines;
  const last = lines[lines.length - 1];
  const used = lines.join(" ").length;
  if (used < text.length) {
    lines[lines.length - 1] = `${last.slice(0, Math.max(1, perLine - 1))}\u2026`;
  }
  return lines;
}

const W = 168;

const MAX_SCALE = 1.35;

const H = 74;
const GAP_X = 176;
const GAP_Y = 34;
const GAP_Y_NARROW = 92;
const PAD = 18;
const DEPTH = 3;

interface Placed extends DiagramNode {
  x: number;
  y: number;
  col: number;
}

export function FlowDiagram({
  diagram,
  id,
  controls,
}: {
  diagram: Diagram;
  id: string;
  controls?: ReactNode;
}) {
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
          y: narrow
            ? PAD + ci * (H + GAP_Y_NARROW)
            : PAD + offset + ri * (H + GAP_Y),
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
      if (b < a || b === a) below = 124;
    });

    return {
      placed: placed.map((p) => ({ ...p, y: p.y + above })),
      byId: Object.fromEntries(
        placed.map((p) => [p.id, { ...p, y: p.y + above }]),
      ),
      width: narrow ? PAD * 2 + W : PAD * 2 + cols.length * W + (cols.length - 1) * GAP_X,
      height: narrow
        ? PAD * 2 + cols.length * H + (cols.length - 1) * GAP_Y_NARROW + DEPTH
        : PAD * 2 + full + DEPTH + above + below,
    };
  }, [diagram, narrow]);

  const routed = useMemo(() => {
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
        const down = p3[1] > p0[1];
        const slot: [number, number] = down
          ? [x, from.y + H + GAP_Y_NARROW / 2]
          : [x, from.y - GAP_Y_NARROW / 2];
        return {
          d: `M ${p0[0]} ${p0[1]} C ${p1[0]} ${p1[1]}, ${p2[0]} ${p2[1]}, ${p3[0]} ${p3[1]}`,
          mid: slot,
          room: W - 20,
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
          room: W + GAP_X,
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
          room: W + GAP_X,
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
          room: W + GAP_X,
        };
      }

      const mx = (p0[0] + p3[0]) / 2;
      const p1: [number, number] = [mx, p0[1]];
      const p2: [number, number] = [mx, p3[1]];
      return {
        d: `M ${p0[0]} ${p0[1]} C ${p1[0]} ${p1[1]}, ${p2[0]} ${p2[1]}, ${p3[0]} ${p3[1]}`,
        mid: bezierMid(p0, p1, p2, p3),
        room: GAP_X - 24,
      };
    };

    const CLEAR = DEPTH + 5;
    const nodeBoxes = placed.map((n) => ({
      x: n.x - CLEAR,
      y: n.y - CLEAR,
      w: W + DEPTH + CLEAR * 2,
      h: H + DEPTH + CLEAR * 2,
    }));
    const taken: { x: number; y: number; w: number; h: number }[] = [];

    return diagram.edges.map((e, i) => {
      const from = byId[e.from];
      const to = byId[e.to];
      if (!from || !to) return null;

      const { d, mid: anchor, room } = route(from, to, (i % 3) * 13);
      const lines = e.label ? wrapLabel(e.label, room, 2) : [];
      if (!lines.length) return { d, lines, mid: anchor, labelW: 0, labelH: 0 };

      const labelW = lines.reduce((w, l) => Math.max(w, l.length * EDGE_CHAR), 0) + 12;
      const labelH = lines.length * 13 + 5;
      const stepX = labelW / 2 + 12;

      const offsets: [number, number][] = [];
      for (let k = 0; k <= 20; k += 1) {
        offsets.push([0, k * 8]);
        if (k) offsets.push([0, -k * 8]);
      }
      for (let kx = 1; kx <= 3; kx += 1) {
        for (let k = 0; k <= 12; k += 1) {
          offsets.push([kx * stepX, k * 8], [-kx * stepX, k * 8]);
          if (k) offsets.push([kx * stepX, -k * 8], [-kx * stepX, -k * 8]);
        }
      }

      const area = (
        a: { x: number; y: number; w: number; h: number },
        b: { x: number; y: number; w: number; h: number },
      ) =>
        Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
        Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

      let mid = anchor;
      let best = Infinity;
      for (const [dx, dy] of offsets) {
        const candidate: [number, number] = [anchor[0] + dx, anchor[1] + dy];
        const box = {
          x: candidate[0] - labelW / 2,
          y: candidate[1] - labelH / 2,
          w: labelW,
          h: labelH,
        };
        const cost =
          nodeBoxes.reduce((n, b) => n + area(box, b), 0) +
          taken.reduce((n, b) => n + area(box, b), 0);
        if (cost < best) {
          best = cost;
          mid = candidate;
        }
        if (cost === 0) break;
      }

      taken.push({
        x: mid[0] - labelW / 2 - 4,
        y: mid[1] - labelH / 2 - 3,
        w: labelW + 8,
        h: labelH + 6,
      });
      return { d, lines, mid, labelW, labelH };
    });
  }, [diagram, byId, placed, narrow]);

  const viewHeight = useMemo(() => {
    let bottom = 0;
    for (const n of placed) bottom = Math.max(bottom, n.y + H + DEPTH);
    for (const g of routed) {
      if (!g) continue;
      for (const m of g.d.matchAll(/-?\d+(?:\.\d+)?\s+(-?\d+(?:\.\d+)?)/g)) {
        bottom = Math.max(bottom, Number(m[1]));
      }
      if (g.lines.length) bottom = Math.max(bottom, g.mid[1] + g.labelH / 2);
    }
    return Math.min(height, Math.ceil(bottom + PAD));
  }, [placed, routed, height]);

  const hoveredNode = hovered ? byId[hovered] : null;
  const hasAlternatives = diagram.columns.some((col) => col.some((n) => n.alternative));

  return (
    <figure className="my-24">
      {!full && (
        <div className="flex items-center justify-between gap-8 mb-8">
          {controls ?? <span />}
          <button
            type="button"
            onClick={toggleFull}
            aria-label="View full screen"
            className="mono text-m3 caps tracking-[0.08em] px-12 min-h-[44px] inline-flex items-center gap-8"
            style={{
              color: "var(--text-mid)",
              background: "transparent",
              border: "1px solid var(--rule-2)",
            }}
          >
            Full screen
          </button>
        </div>
      )}
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
            className="absolute left-8 bottom-8 z-10 max-w-[min(30em,calc(100%-1rem))] p-16"
            style={{
              background: "var(--ink-2)",
              border: "1px solid var(--rule-3)",
              boxShadow: "0 8px 28px rgba(0,0,0,0.45)",
            }}
            role="status"
          >
            <div className="flex items-baseline gap-8 flex-wrap">
              <span className="text-t1 font-medium" style={{ color: "var(--text-hi)" }}>
                {hoveredNode.label}
              </span>
              {hoveredNode.sub && (
                <span className="mono text-m2" style={{ color: "var(--accent)" }}>
                  {hoveredNode.sub}
                </span>
              )}
              <span className="mono text-m3 caps tracking-[0.08em] ml-auto" style={{ color: "var(--text-mid)" }}>
                {KIND_LABEL[hoveredNode.kind ?? "service"]}
              </span>
            </div>
            <p className="text-t2 leading-relaxed mt-8" style={{ color: "var(--text-mid)" }}>
              {hoveredNode.why}
            </p>
            {hoveredNode.setup && (
              <>
                <div className="mono text-m3 caps tracking-[0.09em] mt-12 mb-4" style={{ color: "var(--accent)" }}>
                  Running it
                </div>
                <p className="text-t2 leading-relaxed" style={{ color: "var(--text-mid)" }}>
                  {hoveredNode.setup}
                </p>
              </>
            )}
          </div>
        )}

        {full && <button
          type="button"
          onClick={toggleFull}
          aria-label="Leave full screen"
          className="absolute top-8 right-8 z-10 mono caps tracking-[0.08em] px-12 min-h-[44px] inline-flex items-center gap-8"
          style={{
            fontSize: "var(--m3)",
            color: "var(--text-hi)",
            background: "var(--ink-2)",
            border: "1px solid var(--rule-3)",
          }}
        >
          Exit
        </button>}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${viewHeight}`}
          width="100%"
          role="group"
          aria-label={diagram.caption}
          style={{
            minWidth: narrow ? undefined : width,
            maxWidth: width * MAX_SCALE,
            marginInline: "auto",
            display: "block",
          }}
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

            const geom = routed[i];
            if (!geom) return null;
            const { d, mid, lines, labelW, labelH } = geom;

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
                {lines.length > 0 && (
                  <g>
                    <rect
                      x={mid[0] - labelW / 2}
                      y={mid[1] - labelH / 2}
                      width={labelW}
                      height={labelH}
                      rx={3}
                      fill="var(--plate)"
                    />
                    <text
                      x={mid[0]}
                      y={mid[1] - labelH / 2 + 11}
                      fontSize={EDGE_LABEL_PX}
                      fill="var(--text-mid)"
                      textAnchor="middle"
                      className="mono"
                    >
                      {lines.map((l, li) => (
                        <tspan key={li} x={mid[0]} dy={li === 0 ? 0 : 13}>
                          {l}
                        </tspan>
                      ))}
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

      <figcaption className="mt-8 text-m2" style={{ color: "var(--text-mid)" }}>
        <div className="flex flex-wrap items-center gap-x-16 gap-y-8 mono text-m2 mb-8">
          {([...new Set(diagram.columns.flat().map((n) => n.kind ?? "service"))] as NodeKind[]).map(
            (k) => (
              <span key={k} className="inline-flex items-center gap-8">
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
          <span className="opacity-80">Dashed = asynchronous</span>
          {hasAlternatives && (
            <span className="inline-flex items-center gap-8" style={{ color: "var(--warn)" }}>
              <span aria-hidden style={{ width: 9, height: 9, border: "1px dashed var(--warn)" }} />
              Considered, not chosen
            </span>
          )}
        </div>
        <span>{diagram.caption}</span>
        {hoveredNode && !hoveredNode.why && (
          <span className="mono text-m2 ml-12" style={{ color: "var(--accent)" }}>
            {hoveredNode.label}
            {hoveredNode.sub ? ` · ${hoveredNode.sub}` : ""} · {KIND_LABEL[hoveredNode.kind ?? "service"]}
          </span>
        )}
      </figcaption>
    </figure>
  );
}
