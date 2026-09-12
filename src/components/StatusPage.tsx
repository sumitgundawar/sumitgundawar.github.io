import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Kicker,
  Ledger,
  Masthead,
  Plate,
  PrimaryAction,
  Record,
  SiteFooter,
  Spine,
  StatusDot,
  Tag,
} from "./primitives";
import { LoopVideo } from "./LoopVideo";
import { Newsletter } from "./Newsletter";
import { usePageMeta, useReveal } from "@/lib/hooks";
import {
  articles,
  authorPage,
  education,
  frameworks,
  identity,
  incidents,
  kpis,
  podcasts,
  recognition,
  services,
  speaking,
  timeline,
} from "@/data/content";
import { failureModes } from "@/data/failures";
import { manifest } from "@/data/learn/manifest";

const CORPUS = {
  cards: manifest.length,
  topics: manifest.reduce((n, c) => n + c.topics.length, 0),
  advanced: manifest.reduce(
    (n, c) => n + c.topics.filter((t) => t.level === "advanced").length,
    0,
  ),
};

const articleById = new Map(articles.map((a) => [a.id, a]));
const incidentById = new Map(incidents.map((i) => [i.id, i]));
const serviceById = new Map(services.map((s) => [s.id, s]));

function Statement() {
  return (
    <div className="pt-48 md:pt-96 md:grid md:grid-cols-[minmax(0,1fr)_auto] md:gap-64 md:items-end">
      <div className="min-w-0">
      <h1 className="measure">
        <span className="eyebrow block mb-24">{identity.name}</span>
        I design systems around how they fail.
      </h1>
      <p className="text-t2 text-text-mid mt-32 measure">
        {identity.title}. Node, TypeScript and React, and the data and AI systems behind them.{" "}
        {identity.location}.
      </p>
      <p className="text-t3 text-text-lo mt-16 measure">{identity.bio}</p>
      <div className="mt-32 flex flex-wrap items-center gap-24">
        <PrimaryAction href={`mailto:${identity.email}`}>get in touch</PrimaryAction>
        <StatusDot label={identity.availability} />
      </div>
      </div>
      <div className="mt-48 md:mt-0 md:w-[300px] xl:w-[360px] shrink-0">
        <Plate n={0} bleed={false}>
          <img
            src="/sumit-gundawar.webp"
            alt=""
            width={720}
            height={900}
            fetchPriority="high"
            decoding="async"
            className="block w-full aspect-[4/5] object-cover"
          />
        </Plate>
      </div>
    </div>
  );
}

