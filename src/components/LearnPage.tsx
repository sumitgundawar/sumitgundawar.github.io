import { useEffect, useMemo, useState, type ReactNode } from "react";
import { FilterBar, IndexItem, Masthead, PageHeader, SiteFooter } from "./primitives";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FlowDiagram } from "./FlowDiagram";
import { DiagramViews } from "./DiagramViews";
import { AskBox } from "./AskBox";
import { NewsletterPrompt } from "./NewsletterPrompt";
import { trackQuiz } from "@/lib/api";
import { track } from "@/lib/track";
import { useProgress, summarise, type Progress } from "@/lib/progress";
import { usePageDwell, setSocialMeta, useStagger } from "@/lib/hooks";

import { manifest, topicCount } from "@/data/learn/manifest";
import { loadCard } from "@/data/learn/load";
import { TRACKS, LEVELS, type Card, type CardMeta, type Level, type Topic, type Check, type Source, type Track } from "@/data/learn/types";

function metaForLevel(level: Level | "all"): CardMeta[] {
  if (level === "all") return manifest;
  return manifest
    .map((c) => ({ ...c, topics: c.topics.filter((t) => t.level === level) }))
    .filter((c) => c.topics.length > 0);
}

const TRACK_ORDER: Track[] = [
  "dissection",
  "case-study",
  "design",
  "practice",
  "delivery",
  "languages",
  "foundations",
  "interview",
];

const byLevel = {
  beginner: manifest.reduce((n, c) => n + c.topics.filter((t) => t.level === "beginner").length, 0),
  intermediate: manifest.reduce(
    (n, c) => n + c.topics.filter((t) => t.level === "intermediate").length,
    0,
  ),
  advanced: manifest.reduce((n, c) => n + c.topics.filter((t) => t.level === "advanced").length, 0),
};

const countByLevel = (level: Level) =>
  manifest.reduce((n, c) => n + c.topics.filter((t) => t.level === level).length, 0);

