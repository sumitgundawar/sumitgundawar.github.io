import { useEffect, useState, type ElementType, type ReactNode } from "react";
import { HealthDot, Eyebrow, Tag } from "./primitives";
import { useReveal, useNow, trackClick } from "@/lib/hooks";
import { Link } from "react-router-dom";
import { Newsletter } from "./Newsletter";
import {
  identity,
  timeline,
  education,
  services,
  allProducts,
  articles,
  podcasts,
  speaking,
  recognition,
  kpis,
} from "@/data/content";

const GITHUB = "https://github.com/sumitgundawar";

/* ---------- helpers ---------- */

export function Reveal({
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

export function SectionHead({ label, right }: { label: string; right?: ReactNode }) {
  return (
    <div className="flex items-center flex-wrap gap-3 mb-7">
      <span aria-hidden className="inline-block shrink-0" style={{ width: 7, height: 7, background: "var(--cool)" }} />
      <h2
        className="mono uppercase font-semibold"
        style={{ fontSize: "var(--fs-label)", letterSpacing: "0.14em", color: "var(--c-text-dim)" }}
      >
        {label}
      </h2>
      <span className="h-px flex-1 min-w-8" style={{ background: "var(--hair)" }} />
      {right}
    </div>
  );
}

/* ---------- page ---------- */

export function StatusPage() {
  return (
    <div className="min-h-[100dvh]">
      <CornerNav />
      {/* The nav is fixed, so it is out of flow and lands on top of whatever is
          beneath it. It occupies y=12..56 on phones and y=20..64 from sm up,
          while content began at 32px, so the CTAs sat over the status line on
          mobile and over the lead paragraph on desktop. Clear it explicitly.
          Below lg the nav spans most of the width and the whole page must start
          under it; at lg it is only top-right, so the left column is unaffected
          and just the content column needs the offset. */}
      <div className="mx-auto w-full max-w-[1280px] px-5 sm:px-8 lg:px-10 pt-16 sm:pt-20 lg:pt-12 pb-8 lg:pb-12">
        <div className="grid lg:grid-cols-[360px_minmax(0,1fr)] gap-10 lg:gap-16 items-start">
          <Sidebar />
          <main id="content" className="min-w-0 lg:pt-6">
            <Lead />
            <Profile />
            <Work />
            <Writing />
            <Podcasts />
            <SpeakingRecognition />
            <Education />
            <Newsletter />
            <Footer />
          </main>
        </div>
      </div>
    </div>
  );
}

/* ---------- sidebar (identity + impact + contact) ---------- */

function Sidebar() {
  const channels: { label: string; value: string; href: string; download?: boolean }[] = [
    { label: "Email", value: identity.email, href: `mailto:${identity.email}` },
    { label: "LinkedIn", value: identity.linkedinLabel, href: identity.linkedin },
    { label: "GitHub", value: "github.com/sumitgundawar", href: GITHUB },
    { label: "Work", value: "github.com/sumitbdv", href: "https://github.com/sumitbdv" },
    { label: "CV", value: "Download PDF", href: "/uploads/Sumit_Gundawar_CV.pdf", download: true },
  ];

  return (
    <aside className="min-w-0 lg:sticky lg:top-10 self-start grid md:grid-cols-2 lg:grid-cols-1 gap-7 md:gap-x-8 items-start">
      <figure
        className="relative border border-hair overflow-hidden order-2 md:order-none max-w-[200px] sm:max-w-[260px] md:max-w-[260px] lg:max-w-[360px] min-w-0"
        style={{ background: "var(--surface-2)" }}
      >
        <div style={{ paddingTop: "100%" }} />
        <img
          src="/sumit-gundawar.webp"
          alt="Sumit Gundawar"
          width={720}
          height={960}
          fetchPriority="high"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: "50% 16%" }}
        />
      </figure>

      {/* min-w-0 on every child, not just the aside. A grid item defaults to
          min-width:auto, so its min-content sets the track floor: the contact
          block's 394px min-content was forcing a 394px track inside a 350px
          column, and every sibling stretched to match and was clipped off the
          side of the phone. */}
      <div className="order-1 md:order-none min-w-0">
        <div className="flex items-center gap-2.5 mb-4">
          <HealthDot health="ok" pulse size={9} />
          <span className="mono text-[length:var(--fs-label)]" style={{ color: "var(--c-text)" }}>
            Shipping in production
          </span>
          <span className="mono text-[length:var(--fs-label)] uppercase tracking-[0.08em] ml-auto" style={{ color: "var(--signal)" }}>
            {identity.status}
          </span>
        </div>
        <h1
          className="font-semibold leading-[1.0] tracking-[-0.02em]"
          style={{ fontSize: "var(--fs-page)", color: "var(--c-text)" }}
        >
          {identity.name}
        </h1>
        <p className="mono text-[length:var(--fs-body)] mt-3 leading-relaxed" style={{ color: "var(--c-text-dim)" }}>
          {identity.title}
          <br />
          {identity.location}
        </p>
      </div>

      {/* KPIs */}
      <div className="order-3 md:order-none min-w-0 md:col-start-2 md:row-start-1 md:self-start lg:col-start-auto lg:row-start-auto">
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
              <div className="mono text-[length:var(--fs-label)] uppercase tracking-[0.06em] mt-2" style={{ color: "var(--c-text)" }}>
                {k.label}
              </div>
              <div className="text-[length:var(--fs-label)] mt-1 leading-snug" style={{ color: "var(--c-text-dim)" }}>
                {k.note}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* contact */}
      <div className="order-4 md:order-none min-w-0 md:col-span-2 lg:col-span-1">
        <Eyebrow className="mb-2">contact</Eyebrow>
        <div className="flex flex-col md:grid md:grid-cols-2 md:gap-x-6 lg:grid-cols-1">
          {channels.map((c) => (
            <a
              key={c.label}
              href={c.href}
              target={c.href.startsWith("http") ? "_blank" : undefined}
              rel={c.href.startsWith("http") ? "noreferrer" : undefined}
              download={c.download ? true : undefined}
              onClick={() => trackClick(c.download ? "cv_download" : "contact_click", { channel: c.label })}
              className="flex items-center gap-2.5 py-3 min-h-[44px] border-t border-hair group"
            >
              <HealthDot health="ok" size={6} />
              <span className="eyebrow w-[58px] shrink-0">{c.label}</span>
              <span className="mono text-[length:var(--fs-label)] truncate min-w-0 flex-1 link-underline inline-flex items-center min-h-[44px]" style={{ color: "var(--c-text)" }}>
                {c.value}
              </span>
              <span className="mono text-[length:var(--fs-label)]" style={{ color: "var(--cool)" }}>↗</span>
            </a>
          ))}
        </div>
        <p className="text-[length:var(--fs-body)] mt-4 leading-relaxed" style={{ color: "var(--c-text-dim)" }}>
          {identity.availability}
        </p>
      </div>
    </aside>
  );
}

