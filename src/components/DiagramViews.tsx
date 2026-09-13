import { useState } from "react";
import { FlowDiagram } from "./FlowDiagram";
import { LayeredDiagram } from "./LayeredDiagram";
import { trackClick } from "@/lib/hooks";
import type { Diagram } from "@/data/learn";

export function DiagramViews({ diagram, id }: { diagram: Diagram; id: string }) {
  const [view, setView] = useState<"flow" | "layers">("flow");

  if (diagram.columns.length < 3) return <FlowDiagram diagram={diagram} id={id} />;

  const toggle = (
    <div className="flex gap-8" role="group" aria-label="Diagram view">
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
            className="mono text-m3 caps tracking-[0.08em] px-12 min-h-[44px] inline-flex items-center"
            style={{
              background: on ? "var(--ink-3)" : "transparent",
              border: `1px solid ${on ? "var(--rule-3)" : "var(--rule-2)"}`,
              color: on ? "var(--text-hi)" : "var(--text-mid)",
            }}
          >
            {v === "flow" ? "flow" : "3D layers"}
          </button>
        );
      })}
    </div>
  );

  return (
    <div>
      {view === "flow" ? (
        <FlowDiagram diagram={diagram} id={id} controls={toggle} />
      ) : (
        <>
          <div className="mb-12">{toggle}</div>
          <LayeredDiagram diagram={diagram} id={id} />
        </>
      )}
    </div>
  );
}
