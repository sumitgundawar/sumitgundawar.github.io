import type { Health } from "@/data/content";
import { cn } from "@/lib/utils";

const HEALTH_COLOR: Record<Health, string> = {
  ok: "var(--signal)",
  warn: "var(--warn)",
  crit: "var(--crit)",
};
const HEALTH_WORD: Record<Health, string> = {
  ok: "operational",
  warn: "degraded",
  crit: "critical",
};

export function HealthDot({
  health,
  pulse = false,
  size = 8,
  className,
}: {
  health: Health;
  pulse?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={`status: ${HEALTH_WORD[health]}`}
      className={cn("inline-block shrink-0 rounded-full", className)}
      style={{
        width: size,
        height: size,
        background: HEALTH_COLOR[health],
        animation: pulse ? "pulse-dot 2.4s var(--ease) infinite" : undefined,
      }}
    />
  );
}

export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("eyebrow", className)}>{children}</div>;
}

export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="mono text-[11px] text-fg-dim border border-hair px-1.5 py-1 leading-none whitespace-nowrap">
      {children}
    </span>
  );
}