/* ---------- corner nav (primary CTAs, pinned top right) ---------- */

function CornerNav() {
  return (
    <nav
      /* Background but no padding. The links carry their own panel background;
         the container had none, so content scrolled through the gap between the
         two of them. Padding and a border fixed that and cost 10px of height,
         which was enough to wrap the nav onto two rows at 360px and put it back
         on top of the name. The background alone covers the gap and changes no
         geometry. */
      className="fixed top-3 right-3 sm:top-5 sm:right-5 z-50 flex flex-wrap justify-end gap-2"
      style={{ background: "var(--ink)" }}
      aria-label="Primary"
    >
      <Link
        to="/learn"
        className="panel mono text-[length:var(--fs-label)] uppercase tracking-[0.06em] px-2.5 sm:px-3.5 whitespace-nowrap link-underline inline-flex items-center min-h-[44px]"
        style={{ color: "var(--c-text)" }}
      >
        How I build →
      </Link>
      <Link
        to="/build"
        className="panel mono text-[length:var(--fs-label)] uppercase tracking-[0.06em] px-2.5 sm:px-3.5 whitespace-nowrap link-underline inline-flex items-center min-h-[44px]"
        style={{ color: "var(--c-text)" }}
      >
        Build a system →
      </Link>
    </nav>
  );
}

