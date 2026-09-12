import { usePageMeta } from "@/lib/hooks";
import { Masthead, PageHeader, SiteFooter } from "./primitives";
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
      style={{ borderColor: "var(--rule-3)", background: "var(--ink-2)" }}
    >
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div className="flex items-baseline gap-2.5 flex-wrap">
          <span className="text-t1 font-medium" style={{ color: "var(--text-hi)" }}>
            {rec.name}
          </span>
          <span className="mono text-m2" style={{ color: "var(--accent)" }}>
            {rec.pick}
          </span>
        </div>
        {rec.optional && (
          <span className="mono text-m2 uppercase tracking-wide" style={{ color: "var(--warn)" }}>
            add when needed
          </span>
        )}
      </div>

      <p className="mt-2.5 text-t2 leading-[1.6]" style={{ color: "var(--text-mid)" }}>
        {rec.why}
      </p>

      <p className="mt-2 text-t2 leading-relaxed mono" style={{ color: "var(--text-mid)", opacity: 0.85 }}>
        {rec.where}
      </p>

      <button
        onClick={() => {
          setShowAlts((s) => !s);
          if (!showAlts) track("build_alternatives", { component: rec.id });
        }}
        className="mono text-m2 mt-3 link-underline"
        style={{ color: "var(--accent)" }}
      >
        {showAlts ? "hide alternatives" : `switch this · ${rec.alternatives.length} alternatives`}
      </button>

      {showAlts && (
        <div className="mt-3 flex flex-col gap-2.5">
          {rec.alternatives.map((alt) => (
            <div key={alt.name} className="border-l-2 pl-3" style={{ borderColor: "var(--rule-2)" }}>
              <div className="text-t2 font-medium" style={{ color: "var(--text-hi)" }}>
                {alt.name}
              </div>
              <div className="text-t2 leading-relaxed" style={{ color: "var(--text-mid)" }}>
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
      <div className="shell pb-96">

        <PageHeader
          title="Build a system"
          standfirst="A short interview, then an architecture sized to what you are actually building. The questions adapt to your answers, so it asks what still matters and skips what you have already settled. Every component comes with why it is there, what it costs, and what you would use instead, because a recommendation with no visible alternatives reads as a verdict rather than a choice."
        />

        {thinking && (
          <div className="mt-10 flex items-center gap-3" aria-live="polite">
            <span className="build-pulse" aria-hidden />
            <span className="mono text-m2" style={{ color: "var(--text-mid)" }}>
              working out what to ask next
            </span>
          </div>
        )}

        {q && (
          <>
            <div
              className="sticky z-40 py-16 -mx-[var(--pad)] px-[var(--pad)] border-b border-rule-2"
              style={{ top: "var(--masthead)", background: "var(--ink)" }}
            >
            <div className="flex items-center gap-16 measure-46">
              <div
                role="progressbar"
                aria-valuenow={answeredCount}
                aria-valuemin={0}
                aria-valuemax={questions.length}
                className="h-4 flex-1"
                style={{ background: "var(--rule-2)" }}
              >
                <div
                  className="h-full transition-all duration-300"
                  style={{ width: `${(answeredCount / questions.length) * 100}%`, background: "var(--accent)" }}
                />
              </div>
              <span className="mono text-m2 tnum shrink-0 text-text-lo">
                {answeredCount + 1} / {questions.length}
              </span>
            </div>
            </div>

            <div className="mt-8">
              {note?.reason && (
                <p className="text-t2 leading-relaxed max-w-[34em]" style={{ color: "var(--text-mid)" }}>
                  <span className="eyebrow" style={{ color: "var(--accent)" }}>
                    why this one{" "}
                  </span>
                  {note.reason}
                </p>
              )}
              <h2 className="mt-12 measure-46">{q.prompt}</h2>
              {q.help && (
                <p className="mt-2.5 text-t2 leading-relaxed max-w-[32em]" style={{ color: "var(--text-mid)" }}>
                  {q.help}
                </p>
              )}

              <div className="mt-32 flex flex-col gap-12 measure-46">
                {q.options.map((o, i) => (
                  <button
                    key={o.id}
                    onClick={() => choose(q.id, o.id)}
                    className="press text-left border border-rule-3 px-16 py-16 min-h-[56px] grid grid-cols-[24px_minmax(0,1fr)] gap-12 transition-colors duration-[120ms] hover:bg-ink-1"
                  >
                    <span className="mono text-m3 text-text-lo pt-4">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-t2 text-text-hi">{o.label}</span>
                      {o.hint && <span className="block text-t3 text-text-lo mt-4">{o.hint}</span>}
                    </span>
                  </button>
                ))}
              </div>

              {Object.keys(inferred).length > 0 && (
                <p className="mt-4 text-t2 leading-relaxed max-w-[34em]" style={{ color: "var(--text-mid)" }}>
                  {Object.keys(inferred).length === 1 ? "One question was" : `${Object.keys(inferred).length} questions were`}{" "}
                  answered from what you had already said, to keep this short.{" "}
                  <button onClick={askInferred} className="link-underline mono text-m2" style={{ color: "var(--accent)" }}>
                    ask me those as well
                  </button>
                </p>
              )}

              <div className="mt-5 flex items-center gap-5">
                {history.length > 0 && (
                  <button
                    onClick={back}
                    className="mono text-m2 text-accent link-underline inline-flex items-center min-h-[44px]"
                  >
                    ← back
                  </button>
                )}
                <button
                  onClick={() => choose(q.id, q.skipDefault, true)}
                  className="mono text-m2 text-accent link-underline inline-flex items-center min-h-[44px]"
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
                className="mono text-m2 text-accent link-underline inline-flex items-center min-h-[44px]"
              >
                ← change last answer
              </button>
              <button onClick={restart} className="mono text-m2 link-underline inline-flex items-center min-h-[44px]" style={{ color: "var(--text-mid)" }}>
                start again
              </button>
              <button
                onClick={copyLink}
                className="mono text-m2 uppercase tracking-[0.08em] px-3 min-h-[44px] inline-flex items-center"
                style={{
                  border: "1px solid var(--rule-3)",
                  background: "var(--ink-3)",
                  color: copied ? "var(--accent)" : "var(--text-hi)",
                }}
              >
                {copied ? "link copied" : "copy link"}
              </button>
            </div>

            <NewsletterPrompt
              context="build"
              line="If this was useful, I write about the decisions behind architectures like this one: what broke in production and what the fix cost. Sent when there is something worth sending."
            />

            <p className="mt-6 text-t2 leading-relaxed max-w-[35em]" style={{ color: "var(--text-hi)" }}>
              {headline(answers)}
            </p>
            <p className="mt-2.5 mono text-t2" style={{ color: "var(--accent)" }}>
              {costBand(answers)}
            </p>

            <FlowDiagram diagram={diagram} id="build-result" />

            <div className="mt-7 grid gap-3">
              {recs.map((r) => (
                <ComponentCard key={r.id} rec={r} />
              ))}
            </div>

            <p className="mt-8 text-t2 leading-relaxed max-w-[34em]" style={{ color: "var(--text-mid)" }}>
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
