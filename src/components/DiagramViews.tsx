import { useState } from "react";
import { FlowDiagram } from "./FlowDiagram";
import { LayeredDiagram } from "./LayeredDiagram";
import { trackClick } from "@/lib/hooks";
import type { Diagram } from "@/data/learn";

/* Flat is the default and stays the default.
 *
 * The flat view is the one that teaches: it names every hop and labels every
 * edge, and it is readable at 390px. The layered view answers a different
 * question, which is what "through the stack" actually means, and it answers it
 * better than any arrangement on a plane can. Offering both and defaulting to
 * flat means the depth is there for the people it helps without taxing the
 * people it does not. */
export function DiagramViews({ diagram, id }: { diagram: Diagram; id: string }) {
  const [view, setView] = useState<"flow" | "layers">("flow");

  // Two columns is a before and an after; there is no stack to look through.
  if (diagram.columns.length < 3) return <FlowDiagram diagram={diagram} id={id} />;

  return (
    <div>
      <div className="flex gap-1.5 mb-2" role="group" aria-label="Diagram view">
        {(["flow", "layers"] as const).map((v) => {
          const on = view === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => {
                setView(v);
                trackClick("diagram_view", { view: v, diagram: id });
              }}
              aria-pressed={on}
              className="mono text-[11px] uppercase tracking-[0.08em] px-2.5 min-h-[44px] inline-flex items-center"
              style={{
                background: on ? "var(--surface-2)" : "transparent",
                border: `1px solid ${on ? "var(--hair-strong)" : "var(--hair)"}`,
                color: on ? "var(--c-text)" : "var(--c-text-dim)",
              }}
            >
              {v === "flow" ? "flow" : "3D layers"}
            </button>
          );
        })}
      </div>
      {view === "flow" ? (
        <FlowDiagram diagram={diagram} id={id} />
      ) : (
        <LayeredDiagram diagram={diagram} id={id} />
      )}
    </div>
  );
}
