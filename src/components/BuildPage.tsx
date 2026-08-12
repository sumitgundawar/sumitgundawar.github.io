import { useState } from "react";
import { Link } from "react-router-dom";
import { Eyebrow } from "./primitives";
import { Reveal, SectionHead } from "./StatusPage";
import { identity, buildQuestions, buildRecommendation, type BuildAnswers } from "@/data/content";

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-4 border-t border-hair first:border-t-0">
      <Eyebrow className="mb-1.5">{label}</Eyebrow>
      <p className="text-[15px] leading-relaxed" style={{ color: "var(--c-text)" }}>{value}</p>
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
      <div className="mx-auto w-full max-w-[720px] px-5 sm:px-8 py-8 lg:py-12">
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
          you don't pay for infrastructure you don't need — or under-build for what you do.
        </p>

        {!done ? (
          <Reveal as="div" className="mt-10">
            <div className="mono text-[11.5px] tnum mb-4" style={{ color: "var(--cool)" }}>
              step {step + 1} / {buildQuestions.length}
            </div>
            <SectionHead label={question.prompt} />
            <div className="flex flex-col gap-2">
              {question.options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => pick(opt.value)}
                  className="text-left text-[15px] px-4 py-3 border border-hair link-underline"
                  style={{ color: "var(--c-text)" }}
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
            <div className="border border-hair px-5" style={{ background: "var(--surface)" }}>
              <ResultRow label="compute" value={result!.compute} />
              <ResultRow label="data" value={result!.data} />
              <ResultRow label="edge / cdn" value={result!.edge} />
              <ResultRow label="domain" value={result!.domain} />
            </div>

            <div className="mt-6">
              <Eyebrow className="mb-3">why</Eyebrow>
              <div className="flex flex-col gap-2.5">
                {result!.reasoning.map((line, i) => (
                  <p key={i} className="text-[14.5px] leading-relaxed" style={{ color: "var(--c-text-dim)" }}>
                    {line}
                  </p>
                ))}
              </div>
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
