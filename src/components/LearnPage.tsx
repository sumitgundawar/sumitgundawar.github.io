import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FlowDiagram } from "./FlowDiagram";
import { track } from "@/lib/track";
import {
  cards,
  cardsForLevel,
  countByLevel,
  topicCount,
  TRACKS,
  LEVELS,
  type Card,
  type Level,
  type Topic,
} from "@/data/learn";

const LEVEL_COLOR: Record<Level, string> = {
  beginner: "var(--lv-beginner)",
  intermediate: "var(--lv-intermediate)",
  advanced: "var(--lv-advanced)",
};

function LevelDot({ level }: { level: Level }) {
  return (
    <span
      className="inline-block rounded-full shrink-0"
      style={{ width: 7, height: 7, background: LEVEL_COLOR[level] }}
      aria-hidden
    />
  );
}

function TopicView({ topic, cardId }: { topic: Topic; cardId: string }) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const correct = picked === topic.check.correctIndex;

  const answer = (i: number) => {
    if (answered) return;
    setPicked(i);
    track("quiz_answer", {
      card: cardId,
      topic: topic.id,
      level: topic.level,
      correct: i === topic.check.correctIndex,
    });
  };

  return (
    <div className="pb-8 pt-1">
      <div className="flex flex-col gap-3 max-w-[36em]">
        {topic.body.map((p, i) => (
          <p key={i} className="text-[15px] leading-[1.65]" style={{ color: "var(--c-text-dim)" }}>
            {p}
          </p>
        ))}
      </div>

      {topic.diagram && <FlowDiagram diagram={topic.diagram} id={`${cardId}-${topic.id}`} />}

      {topic.why && (
        <div
          className="mt-5 border-l-2 pl-4 py-1 max-w-[36em]"
          style={{ borderColor: "var(--accent)" }}
        >
          <div className="mono text-[12px] uppercase tracking-[0.09em] mb-1.5" style={{ color: "var(--accent)" }}>
            why this choice
          </div>
          <p className="text-[15px] leading-[1.65]" style={{ color: "var(--c-text)" }}>
            {topic.why}
          </p>
        </div>
      )}

      {topic.inPractice && (
        <div
          className="mt-4 border-l-2 pl-4 py-1 max-w-[36em]"
          style={{ borderColor: "var(--accent-2)" }}
        >
          <div className="mono text-[12px] uppercase tracking-[0.09em] mb-1.5" style={{ color: "var(--accent-2)" }}>
            in practice
          </div>
          <p className="text-[15px] leading-[1.65]" style={{ color: "var(--c-text)" }}>
            {topic.inPractice}
          </p>
        </div>
      )}

      <div
        className="mt-6 rounded-lg border p-4 sm:p-5 max-w-[36em]"
        style={{ borderColor: "var(--hair)", background: "var(--surface-2)" }}
      >
        <div className="mono text-[12px] uppercase tracking-[0.09em] mb-2.5" style={{ color: "var(--c-text-dim)" }}>
          check yourself
        </div>
        <p className="text-[15px] leading-relaxed" style={{ color: "var(--c-text)" }}>
          {topic.check.prompt}
        </p>
        <div className="flex flex-col gap-2 mt-4">
          {topic.check.options.map((opt, i) => {
            const isCorrect = i === topic.check.correctIndex;
            const show = answered && (i === picked || isCorrect);
            return (
              <button
                key={i}
                onClick={() => answer(i)}
                disabled={answered}
                className="text-left text-[15px] leading-snug px-3.5 py-3 rounded-md border transition-colors flex gap-3 items-start min-h-[48px]"
                style={{
                  borderColor: show ? (isCorrect ? "var(--lv-beginner)" : "var(--crit)") : "var(--hair-strong)",
                  background: show && isCorrect ? "rgba(61,214,140,0.10)" : "var(--surface)",
                  color: show && isCorrect ? "var(--lv-beginner)" : "var(--c-text)",
                  opacity: answered && i !== picked && !isCorrect ? 0.45 : 1,
                  cursor: answered ? "default" : "pointer",
                }}
              >
                <span className="mono text-[12px] pt-0.5 shrink-0" style={{ color: "var(--c-text-dim)" }}>
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="min-w-0">{opt}</span>
              </button>
            );
          })}
        </div>
        {answered && (
          <p className="text-[15px] mt-4 leading-relaxed" style={{ color: "var(--c-text-dim)" }}>
            <span style={{ color: correct ? "var(--lv-beginner)" : "var(--crit)" }}>
              {correct ? "Correct. " : "Not quite. "}
            </span>
            {topic.check.explain}
          </p>
        )}
      </div>
    </div>
  );
}

