import { Link } from "react-router-dom";
import { Masthead, SiteFooter, Tag } from "./primitives";
import { Boot } from "./Boot";
import { Newsletter } from "./Newsletter";
import { InferenceField } from "./InferenceField";
import { HeroName } from "./HeroName";
import { Marquee } from "./Marquee";
import { Numbers } from "./Numbers";
import { Evidence } from "./Evidence";
import { Reveal } from "./Reveal";
import { BracketPanel } from "./Frames";
import { usePageMeta } from "@/lib/hooks";
import { SPRING } from "@/lib/motion";
import {
  articles,
  frameworks,
  identity,
  incidents,
  podcasts,
  recognition,
  services,
  speaking,
} from "@/data/content";
import { failureModes } from "@/data/failures";

const outlets = new Set(articles.map((a) => a.publication)).size;
const articleById = new Map(articles.map((a) => [a.id, a]));
const incidentById = new Map(incidents.map((i) => [i.id, i]));

function Heading({ text, eyebrow, note }: { text: string; eyebrow: string; note?: string }) {
  return (
    <div className="blockhead">
      <div className="min-w-0">
        <span className="brow">
          <span className="brow-dot" aria-hidden />
          {eyebrow}
        </span>
        <h2 className="blockhead-title display" data-display>
          <Reveal text={text} by="word" stagger={90} config={SPRING.REVEAL} gap={0.18} />
        </h2>
      </div>
      {note && <span className="blockhead-note">{note}</span>}
    </div>
  );
}

