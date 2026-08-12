import { useState } from "react";
import { Link } from "react-router-dom";
import { HealthDot, Eyebrow } from "./primitives";
import { Reveal, SectionHead } from "./StatusPage";
import { identity, learnCategories, type LearnConcept } from "@/data/content";

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.98;
  window.speechSynthesis.speak(utter);
}

const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

function ConceptCard({
  concept,
  onAnswered,
}: {
  concept: LearnConcept;
  onAnswered: (id: string, correct: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const submit = (i: number) => {
    if (submitted) return;
    setPicked(i);
    setSubmitted(true);
    onAnswered(concept.id, i === concept.check.correctIndex);
  };

  return (
    <div className="border-t border-hair first:border-t-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-[17px] font-medium" style={{ color: "var(--c-text)" }}>
          {concept.title}
        </span>
        <span className="mono text-[12px] shrink-0" style={{ color: "var(--cool)" }}>
          {open ? "close" : "open"}
        </span>
      </button>

      {open && (
        <div className="pb-6">
          <div className="flex flex-col gap-3 max-w-[64ch]">
            {concept.body.map((line, i) => (
              <p key={i} className="text-[15px] leading-relaxed" style={{ color: "var(--c-text-dim)" }}>
                {line}
              </p>
            ))}
          </div>

          {canSpeak && (
            <button
              onClick={() => speak(concept.body.join(" "))}
              className="mono text-[12px] mt-4 border border-hair px-2.5 py-1.5 link-underline"
              style={{ color: "var(--c-text-dim)" }}
            >
              ▶ listen
            </button>
          )}

          <div className="mt-6 border border-hair p-4" style={{ background: "var(--surface-2)" }}>
            <Eyebrow className="mb-3">check yourself</Eyebrow>
            <p className="text-[15px] leading-relaxed" style={{ color: "var(--c-text)" }}>
              {concept.check.prompt}
            </p>
            <div className="flex flex-col gap-2 mt-3.5">
              {concept.check.options.map((opt, i) => {
                const isCorrect = i === concept.check.correctIndex;
                const isPicked = i === picked;
                const showState = submitted && (isPicked || isCorrect);
                return (
                  <button
                    key={i}
                    onClick={() => submit(i)}
                    disabled={submitted}
                    className="text-left text-[14px] px-3 py-2 border"
                    style={{
                      borderColor: showState ? (isCorrect ? "var(--signal)" : "var(--crit)") : "var(--hair)",
                      color: showState && isCorrect ? "var(--signal)" : "var(--c-text-dim)",
                      opacity: submitted && !isPicked && !isCorrect ? 0.5 : 1,
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {submitted && (
              <p className="text-[13.5px] mt-3.5 leading-relaxed" style={{ color: "var(--c-text-dim)" }}>
                {picked === concept.check.correctIndex ? "Correct. " : "Not quite. "}
                {concept.check.explain}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function LearnPage() {
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [answered, setAnswered] = useState<Record<string, boolean>>({});

  const category = learnCategories.find((c) => c.id === categoryId) ?? null;
  const answeredCount = Object.keys(answered).length;
  const correctCount = Object.values(answered).filter(Boolean).length;

  const onAnswered = (id: string, correct: boolean) => {
    setAnswered((prev) => ({ ...prev, [id]: correct }));
  };

  return (
    <div className="min-h-[100dvh]">
      <div className="mx-auto w-full max-w-[880px] px-5 sm:px-8 py-8 lg:py-12">
        <div className="flex items-center justify-between gap-4 mb-8">
          <Link to="/" className="mono text-[12px] link-underline" style={{ color: "var(--c-text-dim)" }}>
            ← {identity.name}
          </Link>
          {answeredCount > 0 && (
            <div className="flex items-center gap-2">
              <HealthDot health="ok" size={7} />
              <span className="mono text-[12px] tnum" style={{ color: "var(--c-text-dim)" }}>
                {correctCount}/{answeredCount} correct this session
              </span>
            </div>
          )}
        </div>

        <h1
          className="font-semibold leading-[1.05] tracking-[-0.015em]"
          style={{ fontSize: "clamp(26px, 3.6vw, 36px)", color: "var(--c-text)" }}
        >
          Learn engineering
        </h1>
        <p className="mt-3 text-[15.5px] leading-relaxed max-w-[60ch]" style={{ color: "var(--c-text-dim)" }}>
          Short, concrete concepts with a question at the end. Nothing here is saved — refresh and the
          score resets, on purpose.
        </p>

        {!category ? (
          <Reveal as="div" className="mt-10">
            <SectionHead label="topics" />
            <div className="grid sm:grid-cols-2 gap-px" style={{ background: "var(--hair)", border: "1px solid var(--hair)" }}>
              {learnCategories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategoryId(c.id)}
                  className="p-5 text-left flex flex-col gap-2"
                  style={{ background: "var(--surface)" }}
                >
                  <span className="text-[17px] font-medium" style={{ color: "var(--c-text)" }}>{c.title}</span>
                  <span className="text-[14px] leading-relaxed" style={{ color: "var(--c-text-dim)" }}>{c.summary}</span>
                  <span className="mono text-[11.5px] mt-1" style={{ color: "var(--cool)" }}>
                    {c.concepts.length} concepts →
                  </span>
                </button>
              ))}
            </div>
          </Reveal>
        ) : (
          <Reveal as="div" className="mt-10">
            <button
              onClick={() => setCategoryId(null)}
              className="mono text-[12px] link-underline mb-5"
              style={{ color: "var(--c-text-dim)" }}
            >
              ← all topics
            </button>
            <SectionHead label={category.title} />
            <div>
              {category.concepts.map((concept) => (
                <ConceptCard key={concept.id} concept={concept} onAnswered={onAnswered} />
              ))}
            </div>
          </Reveal>
        )}
      </div>
    </div>
  );
}
