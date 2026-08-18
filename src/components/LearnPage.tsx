import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FlowDiagram } from "./FlowDiagram";
import { DiagramViews } from "./DiagramViews";
import { AskBox } from "./AskBox";
import { NewsletterPrompt } from "./NewsletterPrompt";
import { trackQuiz } from "@/lib/api";
import { track } from "@/lib/track";
import { useProgress, summarise, type Progress } from "@/lib/progress";
import { usePageDwell, setSocialMeta, useStagger } from "@/lib/hooks";
/* Imported from the leaf modules rather than from the barrel.
 *
 * "@/data/learn" pulls every card into whatever imports it, which is how this
 * page came to ship 407KB of JavaScript to show one card. The manifest carries
 * the titles and levels the index renders; the material for an opened card is
 * fetched as its own chunk. */
import { manifest, topicCount } from "@/data/learn/manifest";
import { loadCard } from "@/data/learn/load";
import { TRACKS, LEVELS, type Card, type CardMeta, type Level, type Topic, type Check } from "@/data/learn/types";

/** Cards that still have something to show once a level filter is applied. */
function metaForLevel(level: Level | "all"): CardMeta[] {
  if (level === "all") return manifest;
  return manifest
    .map((c) => ({ ...c, topics: c.topics.filter((t) => t.level === level) }))
    .filter((c) => c.topics.length > 0);
}

const countByLevel = (level: Level) =>
  manifest.reduce((n, c) => n + c.topics.filter((t) => t.level === level).length, 0);

/** A grid whose children arrive one after another rather than all at once.
 *  A component rather than a hook call at the use site, because the grid is
 *  rendered inside a map over tracks and hooks cannot be called there. */
