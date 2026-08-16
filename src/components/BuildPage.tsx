import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { FlowDiagram } from "./FlowDiagram";
import { track } from "@/lib/track";
import {
  questions,
  recommend,
  costBand,
  headline,
  type Answers,
  type Recommendation,
} from "@/data/build";
import type { Diagram } from "@/data/learn";

/** Lay the recommended components out as a request flowing left to right.
 *
 *  Edges come from each component's declared dependencies. Deriving them from
 *  column position instead, which is what this did originally, produced
 *  confident nonsense: "CDN to authentication", "video pipeline to database",
 *  and no edge at all between the application server and the database. */
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

  // A component nothing points at and which points nowhere would float
  // unconnected, so give it the one honest edge it has: the app server uses it.
  const linked = new Set(edges.flatMap((e) => [e.from, e.to]));
  const host = recs.find((r) => r.id === "api") ?? recs[0];
  recs.forEach((r) => {
    if (r.id !== host?.id && !linked.has(r.id)) add(host.id, r.id, r.kind === "external");
  });

  const columns: Recommendation[][] = [[], [], [], [], []];
  recs.forEach((r) => columns[order[r.kind] ?? 2].push(r));

  return {
    caption: "Your architecture, hover any component for the reasoning",
    columns: columns
      .filter((c) => c.length)
      .map((col) => col.map((r) => ({ id: r.id, label: r.name, sub: r.pick, kind: r.kind }))),
    edges,
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
          <span className="text-[19px] font-medium" style={{ color: "var(--c-text)" }}>
            {rec.name}
          </span>
          <span className="mono text-[12px]" style={{ color: "var(--accent)" }}>
            {rec.pick}
          </span>
        </div>
        {rec.optional && (
          <span className="mono text-[12px] uppercase tracking-wide" style={{ color: "var(--lv-intermediate)" }}>
            add when needed
          </span>
        )}
      </div>

      <p className="mt-2.5 text-[15px] leading-[1.6]" style={{ color: "var(--c-text-dim)" }}>
        {rec.why}
      </p>

      <p className="mt-2 text-[15px] leading-relaxed mono" style={{ color: "var(--c-text-dim)", opacity: 0.85 }}>
        {rec.where}
      </p>

      <button
        onClick={() => {
          setShowAlts((s) => !s);
          if (!showAlts) track("build_alternatives", { component: rec.id });
        }}
        className="mono text-[12px] mt-3 link-underline"
        style={{ color: "var(--accent-2)" }}
      >
        {showAlts ? "hide alternatives" : `switch this · ${rec.alternatives.length} alternatives`}
      </button>

      {showAlts && (
        <div className="mt-3 flex flex-col gap-2.5">
          {rec.alternatives.map((alt) => (
            <div key={alt.name} className="border-l-2 pl-3" style={{ borderColor: "var(--hair)" }}>
              <div className="text-[15px] font-medium" style={{ color: "var(--c-text)" }}>
                {alt.name}
              </div>
              <div className="text-[15px] leading-relaxed" style={{ color: "var(--c-text-dim)" }}>
                {alt.when}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function BuildPage() {
  /* Answers live in the URL as well as in state.
     The result is the most shareable thing on the site, a costed architecture
     with the reasoning attached, and until now the only way to show someone was
     a screenshot: ten questions in, the URL still said /build. The same problem
     was fixed for /learn months ago and this one was missed. Compact encoding,
     question id to option id, so the link stays short enough to paste. */
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

  const [step, setStep] = useState(() => (Object.keys(fromUrl).length ? questions.length : 0));
  const [answers, setAnswers] = useState<Answers>(fromUrl);
  const done = step >= questions.length;

  const recs = useMemo(() => (done ? recommend(answers) : []), [done, answers]);
  const diagram = useMemo(() => (recs.length ? toDiagram(recs) : null), [recs]);

  const choose = (qid: string, oid: string, skipped = false) => {
    setAnswers((a) => ({ ...a, [qid]: oid }));
    setStep((s) => s + 1);
    track(skipped ? "build_skip" : "build_answer", { question: qid, answer: oid });
  };

  const [copied, setCopied] = useState(false);
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      track("build_share", {});
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard is blocked without a user gesture in some browsers, and over
         http. The URL is in the address bar either way, so failing quietly is
         better than an error about a convenience. */
    }
  };

  const restart = () => {
    setAnswers({});
    setParams({}, { replace: true });
    setStep(0);
    track("build_restart", {});
  };

  /* Written only at the end. Updating it per question would put ten entries in
     the back stack for one run, so Back would walk the questionnaire rather
     than leaving the page. */
  useEffect(() => {
    if (!done) return;
    const encoded = Object.entries(answers).map(([q, o]) => `${q}:${o}`).join(",");
    if (encoded && params.get("a") !== encoded) {
      setParams({ a: encoded }, { replace: true });
    }
  }, [done, answers, params, setParams]);

  const q = !done ? questions[step] : null;

  return (
    <main id="content" className="min-h-[100dvh]">
      <div className="mx-auto w-full max-w-[940px] px-5 sm:px-8 py-8 lg:py-12">
        <Link to="/" className="mono text-[12px] link-underline inline-flex items-center min-h-[44px]" style={{ color: "var(--c-text-dim)" }}>
          ← back to profile
        </Link>

        <h1
          className="mt-7 font-semibold leading-[1.05] tracking-[-0.02em]"
          style={{ fontSize: "clamp(30px, 5vw, 44px)", color: "var(--c-text)" }}
        >
          Build a system
        </h1>
        <p className="mt-3.5 text-[15px] leading-relaxed max-w-[34em]" style={{ color: "var(--c-text-dim)" }}>
          Ten questions, then an architecture sized to what you are actually building. Every component
          comes with why it is there, what it costs, and what you would use instead.
        </p>

        {q && (
          <>
            <div className="mt-8 flex items-center gap-3">
              <div className="h-[4px] flex-1 rounded-full overflow-hidden" style={{ background: "var(--hair-strong)" }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${(step / questions.length) * 100}%`, background: "var(--accent)" }}
                />
              </div>
              <span className="mono text-[12px] tnum shrink-0" style={{ color: "var(--c-text-dim)" }}>
                {step + 1} / {questions.length}
              </span>
            </div>

            <div className="mt-8">
              <h2 className="text-[24px] sm:text-[24px] font-semibold tracking-[-0.01em]" style={{ color: "var(--c-text)" }}>
                {q.prompt}
              </h2>
              {q.help && (
                <p className="mt-2.5 text-[15px] leading-relaxed max-w-[32em]" style={{ color: "var(--c-text-dim)" }}>
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
                    <div className="text-[15px]" style={{ color: "var(--c-text)" }}>
                      {o.label}
                    </div>
                    {o.hint && (
                      <div className="text-[15px] mt-0.5" style={{ color: "var(--c-text-dim)" }}>
                        {o.hint}
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div className="mt-5 flex items-center gap-5">
                {step > 0 && (
                  <button
                    onClick={() => setStep((s) => s - 1)}
                    className="mono text-[12px] link-underline inline-flex items-center min-h-[44px]"
                    style={{ color: "var(--c-text-dim)" }}
                  >
                    ← back
                  </button>
                )}
                <button
                  onClick={() => choose(q.id, q.skipDefault, true)}
                  className="mono text-[12px] link-underline inline-flex items-center min-h-[44px]"
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
                onClick={() => setStep(questions.length - 1)}
                className="mono text-[12px] link-underline inline-flex items-center min-h-[44px]"
                style={{ color: "var(--c-text-dim)" }}
              >
                ← change last answer
              </button>
              <button onClick={restart} className="mono text-[12px] link-underline inline-flex items-center min-h-[44px]" style={{ color: "var(--c-text-dim)" }}>
                start again
              </button>
              <button
                onClick={copyLink}
                className="mono text-[12px] uppercase tracking-[0.08em] px-3 min-h-[44px] inline-flex items-center"
                style={{
                  border: "1px solid var(--hair-strong)",
                  background: "var(--surface-2)",
                  color: copied ? "var(--accent)" : "var(--c-text)",
                }}
              >
                {copied ? "link copied" : "copy link"}
              </button>
            </div>

            <p className="mt-6 text-[15px] leading-relaxed max-w-[35em]" style={{ color: "var(--c-text)" }}>
              {headline(answers)}
            </p>
            <p className="mt-2.5 mono text-[15px]" style={{ color: "var(--accent)" }}>
              {costBand(answers)}
            </p>

            <FlowDiagram diagram={diagram} id="build-result" />

            <div className="mt-7 grid gap-3">
              {recs.map((r) => (
                <ComponentCard key={r.id} rec={r} />
              ))}
            </div>

            <p className="mt-8 text-[15px] leading-relaxed max-w-[34em]" style={{ color: "var(--c-text-dim)" }}>
              Anything marked add when needed is deliberately not part of the first build. Add it when you
              have measured that you need it, not before, every component you skip is one you do not have
              to operate, secure or pay for.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