function StaggerGrid({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useStagger<HTMLDivElement>();
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

function Sources({ sources }: { sources: Source[] }) {
  return (
    <details className="mt-7 max-w-[36em] group">
      <summary
        className="mono text-m2 uppercase tracking-[0.09em] cursor-pointer inline-flex items-center gap-2 min-h-[44px]"
        style={{ color: "var(--text-mid)" }}
      >
        <span className="tnum">
          evidence · {sources.length} {sources.length === 1 ? "source" : "sources"}
        </span>
        <span aria-hidden className="group-open:hidden">
          +
        </span>

        <span aria-hidden className="hidden group-open:inline">
          -
        </span>
      </summary>
      <ol className="mt-2 flex flex-col gap-3.5 pl-0">
        {sources.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="mono tnum text-m3 pt-1 shrink-0" style={{ color: "var(--text-mid)", opacity: 0.6 }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-t2 leading-snug link-underline"
                style={{ color: "var(--text-hi)" }}
              >
                {s.label} <span aria-hidden>&#8599;</span>
              </a>
              <p className="mt-1 text-t3 leading-relaxed" style={{ color: "var(--text-mid)" }}>
                {s.supports}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </details>
  );
}

function Subject({ subject }: { subject: NonNullable<Card["subject"]> }) {
  const when = new Date(subject.published + "T00:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return (
    <div
      className="mt-24 border border-rule-2 p-24 measure"
      style={{ borderColor: "var(--rule-3)", background: "var(--ink-3)" }}
    >
      <div className="mono text-m2 uppercase tracking-[0.09em] mb-2" style={{ color: "var(--accent)" }}>
        dissecting
      </div>
      <a
        href={subject.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-t1 font-medium leading-snug link-underline"
        style={{ color: "var(--text-hi)" }}
      >
        {subject.title} <span aria-hidden>&#8599;</span>
      </a>
      <div className="mono text-m2 mt-1.5" style={{ color: "var(--text-mid)" }}>
        {subject.publisher} · {when}
      </div>
      <p className="mt-3 text-t2 leading-relaxed" style={{ color: "var(--text-mid)" }}>
        {subject.note}
      </p>
    </div>
  );
}

const LEVEL_COLOR: Record<Level, string> = {
  beginner: "var(--ok)",
  intermediate: "var(--warn)",
  advanced: "var(--crit)",
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

function shuffleOptions(topic: Topic, check: Check) {
  let seed = 0;
  const key = topic.id + check.prompt;
  for (let i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) >>> 0;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const order = check.options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return {
    options: order.map((i) => check.options[i]),
    correctIndex: order.indexOf(check.correctIndex),
  };
}

function useCheck(topic: Topic): Check {
  const bank = useMemo(() => [topic.check, ...(topic.checks ?? [])], [topic]);
  const [index] = useState(() => Math.floor(Math.random() * bank.length));
  return bank[Math.min(index, bank.length - 1)];
}

function TopicView({
  topic,
  cardId,
  wasCorrect,
  onAnswered,
}: {
  topic: Topic;
  cardId: string;
  wasCorrect?: boolean;
  onAnswered: (topicId: string, correct: boolean) => void;
}) {
  const check = useCheck(topic);
  const shuffled = useMemo(() => shuffleOptions(topic, check), [topic, check]);

  const [picked, setPicked] = useState<number | null>(() =>
    wasCorrect === undefined ? null : wasCorrect ? shuffled.correctIndex : -1,
  );

  const [justAnswered, setJustAnswered] = useState<number | null>(null);
  useEffect(() => {
    if (justAnswered === null) return;
    const id = window.setTimeout(() => setJustAnswered(null), 500);
    return () => window.clearTimeout(id);
  }, [justAnswered]);

  const answered = picked !== null;
  const correct = wasCorrect ?? picked === shuffled.correctIndex;

  const answer = (i: number) => {
    if (answered) return;
    setPicked(i);
    setJustAnswered(i);
    onAnswered(topic.id, i === shuffled.correctIndex);
    track("quiz_answer", {
      card: cardId,
      topic: topic.id,
      level: topic.level,
      correct: i === shuffled.correctIndex,
    });

    trackQuiz(topic.id, i, i === shuffled.correctIndex);
  };

  return (
    <div className="pb-8 pt-1">
      <div className="grid @min-[1060px]:grid-cols-[minmax(0,var(--measure))_minmax(0,1fr)] gap-x-48 items-start">
      <div className="min-w-0">
      <div className="flex flex-col gap-3 max-w-[36em]">
        {topic.body.map((p, i) => (
          <p key={i} className="text-t2 leading-[1.65]" style={{ color: "var(--text-mid)" }}>
            {p}
          </p>
        ))}
      </div>

      {topic.why && (
        <div className="mt-32 md:grid md:grid-cols-[96px_minmax(0,1fr)] md:gap-24 measure">
          <div className="eyebrow mb-8 md:mb-0 md:pt-4" style={{ color: "var(--accent)" }}>
            why
          </div>
          <p className="text-t2 text-text-hi">{topic.why}</p>
        </div>
      )}

      {topic.inPractice && (
        <div className="mt-24 md:grid md:grid-cols-[96px_minmax(0,1fr)] md:gap-24 measure">
          <div className="eyebrow mb-8 md:mb-0 md:pt-4">in practice</div>
          <p className="text-t2 text-text-hi">{topic.inPractice}</p>
        </div>
      )}

      </div>

      <div
        className="mt-32 @min-[1060px]:mt-0 border border-rule-2 p-16 sm:p-24 measure @min-[1060px]:max-w-none min-w-0"
        style={{ background: "var(--ink-1)" }}
      >
        <div className="eyebrow mb-16">check yourself</div>
        <p className="text-t2 leading-relaxed" style={{ color: "var(--text-hi)" }}>
          {check.prompt}
        </p>
        <div className="flex flex-col gap-2 mt-4">
          {shuffled.options.map((opt, i) => {
            const isCorrect = i === shuffled.correctIndex;
            const show = answered && (i === picked || isCorrect);
            return (
              <button
                key={i}
                onClick={() => answer(i)}

                aria-disabled={answered}
                className={`text-left text-t3 px-16 py-12 border transition-colors duration-[120ms] flex gap-12 items-start min-h-[48px]${
                  justAnswered === i ? (isCorrect ? " check-correct" : " check-wrong") : ""
                }`}
                style={{
                  borderColor: show ? (isCorrect ? "var(--ok)" : "var(--crit)") : "var(--rule-3)",
                  borderWidth: show ? 2 : 1,
                  background: show && isCorrect ? "var(--n-service-fill)" : "var(--ink)",
                  color: show && isCorrect ? "var(--ok)" : "var(--text-hi)",
                  opacity: answered && i !== picked && !isCorrect ? 0.45 : 1,
                  cursor: answered ? "default" : "pointer",
                }}
              >
                <span className="mono text-m2 pt-0.5 shrink-0 w-3" style={{ color: show && isCorrect ? "var(--ok)" : "var(--text-mid)" }}>
                  {show && isCorrect ? (
                    <span className="check-mark inline-block">✓</span>
                  ) : (
                    String.fromCharCode(65 + i)
                  )}
                </span>
                <span className="min-w-0">{opt}</span>
              </button>
            );
          })}
        </div>
        {answered && (
          <p role="status" className="text-t2 mt-4 leading-relaxed" style={{ color: "var(--text-mid)" }}>
            <span style={{ color: correct ? "var(--ok)" : "var(--crit)" }}>
              {correct ? "Correct. " : "Not quite. "}
            </span>
            {check.explain}
          </p>
        )}
      </div>
      </div>

      {topic.diagram && <DiagramViews diagram={topic.diagram} id={`${cardId}-${topic.id}`} />}

      {topic.sources && <Sources sources={topic.sources} />}

      <AskBox topicId={topic.id} />
    </div>
  );
}

function CardDetail({
  card,
  onBack,
  progress,
  onAnswered,
}: {
  card: Card;
  onBack: () => void;
  progress: Progress;
  onAnswered: (topicId: string, correct: boolean) => void;
}) {
  const [active, setActive] = useState<string | null>(card.topics[0]?.id ?? null);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id.replace(/^topic-/, ""));
      },
      { rootMargin: "-96px 0px -70% 0px", threshold: 0 },
    );
    card.topics.forEach((t) => {
      const el = document.getElementById(`topic-${t.id}`);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [card.id, card.topics]);

  const done = card.topics.filter((t) => t.id in progress).length;

  return (
    <div>
      <button
        onClick={onBack}
        className="mono text-m2 mb-4 inline-flex items-center gap-1.5 link-underline min-h-[44px]"
        style={{ color: "var(--text-mid)" }}
      >
        ← all topics
      </button>

      <h1 className="text-d2 measure">
        {card.title}
      </h1>
      <p className="mt-3 text-t2 leading-relaxed max-w-[36em]" style={{ color: "var(--text-mid)" }}>
        {card.summary}
      </p>

      {card.subject && <Subject subject={card.subject} />}

      <div className="mt-9 grid lg:grid-cols-[200px_minmax(0,1fr)] xl:grid-cols-[230px_minmax(0,1fr)] gap-x-10 xl:gap-x-14 items-start">

        <nav
          aria-label="Contents"
          className="lg:sticky lg:top-8 min-w-0 mb-8 lg:mb-0 pb-5 lg:pb-0 border-b lg:border-b-0"
          style={{ borderColor: "var(--rule-2)" }}
        >
          <div className="mono text-m3 uppercase tracking-[0.12em] mb-3" style={{ color: "var(--text-mid)" }}>
            contents
          </div>
          <ol className="flex flex-col gap-0.5">
            {card.topics.map((t, i) => {
              const here = active === t.id;
              return (
                <li key={t.id}>
                  <a
                    href={`#topic-${t.id}`}
                    onClick={() => track("topic_open", { card: card.id, topic: t.id, level: t.level })}
                    className="flex items-start gap-2.5 py-2 min-h-[44px] text-m2 leading-snug"
                    style={{
                      color: here ? "var(--text-hi)" : "var(--text-mid)",
                      borderLeft: `2px solid ${here ? "var(--accent)" : "transparent"}`,
                      paddingLeft: 10,
                      marginLeft: -12,
                    }}
                  >
                    <span className="mono tnum shrink-0 pt-px" style={{ color: here ? "var(--accent)" : "var(--text-mid)", opacity: here ? 1 : 0.6 }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0">{t.title}</span>
                    {t.id in progress && (
                      <span className="mono shrink-0 ml-auto" style={{ color: progress[t.id] ? "var(--ok)" : "var(--crit)" }}>
                        {progress[t.id] ? "✓" : "×"}
                      </span>
                    )}
                  </a>
                </li>
              );
            })}
          </ol>
          <div className="mono text-m3 mt-4 pt-3 border-t" style={{ color: "var(--text-mid)", borderColor: "var(--rule-2)" }}>
            {card.topics.length} topics{done ? ` · ${done} answered` : ""}
          </div>
        </nav>

        <div className="min-w-0 @container">
          {card.topics.map((t, i) => (
            <section
              key={t.id}
              id={`topic-${t.id}`}

              style={{ scrollMarginTop: 88 }}
              className={i === 0 ? "" : "mt-14 pt-12 border-t"}
            >
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="mono tnum text-m2" style={{ color: "var(--accent)" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h2 className="min-w-0">
                  {t.title}
                </h2>
                <span className="mono text-m2 uppercase tracking-wide ml-auto shrink-0" style={{ color: LEVEL_COLOR[t.level] }}>
                  {t.level}
                </span>
              </div>
              <TopicView
                topic={t}
                cardId={card.id}
                wasCorrect={progress[t.id]}
                onAnswered={onAnswered}
              />
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LearnPage() {
  const { cardId } = useParams<{ cardId?: string }>();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { progress, record, reset } = useProgress();
  const answeredCount = Object.keys(progress).length;

  const levelParam = params.get("level");
  const level: Level | "all" =
    levelParam && (LEVELS as string[]).includes(levelParam) ? (levelParam as Level) : "all";

  const setLevel = (l: Level | "all") => {
    const next = new URLSearchParams(params);
    if (l === "all") next.delete("level");
    else next.set("level", l);
    setParams(next, { replace: true });
  };

  usePageDwell(cardId ? `/learn/${cardId}` : "/learn", cardId);

  const openCard = cardId ?? null;
  const setOpenCard = (id: string | null) =>
    navigate(id ? `/learn/${id}${window.location.search}` : `/learn${window.location.search}`);

  const visible = useMemo(() => metaForLevel(level), [level]);

  const currentMeta = openCard ? manifest.find((c) => c.id === openCard) ?? null : null;
  const [current, setCurrent] = useState<Card | null>(null);

  useEffect(() => {
    if (!currentMeta) {
      setCurrent(null);
      return;
    }
    let live = true;
    setCurrent(null);
    void loadCard(currentMeta.group, currentMeta.id).then((card) => {
      if (live) setCurrent(card);
    });
    return () => {
      live = false;
    };
  }, [currentMeta]);

  const shownTopics = visible.reduce((n, c) => n + c.topics.length, 0);

  useEffect(() => {
    const title = currentMeta
      ? `${currentMeta.title}, Learn engineering`
      : "Learn engineering, software engineering and system design";
    document.title = title;
    const desc = currentMeta
      ? currentMeta.summary
      : `${topicCount} topics across ${manifest.length} cards, from first principles to senior and staff interview level.`;
    let tag = document.querySelector('meta[name="description"]');
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute("name", "description");
      document.head.appendChild(tag);
    }
    tag.setAttribute("content", desc);

    setSocialMeta(title, desc);
  }, [currentMeta]);

  return (
    <>
      <Masthead />
      <main id="content" className="min-h-[100dvh]">
      <div className="shell py-8 lg:py-12">

        {currentMeta && !current ? (
          <div className="mt-10" data-loading="card">
            <p className="mono text-m2" style={{ color: "var(--text-mid)" }}>
              loading {currentMeta.title.toLowerCase()}
            </p>
          </div>
        ) : current ? (
          <div className="mt-8">
            <CardDetail
              card={current}
              onBack={() => setOpenCard(null)}
              progress={progress}
              onAnswered={record}
            />

            {answeredCount >= 3 && (
              <NewsletterPrompt
                context="learn"
                line={`You have worked through ${answeredCount} checks. I write about building systems that survive production, the same material as this, with what broke and what the fix cost. Sent when there is something worth sending.`}
              />
            )}
          </div>
        ) : (
          <>
            <PageHeader
              title="Learn engineering"
              standfirst={`${topicCount} topics across ${manifest.length} cards, from first principles to the decisions senior and staff interviews actually probe. ${byLevel.advanced} of them are advanced. Every topic says why a choice was made rather than only what it was, and every number carries the source it came from.`}
            >
              {(() => {
                const all = summarise(progress, manifest.flatMap((c) => c.topics.map((t) => t.id)));
                if (!all.answered) return null;
                return (
                  <div className="measure-46">
                    <div className="flex items-baseline justify-between gap-16 mono text-m2 text-text-lo mb-8">
                      <span className="tnum">
                        {all.answered} of {all.total} answered, {all.correct} correct
                      </span>
                      <button
                        onClick={reset}
                        className="link-underline inline-flex items-center min-h-[44px] text-accent"
                      >
                        reset
                      </button>
                    </div>
                    <div
                      role="progressbar"
                      aria-valuenow={all.answered}
                      aria-valuemin={0}
                      aria-valuemax={all.total}
                      className="h-4"
                      style={{ background: "var(--rule-2)" }}
                    >
                      <div
                        className="h-full transition-all duration-500"
                        style={{ width: `${(all.answered / all.total) * 100}%`, background: "var(--accent)" }}
                      />
                    </div>
                  </div>
                );
              })()}
            </PageHeader>

            <FilterBar
              label="Filter by level"
              value={level}
              onChange={(id) => {
                setLevel(id as Level | "all");
                track("level_filter", { level: id });
              }}
              options={[
                { id: "all", label: `everything ${topicCount}` },
                ...LEVELS.map((l) => ({ id: l, label: `${l} ${countByLevel(l)}` })),
              ]}
            />

            {level !== "all" && (
              <p className="text-t3 text-text-lo mt-24">
                {shownTopics} {level} topics across {visible.length} cards.
              </p>
            )}

            <div className="grid gap-64 md:gap-96 mt-48 pb-96">
              {TRACK_ORDER.map((trackId) => {
                const tr = TRACKS.find((x) => x.id === trackId);
                const inTrack = visible.filter((c) => c.track === trackId);
                if (!tr || !inTrack.length) return null;
                return (
                  <section key={tr.id}>
                    <h2 className="measure">{tr.label}</h2>
                    <p className="text-t3 text-text-lo mt-12 measure-46">{tr.blurb}</p>
                    <div className="mt-32">
                      {inTrack.map((c) => {
                        const done = summarise(progress, c.topics.map((t) => t.id));
                        const levelsHere = LEVELS.filter((l) => c.topics.some((t) => t.level === l));
                        return (
                          <IndexItem
                            key={c.id}
                            title={c.title}
                            to={`/learn/${c.id}${window.location.search}`}
                            summary={c.summary}
                            meta={
                              <span className="flex items-center gap-12 xl:justify-end">
                                <span className="tnum">
                                  {done.answered ? `${done.answered}/${done.total} answered` : `${done.total} topics`}
                                </span>
                                <span className="flex items-center gap-4">
                                  {levelsHere.map((l) => (
                                    <LevelDot key={l} level={l} />
                                  ))}
                                </span>
                              </span>
                            }
                          />
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
      <SiteFooter />
    </>
  );
}
