import { useEffect, useState } from "react";
import { IndexItem, Masthead, SiteFooter } from "./primitives";
import { Link, useParams } from "react-router-dom";
import { usePageDwell, usePageMeta } from "@/lib/hooks";
import { API, listIssues, readIssue, type Issue, type IssueSummary } from "@/lib/api";
import { Newsletter } from "./Newsletter";

function formatDate(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function paragraphs(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function readable(issue: Issue): string[] {
  const source = issue.text?.trim()
    ? issue.text
    : issue.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const cut = source.search(/unsubscribe|you are receiving this/i);
  return paragraphs(cut > 200 ? source.slice(0, cut) : source);
}

function IssueView({ slug }: { slug: string }) {
  const [issue, setIssue] = useState<Issue | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    let live = true;
    void readIssue(slug).then((found) => {
      if (!live) return;
      setIssue(found);
      setState(found ? "ready" : "missing");
    });
    return () => {
      live = false;
    };
  }, [slug]);

  usePageMeta(
    issue ? issue.subject : "Newsletter archive",
    issue ? `Newsletter issue sent on ${formatDate(issue.sent_at)}.` : "Past issues of the newsletter.",
  );

  if (state === "loading") {
    return (
      <p className="mt-10 mono text-m2" style={{ color: "var(--text-mid)" }}>
        loading
      </p>
    );
  }

  if (state === "missing" || !issue) {
    return (
      <div className="mt-10">
        <p className="text-t2" style={{ color: "var(--text-hi)" }}>
          No issue with that address.
        </p>
        <Link to="/archive" className="mt-3 inline-flex mono text-m2 link-underline" style={{ color: "var(--accent)" }}>
          see every issue
        </Link>
      </div>
    );
  }

  return (
    <article className="mt-48 measure">
      <p className="mono text-m2 uppercase tracking-[0.08em]" style={{ color: "var(--accent)" }}>
        {formatDate(issue.sent_at)}
      </p>
      <h1 className="text-d2 mt-12 measure">
        {issue.subject}
      </h1>

      <div className="mt-7 flex flex-col gap-4">
        {readable(issue).map((p, i) => (
          <p key={i} className="text-t2 leading-[1.7]" style={{ color: "var(--text-hi)" }}>
            {p}
          </p>
        ))}
      </div>

      <a
        href={`${API}/api/newsletter/${encodeURIComponent(issue.slug)}?format=html`}
        className="mt-7 inline-flex mono text-m2 link-underline"
        style={{ color: "var(--text-mid)" }}
      >
        view the email as it was sent
      </a>
    </article>
  );
}

function IssueList() {
  const [issues, setIssues] = useState<IssueSummary[] | null>(null);

  useEffect(() => {
    let live = true;
    void listIssues().then((found) => {
      if (live) setIssues(found);
    });
    return () => {
      live = false;
    };
  }, []);

  usePageMeta(
    "Newsletter archive",
    "Every issue of the newsletter, readable in full without subscribing.",
  );

  return (
    <>
      <h1 className="text-d2 mt-24 measure">
        Newsletter archive
      </h1>
      <p className="mt-3 text-t2 leading-relaxed max-w-[34em]" style={{ color: "var(--text-mid)" }}>
        Every issue, in full, without subscribing. If you want to know what arrives before you hand
        over an address, this is the honest version of that answer.
      </p>

      {issues === null && (
        <p className="mt-8 mono text-m2" style={{ color: "var(--text-mid)" }}>
          loading
        </p>
      )}

      {issues?.length === 0 && (
        <p className="mt-8 text-t2 leading-relaxed max-w-[34em]" style={{ color: "var(--text-mid)" }}>
          Nothing sent yet. The first issue will appear here the day it goes out, which is also the
          reason there is no schedule attached to it.
        </p>
      )}

      {issues && issues.length > 0 && (
        <div className="mt-32">
          {issues.map((issue) => (
            <IndexItem
              key={issue.slug}
              kicker={formatDate(issue.sent_at)}
              title={issue.subject}
              to={`/archive/${issue.slug}`}
            />
          ))}
        </div>
      )}

      <div className="mt-64 measure-46">
        <Newsletter />
      </div>
    </>
  );
}

export function ArchivePage() {
  const { slug } = useParams();
  usePageDwell(slug ? `/archive/${slug}` : "/archive");

  return (
    <>
      <Masthead />
      <main id="content" className="min-h-[100dvh]">
      <div className="shell pt-16 sm:pt-20 lg:pt-12 pb-16">
        {slug && (
          <Link
            to="/archive"
            className="mono text-m2 text-accent link-underline inline-flex items-center min-h-[44px]"
          >
            &#8592; every issue
          </Link>
        )}

        {slug ? <IssueView slug={slug} /> : <IssueList />}
      </div>
    </main>
      <SiteFooter />
    </>
  );
}
