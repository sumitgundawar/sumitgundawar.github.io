import { IndexItem, Masthead, PageHeader, SiteFooter } from "./primitives";
import { articles } from "@/data/content";
import { failureModes } from "@/data/failures";
import { usePageDwell, usePageMeta, trackClick } from "@/lib/hooks";

const modeOf = new Map<string, { id: string; failure: string }>();
for (const mode of failureModes) {
  for (const id of mode.articleIds) {
    if (!modeOf.has(id)) modeOf.set(id, { id: mode.id, failure: mode.failure });
  }
}

export function WritingPage() {
  usePageDwell("/writing");
  usePageMeta(
    "Writing",
    "Published pieces on building systems that survive production, each opening with an incident that actually happened.",
  );

  const groups = failureModes
    .map((mode) => ({
      mode,
      items: articles
        .filter((a) => modeOf.get(a.id)?.id === mode.id)
        .sort((a, b) => (a.iso < b.iso ? 1 : -1)),
    }))
    .filter((g) => g.items.length > 0);

  const outlets = new Set(articles.map((a) => a.publication)).size;

  return (
    <>
      <Masthead />
      <main id="content" className="shell min-h-[100dvh]">
        <PageHeader
          title="Writing"
          standfirst={`${articles.length} published pieces across ${outlets} outlets, grouped by the failure they are about rather than by date. Each one opens with an incident that actually happened.`}
        >
          <a
            href="/feed.xml"
            onClick={() => trackClick("feed_click", {})}
            className="mono text-m2 text-accent link-underline min-h-[44px] min-w-[44px] inline-flex items-center"
          >
            RSS, no email needed
          </a>
        </PageHeader>

        <div className="grid gap-64 md:gap-96 pb-96">
          {groups.map(({ mode, items }) => (
            <section key={mode.id}>
              <div className="md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,420px)] md:gap-64 md:items-baseline">
                <h2>{mode.failure}</h2>
                <p className="text-t3 text-text-lo mt-12 md:mt-0">{mode.because}</p>
              </div>
              <div className="mt-32">
                {items.map((a) => (
                  <IndexItem
                    key={a.id}
                    kicker={`${a.publication} / ${a.date}`}
                    title={a.title}
                    href={a.url}
                    summary={a.summary}
                    meta={a.framework ? `Framework: ${a.framework}` : undefined}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
