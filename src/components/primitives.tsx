import { type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { identity } from "@/data/content";

export function Kicker({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("eyebrow", className)}>{children}</div>;
}

export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="mono text-m3 uppercase text-text-lo border border-rule-2 px-8 py-4 whitespace-nowrap">
      {children}
    </span>
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
      <span className="mono text-m3 uppercase text-text-lo">{label}</span>
    </span>
  );
}

const NAV = [
  { to: "/", label: "profile" },
  { to: "/learn", label: "learn" },
  { to: "/build", label: "build" },
  { to: "/writing", label: "writing" },
];

export function Masthead() {
  const { pathname } = useLocation();
  const active = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));
  return (
    <header
      className="sticky top-0 z-50 border-b border-rule-2"
      style={{ background: "var(--ink-2)", height: "var(--masthead)" }}
    >
      <div className="shell h-full flex items-center justify-between gap-16">
        <Link
          to="/"
          className="hidden sm:inline-flex mono text-m3 uppercase text-text-hi whitespace-nowrap min-h-[44px] items-center"
        >
          {identity.name}
        </Link>
        <nav aria-label="Pages" className="flex items-center -ml-12 sm:ml-0 -mr-12 sm:-mr-8">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active(item.to) ? "page" : undefined}
              className={cn(
                "mono text-m2 px-12 min-h-[44px] inline-flex items-center border-b-2 transition-colors duration-[120ms]",
                active(item.to)
                  ? "text-text-hi border-accent"
                  : "text-text-lo border-transparent hover:text-text-hi",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function PageHeader({
  title,
  standfirst,
  children,
}: {
  title: string;
  standfirst?: string;
  children?: ReactNode;
}) {
  return (
    <div className="pt-48 md:pt-64 pb-48">
      <h1 className="text-d2 measure">{title}</h1>
      {standfirst && <p className="text-t2 text-text-mid mt-24 measure">{standfirst}</p>}
      {children && <div className="mt-24">{children}</div>}
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
      className="sticky z-40 flex flex-wrap border-b border-rule-2 -mx-[var(--pad)] px-[var(--pad)]"
      style={{ top: "var(--masthead)", background: "var(--ink-2)" }}
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "mono text-m2 px-16 min-h-[44px] inline-flex items-center border-b-2 transition-colors duration-[120ms]",
            value === o.id
              ? "text-text-hi border-accent"
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
  n,
  id,
  title,
  action,
  children,
}: {
  n: number;
  id: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} style={{ scrollMarginTop: 72 }} className="relative">
      <div className="md:grid md:grid-cols-[var(--spine)_minmax(0,1fr)]">
        <div aria-hidden className="hidden md:block relative">
          <span className="mono text-m3 text-accent absolute left-0 top-4">
            {String(n).padStart(2, "0")}
          </span>
        </div>
        <div className="min-w-0">
          <div className="flex items-end justify-between gap-16 flex-wrap">
            <h2 tabIndex={-1} className="min-w-0">
              <span className="md:hidden mono text-m3 text-accent block mb-8">
                {String(n).padStart(2, "0")}
              </span>
              {title}
            </h2>
            {action}
          </div>
          <div className="md:hidden mt-12 h-px w-24" style={{ background: "var(--accent)" }} />
          <div className="mt-24">{children}</div>
        </div>
      </div>
    </section>
  );
}

export function Plate({
  n,
  caption,
  bleed = true,
  children,
}: {
  n?: number;
  caption?: string;
  bleed?: boolean;
  children: ReactNode;
}) {
  return (
    <figure className={cn("relative", bleed && "xl:-mr-48 2xl:-mx-64")}>
      {n !== undefined && n > 0 && (
        <figcaption className="mono text-m3 uppercase text-text-lo mb-8">
          pl. {String(n).padStart(2, "0")}
        </figcaption>
      )}
      <div
        className="relative border border-rule-2"
        style={{ background: "var(--plate)" }}
      >
        <Registration />
        {children}
      </div>
      {caption && (
        <figcaption className="serif italic text-t3 text-text-lo mt-12 measure-46">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

function Registration() {
  const mark = "absolute w-8 h-8 pointer-events-none";
  const stroke = { borderColor: "var(--accent)" } as const;
  return (
    <span aria-hidden>
      <span className={cn(mark, "left-0 top-0 border-l border-t")} style={stroke} />
      <span className={cn(mark, "right-0 top-0 border-r border-t")} style={stroke} />
      <span className={cn(mark, "left-0 bottom-0 border-l border-b")} style={stroke} />
      <span className={cn(mark, "right-0 bottom-0 border-r border-b")} style={stroke} />
    </span>
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
    <article className="md:grid md:grid-cols-[96px_minmax(0,1fr)] md:gap-24 py-24 border-t border-rule-2 first:border-t-0 first:pt-0">
      <div className="mono text-m2 tnum text-text-lo mb-8 md:mb-0">{meta}</div>
      <div className="min-w-0">
        <h3>{title}</h3>
        {org && (
          <div className="mono text-m2 text-accent mt-4">
            {orgUrl ? (
              <a href={orgUrl} target="_blank" rel="noopener noreferrer" className="link-underline">
                {org}
              </a>
            ) : (
              org
            )}
          </div>
        )}
        {children && <div className="text-t3 text-text-mid mt-12 measure-46">{children}</div>}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-8 mt-16">
            {tags.slice(0, 6).map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </div>
        )}
      </div>
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
}: {
  kicker?: string;
  title: string;
  href?: string;
  to?: string;
  summary?: string;
  meta?: ReactNode;
}) {
  const body = (
    <span className="xl:grid xl:grid-cols-[minmax(0,1fr)_164px] xl:gap-40 xl:items-baseline">
      <span className="block min-w-0">
        {kicker && <span className="eyebrow block mb-8">{kicker}</span>}
        <h3 className="link-underline inline">{title}</h3>
        {summary && <span className="block text-t3 text-text-mid mt-12 measure-46">{summary}</span>}
      </span>
      {meta && (
        <span className="block mono text-m2 text-text-lo mt-12 xl:mt-0 xl:text-right">{meta}</span>
      )}
    </span>
  );
  const shell =
    "group block py-24 border-t border-rule-2 first:border-t-0 first:pt-0 transition-colors duration-[120ms] hover:bg-ink-1";
  if (to) {
    return (
      <Link to={to} className={shell}>
        {body}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={shell}>
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
    <dl className="grid grid-cols-2 md:grid-cols-4 border-t border-l border-rule-2">
      {items.map((item) => (
        <div key={item.label} className="border-b border-r border-rule-2 p-16">
          <dt className="sr-only">{item.label}</dt>
          <dd>
            <div className="serif tnum text-d3 text-text-hi">{item.value}</div>
            <div className="eyebrow mt-8">{item.label}</div>
            {item.note && <div className="text-t3 text-text-lo mt-8">{item.note}</div>}
            {item.source && (
              <details className="mt-8">
                <summary className="mono text-m3 uppercase text-accent cursor-pointer min-h-[44px] inline-flex items-center">
                  how this was measured
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
    "press mono text-m2 uppercase inline-flex items-center justify-center min-h-[44px] px-24 transition-colors duration-[120ms]";
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
      <div className="shell py-32 grid gap-24 md:grid-cols-3 mono text-m2 text-text-lo">
        <div>
          <div className="eyebrow mb-8">contact</div>
          <a href={`mailto:${identity.email}`} className="link-underline min-h-[44px] min-w-[44px] inline-flex items-center">
            {identity.email}
          </a>
        </div>
        <div>
          <div className="eyebrow mb-8">elsewhere</div>
          <a
            href={identity.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="link-underline min-h-[44px] min-w-[44px] inline-flex items-center"
          >
            linkedin
          </a>
        </div>
        <div>
          <div className="eyebrow mb-8">feed</div>
          <a href="/feed.xml" className="link-underline min-h-[44px] min-w-[44px] inline-flex items-center">
            rss
          </a>
        </div>
      </div>
    </footer>
  );
}
