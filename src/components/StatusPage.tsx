import { useEffect, useState, type ElementType, type ReactNode } from "react";
import { HealthDot, Eyebrow, Tag } from "./primitives";
import { useReveal, useNow } from "@/lib/hooks";
import {
  identity,
  timeline,
  education,
  services,
  allProducts,
  articles,
  speaking,
  recognition,
  kpis,
} from "@/data/content";

const GITHUB = "https://github.com/sumitgundawar";

/* ---------- helpers ---------- */

function Reveal({
  as: As = "section",
  className = "",
  children,
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  const ref = useReveal<HTMLElement>();
  return (
    <As ref={ref} className={`reveal ${className}`}>
      {children}
    </As>
  );
}

function SectionHead({ label, right }: { label: string; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-7">
      <span aria-hidden className="inline-block shrink-0" style={{ width: 7, height: 7, background: "var(--cool)" }} />
      <h2
        className="mono uppercase font-semibold shrink-0"
        style={{ fontSize: "15px", letterSpacing: "0.13em", color: "var(--c-text)" }}
      >
        {label}
      </h2>
      <span className="h-px flex-1" style={{ background: "var(--hair)" }} />
      {right}
    </div>
  );
}

/* ---------- page ---------- */

export function StatusPage() {
  return (
    <div className="min-h-[100dvh]">
      <div className="mx-auto w-full max-w-[1280px] px-5 sm:px-8 lg:px-10 py-8 lg:py-12">
        <div className="grid lg:grid-cols-[360px_minmax(0,1fr)] gap-10 lg:gap-16 items-start">
          <Sidebar />
          <div className="min-w-0">
            <Lead />
            <Profile />
            <Work />
            <Writing />
            <SpeakingRecognition />
            <Education />
            <Footer />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- sidebar (identity + impact + contact) ---------- */

function Sidebar() {
  const channels = [
    { label: "Email", value: identity.email, href: `mailto:${identity.email}` },
    { label: "LinkedIn", value: identity.linkedinLabel, href: identity.linkedin },
    { label: "GitHub", value: "github.com/sumitgundawar", href: GITHUB },
    { label: "Work", value: "github.com/sumitbdv", href: "https://github.com/sumitbdv" },
  ];

  return (
    <aside className="lg:sticky lg:top-10 self-start flex flex-col gap-7">
      <figure
        className="border border-hair overflow-hidden w-full"
        style={{ aspectRatio: "1 / 1", maxWidth: 360, background: "var(--surface-2)" }}
      >
        <img
          src="/sumit-gundawar.png"
          alt="Sumit Gundawar"
          className="w-full h-full object-cover"
          style={{ objectPosition: "50% 16%" }}
        />
      </figure>

      <div>
        <div className="flex items-center gap-2.5 mb-4">
          <HealthDot health="ok" pulse size={9} />
          <span className="mono text-[13px]" style={{ color: "var(--c-text)" }}>
            Shipping in production
          </span>
          <span className="mono text-[11px] uppercase tracking-[0.08em] ml-auto" style={{ color: "var(--signal)" }}>
            {identity.status}
          </span>
        </div>
        <h1
          className="font-semibold leading-[1.0] tracking-[-0.02em]"
          style={{ fontSize: "clamp(30px, 4vw, 40px)", color: "var(--c-text)" }}
        >
          {identity.name}
        </h1>
        <p className="mono text-[14px] mt-3 leading-relaxed" style={{ color: "var(--c-text-dim)" }}>
          {identity.title}
          <br />
          {identity.location}
        </p>
      </div>

      {/* KPIs */}
      <div>
        <Eyebrow className="mb-3" >impact</Eyebrow>
        <div className="grid grid-cols-2 gap-px" style={{ background: "var(--hair)", border: "1px solid var(--hair)" }}>
          {kpis.map((k) => (
            <div key={k.label} className="p-4" style={{ background: "var(--surface)" }}>
              <div
                className="font-semibold tnum leading-none tracking-[-0.02em]"
                style={{ fontSize: "clamp(26px, 3.4vw, 34px)", color: "var(--c-text)" }}
              >
                {k.value}
              </div>
              <div className="mono text-[11.5px] uppercase tracking-[0.06em] mt-2" style={{ color: "var(--c-text)" }}>
                {k.label}
              </div>
              <div className="text-[12.5px] mt-1 leading-snug" style={{ color: "var(--c-text-dim)" }}>
                {k.note}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* contact */}
      <div>
        <Eyebrow className="mb-2">contact</Eyebrow>
        <div className="flex flex-col">
          {channels.map((c) => (
            <a
              key={c.label}
              href={c.href}
              target={c.href.startsWith("http") ? "_blank" : undefined}
              rel={c.href.startsWith("http") ? "noreferrer" : undefined}
              className="flex items-center gap-2.5 py-2.5 border-t border-hair group"
            >
              <HealthDot health="ok" size={6} />
              <span className="eyebrow w-[58px] shrink-0">{c.label}</span>
              <span className="mono text-[13px] truncate flex-1 link-underline" style={{ color: "var(--c-text)" }}>
                {c.value}
              </span>
              <span className="mono text-[12px]" style={{ color: "var(--cool)" }}>↗</span>
            </a>
          ))}
        </div>
        <p className="text-[14px] mt-4 leading-relaxed" style={{ color: "var(--c-text-dim)" }}>
          {identity.availability}
        </p>
      </div>
    </aside>
  );
}

/* ---------- lead ---------- */

function Lead() {
  return (
    <header className="reveal in">
      <p
        className="font-medium leading-[1.12] tracking-[-0.015em] max-w-[20ch] sm:max-w-none"
        style={{ fontSize: "clamp(26px, 3.6vw, 44px)", color: "var(--c-text)" }}
      >
        An engineer who builds systems that stay up: AI systems, data pipelines,
        and full-stack platforms in production.
      </p>
      <p className="mt-5 text-[17px] leading-relaxed max-w-[64ch]" style={{ color: "var(--c-text-dim)" }}>
        {identity.bio}
      </p>
    </header>
  );
}

/* ---------- profile rows ---------- */

function Profile() {
  return (
    <Reveal className="mt-16">
      <SectionHead label="experience" />
      <div>
        {timeline.map((r, i) => (
          <div
            key={r.key}
            className={`grid sm:grid-cols-[120px_1fr_auto] gap-x-6 gap-y-2 py-6 ${i === 0 ? "" : "border-t border-hair"}`}
          >
            <div className="flex items-center gap-2 sm:pt-1">
              <HealthDot health={r.health} size={7} />
              <span className="eyebrow" style={{ fontSize: 12 }}>{r.label}</span>
            </div>
            <div className="min-w-0">
              <div className="text-[18px] font-medium leading-snug" style={{ color: "var(--c-text)" }}>
                {r.title}
              </div>
              <p className="text-[15.5px] mt-1.5 leading-relaxed max-w-[60ch]" style={{ color: "var(--c-text-dim)" }}>
                {r.line}
              </p>
              {r.tags && (
                <div className="flex flex-wrap gap-1.5 mt-3.5">
                  {r.tags.map((t) => (
                    <Tag key={t}>{t}</Tag>
                  ))}
                </div>
              )}
            </div>
            <div className="mono text-[13px] sm:text-right tnum" style={{ color: "var(--c-text-dim)" }}>
              {r.dates}
            </div>
          </div>
        ))}
      </div>
    </Reveal>
  );
}

/* ---------- work (2-col grid, with links) ---------- */

function Work() {
  const [open, setOpen] = useState(false);
  return (
    <Reveal className="mt-16">
      {open && <ProductsModal onClose={() => setOpen(false)} />}
      <SectionHead
        label="selected work"
        right={
          <button onClick={() => setOpen(true)} className="mono text-[12px] link-underline" style={{ color: "var(--c-text-dim)" }}>
            13+ shipped — view all ↗
          </button>
        }
      />
      <div className="grid sm:grid-cols-2 gap-px" style={{ background: "var(--hair)", border: "1px solid var(--hair)" }}>
        {services.map((s, i) => (
          <div key={s.id} className="p-5 flex flex-col" style={{ background: "var(--surface)" }}>
            <div className="flex items-baseline gap-2.5 mb-2">
              <span className="mono text-[12px] tnum" style={{ color: "var(--cool)" }}>{String(i + 1).padStart(2, "0")}</span>
              <HealthDot health={s.health} size={6} />
              {s.url ? (
                <a href={s.url} target="_blank" rel="noreferrer" className="text-[17px] font-medium link-underline" style={{ color: "var(--c-text)" }}>
                  {s.name}
                </a>
              ) : (
                <h3 className="text-[17px] font-medium" style={{ color: "var(--c-text)" }}>{s.name}</h3>
              )}
            </div>
            <p className="text-[15px] leading-relaxed flex-1" style={{ color: "var(--c-text-dim)" }}>
              {s.slo}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 mt-4">
              {s.stack.map((t) => (
                <Tag key={t}>{t}</Tag>
              ))}
            </div>
            {s.url && (
              <a href={s.url} target="_blank" rel="noreferrer" className="mono text-[12px] mt-3 link-underline self-start" style={{ color: "var(--cool)" }}>
                {s.urlLabel} ↗
              </a>
            )}
          </div>
        ))}
      </div>
    </Reveal>
  );
}

/* ---------- writing + speaking + recognition ---------- */

function Writing() {
  return (
    <Reveal className="mt-16">
      <div id="writing" style={{ scrollMarginTop: 24 }}>
        <SectionHead
          label="writing"
          right={
            <a href={"https://dataconomy.com/author/sumit-gundawar/"} target="_blank" rel="noreferrer" className="mono text-[12px] link-underline" style={{ color: "var(--c-text-dim)" }}>
              author archive ↗
            </a>
          }
        />
        <div>
          {articles.map((a, i) => (
            <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className={`block py-6 group ${i === 0 ? "" : "border-t border-hair"}`}>
              <div className="flex items-baseline justify-between gap-4 mono text-[12px]" style={{ color: "var(--c-text-dim)" }}>
                <span className="uppercase tracking-[0.07em]">{a.publication}</span>
                <span className="tnum shrink-0">{a.date}</span>
              </div>
              <h3
                className="serif mt-2 leading-snug link-underline inline"
                style={{ fontSize: "clamp(21px, 2.8vw, 28px)", color: "var(--c-text)" }}
              >
                {a.title}
              </h3>
              <p className="text-[16px] mt-2.5 leading-relaxed max-w-[64ch]" style={{ color: "var(--c-text-dim)" }}>
                {a.summary}
              </p>
            </a>
          ))}
        </div>
      </div>
    </Reveal>
  );
}

/* ---------- speaking + recognition (prominent) ---------- */

function SpeakingRecognition() {
  return (
    <Reveal className="mt-16">
      <SectionHead label="speaking & recognition" />
      <div className="grid sm:grid-cols-2 gap-px" style={{ background: "var(--hair)", border: "1px solid var(--hair)" }}>
        <div className="p-6" style={{ background: "var(--surface)" }}>
          <Eyebrow className="mb-5">speaking</Eyebrow>
          {speaking.map((t, i) => (
            <div key={t.venue} className={`py-4 ${i === 0 ? "" : "border-t border-hair"}`}>
              <div className="flex items-baseline gap-3 flex-wrap">
                {t.url ? (
                  <a href={t.url} target="_blank" rel="noreferrer" className="text-[17px] font-medium link-underline" style={{ color: "var(--c-text)" }}>
                    {t.venue} ↗
                  </a>
                ) : (
                  <span className="text-[17px] font-medium" style={{ color: "var(--c-text)" }}>{t.venue}</span>
                )}
                <span className="mono text-[12.5px] tnum" style={{ color: "var(--cool)" }}>{t.when}</span>
                {t.placeholder && <span className="mono text-[10.5px] border border-hair px-1.5 py-0.5" style={{ color: "var(--warn)" }}>tbc</span>}
              </div>
              <p className="text-[15px] mt-1.5 leading-snug" style={{ color: "var(--c-text-dim)" }}>{t.title}</p>
            </div>
          ))}
        </div>

        <div className="p-6" style={{ background: "var(--surface)" }}>
          <Eyebrow className="mb-5">recognition</Eyebrow>
          {recognition.map((r, i) => (
            <div key={r.org} className={`py-4 ${i === 0 ? "" : "border-t border-hair"}`}>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-[17px] font-medium" style={{ color: "var(--c-text)" }}>{r.role}</span>
                <a href={r.url} target="_blank" rel="noreferrer" className="text-[15px] link-underline" style={{ color: "var(--cool)" }}>{r.org} ↗</a>
                <span className="mono text-[12.5px] tnum" style={{ color: "var(--cool)" }}>{r.when}</span>
              </div>
              {r.extraUrl && (
                <p className="text-[14.5px] mt-1.5" style={{ color: "var(--c-text-dim)" }}>
                  <a href={r.extraUrl} target="_blank" rel="noreferrer" className="link-underline" style={{ color: "var(--c-text-dim)" }}>{r.extraLabel} ↗</a>
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </Reveal>
  );
}

/* ---------- products modal ---------- */

function ProductsModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const orgs = Array.from(new Set(allProducts.map((p) => p.org)));

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto py-[8vh] px-4"
      style={{ background: "rgb(0 0 0 / 0.6)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="All shipped products"
    >
      <div
        className="panel rounded-[3px] w-full max-w-[640px]"
        style={{ background: "var(--surface)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-hair">
          <div className="flex items-center gap-2.5">
            <HealthDot health="ok" size={8} />
            <span className="mono text-[13px]" style={{ color: "var(--c-text)" }}>
              13+ shipped products
            </span>
          </div>
          <button onClick={onClose} className="mono text-[12px] border border-hair px-2 py-1 rounded-sm" style={{ color: "var(--c-text-dim)" }}>
            esc
          </button>
        </div>

        <div className="max-h-[64vh] overflow-y-auto">
          {orgs.map((org) => (
            <div key={org}>
              <div className="px-5 pt-4 pb-1">
                <Eyebrow>{org}</Eyebrow>
              </div>
              {allProducts.filter((p) => p.org === org).map((p) => (
                <div key={p.name} className="px-5 py-3 border-t border-hair">
                  <div className="flex items-baseline gap-2.5">
                    <HealthDot health="ok" size={6} />
                    {p.url ? (
                      <a href={p.url} target="_blank" rel="noreferrer" className="text-[15px] font-medium link-underline" style={{ color: "var(--c-text)" }}>
                        {p.name} ↗
                      </a>
                    ) : (
                      <span className="text-[15px] font-medium" style={{ color: "var(--c-text)" }}>{p.name}</span>
                    )}
                  </div>
                  <p className="text-[13.5px] mt-1 leading-relaxed" style={{ color: "var(--c-text-dim)" }}>{p.line}</p>
                </div>
              ))}
            </div>
          ))}
          <p className="px-5 py-4 border-t border-hair mono text-[11.5px]" style={{ color: "var(--c-text-dim)" }}>
            A selection. Several internal tools are not listed here.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------- education ---------- */

function Education() {
  return (
    <Reveal className="mt-16">
      <SectionHead label="education" />
      <div>
        {education.map((e, i) => (
          <div
            key={e.school}
            className={`grid sm:grid-cols-[1fr_auto] gap-x-6 gap-y-1 py-6 ${i === 0 ? "" : "border-t border-hair"}`}
          >
            <div className="min-w-0">
              <div className="text-[18px] font-medium leading-snug" style={{ color: "var(--c-text)" }}>{e.degree}</div>
              <div className="mono text-[13px] mt-1" style={{ color: "var(--cool)" }}>{e.school}</div>
              <p className="text-[15px] mt-2 leading-relaxed max-w-[62ch]" style={{ color: "var(--c-text-dim)" }}>{e.detail}</p>
              {e.tags && (
                <div className="flex flex-wrap gap-1.5 mt-3.5">
                  {e.tags.map((t) => (
                    <Tag key={t}>{t}</Tag>
                  ))}
                </div>
              )}
            </div>
            <div className="mono text-[13px] sm:text-right tnum shrink-0" style={{ color: "var(--c-text-dim)" }}>
              {e.dates}
              <div className="mt-0.5" style={{ color: "var(--c-text-dim)", opacity: 0.7 }}>{e.place}</div>
            </div>
          </div>
        ))}
      </div>
    </Reveal>
  );
}

/* ---------- footer ---------- */

function Footer() {
  const now = useNow(1000);
  const london = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);
  return (
    <footer className="mt-16 pt-5 border-t border-hair flex items-center justify-between mono text-[12px]" style={{ color: "var(--c-text-dim)" }}>
      <span>© {identity.name}</span>
      <span className="tnum">London · {london}</span>
    </footer>
  );
}
