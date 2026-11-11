import { useEffect, useMemo, useRef, useState } from "react";
import { advance, onEnter, prefersStill, subscribe, SPRING } from "@/lib/motion";
import type { Diagram, DiagramNode, NodeKind } from "@/data/learn";

const KIND_FILL: Record<NodeKind, string> = {
  client: "var(--n-client-fill)",
  edge: "var(--n-edge-fill)",
  service: "var(--n-service-fill)",
  data: "var(--n-data-fill)",
  queue: "var(--n-queue-fill)",
  external: "var(--n-external-fill)",
};

const KIND_LINE: Record<NodeKind, string> = {
  client: "var(--n-client)",
  edge: "var(--n-edge)",
  service: "var(--n-service)",
  data: "var(--n-data)",
  queue: "var(--n-queue)",
  external: "var(--n-external)",
};

const KIND_TEXT: Record<NodeKind, string> = {
  client: "var(--n-client-text)",
  edge: "var(--n-edge-text)",
  service: "var(--n-service-text)",
  data: "var(--n-data-text)",
  queue: "var(--n-queue-text)",
  external: "var(--n-external-text)",
};

const KIND_LABEL: Record<NodeKind, string> = {
  client: "Client",
  edge: "Edge",
  service: "Service",
  data: "Data store",
  queue: "Queue",
  external: "External",
};

const NODE_W = 168;
const NODE_H = 54;
const COL_GAP = 192;
const ROW_GAP = 62;
const TIER_GAP = 92;
const BAND_PAD_X = 30;
const BAND_PAD_Y = 18;
const PER_ROW = 3;
const CORNER = 11;

type Placed = DiagramNode & { tier: number; x: number; y: number };
type Link = { from: string; to: string; tier: number; async?: boolean; path: string; len: number };

function elbow(ax: number, ay: number, bx: number, by: number, mid: number) {
  const dx = bx - ax;
  if (Math.abs(dx) < 2) {
    return { path: `M ${ax} ${ay} L ${bx} ${by}`, len: Math.abs(by - ay) };
  }
  const sign = dx > 0 ? 1 : -1;
  const r = Math.min(CORNER, Math.abs(dx) / 2, Math.abs(mid - ay), Math.abs(by - mid));
  const path = [
    `M ${ax} ${ay}`,
    `L ${ax} ${mid - r}`,
    `Q ${ax} ${mid} ${ax + sign * r} ${mid}`,
    `L ${bx - sign * r} ${mid}`,
    `Q ${bx} ${mid} ${bx} ${mid + r}`,
    `L ${bx} ${by}`,
  ].join(" ");
  return { path, len: Math.abs(by - ay) + Math.abs(dx) };
}

function bypass(ax: number, ay: number, bx: number, by: number, lane: number) {
  const r = CORNER;
  const path = [
    `M ${ax} ${ay}`,
    `L ${ax} ${ay + 20 - r}`,
    `Q ${ax} ${ay + 20} ${ax + (lane > ax ? r : -r)} ${ay + 20}`,
    `L ${lane - (lane > ax ? r : -r)} ${ay + 20}`,
    `Q ${lane} ${ay + 20} ${lane} ${ay + 20 + r}`,
    `L ${lane} ${by - 20 - r}`,
    `Q ${lane} ${by - 20} ${lane - (lane > bx ? r : -r)} ${by - 20}`,
    `L ${bx + (lane > bx ? r : -r)} ${by - 20}`,
    `Q ${bx} ${by - 20} ${bx} ${by - 20 + r}`,
    `L ${bx} ${by}`,
  ].join(" ");
  const len = Math.abs(by - ay) + Math.abs(lane - ax) + Math.abs(lane - bx);
  return { path, len };
}

