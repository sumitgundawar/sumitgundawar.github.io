import { useEffect, useState } from "react";
import { Masthead, SiteFooter } from "./primitives";
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
      <p className="mt-10 mono text-[length:var(--fs-label)]" style={{ color: "var(--c-text-dim)" }}>
        loading
      </p>
    );
  }

  if (state === "missing" || !issue) {
    return (
      <div className="mt-10">
        <p className="text-[length:var(--fs-body)]" style={{ color: "var(--c-text)" }}>
          No issue with that address.
        </p>
        <Link to="/archive" className="mt-3 inline-flex mono text-[length:var(--fs-label)] link-underline" style={{ color: "var(--accent-2)" }}>
          see every issue
        </Link>
      </div>
    );
  }

  return (
    <article className="mt-9 max-w-[38em]">
      <p className="mono text-[length:var(--fs-label)] uppercase tracking-[0.08em]" style={{ color: "var(--accent-2)" }}>
        {formatDate(issue.sent_at)}
      </p>
      <h1 className="mt-3 font-semibold leading-[1.1] tracking-[-0.02em]" style={{ fontSize: "var(--fs-page)", color: "var(--c-text)" }}>
        {issue.subject}
      </h1>

      <div className="mt-7 flex flex-col gap-4">
        {readable(issue).map((p, i) => (
          <p key={i} className="text-[length:var(--fs-body)] leading-[1.7]" style={{ color: "var(--c-text)" }}>
            {p}
          </p>
        ))}
      </div>

      <a
        href={`${API}/api/newsletter/${encodeURIComponent(issue.slug)}?format=html`}
        className="mt-7 inline-flex mono text-[length:var(--fs-label)] link-underline"
        style={{ color: "var(--c-text-dim)" }}
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
      <h1 className="mt-6 font-semibold tracking-[-0.02em]" style={{ fontSize: "var(--fs-page)", color: "var(--c-text)" }}>
        Newsletter archive
      </h1>
      <p className="mt-3 text-[length:var(--fs-body)] leading-relaxed max-w-[34em]" style={{ color: "var(--c-text-dim)" }}>
        Every issue, in full, without subscribing. If you want to know what arrives before you hand
        over an address, this is the honest version of that answer.
      </p>

      {issues === null && (
        <p className="mt-8 mono text-[length:var(--fs-label)]" style={{ color: "var(--c-text-dim)" }}>
          loading
        </p>
      )}

      {issues?.length === 0 && (
        <p className="mt-8 text-[length:var(--fs-body)] leading-relaxed max-w-[34em]" style={{ color: "var(--c-text-dim)" }}>
          Nothing sent yet. The first issue will appear here the day it goes out, which is also the
          reason there is no schedule attached to it.
        </p>
      )}

      {issues && issues.length > 0 && (
        <ul className="mt-8 flex flex-col">
          {issues.map((issue) => (
            <li key={issue.slug} className="border-t py-4" style={{ borderColor: "var(--hair)" }}>
              <Link to={`/archive/${issue.slug}`} className="group flex flex-col gap-1">
                <span className="mono text-[length:var(--fs-label)] tnum" style={{ color: "var(--c-text-dim)" }}>
                  {formatDate(issue.sent_at)}
                </span>
                <span className="text-[length:var(--fs-item)] link-underline" style={{ color: "var(--c-text)" }}>
                  {issue.subject}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-12 max-w-[34em]">
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
