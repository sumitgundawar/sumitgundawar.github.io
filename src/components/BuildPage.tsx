import { usePageMeta } from "@/lib/hooks";
import { Masthead, SiteFooter } from "./primitives";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { NewsletterPrompt } from "./NewsletterPrompt";
import { Link } from "react-router-dom";
import { FlowDiagram } from "./FlowDiagram";
import { track } from "@/lib/track";
import { nextQuestion } from "@/lib/api";
import {
  questions,
  recommend,
  costBand,
  headline,
  type Answers,
  type Recommendation,
} from "@/data/build";
import type { Diagram, DiagramEdge } from "@/data/learn";

function toDiagram(recs: Recommendation[]): Diagram {
  const order: Record<string, number> = { client: 0, edge: 1, service: 2, queue: 3, data: 4, external: 4 };
  const present = new Set(recs.map((r) => r.id));

  const edges: Diagram["edges"] = [];
  const seen = new Set<string>();
  const add = (from: string, to: string, isAsync: boolean) => {
    const key = `${from}->${to}`;
    if (from === to || !present.has(to) || seen.has(key)) return;
    seen.add(key);
    edges.push({ from, to, async: isAsync });
  };
  recs.forEach((r) => {
    r.dependsOn?.forEach((to) => add(r.id, to, false));
    r.dependsOnAsync?.forEach((to) => add(r.id, to, true));
  });

  const linked = new Set(edges.flatMap((e) => [e.from, e.to]));
  const host = recs.find((r) => r.id === "api") ?? recs[0];
  recs.forEach((r) => {
    if (r.id !== host?.id && !linked.has(r.id)) add(host.id, r.id, r.kind === "external");
  });

  const columns: Recommendation[][] = [[], [], [], [], []];
  recs.forEach((r) => columns[order[r.kind] ?? 2].push(r));

  const withAlternatives = columns.filter((c) => c.length).map((col) =>
    col.flatMap((r) => {
      const chosen = {
        id: r.id,
        label: r.name,
        sub: r.pick,
        kind: r.kind,
        why: r.why,
        setup: r.where,
      };
      const alt = r.alternatives?.[0];
      if (!alt) return [chosen];
      return [
        chosen,
        {
          id: `${r.id}-alt`,
          label: alt.name,
          sub: `instead of ${r.pick}`,
          kind: r.kind,
          alternative: true,
          why: `Considered instead of ${r.pick}. ${alt.when}`,
          setup: "More to set up and usually more to run. Worth it when the condition above is true for you, and not before.",
        },
      ];
    }),
  );

  const altEdges: DiagramEdge[] = withAlternatives
    .flat()
    .filter((n) => "alternative" in n && n.alternative)
    .map((n) => ({ from: n.id.replace(/-alt$/, ""), to: n.id, label: "or", async: true }));

  return {
    caption: "Your architecture, and what was considered instead. Hover or tap any component.",
    columns: withAlternatives,
    edges: [...edges, ...altEdges],
  };
}