export function LayeredDiagram({ diagram, id }: { diagram: Diagram; id: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const still = prefersStill();
  const [lift, setLift] = useState(still ? 1 : 0);
  const [flow, setFlow] = useState(still ? 1 : 0);
  const [picked, setPicked] = useState<string | null>(null);
  const [run, setRun] = useState(0);

  const scene = useMemo(() => {
    const placed: Placed[] = [];
    const bands: { tier: number; x: number; y: number; w: number; h: number; label: string }[] = [];
    let cursor = 0;

    diagram.columns.forEach((col, tier) => {
      const rows = Math.ceil(col.length / PER_ROW);
      const height = rows * NODE_H + (rows - 1) * (ROW_GAP - NODE_H);
      col.forEach((node, i) => {
        const rIdx = Math.floor(i / PER_ROW);
        const inRow = Math.min(PER_ROW, col.length - rIdx * PER_ROW);
        const cIdx = i % PER_ROW;
        placed.push({
          ...node,
          tier,
          x: (cIdx - (inRow - 1) / 2) * COL_GAP,
          y: cursor + rIdx * ROW_GAP,
        });
      });
      const widest = Math.min(PER_ROW, col.length);
      const halfW = ((widest - 1) / 2) * COL_GAP + NODE_W / 2 + BAND_PAD_X;
      const kinds = [...new Set(col.map((n) => n.kind ?? "service"))];
      bands.push({
        tier,
        x: -halfW,
        y: cursor - NODE_H / 2 - BAND_PAD_Y,
        w: halfW * 2,
        h: height + BAND_PAD_Y * 2,
        label: kinds.length === 1 ? KIND_LABEL[kinds[0]] : "Mixed",
      });
      cursor += height + TIER_GAP;
    });

    const byId = new Map(placed.map((p) => [p.id, p]));
    const outerX = Math.max(...bands.map((b) => b.x + b.w));
    const links: Link[] = [];
    const laneXs: number[] = [];
    let skips = 0;
    const seen = new Map<number, number>();
    for (const e of diagram.edges) {
      const a = byId.get(e.from);
      const b = byId.get(e.to);
      if (!a || !b) continue;
      const down = b.y >= a.y;
      const ay = a.y + (down ? NODE_H / 2 : -NODE_H / 2);
      const by = b.y + (down ? -NODE_H / 2 : NODE_H / 2);
      const spans = Math.abs(b.tier - a.tier) >= 2;
      let path: string;
      let len: number;
      if (spans) {
        skips += 1;
        const side = skips % 2 === 1 ? 1 : -1;
        const lane = side * (outerX + 14 + Math.floor((skips - 1) / 2) * 20);
        laneXs.push(lane);
        ({ path, len } = bypass(a.x, ay, b.x, by, lane));
      } else {
        const key = Math.round((ay + by) / 2);
        const n = seen.get(key) ?? 0;
        seen.set(key, n + 1);
        const mid = ay + (by - ay) / 2 + (n - 0.5) * 13;
        ({ path, len } = elbow(a.x, ay, b.x, by, mid));
      }
      links.push({ from: e.from, to: e.to, tier: a.tier, async: e.async, path, len });
    }

    const tiers = diagram.columns.length;
    const minX = Math.min(...bands.map((b) => b.x), ...laneXs) - 10;
    const maxX = Math.max(...bands.map((b) => b.x + b.w), ...laneXs) + 10;
    const minY = Math.min(...bands.map((b) => b.y)) - 26;
    const maxY = Math.max(...bands.map((b) => b.y + b.h)) + 10;

    return {
      placed,
      bands,
      links,
      tiers,
      view: `${minX} ${minY} ${maxX - minX} ${maxY - minY}`,
    };
  }, [diagram]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || still) return;
    let stop: (() => void) | null = null;
    const begin = () => {
      const entry = { value: 0, velocity: 0 };
      let elapsed = 0;
      let last = performance.now();
      stop = subscribe((time) => {
        const delta = Math.max(0, Math.min(64, time - last));
        last = time;
        elapsed += delta;
        const settled = advance(entry, 1, SPRING.ROW, delta, 0.002);
        setLift(entry.value);
        const t = Math.max(0, Math.min(1, (elapsed - 420) / 1150));
        setFlow(t < 1 ? t * t * (3 - 2 * t) : 1);
        if (settled && t >= 1) {
          setLift(1);
          setFlow(1);
          stop?.();
          stop = null;
        }
      });
    };
    if (run > 0) {
      setFlow(0);
      begin();
      return () => stop?.();
    }
    const off = onEnter(host, begin);
    return () => {
      off();
      stop?.();
    };
  }, [diagram, still, run]);

  const seg = 1 / Math.max(1, scene.tiers - 1);
  const chosen = scene.placed.find((p) => p.id === picked);
  const incident = new Set(
    picked ? scene.links.filter((l) => l.from === picked || l.to === picked).map((l) => l.from + l.to) : [],
  );

  return (
    <div ref={hostRef} className="layers">
      <svg
        viewBox={scene.view}
        className="layers-svg"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`${diagram.caption}, tiered view`}
      >
        {scene.bands.map((band) => {
          const appear = Math.max(0, Math.min(1, lift * scene.tiers - band.tier));
          return (
            <g key={`b${band.tier}`} opacity={appear}>
              <rect
                x={band.x}
                y={band.y}
                width={band.w}
                height={band.h}
                rx={10}
                fill="var(--sunken)"
                stroke="var(--rule-2)"
                strokeWidth={1}
              />
              <text x={band.x + 12} y={band.y - 9} className="layers-tier">
                {band.label}
              </text>
            </g>
          );
        })}

        {scene.links.map((l) => {
          const key = l.from + l.to;
          const draw = Math.max(0, Math.min(1, lift * scene.tiers - l.tier - 0.2));
          const dim = picked && !incident.has(key) ? 0.18 : 1;
          const start = l.tier * seg;
          const p = Math.max(0, Math.min(1, (flow - start) / seg));
          const dash = 26;
          return (
            <g key={key} opacity={dim}>
              <path
                d={l.path}
                fill="none"
                stroke="var(--edge)"
                strokeWidth={1.5}
                strokeDasharray={l.async ? "6 5" : `${l.len} ${l.len}`}
                strokeDashoffset={l.async ? 0 : l.len * (1 - draw)}
                opacity={l.async ? draw * 0.85 : 0.85}
              />
              {p > 0 && p < 1 && (
                <path
                  d={l.path}
                  fill="none"
                  stroke="var(--signal)"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${l.len + dash}`}
                  strokeDashoffset={dash - p * (l.len + dash)}
                />
              )}
            </g>
          );
        })}

        {scene.placed.map((node) => {
          const kind = node.kind ?? "service";
          const appear = Math.max(0, Math.min(1, lift * scene.tiers - node.tier));
          const hit = flow >= 1 ? 0 : Math.max(0, 1 - Math.abs(flow - node.tier * seg) / (seg * 0.55));
          const on = picked === node.id;
          const dim = picked && !on ? 0.3 : 1;
          const long = node.label.length > 19;
          return (
            <g
              key={node.id}
              data-node
              transform={`translate(${node.x} ${node.y + (1 - appear) * 18})`}
              opacity={appear * dim}
              onClick={() => setPicked(on ? null : node.id)}
              className="layers-node"
            >
              <rect
                x={-NODE_W / 2}
                y={-NODE_H / 2}
                width={NODE_W}
                height={NODE_H}
                rx={8}
                fill={KIND_FILL[kind]}
                stroke={on || hit > 0.05 ? "var(--signal)" : KIND_LINE[kind]}
                strokeWidth={on ? 2 : 1.25 + hit * 1.5}
              />
              <text
                y={node.sub ? -4 : 5}
                className="layers-label"
                fill={KIND_TEXT[kind]}
                style={long ? { fontSize: "12px" } : undefined}
              >
                {node.label}
              </text>
              {node.sub && (
                <text y={15} className="layers-sub" fill={KIND_TEXT[kind]}>
                  {node.sub}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="layers-foot">
        <p className="layers-hint" data-allow-lowercase>
          {chosen
            ? chosen.why || chosen.setup || `${chosen.label}. ${chosen.sub ?? ""}`
            : "Tap a component to see why it is there and what it talks to."}
        </p>
        {!still && (
          <button type="button" className="layers-replay" onClick={() => setRun((r) => r + 1)}>
            Replay the request
          </button>
        )}
      </div>
      <span className="sr-only" id={`${id}-layers`}>
        {diagram.caption}
      </span>
    </div>
  );
}