/* ---------- lead ---------- */

function Lead() {
  return (
    <header className="reveal in">
      <p
        className="font-medium leading-[1.12] tracking-[-0.015em] max-w-[14em] sm:max-w-none"
        style={{ fontSize: "var(--fs-hero)", color: "var(--c-text)" }}
      >
        I build the systems that are still standing at 3am.
      </p>
      <p className="mt-5 text-[length:var(--fs-item)] leading-relaxed max-w-[34em]" style={{ color: "var(--c-text-dim)" }}>
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
              <div className="text-[length:var(--fs-item)] font-medium leading-snug" style={{ color: "var(--c-text)" }}>
                {r.title}
              </div>
              {/* Employer on its own line. Role and employer are two different
                  facts, and running them together behind a separator made a
                  long line that wrapped badly and read as one job title. */}
              {r.org && (
                <div className="mono text-[length:var(--fs-input)] mt-1" style={{ color: "var(--cool)" }}>
                  {r.org}
                </div>
              )}
              <p className="text-[length:var(--fs-body)] mt-1.5 leading-relaxed max-w-[32em]" style={{ color: "var(--c-text-dim)" }}>
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
            <div className="mono text-[length:var(--fs-label)] sm:text-right tnum" style={{ color: "var(--c-text-dim)" }}>
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
          <button onClick={() => setOpen(true)} className="mono text-[length:var(--fs-label)] link-underline inline-flex items-center min-h-[44px]" style={{ color: "var(--c-text-dim)" }}>
            13+ shipped, view all ↗
          </button>
        }
      />
      <div className="grid sm:grid-cols-2 gap-px" style={{ background: "var(--hair)", border: "1px solid var(--hair)" }}>
        {services.map((s, i) => (
          <div key={s.id} className="p-5 flex flex-col" style={{ background: "var(--surface)" }}>
            <div className="flex items-baseline gap-2.5 mb-2">
              {/* No health dot here. Every project carries health "ok", so six
                  identical green dots said nothing while breaking the one rule
                  this palette has, colour means health, never decoration.
                  Worth restoring the moment a project has a status worth
                  distinguishing. */}
              <span className="mono text-[length:var(--fs-label)] tnum" style={{ color: "var(--cool)" }}>{String(i + 1).padStart(2, "0")}</span>
              {s.url ? (
                <a href={s.url} target="_blank" rel="noreferrer" className="text-[length:var(--fs-item)] font-medium link-underline tracking-[-0.01em]" style={{ color: "var(--c-text)" }}>
                  {s.name}
                </a>
              ) : (
                <h3 className="text-[length:var(--fs-item)] font-medium tracking-[-0.01em]" style={{ color: "var(--c-text)" }}>{s.name}</h3>
              )}
            </div>
            <p className="text-[length:var(--fs-body)] leading-relaxed flex-1" style={{ color: "var(--c-text-dim)" }}>
              {s.slo}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 mt-4">
              {s.stack.map((t) => (
                <Tag key={t}>{t}</Tag>
              ))}
            </div>
            {s.url && (
              <a href={s.url} target="_blank" rel="noreferrer" className="mono text-[length:var(--fs-label)] mt-3 link-underline self-start inline-flex items-center min-h-[44px]" style={{ color: "var(--cool)" }}>
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
            <Link to="/writing" className="mono text-[length:var(--fs-label)] link-underline inline-flex items-center min-h-[44px]" style={{ color: "var(--c-text-dim)" }}>
              all writing, and the feed →
            </Link>
          }
        />
        <div>
          {articles.map((a, i) => (
            <a
              key={a.id}
              href={a.url}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackClick("article_click", { title: a.title, publication: a.publication })}
              className={`block py-6 group ${i === 0 ? "" : "border-t border-hair"}`}
            >
              <div className="flex items-baseline justify-between gap-4 mono text-[length:var(--fs-label)]" style={{ color: "var(--c-text-dim)" }}>
                <span className="uppercase tracking-[0.07em]">{a.publication}</span>
                <span className="tnum shrink-0">{a.date}</span>
              </div>
              <h3
                className="serif mt-2 leading-snug link-underline inline"
                style={{ fontSize: "var(--fs-item)", color: "var(--c-text)" }}
              >
                {a.title}
              </h3>
              <p className="text-[length:var(--fs-body)] mt-2.5 leading-relaxed max-w-[34em]" style={{ color: "var(--c-text-dim)" }}>
                {a.summary}
              </p>
            </a>
          ))}
        </div>
      </div>
    </Reveal>
  );
}

/* ---------- podcast ---------- */

function Podcasts() {
  /* Which episode is playing, if any. Click to load, rather than an iframe on
     every page view: a YouTube embed pulls several hundred kilobytes and sets
     its own cookies before anyone has decided to watch, which is a cost paid by
     the many for the few. The thumbnail is local, so the page makes no request
     to YouTube at all until this is set. */
  const [playing, setPlaying] = useState<string | null>(null);

  return (
    <Reveal className="mt-16">
      <div id="podcast" style={{ scrollMarginTop: 24 }}>
        <SectionHead label="podcast" />
        <div
          className="grid sm:grid-cols-2 gap-px"
          style={{ background: "var(--hair)", border: "1px solid var(--hair)" }}
        >
          {podcasts.map((p) => (
            <div key={p.id} className="min-w-0 flex flex-col" style={{ background: "var(--surface)" }}>
              {p.youtubeId && (
                <div className="relative w-full" style={{ aspectRatio: "16 / 9", background: "var(--surface-2)" }}>
                  {playing === p.youtubeId ? (
                    <iframe
                      // nocookie, and only ever mounted after a click.
                      src={`https://www.youtube-nocookie.com/embed/${p.youtubeId}?autoplay=1&rel=0`}
                      title={p.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full"
                      style={{ border: 0 }}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setPlaying(p.youtubeId!);
                        trackClick("podcast_play", { title: p.title, show: p.show });
                      }}
                      className="absolute inset-0 w-full h-full group"
                      aria-label={`Play: ${p.title}`}
                    >
                      <img
                        src={`/podcast/${p.youtubeId}.webp`}
                        alt=""
                        width={960}
                        height={540}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <span
                        aria-hidden
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ background: "rgba(0,0,0,0.28)" }}
                      >
                        <span
                          className="inline-flex items-center justify-center"
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: "50%",
                            background: "rgba(14,17,16,0.82)",
                            border: "1px solid var(--hair-strong)",
                            color: "var(--c-text)",
                            fontSize: 18,
                            paddingLeft: 4,
                          }}
                        >
                          ▶
                        </span>
                      </span>
                    </button>
                  )}
                </div>
              )}

              <div className="p-6 flex-1">
                <div
                  className="flex items-baseline justify-between gap-3 mono text-[length:var(--fs-label)]"
                  style={{ color: "var(--c-text-dim)" }}
                >
                  <span className="uppercase tracking-[0.07em] min-w-0 truncate">
                    {p.show}
                    {p.episode ? ` · ${p.episode}` : ""}
                  </span>
                  <span className="tnum shrink-0" style={{ color: "var(--cool)" }}>
                    {p.when}
                  </span>
                </div>
                <h3
                  className="mt-3 leading-snug font-medium tracking-[-0.01em]"
                  style={{ fontSize: "var(--fs-item)", color: "var(--c-text)" }}
                >
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => trackClick("podcast_click", { title: p.title, show: p.show })}
                    className="link-underline"
                  >
                    {p.title} ↗
                  </a>
                </h3>
                <p
                  className="text-[length:var(--fs-body)] mt-2.5 leading-relaxed"
                  style={{ color: "var(--c-text-dim)" }}
                >
                  {p.summary}
                </p>
              </div>
            </div>
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
                  <a href={t.url} target="_blank" rel="noreferrer" className="text-[length:var(--fs-item)] font-medium link-underline tracking-[-0.01em] inline-flex items-center min-h-[44px]" style={{ color: "var(--c-text)" }}>
                    {t.venue} ↗
                  </a>
                ) : (
                  <span className="text-[length:var(--fs-item)] font-medium" style={{ color: "var(--c-text)" }}>{t.venue}</span>
                )}
                <span className="mono text-[length:var(--fs-label)] tnum" style={{ color: "var(--cool)" }}>{t.when}</span>
                {t.placeholder && <span className="mono text-[length:var(--fs-label)] border border-hair px-1.5 py-0.5" style={{ color: "var(--warn)" }}>tbc</span>}
              </div>
              <p className="text-[length:var(--fs-body)] mt-1.5 leading-snug" style={{ color: "var(--c-text-dim)" }}>{t.title}</p>
            </div>
          ))}
        </div>

        <div className="p-6" style={{ background: "var(--surface)" }}>
          <Eyebrow className="mb-5">recognition</Eyebrow>
          {recognition.map((r, i) => (
            <div key={r.org} className={`py-4 ${i === 0 ? "" : "border-t border-hair"}`}>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-[length:var(--fs-item)] font-medium" style={{ color: "var(--c-text)" }}>{r.role}</span>
                <a href={r.url} target="_blank" rel="noreferrer" className="text-[length:var(--fs-body)] link-underline inline-flex items-center min-h-[44px]" style={{ color: "var(--cool)" }}>{r.org} ↗</a>
                <span className="mono text-[length:var(--fs-label)] tnum" style={{ color: "var(--cool)" }}>{r.when}</span>
              </div>
              {r.note && (
                <p className="text-[length:var(--fs-body)] mt-1.5 leading-snug" style={{ color: "var(--c-text-dim)" }}>
                  {r.note}
                </p>
              )}
              {r.extraUrl && (
                <p className="text-[length:var(--fs-body)] mt-1.5" style={{ color: "var(--c-text-dim)" }}>
                  <a href={r.extraUrl} target="_blank" rel="noreferrer" className="link-underline inline-flex items-center min-h-[44px]" style={{ color: "var(--c-text-dim)" }}>{r.extraLabel} ↗</a>
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
            <span className="mono text-[length:var(--fs-label)]" style={{ color: "var(--c-text)" }}>
              13+ shipped products
            </span>
          </div>
          <button onClick={onClose} className="mono text-[length:var(--fs-label)] border border-hair px-2 py-1 rounded-sm" style={{ color: "var(--c-text-dim)" }}>
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
                      <a href={p.url} target="_blank" rel="noreferrer" className="text-[length:var(--fs-body)] font-medium link-underline inline-flex items-center min-h-[44px]" style={{ color: "var(--c-text)" }}>
                        {p.name} ↗
                      </a>
                    ) : (
                      <span className="text-[length:var(--fs-body)] font-medium" style={{ color: "var(--c-text)" }}>{p.name}</span>
                    )}
                  </div>
                  <p className="text-[length:var(--fs-body)] mt-1 leading-relaxed" style={{ color: "var(--c-text-dim)" }}>{p.line}</p>
                </div>
              ))}
            </div>
          ))}
          <p className="px-5 py-4 border-t border-hair mono text-[length:var(--fs-label)]" style={{ color: "var(--c-text-dim)" }}>
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
              <div className="text-[length:var(--fs-item)] font-medium leading-snug" style={{ color: "var(--c-text)" }}>{e.degree}</div>
              <div className="mono text-[length:var(--fs-label)] mt-1" style={{ color: "var(--cool)" }}>{e.school}</div>
              <p className="text-[length:var(--fs-body)] mt-2 leading-relaxed max-w-[33em]" style={{ color: "var(--c-text-dim)" }}>{e.detail}</p>
              {e.tags && (
                <div className="flex flex-wrap gap-1.5 mt-3.5">
                  {e.tags.map((t) => (
                    <Tag key={t}>{t}</Tag>
                  ))}
                </div>
              )}
            </div>
            <div className="mono text-[length:var(--fs-label)] sm:text-right tnum shrink-0" style={{ color: "var(--c-text-dim)" }}>
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
    <footer className="mt-16 pt-5 border-t border-hair flex items-center justify-between mono text-[length:var(--fs-label)]" style={{ color: "var(--c-text-dim)" }}>
      <span>© {identity.name}</span>
      <span className="tnum">London · {london}</span>
    </footer>
  );
}