function CardDetail({ card, onBack }: { card: Card; onBack: () => void }) {
  const [openId, setOpenId] = useState<string | null>(card.topics[0]?.id ?? null);

  return (
    <div>
      <button
        onClick={onBack}
        className="mono text-[12px] mb-4 inline-flex items-center gap-1.5 link-underline min-h-[44px]"
        style={{ color: "var(--c-text-dim)" }}
      >
        ← all topics
      </button>

      <h2 className="text-[24px] sm:text-[30px] font-semibold tracking-[-0.015em]" style={{ color: "var(--c-text)" }}>
        {card.title}
      </h2>
      <p className="mt-2 text-[15px] leading-relaxed max-w-[33em]" style={{ color: "var(--c-text-dim)" }}>
        {card.summary}
      </p>

      <div className="mt-7">
        {card.topics.map((t) => {
          const open = openId === t.id;
          return (
            <div key={t.id} className="border-t" style={{ borderColor: "var(--hair)" }}>
              <button
                onClick={() => {
                  const next = open ? null : t.id;
                  setOpenId(next);
                  if (next) track("topic_open", { card: card.id, topic: t.id, level: t.level });
                }}
                className="w-full flex items-center gap-3 py-4 text-left"
              >
                <LevelDot level={t.level} />
                <span
                  className="text-[19px] font-medium flex-1 min-w-0"
                  style={{ color: open ? "var(--c-text)" : "var(--c-text-dim)" }}
                >
                  {t.title}
                </span>
                <span className="mono text-[12px] uppercase tracking-wide shrink-0" style={{ color: LEVEL_COLOR[t.level] }}>
                  {t.level}
                </span>
                <span className="mono text-[12px] shrink-0 w-4 text-right" style={{ color: "var(--c-text-dim)" }}>
                  {open ? "−" : "+"}
                </span>
              </button>
              {open && <TopicView topic={t} cardId={card.id} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LearnPage() {
  const [level, setLevel] = useState<Level | "all">("all");
  const [openCard, setOpenCard] = useState<string | null>(null);

  const visible = useMemo(() => cardsForLevel(level), [level]);
  const current = openCard ? visible.find((c) => c.id === openCard) ?? null : null;

  const shownTopics = visible.reduce((n, c) => n + c.topics.length, 0);

  return (
    <div className="min-h-[100dvh]">
      <div className="mx-auto w-full max-w-[940px] px-5 sm:px-8 py-8 lg:py-12">
        <Link to="/" className="mono text-[12px] link-underline inline-flex items-center min-h-[44px]" style={{ color: "var(--c-text-dim)" }}>
          ← back to profile
        </Link>

        {current ? (
          <div className="mt-8">
            <CardDetail card={current} onBack={() => setOpenCard(null)} />
          </div>
        ) : (
          <>
            <h1
              className="mt-7 font-semibold leading-[1.05] tracking-[-0.02em]"
              style={{ fontSize: "clamp(30px, 5vw, 44px)", color: "var(--c-text)" }}
            >
              Learn engineering
            </h1>
            <p className="mt-3.5 text-[15px] leading-relaxed max-w-[34em]" style={{ color: "var(--c-text-dim)" }}>
              Software engineering and system design, from first principles to the decisions senior and
              staff interviews actually probe. Every topic explains why a choice was made, not just what
              it was. Answer the check at the end of each — there are no accounts, and your score resets
              when you refresh.
            </p>

            {/* The counts used to appear twice — once as a stats row and again
                inside the filter pills immediately below. Same four numbers,
                four lines of phone screen, no extra information. */}
            <div className="mt-7 flex flex-wrap gap-2">
              {(["all", ...LEVELS] as const).map((l) => {
                const on = level === l;
                return (
                  <button
                    key={l}
                    onClick={() => {
                      setLevel(l);
                      track("level_filter", { level: l });
                    }}
                    className="mono text-[12px] px-4 rounded-full border transition-colors inline-flex items-center min-h-[44px]"
                    style={{
                      borderColor: on ? (l === "all" ? "var(--c-text)" : LEVEL_COLOR[l]) : "var(--hair)",
                      color: on ? (l === "all" ? "var(--c-text)" : LEVEL_COLOR[l]) : "var(--c-text-dim)",
                      background: on ? "var(--surface-2)" : "transparent",
                    }}
                  >
                    {l === "all" ? `everything · ${topicCount}` : `${l} · ${countByLevel(l)}`}
                  </button>
                );
              })}
            </div>

            {level !== "all" && (
              <p className="mt-3 text-[15px]" style={{ color: "var(--c-text-dim)" }}>
                Showing {shownTopics} {level} topics across {visible.length} cards.
              </p>
            )}

            {TRACKS.map((tr) => {
              const inTrack = visible.filter((c) => c.track === tr.id);
              if (!inTrack.length) return null;
              return (
                <section key={tr.id} className="mt-16">
                  <div>
                    <h2 className="text-[24px] font-semibold tracking-[-0.015em]" style={{ color: "var(--c-text)" }}>
                      {tr.label}
                    </h2>
                    <p className="mt-1.5 text-[15px] max-w-[42em]" style={{ color: "var(--c-text-dim)" }}>
                      {tr.blurb}
                    </p>
                  </div>

                  <div className="mt-5 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
                    {inTrack.map((c) => {
                      const levelsHere = LEVELS.filter((l) => c.topics.some((t) => t.level === l));
                      return (
                        <button
                          key={c.id}
                          onClick={() => {
                            setOpenCard(c.id);
                            track("card_open", { card: c.id, track: c.track });
                          }}
                          className="text-left rounded-lg border p-4 sm:p-5 flex flex-col gap-2 h-full transition-transform hover:-translate-y-0.5"
                          style={{ borderColor: "var(--hair-strong)", background: "var(--surface)" }}
                        >
                          <span className="text-[19px] font-medium leading-snug" style={{ color: "var(--c-text)" }}>
                            {c.title}
                          </span>
                          <span className="text-[15px] leading-relaxed" style={{ color: "var(--c-text-dim)" }}>
                            {c.summary}
                          </span>
                          <span className="mt-auto pt-3 flex items-center gap-2.5 mono text-[12px]" style={{ color: "var(--c-text-dim)" }}>
                            <span className="tnum">{c.topics.length} topics</span>
                            <span className="flex items-center gap-1">
                              {levelsHere.map((l) => (
                                <LevelDot key={l} level={l} />
                              ))}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
