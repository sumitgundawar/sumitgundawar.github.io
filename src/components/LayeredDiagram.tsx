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

const NODE_W = 176;
const NODE_H = 56;
const THICK = 9;
const X_GAP = 206;
const Z_GAP = 104;
const Y_GAP = 142;
const PLANE_PAD = 56;
const TILT = 0.46;

type Placed = DiagramNode & { tier: number; x: number; z: number; sx: number; sy: number };

export function LayeredDiagram({ diagram, id }: { diagram: Diagram; id: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [yaw, setYaw] = useState(-0.34);
  const [lift, setLift] = useState(prefersStill() ? 1 : 0);
  const [picked, setPicked] = useState<string | null>(null);
  const dragging = useRef<{ on: boolean; x: number }>({ on: false, x: 0 });

  useEffect(() => {
    const host = hostRef.current;
    if (!host || prefersStill()) return;
    let stop: (() => void) | null = null;
    const off = onEnter(host, () => {
      const state = { value: 0, velocity: 0 };
      let last = performance.now();
      stop = subscribe((time) => {
        const delta = Math.max(0, time - last);
        last = time;
        const done = advance(state, 1, SPRING.REVEAL, delta, 0.002);
        setLift(state.value);
        if (done) {
          stop?.();
          stop = null;
        }
      });
    });
    return () => {
      off();
      stop?.();
    };
  }, [diagram]);

  const scene = useMemo(() => {
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const placed: Placed[] = [];

    diagram.columns.forEach((col, tier) => {
      const perRow = Math.min(3, col.length);
      const rows = Math.ceil(col.length / perRow);
      col.forEach((node, i) => {
        const cIdx = i % perRow;
        const rIdx = Math.floor(i / perRow);
        const inRow = Math.min(perRow, col.length - rIdx * perRow);
        const x = (cIdx - (inRow - 1) / 2) * X_GAP;
        const z = (rIdx - (rows - 1) / 2) * Z_GAP;
        const rx = x * cosY - z * sinY;
        const rz = x * sinY + z * cosY;
        placed.push({ ...node, tier, x, z, sx: rx, sy: rz * TILT + tier * Y_GAP });
      });
    });

    const planes = diagram.columns.map((col, tier) => {
      const xs = placed.filter((p) => p.tier === tier);
      const halfX = Math.max(...xs.map((p) => Math.abs(p.x))) + NODE_W / 2 + PLANE_PAD;
      const halfZ = Math.max(...xs.map((p) => Math.abs(p.z))) + NODE_H / 2 + PLANE_PAD;
      const corner = (cx: number, cz: number) => {
        const rx = cx * cosY - cz * sinY;
        const rz = cx * sinY + cz * cosY;
        return [rx, rz * TILT + tier * Y_GAP];
      };
      const pts = [
        corner(-halfX, -halfZ),
        corner(halfX, -halfZ),
        corner(halfX, halfZ),
        corner(-halfX, halfZ),
      ];
      const kinds = [...new Set(col.map((n) => n.kind ?? "service"))];
      return {
        tier,
        points: pts.map((p) => p.join(",")).join(" "),
        label: kinds.length === 1 ? KIND_LABEL[kinds[0]] : "Mixed",
        lx: pts[0][0],
        ly: pts[0][1] - 14,
      };
    });

    const byId = new Map(placed.map((p) => [p.id, p]));
    const links = diagram.edges
      .map((e) => ({ edge: e, a: byId.get(e.from), b: byId.get(e.to) }))
      .filter((l): l is { edge: typeof l.edge; a: Placed; b: Placed } => Boolean(l.a && l.b));

    const all = [
      ...placed.map((p) => ({ x: p.sx, y: p.sy })),
      ...planes.flatMap((pl) =>
        pl.points.split(" ").map((s) => {
          const [x, y] = s.split(",").map(Number);
          return { x, y };
        }),
      ),
    ];
    const minX = Math.min(...all.map((p) => p.x)) - NODE_W / 2 - 20;
    const maxX = Math.max(...all.map((p) => p.x)) + NODE_W / 2 + 20;
    const minY = Math.min(...all.map((p) => p.y)) - NODE_H - 34;
    const maxY = Math.max(...all.map((p) => p.y)) + NODE_H + 24;

    return {
      placed,
      planes,
      links,
      view: `${minX} ${minY} ${maxX - minX} ${maxY - minY}`,
    };
  }, [diagram, yaw]);

  const onDown = (e: React.PointerEvent) => {
    if ((e.target as Element).closest("[data-node]")) return;
    dragging.current = { on: true, x: e.clientX };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragging.current.on) return;
    const dx = e.clientX - dragging.current.x;
    dragging.current.x = e.clientX;
    setYaw((y) => Math.max(-0.85, Math.min(0.85, y + dx * 0.004)));
  };
  const onUp = () => {
    dragging.current.on = false;
  };

  const chosen = scene.placed.find((p) => p.id === picked);

  return (
    <div ref={hostRef} className="layers">
      <svg
        viewBox={scene.view}
        className="layers-svg"
        role="img"
        aria-label={`${diagram.caption}, layered view`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      >
        {scene.planes.map((plane) => (
          <g key={`p${plane.tier}`} opacity={lift}>
            <polygon
              points={plane.points}
              fill="var(--sunken)"
              stroke="var(--rule-2)"
              strokeWidth={1}
            />
            <text x={plane.lx} y={plane.ly} className="layers-tier">
              {plane.label}
            </text>
          </g>
        ))}

        {scene.links.map((l, i) => (
          <line
            key={`l${i}`}
            x1={l.a.sx}
            y1={l.a.sy + NODE_H / 2}
            x2={l.b.sx}
            y2={l.b.sy - NODE_H / 2}
            stroke="var(--edge)"
            strokeWidth={1.5}
            strokeDasharray={l.edge.async ? "6 5" : undefined}
            opacity={lift * 0.8}
          />
        ))}

        {scene.placed.map((node) => {
          const kind = node.kind ?? "service";
          const drop = (1 - lift) * 34;
          return (
            <g
              key={node.id}
              data-node
              transform={`translate(${node.sx} ${node.sy - drop})`}
              opacity={lift}
              onClick={() => setPicked(picked === node.id ? null : node.id)}
              className="layers-node"
            >
              <rect
                x={-NODE_W / 2 + 4}
                y={-NODE_H / 2 + THICK}
                width={NODE_W}
                height={NODE_H}
                rx={8}
                fill={KIND_LINE[kind]}
                opacity={0.34}
              />
              <rect
                x={-NODE_W / 2}
                y={-NODE_H / 2}
                width={NODE_W}
                height={NODE_H}
                rx={8}
                fill={KIND_FILL[kind]}
                stroke={picked === node.id ? "var(--signal)" : KIND_LINE[kind]}
                strokeWidth={picked === node.id ? 2 : 1.25}
              />
              <text y={node.sub ? -4 : 5} className="layers-label" fill={KIND_TEXT[kind]}>
                {node.label}
              </text>
              {node.sub && (
                <text y={14} className="layers-sub" fill={KIND_TEXT[kind]}>
                  {node.sub}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <p className="layers-hint" data-allow-lowercase>
        {chosen
          ? chosen.why || chosen.setup || `${chosen.label}. ${chosen.sub ?? ""}`
          : "Drag to turn the stack. Tap a component for why it is there."}
      </p>
      <span className="sr-only" id={`${id}-layers`}>
        {diagram.caption}
      </span>
    </div>
  );
}