function StaggerGrid({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useStagger<HTMLDivElement>();
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

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

/** Stable per-topic shuffle.
 *
 *  107 of 109 checks were authored with the answer at index 1, and 103 had it
 *  as the longest option, so clicking the second button every time scored 98%
 *  without reading anything. Hand-balancing 122 quizzes is fragile and would
 *  drift the moment new ones are written, so the order is randomised here
 *  instead. Seeded by topic id so it is stable across re-renders and does not
 *  move under the reader between clicking and reading the explanation. */
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

/* Which question to ask this time.
 *
 * One fixed question makes a second visit a memory test rather than a check of
 * understanding. Where a topic carries a bank, one is chosen per visit, and the
 * choice is per mount rather than per render so the question does not change
 * under someone midway through reading it.
 *
 * Random rather than sequential, because sequential needs stored state per
 * topic and the point is variety, not coverage. */
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
  // Seed from stored progress: this component unmounts when the topic is
  // collapsed, so without this the answer disappears on every close.
  const [picked, setPicked] = useState<number | null>(() =>
    wasCorrect === undefined ? null : wasCorrect ? shuffled.correctIndex : -1,
  );
  /* Which option was clicked in this interaction, as opposed to which one is
     stored as the answer. Cleared once the animation has run so that a later
     re-render, of which there are several while the explanation appears, does
     not replay it. */
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
    /* First-party too. GA tells you a quiz was answered; this records which
       option was chosen, which is the part that says whether a distractor is
       working or whether an explanation is not. */
    trackQuiz(topic.id, i, i === shuffled.correctIndex);
  };

  return (
    /* One column until there is genuinely room for two.
     *
     * Everything here was capped at 36em and stacked, inside a container half
     * again as wide, so a wide card held narrow content with a column of empty
     * space beside it. Widening the text was not the answer: 36em is already
     * about 72 characters and past that a line is harder to read, not easier.
     *
     * So the width goes to the layout instead. Prose keeps its measure on the
     * left, the quiz moves up beside it rather than a screen further down, and
     * the diagram spans both because a diagram is the one thing here that gets
     * better with more room. */
    <div className="pb-8 pt-1">
      <div className="grid xl:grid-cols-[minmax(0,36em)_minmax(0,1fr)] gap-x-10 2xl:gap-x-14 items-start">
      <div className="min-w-0">
      <div className="flex flex-col gap-3 max-w-[36em]">
        {topic.body.map((p, i) => (
          <p key={i} className="text-[length:var(--fs-body)] leading-[1.65]" style={{ color: "var(--c-text-dim)" }}>
            {p}
          </p>
        ))}
      </div>


      {topic.why && (
        <div
          className="mt-5 border-l-2 pl-4 py-1 max-w-[36em]"
          style={{ borderColor: "var(--accent)" }}
        >
          <div className="mono text-[length:var(--fs-label)] uppercase tracking-[0.09em] mb-1.5" style={{ color: "var(--accent)" }}>
            why this choice
          </div>
          <p className="text-[length:var(--fs-body)] leading-[1.65]" style={{ color: "var(--c-text)" }}>
            {topic.why}
          </p>
        </div>
      )}

      {topic.inPractice && (
        <div
          className="mt-4 border-l-2 pl-4 py-1 max-w-[36em]"
          style={{ borderColor: "var(--accent-2)" }}
        >
          <div className="mono text-[length:var(--fs-label)] uppercase tracking-[0.09em] mb-1.5" style={{ color: "var(--accent-2)" }}>
            in practice
          </div>
          <p className="text-[length:var(--fs-body)] leading-[1.65]" style={{ color: "var(--c-text)" }}>
            {topic.inPractice}
          </p>
        </div>
      )}

      </div>

      <div
        className="mt-6 xl:mt-0 rounded-lg border p-4 sm:p-5 max-w-[36em] xl:max-w-none min-w-0"
        style={{ borderColor: "var(--hair)", background: "var(--surface-2)" }}
      >
        <div className="mono text-[length:var(--fs-label)] uppercase tracking-[0.09em] mb-2.5" style={{ color: "var(--c-text-dim)" }}>
          check yourself
        </div>
        <p className="text-[length:var(--fs-body)] leading-relaxed" style={{ color: "var(--c-text)" }}>
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
                /* aria-disabled, not disabled. A disabled button leaves the tab
                   order entirely, so a screen reader user who answered could not
                   get back to the options to hear which one was right. The click
                   is guarded in answer() already. */
                aria-disabled={answered}
                className={`text-left text-[length:var(--fs-body)] leading-snug px-3.5 py-3 rounded-md border transition-colors flex gap-3 items-start min-h-[48px]${
                  /* Only the option just clicked animates. Animating every
                     revealed option makes the whole list twitch and hides which
                     one the reader actually chose. */
                  justAnswered === i ? (isCorrect ? " check-correct" : " check-wrong") : ""
                }`}
                style={{
                  borderColor: show ? (isCorrect ? "var(--lv-beginner)" : "var(--crit)") : "var(--hair-strong)",
                  background: show && isCorrect ? "rgba(61,214,140,0.10)" : "var(--surface)",
                  color: show && isCorrect ? "var(--lv-beginner)" : "var(--c-text)",
                  opacity: answered && i !== picked && !isCorrect ? 0.45 : 1,
                  cursor: answered ? "default" : "pointer",
                }}
              >
                <span className="mono text-[length:var(--fs-label)] pt-0.5 shrink-0 w-3" style={{ color: show && isCorrect ? "var(--lv-beginner)" : "var(--c-text-dim)" }}>
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
          /* role=status so the outcome and the reasoning are announced. Without
             it a screen reader user answered and heard nothing at all. */
          <p role="status" className="text-[length:var(--fs-body)] mt-4 leading-relaxed" style={{ color: "var(--c-text-dim)" }}>
            <span style={{ color: correct ? "var(--lv-beginner)" : "var(--crit)" }}>
              {correct ? "Correct. " : "Not quite. "}
            </span>
            {check.explain}
          </p>
        )}
      </div>
      </div>

      {/* Spans both columns: a diagram is the one thing on this page that gets
          better with more room, so it is not confined to the reading column. */}
      {topic.diagram && <DiagramViews diagram={topic.diagram} id={`${cardId}-${topic.id}`} />}

      {/* After the check, not before: the question is worth attempting before
          the assistant is on hand to answer it for you. */}
      <AskBox topicId={topic.id} />
    </div>
  );
}

