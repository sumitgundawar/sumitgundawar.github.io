import { Link } from "react-router-dom";
import { Masthead, SiteFooter } from "./primitives";
import { articles, identity } from "@/data/content";
import { usePageDwell, usePageMeta, trackClick } from "@/lib/hooks";

export function WritingPage() {
  usePageDwell("/writing");
  usePageMeta(
    "Writing",
    "Published pieces on building systems that survive production, each opening with an incident that actually happened.",
  );

  const sorted = [...articles].sort((a, b) => (a.iso < b.iso ? 1 : -1));
  const byPublication = sorted.reduce<Record<string, number>>((acc, a) => {
    acc[a.publication] = (acc[a.publication] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <Masthead />
      <main id="content" className="min-h-[100dvh]">
      <div className="shell pt-16 sm:pt-20 lg:pt-12 pb-8 lg:pb-12">

        <h1
          className="font-semibold tracking-[-0.02em] mt-6"
          style={{ fontSize: "var(--fs-page)", color: "var(--c-text)" }}
        >
          Writing
        </h1>

        <p className="mt-3 text-[length:var(--fs-body)] leading-relaxed max-w-[34em]" style={{ color: "var(--c-text-dim)" }}>
          {sorted.length} pieces on building systems that survive production, published across{" "}
          {Object.keys(byPublication).length} outlets. Each one opens with an incident that actually
          happened.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <a
            href="/feed.xml"
            onClick={() => trackClick("feed_click", {})}
            className="mono text-[length:var(--fs-label)] uppercase tracking-[0.08em] px-3 min-h-[44px] inline-flex items-center"
            style={{ border: "1px solid var(--hair-strong)", background: "var(--surface-2)", color: "var(--c-text)" }}
          >
            RSS feed
          </a>
          <span className="mono text-[length:var(--fs-label)]" style={{ color: "var(--c-text-dim)" }}>
            no email needed
          </span>
        </div>

        <div className="mt-10 grid gap-px" style={{ background: "var(--hair)", border: "1px solid var(--hair)" }}>
          {sorted.map((a) => (
            <a
              key={a.id}
              href={a.url}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackClick("article_click", { title: a.title, publication: a.publication })}
              className="p-6 block min-w-0"
              style={{ background: "var(--surface)" }}
            >
              <div
                className="flex items-baseline justify-between gap-3 mono text-[length:var(--fs-label)]"
                style={{ color: "var(--c-text-dim)" }}
              >
                <span className="uppercase tracking-[0.07em] min-w-0 truncate">{a.publication}</span>
                <time dateTime={a.iso} className="tnum shrink-0" style={{ color: "var(--cool)" }}>
                  {a.date}
                </time>
              </div>
              <h2
                className="serif mt-2.5 leading-snug link-underline inline"
                style={{ fontSize: "var(--fs-item)", color: "var(--c-text)" }}
              >
                {a.title} ↗
              </h2>
              <p className="text-[length:var(--fs-body)] mt-2.5 leading-relaxed max-w-[46em]" style={{ color: "var(--c-text-dim)" }}>
                {a.summary}
              </p>
            </a>
          ))}
        </div>

        <p className="mt-10 mono text-[length:var(--fs-label)]" style={{ color: "var(--c-text-dim)" }}>
          {identity.name} · {identity.location}
        </p>
      </div>
    </main>
      <SiteFooter />
    </>
  );
}