function Proof() {
  const rows = [
    ...podcasts.map((p) => ({
      kicker: p.episode ? `${p.show}, ${p.episode}` : p.show,
      title: p.title,
      url: p.url,
      note: "podcast",
    })),
    ...speaking.map((t) => ({
      kicker: t.venue,
      title: t.title,
      url: t.url,
      note: t.when,
    })),
    ...recognition.map((r) => ({
      kicker: r.org,
      title: r.role,
      url: r.url,
      note: r.note ?? r.when,
    })),
    {
      kicker: `${articles.length} articles`,
      title: "Software Testing News, AITechTrend and Dataconomy",
      url: authorPage,
      note: "author page",
    },
  ];
  return (
    <ul className="border-t border-rule-2">
      {rows.map((row) => (
        <li key={row.kicker + row.title} className="border-b border-rule-2">
          {row.url ? (
            <a
              href={row.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block py-16 md:grid md:grid-cols-[200px_minmax(0,1fr)_auto] md:gap-24 md:items-baseline transition-colors duration-[120ms] hover:bg-ink-1"
            >
              <span className="eyebrow">{row.kicker}</span>
              <span className="text-t3 text-text-hi link-underline block mt-8 md:mt-0">
                {row.title}
              </span>
              <span className="mono text-m3 uppercase text-text-lo mt-8 md:mt-0 block">
                {row.note}
              </span>
            </a>
          ) : (
            <div className="py-16 md:grid md:grid-cols-[200px_minmax(0,1fr)_auto] md:gap-24 md:items-baseline">
              <span className="eyebrow">{row.kicker}</span>
              <span className="text-t3 text-text-hi block mt-8 md:mt-0">{row.title}</span>
              <span className="mono text-m3 uppercase text-text-lo mt-8 md:mt-0 block">
                {row.note}
              </span>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function Mode({ mode, index }: { mode: (typeof failureModes)[number]; index: number }) {
  const [open, setOpen] = useState(index === 0);
  const incident = mode.incidentId ? incidentById.get(mode.incidentId) : undefined;
  const modeArticles = mode.articleIds.map((id) => articleById.get(id)).filter(Boolean);
  const framework = frameworks.find((f) => f.abbr === mode.frameworkAbbr);

  return (
    <div id={mode.id} style={{ scrollMarginTop: 72 }} className="border-t border-rule-2 py-24">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full text-left min-h-[44px] flex items-baseline gap-16"
      >
        <span aria-hidden className="mono text-m2 text-accent shrink-0 w-12">
          {open ? "-" : "+"}
        </span>
        <h3 className="min-w-0">{mode.failure}</h3>
      </button>
      <p className="text-t3 text-text-mid mt-12 measure-46 pl-24">{mode.because}</p>

      {open && (
        <div className="mt-32 pl-24 grid gap-32 md:grid-cols-2 xl:gap-48">
          <div>
            <Kicker>what I built against it</Kicker>
            <ul className="mt-12 grid gap-16">
              {mode.built.map((b) => (
                <li key={b.title}>
                  <div className="text-t3 text-text-hi">{b.title}</div>
                  <p className="text-t3 text-text-mid mt-4 measure-46">{b.detail}</p>
                  {b.url && (
                    <a
                      href={b.url}
                      target={b.url.startsWith("http") ? "_blank" : undefined}
                      rel={b.url.startsWith("http") ? "noopener noreferrer" : undefined}
                      className="mono text-m2 text-accent link-underline mt-8 min-h-[44px] inline-flex items-center"
                    >
                      {b.urlLabel} &#8599;
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {incident && (
            <div>
              <Kicker>it has happened in public</Kicker>
              <p className="text-t3 text-text-mid mt-12 measure-46">
                <span className="mono text-m2 tnum text-text-lo">{incident.year}</span>{" "}
                <span className="text-text-hi">{incident.title}.</span> {incident.cause}{" "}
                {incident.blastRadius}
              </p>
            </div>
          )}

          {modeArticles.length > 0 && (
            <div>
              <Kicker>what I published on it</Kicker>
              <ul className="mt-12 grid gap-12">
                {modeArticles.map((a) => (
                  <li key={a!.id}>
                    <a
                      href={a!.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-t3 text-text-hi link-underline"
                    >
                      {a!.title}
                    </a>
                    <span className="mono text-m3 uppercase text-text-lo ml-8">
                      {a!.publication}
                    </span>
                  </li>
                ))}
              </ul>
              {framework && (
                <p className="text-t3 text-text-lo mt-12">
                  <span className="mono text-m2 text-text-hi">{framework.abbr}</span>{" "}
                  {framework.expansion}
                </p>
              )}
            </div>
          )}

          <div className="md:col-span-2">
            <Kicker>and what teaches it</Kicker>
            <div className="flex flex-wrap gap-8 mt-12">
              {mode.topicIds.map((id) => {
                const card = manifest.find((c) => c.topics.some((t) => t.id === id));
                const topic = card?.topics.find((t) => t.id === id);
                if (!card || !topic) return null;
                return (
                  <Link
                    key={id}
                    to={`/learn/${card.id}#topic-${id}`}
                    className="mono text-m3 uppercase text-text-lo border border-rule-3 px-12 min-h-[44px] inline-flex items-center hover:text-text-hi transition-colors duration-[120ms]"
                  >
                    {topic.title}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LiveSystems() {
  const linked = services.filter((s) => s.url);
  const unlinked = services.filter((s) => !s.url);
  return (
    <>
      <div className="border-t border-rule-2">
        {linked.map((s) => (
          <a
            key={s.id}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block py-24 border-b border-rule-2 transition-colors duration-[120ms] hover:bg-ink-1 md:grid md:grid-cols-[96px_minmax(0,1fr)] md:gap-24"
          >
            <span className="mono text-m2 text-accent">{s.urlLabel}</span>
            <span className="block min-w-0 mt-8 md:mt-0">
              <span className="block text-t1 text-text-hi link-underline">{s.name}</span>
              <span className="block text-t3 text-text-mid mt-8 measure-46">{s.slo}</span>
              <span className="flex flex-wrap gap-8 mt-16">
                {s.stack.slice(0, 6).map((x) => (
                  <Tag key={x}>{x}</Tag>
                ))}
              </span>
            </span>
          </a>
        ))}
      </div>
      <div className="mt-24">
        <Kicker>built, and not publicly reachable</Kicker>
        <ul className="mt-12 grid gap-12">
          {unlinked.map((s) => (
            <li key={s.id}>
              <span className="text-t3 text-text-hi">{s.name}.</span>{" "}
              <span className="text-t3 text-text-mid">{s.slo}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function Method() {
  return (
    <div className="grid gap-24 md:grid-cols-2">
      <div>
        <h3>I check my own claims, and publish what was wrong</h3>
        <p className="text-t3 text-text-mid mt-12 measure-46">
          The {CORPUS.topics} topics behind {CORPUS.cards} cards carry 141 cited sources. Every one
          was requested: 132 resolve, and the nine that do not are explained rather than dropped.
          Three of my own factual claims turned out to be wrong and are corrected in public, and one
          defect is left unfixed with the reasoning stated instead of quietly shipped.
        </p>
        <Link
          to="/learn"
          className="mono text-m2 text-accent link-underline mt-16 min-h-[44px] inline-flex items-center"
        >
          read the material
        </Link>
      </div>
      <div>
        <h3>The site refuses to ship its own mistakes</h3>
        <p className="text-t3 text-text-mid mt-12 measure-46">
          Eleven check suites run in the build: 45 assertions against the deployed site, 30 on
          security, 69 email compatibility rules, plus gates on typography, colour contrast at the
          sizes actually used, content structure, indexing signals and every route returning real
          text rather than an empty app shell.
        </p>
        <a
          href="https://github.com/sumitgundawar/sumitgundawar.github.io"
          target="_blank"
          rel="noopener noreferrer"
          className="mono text-m2 text-accent link-underline mt-16 min-h-[44px] inline-flex items-center"
        >
          the source &#8599;
        </a>
      </div>
    </div>
  );
}

export function StatusPage() {
  const reveal = useReveal<HTMLDivElement>();
  usePageMeta(
    `${identity.name}, ${identity.title} in ${identity.location}`,
    identity.bio,
  );

  const robot = education.find((e) => e.media);

  return (
    <>
      <Masthead />
      <main id="content" className="shell">
        <Statement />

        <div ref={reveal} className="mt-64 md:mt-128 grid gap-64 md:gap-128">
          <Spine n={1} id="evidence" title="The numbers, and how they were measured">
            <Ledger items={kpis} />
          </Spine>

          <Spine n={2} id="proof" title="Where other people have put my name">
            <Proof />
          </Spine>

          <Spine n={3} id="work" title="Now, and before">
            <div>
              {timeline.map((row) => (
                <Record
                  key={row.key}
                  meta={row.dates}
                  title={row.title}
                  org={row.org}
                  tags={row.tags}
                >
                  {row.line}
                </Record>
              ))}
            </div>
          </Spine>

          <Spine
            n={4}
            id="failures"
            title="Seven ways a system fails, and what I did about each"
          >
            <p className="text-t3 text-text-lo measure-46 -mt-12 mb-24">
              Each one gathers what I built against it, the time it happened to somebody in public,
              what I published about it, and the material that teaches it.
            </p>
            <div>
              {failureModes.map((mode, i) => (
                <Mode key={mode.id} mode={mode} index={i} />
              ))}
            </div>
          </Spine>

          <Spine n={5} id="systems" title="Systems you can open right now">
            <LiveSystems />
          </Spine>

          <Spine
            n={6}
            id="try"
            title="Two things to try, and one of them argues with you"
            action={
              <Link
                to="/build"
                className="mono text-m2 text-accent link-underline min-h-[44px] inline-flex items-center"
              >
                size your system
              </Link>
            }
          >
            <div className="grid gap-32 md:grid-cols-2">
              <div>
                <h3>An architecture recommender that talks you down</h3>
                <p className="text-t3 text-text-mid mt-12 measure-46">
                  Ten questions, then a recommendation where every component carries its reasoning
                  and its real alternatives. At small scale it tells you so, because most systems are
                  over-engineered and a recommendation with no visible alternatives reads as a
                  verdict rather than a choice.
                </p>
                <Link
                  to="/build"
                  className="mono text-m2 text-accent link-underline mt-16 min-h-[44px] inline-flex items-center"
                >
                  answer ten questions
                </Link>
              </div>
              <div>
                <h3>A clinical retrieval demo you can make refuse you</h3>
                <p className="text-t3 text-text-mid mt-12 measure-46">
                  {serviceById.get("groundcheck")?.slo}
                </p>
                <a
                  href={serviceById.get("groundcheck")?.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mono text-m2 text-accent link-underline mt-16 min-h-[44px] inline-flex items-center"
                >
                  make it refuse &#8599;
                </a>
              </div>
            </div>
          </Spine>

          <Spine n={7} id="method" title="How I check my own work">
            <Method />
          </Spine>

          <Spine n={8} id="education" title="Where the habits came from">
            <div>
              {education.map((e) => (
                <Record key={e.school} meta={e.dates} title={e.degree} org={e.school} tags={e.tags}>
                  {e.detail}
                </Record>
              ))}
            </div>
            {robot?.media?.video && (
              <div className="mt-48">
                <Plate n={1} caption={robot.media.caption}>
                  <LoopVideo
                    src={robot.media.video.src}
                    poster={robot.media.video.poster}
                    label={robot.media.video.label}
                    event={robot.media.video.event}
                  />
                </Plate>
              </div>
            )}
          </Spine>

          <Spine n={9} id="contact" title="Getting hold of me">
            <div className="grid gap-32 md:grid-cols-2">
              <div>
                <p className="text-t2 text-text-mid measure-46">{identity.availability}</p>
                <div className="mt-24 flex flex-wrap items-center gap-24">
                  <PrimaryAction href={`mailto:${identity.email}`}>
                    {identity.email}
                  </PrimaryAction>
                  <a
                    href={identity.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mono text-m2 text-accent link-underline min-h-[44px] inline-flex items-center"
                  >
                    linkedin &#8599;
                  </a>
                </div>
              </div>
              <Newsletter />
            </div>
          </Spine>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