function Principles() {
  return (
    <ol className="principles">
      {frameworks.map((framework, i) => (
        <li key={framework.abbr} className="principle">
          <span className="principle-index tnum">{String(i + 1).padStart(2, "0")}</span>
          <div className="min-w-0">
            <h3 className="principle-title">
              {framework.abbr}, {framework.expansion}
            </h3>
            <p className="principle-body">
              {framework.domain}. {framework.layers.join(". ")}.
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function SystemCards() {
  return (
    <ul className="systems">
      {services.slice(0, 4).map((service, i) => {
        const body = (
          <>
            <span className="system-name">{service.name}</span>
            <span className="system-blurb">{service.slo}</span>
            <span className="system-foot">
              <span className="flex flex-wrap gap-8">
                {service.stack.slice(0, 3).map((item) => (
                  <Tag key={item}>{item}</Tag>
                ))}
              </span>
              {service.url && <span className="system-link">{service.urlLabel}</span>}
            </span>
          </>
        );
        return (
          <li key={service.id} className="system" data-offset={i % 2 === 1 ? "true" : "false"}>
            {service.url ? (
              <a href={service.url} target="_blank" rel="noopener noreferrer" className="system-card">
                {body}
              </a>
            ) : (
              <div className="system-card">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function FailureRow({ mode }: { mode: (typeof failureModes)[number] }) {
  const incident = mode.incidentId ? incidentById.get(mode.incidentId) : undefined;
  const modeArticles = mode.articleIds.map((id) => articleById.get(id)).filter(Boolean);
  const counts = [
    `${mode.built.length} built`,
    incident ? "1 public incident" : null,
    modeArticles.length ? `${modeArticles.length} published` : null,
  ].filter(Boolean) as string[];

  return (
    <details id={mode.id} className="failrow" style={{ scrollMarginTop: 88 }}>
      <summary className="failrow-summary">
        <h3 className="failrow-title">{mode.failure}</h3>
        <span className="failrow-counts">{counts.join(", ")}</span>
      </summary>
      <div className="failrow-body">
        <div className="min-w-0">
          <p className="text-t2 text-text-mid">{mode.because}</p>
          {incident && (
            <p className="text-t3 text-text-lo mt-12">
              <span className="tnum">{incident.year}</span>{" "}
              <span className="text-text-hi">{incident.title}.</span> {incident.cause}
            </p>
          )}
        </div>
        <ul className="grid gap-8 min-w-0">
          {mode.built.map((item) => (
            <li key={item.title} className="text-t3">
              <span className="text-text-hi">{item.title}.</span>{" "}
              <span className="text-text-lo">{item.detail}</span>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

export function StatusPage() {
  usePageMeta(`${identity.name}, ${identity.title} in ${identity.location}`, identity.bio);

  return (
    <>
      <Boot />
      <Masthead />
      <main id="content">
        <HeroName />
        <Marquee />

        <section id="thesis" className="shell sect">
          <div className="grid-12">
            <div className="md:col-span-6 md:self-center">
              <Heading eyebrow="The argument" text="Systems do not fail politely." />
              <p className="lead mt-24">
                Every framework here was built against a failure I had already carried. They are
                named so the argument can be checked, and each one is defended in writing elsewhere
                on this site.
              </p>
            </div>
            <div className="md:col-start-8 md:col-span-5">
              <Principles />
            </div>
          </div>
        </section>

        <section id="shipped" className="shell sect" style={{ scrollMarginTop: 88 }}>
          <Heading
            eyebrow="Selected systems"
            text="The work that stayed up."
            note={`4 of ${services.length} shipped`}
          />
          <SystemCards />
          <div className="mt-32">
            <Link to="/build" className="sans text-t2 text-signal link-underline min-h-[44px] inline-flex items-center">
              All {services.length} systems
            </Link>
          </div>
        </section>

        <section id="numbers" className="shell sect">
          <Heading eyebrow="By the numbers" text="Measured, and checkable." />
          <Numbers />
        </section>

        <section id="failures" className="shell sect" style={{ scrollMarginTop: 88 }}>
          <Heading
            eyebrow="Carried, not catalogued"
            text="How systems fail, and what I did about it."
          />
          <div className="failrows">
            {failureModes.map((mode) => (
              <FailureRow key={mode.id} mode={mode} />
            ))}
          </div>
        </section>

        <section id="gateway" className="shell sect">
          <Heading
            eyebrow="Live, once"
            text="A transformer I trained, behind a guardrail."
          />
          <BracketPanel className="mt-32">
            <InferenceField />
          </BracketPanel>
        </section>

        <section id="writing" className="shell sect">
          <Heading
            eyebrow={`${articles.length} articles, ${outlets} outlets`}
            text="Where my name appears."
          />
          <Evidence />

          <div className="mt-24">
            <Link to="/writing" className="sans text-t2 text-signal link-underline min-h-[44px] inline-flex items-center">
              All {articles.length} articles
            </Link>
          </div>

          <h3 className="text-t1 mt-40">Spoken, and where others put my name</h3>
          <ul className="grid gap-x-40 gap-y-16 sm:grid-cols-2 xl:grid-cols-3 mt-16">
            {podcasts.map((podcast) => (
              <li key={podcast.url}>
                <a
                  href={podcast.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-t3 text-text-hi link-underline"
                >
                  {podcast.title}
                </a>
                <span className="block text-t3 text-text-lo mt-4">{podcast.show}</span>
              </li>
            ))}
            {speaking.map((talk) => (
              <li key={talk.title}>
                <span className="text-t3 text-text-hi">{talk.title}</span>
                <span className="block text-t3 text-text-lo mt-4">
                  {talk.venue}, {talk.when}
                </span>
              </li>
            ))}
            {recognition.map((item) => (
              <li key={item.role + item.org}>
                <span className="text-t3 text-text-hi">{item.role}</span>
                <span className="block text-t3 text-text-lo mt-4">{item.org}</span>
              </li>
            ))}
          </ul>
        </section>

        <section id="contact" className="shell sect" style={{ scrollMarginTop: 88 }}>
          <Heading eyebrow="Get in touch" text="Have something that has to stay up?" />
          <p className="lead mt-24 measure">{identity.availability}</p>
          <a href={`mailto:${identity.email}`} className="bigmail mt-32">
            {identity.email}
            <span className="bigmail-arrow" aria-hidden>
              &#8599;
            </span>
          </a>
          <div className="mt-24">
            <a
              href={identity.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="sans text-t2 text-text-mid link-underline min-h-[44px] inline-flex items-center"
            >
              LinkedIn
            </a>
          </div>
          <div className="mt-48 max-w-[56ch]">
            <Newsletter />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
