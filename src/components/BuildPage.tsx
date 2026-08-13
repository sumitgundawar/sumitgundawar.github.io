import { useState } from "react";
import { Link } from "react-router-dom";
import { Eyebrow } from "./primitives";
import { Reveal, SectionHead } from "./StatusPage";
import {
  identity,
  buildQuestions,
  buildRecommendation,
  type BuildAnswers,
  type BuildComponent,
  type BuildRecommendation,
} from "@/data/content";

function ResultRow({ label, component }: { label: string; component: BuildComponent }) {
  return (
    <div className="py-4 border-t border-hair first:border-t-0">
      <Eyebrow className="mb-1.5">{label}</Eyebrow>
      <p className="text-[15px] leading-relaxed" style={{ color: "var(--c-text)" }}>{component.value}</p>
      <p className="text-[13.5px] leading-relaxed mt-2 max-w-[64ch]" style={{ color: "var(--c-text-dim)" }}>
        <span className="mono" style={{ color: "var(--cool)" }}>why — </span>
        {component.why}
      </p>
    </div>
  );
}

function FlowNode({ label, short }: { label: string; short: string }) {
  return (
    <div className="flex-1 border border-hair px-4 py-3.5" style={{ background: "var(--surface)" }}>
      <Eyebrow className="mb-1.5">{label}</Eyebrow>
      <p className="text-[14px] font-medium leading-snug" style={{ color: "var(--c-text)" }}>{short}</p>
    </div>
  );
}

function FlowArrow() {
  return (
    <div
      aria-hidden
      className="mono flex items-center justify-center shrink-0 text-[14px] py-0.5 sm:py-0 sm:px-1.5"
      style={{ color: "var(--c-text-dim)" }}
    >
      <span className="sm:hidden">↓</span>
      <span className="hidden sm:inline">→</span>
    </div>
  );
}

function RequestFlow({ result }: { result: BuildRecommendation }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-stretch">
      <FlowNode label="domain" short={result.domain.short} />
      <FlowArrow />
      <FlowNode label="edge / cdn" short={result.edge.short} />
      <FlowArrow />
      <FlowNode label="compute" short={result.compute.short} />
      <FlowArrow />
      <FlowNode label="data" short={result.data.short} />
    </div>
  );
}

export function BuildPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<BuildAnswers>({});

  const done = step >= buildQuestions.length;
  const question = buildQuestions[step];

  const pick = (value: string) => {
    if (!question) return;
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
    setStep((s) => s + 1);
  };

  const startOver = () => {
    setAnswers({});
    setStep(0);
  };

  const result = done ? buildRecommendation(answers) : null;

  return (
    <div className="min-h-[100dvh]">
      <div className="mx-auto w-full max-w-[820px] px-5 sm:px-8 py-8 lg:py-12">
        <div className="mb-8">
          <Link to="/" className="mono text-[12px] link-underline" style={{ color: "var(--c-text-dim)" }}>
            ← {identity.name}
          </Link>
        </div>

        <h1
          className="font-semibold leading-[1.05] tracking-[-0.015em]"
          style={{ fontSize: "clamp(26px, 3.6vw, 36px)", color: "var(--c-text)" }}
        >
          Build a system
        </h1>
        <p className="mt-3 text-[15.5px] leading-relaxed max-w-[58ch]" style={{ color: "var(--c-text-dim)" }}>
          A short questionnaire that sizes a starting architecture to your actual expected traffic, so
          you don't pay for infrastructure you don't need — or under-build for what you do. Deterministic
          rules, not a model guessing — every recommendation below states why.
        </p>

        {!done ? (
          <Reveal as="div" className="mt-10">
            <div className="mono text-[11.5px] tnum mb-2 flex items-baseline justify-between" style={{ color: "var(--cool)" }}>
              <span>step {step + 1} / {buildQuestions.length}</span>
            </div>
            <div className="h-[2px] w-full mb-7" style={{ background: "var(--hair)" }}>
              <div
                className="h-full transition-[width] duration-300"
                style={{ width: `${(step / buildQuestions.length) * 100}%`, background: "var(--cool)" }}
              />
            </div>
            <SectionHead label={question.prompt} />
            <div className="flex flex-col gap-2">
              {question.options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => pick(opt.value)}
                  className="text-left text-[15px] px-4 py-3 border border-hair transition-colors hover:bg-[var(--surface-2)] hover:border-[var(--cool)]"
                  style={{ color: "var(--c-text)", background: "var(--surface)" }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="mono text-[12px] link-underline mt-6"
                style={{ color: "var(--c-text-dim)" }}
              >
                ← back
              </button>
            )}
          </Reveal>
        ) : (
          <Reveal as="div" className="mt-10">
            <SectionHead label={`recommendation: ${result!.tier}`} />
            <p className="text-[14.5px] leading-relaxed max-w-[64ch] mb-7 -mt-3" style={{ color: "var(--c-text-dim)" }}>
              {result!.tierNote}
            </p>

            <Eyebrow className="mb-3">request flow</Eyebrow>
            <RequestFlow result={result!} />

            <div className="mt-8 border border-hair px-5" style={{ background: "var(--surface)" }}>
              <ResultRow label="domain" component={result!.domain} />
              <ResultRow label="edge / cdn" component={result!.edge} />
              <ResultRow label="compute" component={result!.compute} />
              <ResultRow label="data" component={result!.data} />
            </div>

            <div className="mt-6">
              <Eyebrow className="mb-3">principle</Eyebrow>
              <p className="text-[14.5px] leading-relaxed max-w-[64ch]" style={{ color: "var(--c-text-dim)" }}>
                {result!.principle}
              </p>
            </div>

            <button
              onClick={startOver}
              className="mono text-[12px] link-underline mt-8"
              style={{ color: "var(--c-text-dim)" }}
            >
              ← start over
            </button>
          </Reveal>
        )}
      </div>
    </div>
  );
}
