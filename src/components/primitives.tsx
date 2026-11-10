import { type CSSProperties, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Reveal } from "./Reveal";
import { SPRING } from "@/lib/motion";
import { identity } from "@/data/content";

export function Kicker({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("eyebrow", className)}>{children}</div>;
}

export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="sans text-t3 text-text-lo whitespace-nowrap">{children}</span>
  );
}

export function StatusDot({ label, tone = "ok" }: { label: string; tone?: "ok" | "warn" | "crit" }) {
  return (
    <span className="inline-flex items-center gap-8">
      <span
        aria-hidden
        className="inline-block shrink-0 rounded-full"
        style={{ width: 7, height: 7, background: `var(--${tone})` }}
      />
      <span className="sans text-t3 text-text-lo">{label}</span>
    </span>
  );
}

const NAV = [
  { to: "/", label: "Profile" },
  { to: "/learn", label: "Learn" },
  { to: "/build", label: "Build" },
  { to: "/writing", label: "Writing" },
];

export function Masthead() {
  const { pathname } = useLocation();
  const active = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));
  return (
    <header
      className="sticky top-0 z-50 pt-12 pb-12"
      style={{ background: "var(--base)" }}
    >
      <div className="shell">
        <div className="navpill h-[52px] px-24 flex items-center justify-between gap-16">
        <Link
          to="/"
          className="hidden sm:inline-flex sans text-t3 text-text-hi whitespace-nowrap min-h-[44px] items-center"
        >
          {identity.name}
        </Link>
        <nav aria-label="Pages" className="flex items-center gap-4 -mr-12">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active(item.to) ? "page" : undefined}
              className={cn(
                "sans text-t3 px-12 sm:px-16 min-h-[44px] rounded-full inline-flex items-center transition-colors duration-[120ms]",
                active(item.to) ? "bg-signal text-ink" : "text-text-lo hover:text-text-hi",
              )}
            >
              {item.label}
            </Link>
          ))}
          </nav>
        </div>
      </div>
    </header>
  );
}

export function PageHeader({
  title,
  standfirst,
  eyebrow,
  children,
}: {
  title: string;
  standfirst?: string;
  eyebrow?: string;
  children?: ReactNode;
}) {
  const short = title.trim().split(/\s+/).length <= 4;
  return (
    <div className="pt-32 md:pt-48 pb-40 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,420px)] md:gap-64 md:items-start">
      <div className="min-w-0">
        {eyebrow && (
          <span className="brow mb-12">
            <span className="brow-dot" aria-hidden />
            {eyebrow}
          </span>
        )}
        <h1
          className={short ? "pagetitle display" : "pagetitle"}
          data-display={short ? "" : undefined}
        >
          <Reveal text={title} by="word" stagger={90} config={SPRING.REVEAL} gap={0.18} />
        </h1>
      </div>
      <div>
        {standfirst && <p className="text-t2 text-text-mid mt-24 md:mt-0">{standfirst}</p>}
        {children && <div className="mt-24">{children}</div>}
      </div>
    </div>
  );
}