function ComponentCard({ rec }: { rec: Recommendation }) {
  const [showAlts, setShowAlts] = useState(false);

  return (
    <div
      className="rounded-lg border p-4 sm:p-5"
      style={{ borderColor: "var(--hair-strong)", background: "var(--surface)" }}
    >
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div className="flex items-baseline gap-2.5 flex-wrap">
          <span className="text-[length:var(--fs-item)] font-medium" style={{ color: "var(--c-text)" }}>
            {rec.name}
          </span>
          <span className="mono text-[length:var(--fs-label)]" style={{ color: "var(--accent)" }}>
            {rec.pick}
          </span>
        </div>
        {rec.optional && (
          <span className="mono text-[length:var(--fs-label)] uppercase tracking-wide" style={{ color: "var(--lv-intermediate)" }}>
            add when needed
          </span>
        )}
      </div>

      <p className="mt-2.5 text-[length:var(--fs-body)] leading-[1.6]" style={{ color: "var(--c-text-dim)" }}>
        {rec.why}
      </p>

      <p className="mt-2 text-[length:var(--fs-body)] leading-relaxed mono" style={{ color: "var(--c-text-dim)", opacity: 0.85 }}>
        {rec.where}
      </p>

      <button
        onClick={() => {
          setShowAlts((s) => !s);
          if (!showAlts) track("build_alternatives", { component: rec.id });
        }}
        className="mono text-[length:var(--fs-label)] mt-3 link-underline"
        style={{ color: "var(--accent-2)" }}
      >
        {showAlts ? "hide alternatives" : `switch this · ${rec.alternatives.length} alternatives`}
      </button>

      {showAlts && (
        <div className="mt-3 flex flex-col gap-2.5">
          {rec.alternatives.map((alt) => (
            <div key={alt.name} className="border-l-2 pl-3" style={{ borderColor: "var(--hair)" }}>
              <div className="text-[length:var(--fs-body)] font-medium" style={{ color: "var(--c-text)" }}>
                {alt.name}
              </div>
              <div className="text-[length:var(--fs-body)] leading-relaxed" style={{ color: "var(--c-text-dim)" }}>
                {alt.when}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface Adaptive {
  prompt: string;
  help: string;
  reason: string;
}

interface Snapshot {
  answers: Answers;
  currentId: string;
  note: Adaptive | null;
  inferred: Record<string, string>;
}

export function BuildPage() {
  usePageMeta(
    "Build a system",
    "Ten questions about scale, budget and constraints, and a costed architecture with the reasoning attached at the end of them.",
  );

  const [params, setParams] = useSearchParams();

  const fromUrl = useMemo<Answers>(() => {
    const raw = params.get("a");
    if (!raw) return {};
    const out: Answers = {};
    for (const pair of raw.split(",")) {
      const [q, o] = pair.split(":");
      if (q && o) out[q] = o;
    }
    return out;
  }, [params]);

  const [answers, setAnswers] = useState<Answers>(fromUrl);
  const [currentId, setCurrentId] = useState<string>(() =>
    Object.keys(fromUrl).length ? "" : (questions[0]?.id ?? ""),
  );
  const [note, setNote] = useState<Adaptive | null>(null);
  const [inferred, setInferred] = useState<Record<string, string>>({});
  const [thinking, setThinking] = useState(false);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const done = !currentId && Object.keys(answers).length > 0;

  const recs = useMemo(() => (done ? recommend(answers) : []), [done, answers]);
  const diagram = useMemo(() => (recs.length ? toDiagram(recs) : null), [recs]);

  const advance = async (current: Answers) => {
    const left = questions.filter((q) => !(q.id in current));
    if (!left.length) {
      setCurrentId("");
      setNote(null);
      return;
    }

    setThinking(true);
    const res = await nextQuestion(
      current,
      left.map((q) => ({ id: q.id, prompt: q.prompt, options: q.options.map((o) => o.id) })),
    );
    setThinking(false);

    const target = res && questions.find((q) => q.id === res.ask);
    if (res && target) {
      const merged = { ...current };
      const filled: Record<string, string> = {};
      for (const [qid, oid] of Object.entries(res.infer)) {
        const q = questions.find((x) => x.id === qid);
        if (!q || qid === res.ask || qid in merged) continue;
        if (!q.options.some((o) => o.id === oid)) continue;
        merged[qid] = oid;
        filled[qid] = oid;
      }
      if (!(res.ask in merged)) {
        setAnswers(merged);
        setInferred((prev) => ({ ...prev, ...filled }));
        setCurrentId(res.ask);
        setNote({ prompt: res.prompt, help: res.help, reason: res.reason });
        track("build_adaptive", { question: res.ask, inferred: Object.keys(filled).length });
        return;
      }
    }

    setCurrentId(left[0].id);
    setNote(null);
  };

  const choose = (qid: string, oid: string, skipped = false) => {
    setHistory((h) => [...h, { answers, currentId, note, inferred }]);
    const next = { ...answers, [qid]: oid };
    setAnswers(next);
    track(skipped ? "build_skip" : "build_answer", { question: qid, answer: oid });
    void advance(next);
  };

  const back = () => {
    const prev = history[history.length - 1];
    if (!prev) return;
    setHistory((h) => h.slice(0, -1));
    setAnswers(prev.answers);
    setCurrentId(prev.currentId);
    setNote(prev.note);
    setInferred(prev.inferred);
  };

  const askInferred = () => {
    const ids = Object.keys(inferred);
    if (!ids.length) return;
    const stripped = { ...answers };
    ids.forEach((id) => delete stripped[id]);
    setHistory((h) => [...h, { answers, currentId, note, inferred }]);
    setAnswers(stripped);
    setInferred({});
    setNote(null);
    setCurrentId(ids[0]);
    track("build_review_inferred", { count: ids.length });
  };

  const [copied, setCopied] = useState(false);
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      track("build_share", {});
      setTimeout(() => setCopied(false), 2000);
    } catch {
    }
  };

  const restart = () => {
    setAnswers({});
    setParams({}, { replace: true });
    setInferred({});
    setHistory([]);
    setNote(null);
    setCurrentId(questions[0]?.id ?? "");
    track("build_restart", {});
  };

  useEffect(() => {
    if (!done) return;
    const encoded = Object.entries(answers).map(([q, o]) => `${q}:${o}`).join(",");
    if (encoded && params.get("a") !== encoded) {
      setParams({ a: encoded }, { replace: true });
    }
  }, [done, answers, params, setParams]);

  const base = questions.find((x) => x.id === currentId) ?? null;

  const q = base && !thinking ? { ...base, prompt: note?.prompt || base.prompt, help: note?.help || base.help } : null;
  const answeredCount = Object.keys(answers).length;

  return (
    <>
      <Masthead />
      <main id="content" className="min-h-[100dvh]">
      <div className="shell py-8 lg:py-12">

        <h1
          className="mt-7 font-semibold leading-[1.05] tracking-[-0.02em]"
          style={{ fontSize: "var(--fs-page)", color: "var(--c-text)" }}
        >
          Build a system
        </h1>
        <p className="mt-3.5 text-[length:var(--fs-body)] leading-relaxed max-w-[34em]" style={{ color: "var(--c-text-dim)" }}>
          A short interview, then an architecture sized to what you are actually building. The questions
          adapt to your answers, so it asks what still matters and skips what you have already settled.
          Every component comes with why it is there, what it costs, and what you would use instead.
        </p>

        {thinking && (
          <div className="mt-10 flex items-center gap-3" aria-live="polite">
            <span className="build-pulse" aria-hidden />
            <span className="mono text-[length:var(--fs-label)]" style={{ color: "var(--c-text-dim)" }}>
              working out what to ask next
            </span>
          </div>
        )}

        {q && (
          <>
            <div className="mt-8 flex items-center gap-3">
              <div className="h-[4px] flex-1 rounded-full overflow-hidden" style={{ background: "var(--hair-strong)" }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${(answeredCount / questions.length) * 100}%`, background: "var(--accent)" }}
                />
              </div>
              <span className="mono text-[length:var(--fs-label)] tnum shrink-0" style={{ color: "var(--c-text-dim)" }}>
                {answeredCount + 1} / {questions.length}
              </span>
            </div>

            <div className="mt-8">
              {note?.reason && (
                <p className="text-[length:var(--fs-body)] leading-relaxed max-w-[34em]" style={{ color: "var(--c-text-dim)" }}>
                  <span className="mono text-[length:var(--fs-label)] uppercase tracking-[0.08em]" style={{ color: "var(--accent-2)" }}>
                    why this one{" "}
                  </span>
                  {note.reason}
                </p>
              )}
              <h2 className="mt-2 text-[length:var(--fs-item)] sm:text-[length:var(--fs-item)] font-semibold tracking-[-0.01em]" style={{ color: "var(--c-text)" }}>
                {q.prompt}
              </h2>
              {q.help && (
                <p className="mt-2.5 text-[length:var(--fs-body)] leading-relaxed max-w-[32em]" style={{ color: "var(--c-text-dim)" }}>
                  {q.help}
                </p>
              )}

              <div className="mt-5 flex flex-col gap-2.5 max-w-[36em]">
                {q.options.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => choose(q.id, o.id)}
                    className="text-left rounded-lg border px-4 py-3.5 transition-transform hover:-translate-y-0.5"
                    style={{ borderColor: "var(--hair-strong)", background: "var(--surface)" }}
                  >
                    <div className="text-[length:var(--fs-body)]" style={{ color: "var(--c-text)" }}>
                      {o.label}
                    </div>
                    {o.hint && (
                      <div className="text-[length:var(--fs-body)] mt-0.5" style={{ color: "var(--c-text-dim)" }}>
                        {o.hint}
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {Object.keys(inferred).length > 0 && (
                <p className="mt-4 text-[length:var(--fs-body)] leading-relaxed max-w-[34em]" style={{ color: "var(--c-text-dim)" }}>
                  {Object.keys(inferred).length === 1 ? "One question was" : `${Object.keys(inferred).length} questions were`}{" "}
                  answered from what you had already said, to keep this short.{" "}
                  <button onClick={askInferred} className="link-underline mono text-[length:var(--fs-label)]" style={{ color: "var(--accent-2)" }}>
                    ask me those as well
                  </button>
                </p>
              )}

              <div className="mt-5 flex items-center gap-5">
                {history.length > 0 && (
                  <button
                    onClick={back}
                    className="mono text-[length:var(--fs-label)] link-underline inline-flex items-center min-h-[44px]"
                    style={{ color: "var(--c-text-dim)" }}
                  >
                    ← back
                  </button>
                )}
                <button
                  onClick={() => choose(q.id, q.skipDefault, true)}
                  className="mono text-[length:var(--fs-label)] link-underline inline-flex items-center min-h-[44px]"
                  style={{ color: "var(--c-text-dim)" }}
                >
                  skip, assume a sensible default
                </button>
              </div>
            </div>
          </>
        )}

        {done && diagram && (
          <div className="mt-9">
            <div className="flex items-center gap-4 flex-wrap">
              <button
                onClick={back}
                className="mono text-[length:var(--fs-label)] link-underline inline-flex items-center min-h-[44px]"
                style={{ color: "var(--c-text-dim)" }}
              >
                ← change last answer
              </button>
              <button onClick={restart} className="mono text-[length:var(--fs-label)] link-underline inline-flex items-center min-h-[44px]" style={{ color: "var(--c-text-dim)" }}>
                start again
              </button>
              <button
                onClick={copyLink}
                className="mono text-[length:var(--fs-label)] uppercase tracking-[0.08em] px-3 min-h-[44px] inline-flex items-center"
                style={{
                  border: "1px solid var(--hair-strong)",
                  background: "var(--surface-2)",
                  color: copied ? "var(--accent)" : "var(--c-text)",
                }}
              >
                {copied ? "link copied" : "copy link"}
              </button>
            </div>

            <NewsletterPrompt
              context="build"
              line="If this was useful, I write about the decisions behind architectures like this one: what broke in production and what the fix cost. Sent when there is something worth sending."
            />

            <p className="mt-6 text-[length:var(--fs-body)] leading-relaxed max-w-[35em]" style={{ color: "var(--c-text)" }}>
              {headline(answers)}
            </p>
            <p className="mt-2.5 mono text-[length:var(--fs-body)]" style={{ color: "var(--accent)" }}>
              {costBand(answers)}
            </p>

            <FlowDiagram diagram={diagram} id="build-result" />

            <div className="mt-7 grid gap-3">
              {recs.map((r) => (
                <ComponentCard key={r.id} rec={r} />
              ))}
            </div>

            <p className="mt-8 text-[length:var(--fs-body)] leading-relaxed max-w-[34em]" style={{ color: "var(--c-text-dim)" }}>
              Anything marked add when needed is deliberately not part of the first build. Add it when you
              have measured that you need it, not before, every component you skip is one you do not have
              to operate, secure or pay for.
            </p>
          </div>
        )}
      </div>
    </main>
      <SiteFooter />
    </>
  );
}