/* A card, read as one guide rather than clicked through as an accordion.
 *
 * It used to open one topic at a time behind a plus and a minus, which meant a
 * page carried about a hundred and twenty words of visible teaching and then a
 * row of collapsed headings. Three things were wrong with that. A reader could
 * not see the shape of what they were about to learn. The quiz, being the only
 * thing in the open topic with a border around it, outweighed the explanation it
 * was testing. And a crawler, or anyone arriving from search, got one topic of
 * text where the page claims to teach a subject.
 *
 * Everything is open now, in order, with a contents rail that tracks where you
 * are. The rail is the part that makes length affordable: a long page is only
 * daunting when you cannot see its end or jump within it.
 */
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

  /* Which section the reader is actually in, so the rail is a position rather
     than a list of links. rootMargin pins the trigger line near the top of the
     viewport; without it every section is "active" while it is anywhere on
     screen and the highlight jitters between two at once. */
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
        className="mono text-[length:var(--fs-label)] mb-4 inline-flex items-center gap-1.5 link-underline min-h-[44px]"
        style={{ color: "var(--c-text-dim)" }}
      >
        ← all topics
      </button>

      {/* h1, not h2. Every deep-linked topic URL, which is what the
          sitemap advertises, previously started its heading order at h2 with
          no h1 anywhere on the page. */}
      <h1 className="text-[length:var(--fs-section)] sm:text-[length:var(--fs-page)] font-semibold tracking-[-0.02em]" style={{ color: "var(--c-text)" }}>
        {card.title}
      </h1>
      <p className="mt-3 text-[length:var(--fs-body)] leading-relaxed max-w-[36em]" style={{ color: "var(--c-text-dim)" }}>
        {card.summary}
      </p>

      <div className="mt-9 grid lg:grid-cols-[200px_minmax(0,1fr)] xl:grid-cols-[230px_minmax(0,1fr)] gap-x-10 xl:gap-x-14 items-start">
        {/* The rail. Sticky from lg up, and simply the first thing on the page
            below that, where a fixed column would eat half a phone screen. */}
        <nav
          aria-label="Contents"
          className="lg:sticky lg:top-8 min-w-0 mb-8 lg:mb-0 pb-5 lg:pb-0 border-b lg:border-b-0"
          style={{ borderColor: "var(--hair)" }}
        >
          <div className="mono text-[length:var(--fs-micro)] uppercase tracking-[0.12em] mb-3" style={{ color: "var(--c-text-dim)" }}>
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
                    className="flex items-start gap-2.5 py-2 text-[length:var(--fs-label)] leading-snug"
                    style={{
                      color: here ? "var(--c-text)" : "var(--c-text-dim)",
                      borderLeft: `2px solid ${here ? "var(--accent)" : "transparent"}`,
                      paddingLeft: 10,
                      marginLeft: -12,
                    }}
                  >
                    <span className="mono tnum shrink-0 pt-px" style={{ color: here ? "var(--accent)" : "var(--c-text-dim)", opacity: here ? 1 : 0.6 }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0">{t.title}</span>
                    {t.id in progress && (
                      <span className="mono shrink-0 ml-auto" style={{ color: progress[t.id] ? "var(--signal)" : "var(--crit)" }}>
                        {progress[t.id] ? "✓" : "×"}
                      </span>
                    )}
                  </a>
                </li>
              );
            })}
          </ol>
          <div className="mono text-[length:var(--fs-micro)] mt-4 pt-3 border-t" style={{ color: "var(--c-text-dim)", borderColor: "var(--hair)" }}>
            {card.topics.length} topics{done ? ` · ${done} answered` : ""}
          </div>
        </nav>

        <div className="min-w-0">
          {card.topics.map((t, i) => (
            <section
              key={t.id}
              id={`topic-${t.id}`}
              /* Clears the fixed nav when jumped to from the rail. */
              style={{ scrollMarginTop: 88 }}
              className={i === 0 ? "" : "mt-14 pt-12 border-t"}
            >
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="mono tnum text-[length:var(--fs-label)]" style={{ color: "var(--accent)" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h2 className="text-[length:var(--fs-item)] sm:text-[length:var(--fs-section)] font-medium tracking-[-0.015em] min-w-0" style={{ color: "var(--c-text)" }}>
                  {t.title}
                </h2>
                <span className="mono text-[length:var(--fs-label)] uppercase tracking-wide ml-auto shrink-0" style={{ color: LEVEL_COLOR[t.level] }}>
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
  // Held in the URL rather than component state: 122 topics had no addresses,
  // so nothing could be linked or bookmarked, and the browser back button left
  // the page entirely instead of closing the open card.
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
  /* The index knows the card exists and what it is called before any of its
     material has been fetched, so the heading, the title and the description
     are correct from the first frame and only the body waits. */
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
    /* The same title and description on the social tags. They were left at the
       site-wide defaults, so a shared link to a specific card was indexed and
       previewed under a name that described the whole site instead. */
    setSocialMeta(title, desc);
  }, [currentMeta]);

  return (
    <main id="content" className="min-h-[100dvh]">
      <div className="mx-auto w-full max-w-[940px] xl:max-w-[1180px] 2xl:max-w-[1320px] px-5 sm:px-8 xl:px-10 py-8 lg:py-12">
        <Link to="/" className="mono text-[length:var(--fs-label)] link-underline inline-flex items-center min-h-[44px]" style={{ color: "var(--c-text-dim)" }}>
          ← back to profile
        </Link>

        {currentMeta && !current ? (
          /* data-loading is the signal the prerenderer waits to disappear.
             Without it a build could capture this frame and ship a page whose
             entire content is the word loading. */
          <div className="mt-10" data-loading="card">
            <p className="mono text-[length:var(--fs-label)]" style={{ color: "var(--c-text-dim)" }}>
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
            {/* After three answered checks, not on arrival. Someone who has
                worked through three has demonstrated the material is worth
                their time, which is a different person from someone who just
                landed. Below the card, so it never interrupts a topic. */}
            {answeredCount >= 3 && (
              <NewsletterPrompt
                context="learn"
                line={`You have worked through ${answeredCount} checks. I write about building systems that survive production, the same material as this, with what broke and what the fix cost. Sent when there is something worth sending.`}
              />
            )}
          </div>
        ) : (
          <>
            <h1
              className="mt-7 font-semibold leading-[1.05] tracking-[-0.02em]"
              style={{ fontSize: "var(--fs-page)", color: "var(--c-text)" }}
            >
              Learn engineering
            </h1>
            <p className="mt-3.5 text-[length:var(--fs-body)] leading-relaxed max-w-[34em]" style={{ color: "var(--c-text-dim)" }}>
              Software engineering and system design, from first principles to the decisions senior and
              staff interviews actually probe. Every topic explains why a choice was made, not just what
              it was. Answer the check at the end of each, there are no accounts, and your score resets
              when you refresh.
            </p>

            {/* The counts used to appear twice, once as a stats row and again
                inside the filter pills immediately below. Same four numbers,
                four lines of phone screen, no extra information. */}
            {(() => {
              const all = summarise(progress, manifest.flatMap((c) => c.topics.map((t) => t.id)));
              if (!all.answered) return null;
              return (
                <div className="mt-6 max-w-[36em]">
                  <div className="flex items-baseline justify-between mono text-[length:var(--fs-label)] mb-2" style={{ color: "var(--c-text-dim)" }}>
                    <span className="tnum">
                      {all.answered} of {all.total} answered · {all.correct} correct
                    </span>
                    <button onClick={reset} className="link-underline inline-flex items-center min-h-[44px]">
                      reset progress
                    </button>
                  </div>
                  <div className="h-[4px] rounded-full overflow-hidden" style={{ background: "var(--hair-strong)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${(all.answered / all.total) * 100}%`, background: "var(--signal)" }}
                    />
                  </div>
                </div>
              );
            })()}

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
                    className="mono text-[length:var(--fs-label)] px-4 rounded-full border transition-colors inline-flex items-center min-h-[44px]"
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
              <p className="mt-3 text-[length:var(--fs-body)]" style={{ color: "var(--c-text-dim)" }}>
                Showing {shownTopics} {level} topics across {visible.length} cards.
              </p>
            )}

            {TRACKS.map((tr) => {
              const inTrack = visible.filter((c) => c.track === tr.id);
              if (!inTrack.length) return null;
              return (
                <section key={tr.id} className="mt-16">
                  <div>
                    <h2 className="text-[length:var(--fs-item)] font-semibold tracking-[-0.015em]" style={{ color: "var(--c-text)" }}>
                      {tr.label}
                    </h2>
                    <p className="mt-1.5 text-[length:var(--fs-body)] max-w-[42em]" style={{ color: "var(--c-text-dim)" }}>
                      {tr.blurb}
                    </p>
                  </div>

                  <StaggerGrid className="mt-5 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
                    {inTrack.map((c) => {
                      const levelsHere = LEVELS.filter((l) => c.topics.some((t) => t.level === l));
                      return (
                        /* A link, not a button. As a button these were
                           invisible to crawlers, so the only route to 122
                           topics was the sitemap, and a reader could not
                           cmd-click, middle-click or copy the link of any of
                           them, which is exactly what someone triaging a study
                           resource does. The routing already existed. */
                        <Link
                          key={c.id}
                          to={`/learn/${c.id}${window.location.search}`}
                          onClick={() => track("card_open", { card: c.id, track: c.track })}
                          className="press text-left rounded-lg border p-4 sm:p-5 flex flex-col gap-2 h-full transition-transform hover:-translate-y-0.5"
                          style={{ borderColor: "var(--hair-strong)", background: "var(--surface)" }}
                        >
                          <span className="text-[length:var(--fs-item)] font-medium leading-snug" style={{ color: "var(--c-text)" }}>
                            {c.title}
                          </span>
                          <span className="text-[length:var(--fs-body)] leading-relaxed" style={{ color: "var(--c-text-dim)" }}>
                            {c.summary}
                          </span>
                          <span className="mt-auto pt-3 flex items-center gap-2.5 mono text-[length:var(--fs-label)]" style={{ color: "var(--c-text-dim)" }}>
                            {(() => {
                              const done = summarise(progress, c.topics.map((t) => t.id));
                              return (
                                <span className="tnum" style={done.answered ? { color: "var(--signal)" } : undefined}>
                                  {done.answered ? `${done.answered}/${done.total} done` : `${done.total} topics`}
                                </span>
                              );
                            })()}
                            <span className="flex items-center gap-1">
                              {levelsHere.map((l) => (
                                <LevelDot key={l} level={l} />
                              ))}
                            </span>
                          </span>
                        </Link>
                      );
                    })}
                  </StaggerGrid>
                </section>
              );
            })}
          </>
        )}
      </div>
    </main>
  );
}
