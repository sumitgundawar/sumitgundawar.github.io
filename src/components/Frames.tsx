import { useEffect, useRef, type ReactNode } from "react";
import { prefersStill, scrollProgress, subscribe } from "@/lib/motion";

const CORNERS = ["tl", "tr", "br", "bl"] as const;

export function BracketPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`bracketed${className ? ` ${className}` : ""}`}>
      {CORNERS.map((corner) => (
        <svg
          key={corner}
          className="bracket-mark"
          data-corner={corner}
          viewBox="0 0 10.5 10.5"
          fill="none"
          aria-hidden
        >
          <path d="M0 0.5H10V10.5" stroke="currentColor" />
        </svg>
      ))}
      {children}
    </div>
  );
}

export function ChamferLink({
  href,
  label,
  external = false,
  className,
}: {
  href: string;
  label: string;
  external?: boolean;
  className?: string;
}) {
  const rel = external ? "noopener noreferrer" : undefined;
  const target = external ? "_blank" : undefined;
  return (
    <a
      href={href}
      target={target}
      rel={rel}
      className={`chamfer press${className ? ` ${className}` : ""}`}
    >
      <svg className="chamfer-frame" viewBox="0 0 220 50" preserveAspectRatio="none" aria-hidden>
        <path d="M220 42L212.932 50H0V0H220V42Z" fill="var(--surface)" />
        <path
          className="chamfer-flood"
          d="M220 42L212.932 50H0V0H220V42Z"
          fill="var(--signal-fill)"
        />
        <path
          d="M220 42L212.932 50H0V0H220V42Z"
          fill="none"
          stroke="var(--signal)"
          strokeOpacity="0.45"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M205 49.5H213L219.5 42V36 M212 0.5H219.5V7 M8 0.5H0.5V7 M7.5 49.5H0.5V42.5"
          fill="none"
          stroke="var(--signal)"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className="chamfer-label">{label}</span>
      <svg
        className="chamfer-arrow"
        viewBox="0 0 13.7071 10.7071"
        fill="none"
        stroke="currentColor"
        aria-hidden
      >
        <path d="M0 5.35355H13M8 10.3536L13 5.35355L8 0.353553" />
      </svg>
    </a>
  );
}

const CELL = 24;
const SOLID_UNTIL = 0.16;
const LIFT = 2;
const ACCENT_SHARE = 0.06;

const hash = (x: number, y: number) => {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

export function DissolveSeam({ carry = "dark" }: { carry?: "light" | "dark" }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const styles = getComputedStyle(document.documentElement);
    const surface = (carry === "light" ? styles.getPropertyValue("--band") : styles.getPropertyValue("--base")).trim();
    const accent = styles.getPropertyValue("--signal-fill").trim();

    let progress = prefersStill() ? 1 : 0;
    let visible = true;

    const render = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (!width || !height) return;
      const w = Math.round(width * ratio);
      const h = Math.round(height * ratio);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);

      const columns = Math.ceil(width / CELL);
      const rows = Math.ceil(height / CELL);
      const lift = progress * LIFT;

      for (let y = 0; y < rows; y += 1) {
        const depth = y / Math.max(1, rows - 1) + lift;
        if (depth > 1) break;
        const solid = depth <= SOLID_UNTIL;
        const fade = Math.min(1, Math.max(0, 1 - (depth - SOLID_UNTIL) / (1 - SOLID_UNTIL)));
        if (!solid && fade <= 0) break;
        for (let x = 0; x < columns; x += 1) {
          if (!solid) {
            if ((x + y) % 2 !== 0) continue;
            if (hash(x, y) > fade) continue;
          }
          context.fillStyle = !solid && hash(x + 101, y + 57) < ACCENT_SHARE ? accent : surface;
          context.fillRect(x * CELL, y * CELL, CELL, CELL);
        }
      }
    };

    render();
    if (prefersStill()) return;

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(canvas);

    const off = subscribe(
      () => {
        if (!visible) return;
        const next = scrollProgress(
          canvas.getBoundingClientRect(),
          "top_bottom",
          "top_top",
          window.innerHeight || 1,
        );
        if (Math.abs(next - progress) < 0.002) return;
        progress = next;
        render();
      },
      () => 16,
    );

    return () => {
      io.disconnect();
      off();
    };
  }, [carry]);

  return <canvas ref={canvasRef} className="seam" aria-hidden />;
}