export function FilterBar({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="sticky z-40 flex flex-wrap border border-rule-1 rounded-lg px-8"
      style={{ top: "var(--masthead)", background: "var(--ink-1)" }}
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "sans text-t3 px-16 min-h-[44px] inline-flex items-center border-b-2 transition-colors duration-[120ms]",
            value === o.id
              ? "text-text-hi border-signal"
              : "text-text-lo border-transparent hover:text-text-hi",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Spine({
  id,
  title,
  action,
  children,
}: {
  id: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} style={{ scrollMarginTop: 72 }} className="relative">
      <div className="min-w-0">
        <div className="flex items-end justify-between gap-16 flex-wrap">
          <h2 tabIndex={-1} className="min-w-0">
            {title}
          </h2>
          {action}
        </div>
        <div className="mt-24">{children}</div>
      </div>
    </section>
  );
}

export function Plate({
  caption,
  bleed = true,
  asideCaption = false,
  fit = false,
  children,
}: {
  caption?: string;
  bleed?: boolean;
  asideCaption?: boolean;
  fit?: boolean;
  children: ReactNode;
}) {
  return (
    <figure
      className={cn(
        "relative",
        bleed && "xl:-mr-48 2xl:-mx-64",
        asideCaption &&
          "sm:grid sm:grid-cols-[auto_minmax(0,340px)] sm:gap-32 md:gap-48 sm:items-start sm:justify-start",
      )}
    >
      <div className={cn("min-w-0", fit && "w-fit")}>
        <div
          className={cn("border border-rule-1 rounded-lg overflow-hidden", fit && "w-fit")}
          style={{ background: "var(--plate)" }}
        >
          {children}
        </div>
      </div>
      {caption && (
        <figcaption
          className={cn(
            "serif italic text-t3 text-text-lo mt-12",
            asideCaption ? "sm:mt-0" : "measure",
          )}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

export function Record({
  meta,
  title,
  org,
  orgUrl,
  children,
  tags,
}: {
  meta: string;
  title: string;
  org?: string;
  orgUrl?: string;
  children?: ReactNode;
  tags?: string[];
}) {
  return (
    <article className="card card-accent sm:grid sm:grid-cols-[112px_minmax(0,1fr)] xl:grid-cols-[128px_minmax(0,1fr)_260px] sm:gap-24 md:gap-32 p-24 pl-32 mb-12">
      <div className="sans tnum text-t3 text-text-lo mb-8 sm:mb-0">{meta}</div>
      <div className="min-w-0">
        <h3>{title}</h3>
        {org && (
          <div className="sans text-t3 text-signal mt-4">
            {orgUrl ? (
              <a href={orgUrl} target="_blank" rel="noopener noreferrer" className="link-underline">
                {org}
              </a>
            ) : (
              org
            )}
          </div>
        )}
        {children && <div className="text-t3 text-text-mid mt-12 measure-wide">{children}</div>}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-8 mt-16 xl:hidden">
            {tags.slice(0, 6).map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </div>
        )}
      </div>
      {tags && tags.length > 0 && (
        <div className="hidden xl:flex flex-wrap content-start gap-8">
          {tags.slice(0, 6).map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </div>
      )}
    </article>
  );
}

export function IndexItem({
  kicker,
  title,
  href,
  to,
  summary,
  meta,
  tone,
}: {
  kicker?: string;
  title: string;
  href?: string;
  to?: string;
  summary?: string;
  meta?: ReactNode;
  tone?: string;
}) {
  const body = (
    <span className="sm:grid sm:grid-cols-[minmax(0,1fr)_180px] sm:gap-24 md:gap-40 sm:items-baseline">
      <span className="block min-w-0">
        {kicker && <span className="eyebrow block mb-8">{kicker}</span>}
        <h3 className="link-underline inline">{title}</h3>
        {summary && <span className="block text-t3 text-text-mid mt-12 measure-wide">{summary}</span>}
      </span>
      {meta && (
        <span className="block sans text-t3 text-text-lo mt-12 sm:mt-0 sm:text-right">{meta}</span>
      )}
    </span>
  );
  const shell = cn("group block card card-link p-24 h-full", tone && "card-accent pl-32");
  const style = tone ? ({ "--tone": tone } as CSSProperties) : undefined;
  if (to) {
    return (
      <Link to={to} className={shell} style={style}>
        {body}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={shell} style={style}>
      {body}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export function Ledger({
  items,
}: {
  items: { value: string; label: string; note?: string; source?: string }[];
}) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12">
      {items.map((item) => (
        <div key={item.label} className="card card-accent p-24 pl-32 flex flex-col">
          <dt className="sr-only">{item.label}</dt>
          <dd className="flex flex-col flex-1">
            <div className="sans tnum text-d3 text-text-hi">{item.value}</div>
            <div className="eyebrow mt-8">{item.label}</div>
            {item.note && <div className="text-t3 text-text-lo mt-8">{item.note}</div>}
            {item.source && (
              <details className="mt-8 md:mt-auto">
                <summary className="sans text-t3 text-signal cursor-pointer min-h-[44px] inline-flex items-center">
                  How this was measured
                </summary>
                <p className="text-t3 text-text-mid mt-8">{item.source}</p>
              </details>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function PrimaryAction({
  href,
  to,
  children,
}: {
  href?: string;
  to?: string;
  children: ReactNode;
}) {
  const cls =
    "press sans text-t3 font-semibold inline-flex items-center justify-center min-h-[44px] px-24 rounded-md transition-colors duration-[120ms]";
  const style = { background: "var(--accent)", color: "var(--ink)" } as const;
  if (to) {
    return (
      <Link to={to} className={cls} style={style}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={cls} style={style} target={href?.startsWith("http") ? "_blank" : undefined} rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}>
      {children}
    </a>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-rule-2 mt-128">
      <div className="shell py-32 grid gap-24 md:grid-cols-3 sans text-t3 text-text-lo">
        <div>
          <div className="eyebrow mb-8">Contact</div>
          <a href={`mailto:${identity.email}`} className="link-underline min-h-[44px] min-w-[44px] inline-flex items-center">
            {identity.email}
          </a>
        </div>
        <div>
          <div className="eyebrow mb-8">Elsewhere</div>
          <a
            href={identity.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="link-underline min-h-[44px] min-w-[44px] inline-flex items-center"
          >
            LinkedIn
          </a>
        </div>
        <div>
          <div className="eyebrow mb-8">Feed</div>
          <a href="/feed.xml" className="link-underline min-h-[44px] min-w-[44px] inline-flex items-center">
            RSS
          </a>
        </div>
      </div>
    </footer>
  );
}
