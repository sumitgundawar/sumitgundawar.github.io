/* Email rendering, built on docs/EMAIL-DESIGN.md.
 *
 * Read that document before adding an email. It carries the palette, the type
 * scale, the structure every message follows, and the reasoning for the
 * constraints, which are not the web's: Gmail strips <style>, Outlook renders
 * through Word so there is no flexbox, remote images are hidden by default and
 * pre-fetched by Apple, and anything over 102KB is clipped along with its
 * unsubscribe link.
 *
 * Compose from the components below rather than writing table markup by hand.
 * That is the whole point of having them: the emails looked like three
 * different products because each one was hand-built.
 */

/* ---------- tokens: docs/EMAIL-DESIGN.md#palette ---------- */

const PAPER = "#f4f4f2";
const CARD = "#ffffff";
const INK = "#14171a"; //     17.99:1 on card
const DIM = "#5f6660"; //      5.91:1 on card
const LINE = "#e3e3df"; //     a boundary, not text
const ACCENT = "#0b6b46"; //   6.55:1 on card
const WARN = "#b45309";

/* The site's signal green is deliberately absent as text or link: #3dd68c
   measures 1.88:1 on white. It appears only as a block nothing is written on. */

const SANS = `-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif`;
const MONO = `ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace`;

const PAD = 28;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* ---------- components: docs/EMAIL-DESIGN.md#components ---------- */

/** Preheader, page, card, wordmark, footer. Every email is this shape. */
function shell(opts: { preheader: string; title: string; body: string; footer: string }): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${esc(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:${PAPER};">
<!-- The line Gmail shows beside the subject. Without it the client invents one
     from the first words of the body, which is always worse. -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(opts.preheader)}</div>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${PAPER};border-collapse:collapse;">
<tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:100%;max-width:600px;background:${CARD};border:1px solid ${LINE};border-collapse:collapse;">

    <tr><td style="padding:${PAD}px ${PAD}px 0 ${PAD}px;font-family:${SANS};">
      <div style="font-size:18px;font-weight:600;color:${INK};letter-spacing:-0.01em;">sumitgundawar.com</div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-top:10px;">
        <tr><td width="40" style="background:${ACCENT};height:3px;line-height:3px;font-size:0;">&nbsp;</td></tr>
      </table>
    </td></tr>

    ${opts.body}

    <tr><td style="padding:26px ${PAD}px ${PAD}px ${PAD}px;font-family:${SANS};">
      <div style="border-top:1px solid ${LINE};padding-top:14px;font-size:12px;line-height:1.6;color:${DIM};">
        ${opts.footer}
      </div>
    </td></tr>

  </table>
</td></tr>
</table>
</body>
</html>`;
}

/** A row of the card, at the standard padding. */
const block = (inner: string, topPad = 22) =>
  `<tr><td style="padding:${topPad}px ${PAD}px 0 ${PAD}px;font-family:${SANS};">${inner}</td></tr>`;

const heading = (t: string) =>
  `<div style="font-size:20px;font-weight:600;color:${INK};line-height:1.3;">${esc(t)}</div>`;

const lede = (t: string) =>
  `<div style="font-size:15px;line-height:1.6;color:${DIM};padding-top:10px;">${esc(t)}</div>`;

const para = (t: string) =>
  `<div style="font-size:15px;line-height:1.65;color:${INK};padding-top:14px;">${esc(t)}</div>`;

/** The mono uppercase eyebrow. This is what makes the mail read as the site's
 *  rather than as a template; the site uses exactly this for every section. */
const label = (t: string) =>
  `<div style="font-family:${MONO};font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:${DIM};">${esc(t)}</div>`;

const link = (href: string, text: string) =>
  `<a href="${esc(href)}" style="color:${ACCENT};">${esc(text)}</a>`;

/** A horizontal bar as a table row. Two cells: filled and empty. Nothing here
 *  needs a client to support anything invented after about 2003. */
function bar(label: string, value: number, max: number, sub: string, colour = ACCENT): string {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 2;
  return `
  <tr>
    <td style="padding:0 0 10px 0;font-family:${SANS};">
      <div style="font-size:13px;color:${INK};padding-bottom:4px;">
        <strong style="font-weight:600;">${esc(label)}</strong>
        <span style="color:${DIM};"> ${esc(sub)}</span>
      </div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
        <tr>
          <td width="${pct}%" style="background:${colour};height:8px;line-height:8px;font-size:0;">&nbsp;</td>
          <td width="${100 - pct}%" style="background:${LINE};height:8px;line-height:8px;font-size:0;">&nbsp;</td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function delta(pct: number | null): string {
  if (pct === null) return `<span style="color:${DIM};">new</span>`;
  const up = pct >= 0;
  const colour = up ? ACCENT : WARN;
  const arrow = up ? "&#9650;" : "&#9660;";
  return `<span style="color:${colour};white-space:nowrap;">${arrow} ${Math.abs(pct)}%</span>`;
}

export interface ReportData {
  digest: { metric: string; current_period: number; previous_period: number; pct_change: number | null }[];
  engagement: { topic_id: string; views: number; readers: number; median_dwell_s: number | null; pct_change: number | null }[];
  struggling: { topic_id: string; answers: number; wrong: number; wrong_pct: number }[];
  dropoff: { topic_id: string; times_last: number }[];
  /* Everything below arrives empty until 0001_analytics_depth.sql has been run,
     and every section that reads it is omitted when empty, so the report stays
     correct rather than half-rendered in the meantime. */
  shape: { visits: number; visitors: number; median_seconds: number | null; median_pages: number | null; single_page_pct: number | null; returning_pct: number | null }[];
  clicks: { event: string; target: string; clicks: number; visitors: number; pct_change: number | null }[];
  pages: { path: string; views: number; visitors: number; median_dwell_s: number | null; pct_change: number | null }[];
  sources: { source: string; visitors: number }[];
  audience: { dimension: string; value: string; visitors: number }[];
  days: number;
}

/** A number of seconds as something readable at a glance. */
function dur(s: number | null): string {
  if (s === null || !Number.isFinite(s)) return "n/a";
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60);
  const rest = Math.round(s % 60);
  return rest ? `${m}m ${rest}s` : `${m}m`;
}

/** A stat block: four figures across, the same shape as the digest row. */
function statRow(cells: { label: string; value: string; note?: string }[]): string {
  return `<tr>${cells
    .map(
      (c) => `
      <td width="${Math.floor(100 / cells.length)}%" style="padding:0 8px 0 0;vertical-align:top;font-family:${SANS};">
        <div style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${DIM};padding-bottom:4px;">${esc(c.label)}</div>
        <div style="font-size:20px;font-weight:600;color:${INK};line-height:1.15;">${esc(c.value)}</div>
        ${c.note ? `<div style="font-size:12px;color:${DIM};padding-top:2px;">${esc(c.note)}</div>` : ""}
      </td>`,
    )
    .join("")}</tr>`;
}

/** A plain two-column table: label on the left, count on the right. */
function listTable(rows: { left: string; right: string; sub?: string }[]): string {
  return rows
    .map(
      (r) => `
    <tr>
      <td style="padding:5px 0;border-bottom:1px solid ${LINE};font-family:${SANS};font-size:13px;color:${INK};">
        ${esc(r.left)}${r.sub ? `<span style="color:${DIM};"> ${esc(r.sub)}</span>` : ""}
      </td>
      <td align="right" style="padding:5px 0;border-bottom:1px solid ${LINE};font-family:${SANS};font-size:13px;color:${INK};white-space:nowrap;">
        ${esc(r.right)}
      </td>
    </tr>`,
    )
    .join("");
}

/* "Sessions" was the wrong word for it. The session key lives in localStorage,
   so one key is one browser across every visit it ever makes, which is a visitor
   and not a session. Visits are counted separately, in the shape section. */
const LABEL: Record<string, string> = {
  sessions: "Visitors",
  page_views: "Page views",
  quiz_answers: "Quiz answers",
  ai_questions: "Questions asked",
};

export function renderReportEmail(d: ReportData): string {
  const to = new Date().toISOString().slice(0, 10);

  const headline = d.digest
    .map((m) => {
      const pct = m.pct_change;
      return `
      <td width="25%" style="padding:0 8px 0 0;vertical-align:top;font-family:${SANS};">
        <div style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${DIM};padding-bottom:4px;">${esc(LABEL[m.metric] ?? m.metric)}</div>
        <div style="font-size:26px;font-weight:600;color:${INK};line-height:1.1;">${m.current_period}</div>
        <div style="font-size:12px;color:${DIM};padding-top:2px;">was ${m.previous_period} &nbsp;${delta(pct)}</div>
      </td>`;
    })
    .join("");

  const maxViews = Math.max(1, ...d.engagement.map((e) => e.views));
  const readRows = d.engagement
    .slice(0, 8)
    .map((e) =>
      bar(
        e.topic_id,
        e.views,
        maxViews,
        `${e.views} views, ${e.readers} readers${e.median_dwell_s ? `, ${e.median_dwell_s}s median` : ""}`,
      ),
    )
    .join("");

  const wrongRows = d.struggling
    .slice(0, 6)
    .map((s) => bar(s.topic_id, s.wrong_pct, 100, `${s.wrong_pct}% wrong of ${s.answers}`, WARN))
    .join("");

  const dropRows = d.dropoff
    .slice(0, 5)
    .map(
      (x) => `<tr><td style="padding:3px 0;font-family:${SANS};font-size:13px;color:${INK};">
        ${esc(x.topic_id)} <span style="color:${DIM};">last topic for ${x.times_last} sessions</span></td></tr>`,
    )
    .join("");

  const section = (title: string, note: string, inner: string) =>
    inner
      ? `
    <tr><td style="padding:26px 24px 0 24px;font-family:${SANS};">
      <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:${INK};font-weight:600;">${esc(title)}</div>
      <div style="font-size:12px;color:${DIM};padding:3px 0 12px 0;">${esc(note)}</div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">${inner}</table>
    </td></tr>`
      : "";

  const empty = d.digest.every((m) => m.current_period === 0);

  /* How long a visit lasts and how far it goes. One row of five figures rather
     than a chart, because these are the numbers that get compared against
     themselves week to week and a bar of one value says nothing. */
  const s = d.shape[0];
  const shapeRows = s
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
         ${statRow([
           { label: "Visits", value: String(s.visits), note: `${s.visitors} visitors` },
           { label: "Typical length", value: dur(s.median_seconds), note: "median" },
           { label: "Pages a visit", value: s.median_pages === null ? "n/a" : String(s.median_pages), note: "median" },
           { label: "One page only", value: s.single_page_pct === null ? "n/a" : `${s.single_page_pct}%`, note: `${s.returning_pct ?? 0}% returning` },
         ])}
       </table>`
    : "";

  const clickRows = listTable(
    d.clicks.slice(0, 10).map((c) => ({
      left: c.event.replace(/_/g, " "),
      sub: c.target ? `· ${c.target.slice(0, 52)}` : "",
      right: `${c.clicks}${c.pct_change === null ? "" : ` (${c.pct_change > 0 ? "+" : ""}${c.pct_change}%)`}`,
    })),
  );

  /* Both ends of the list, because a page nobody opens is the actionable half
     and is invisible in a table sorted by popularity.
   *
   * The tail is only worth printing when it is actually a different set of pages
   * from the head. Reversing the list and taking six gave back the same six rows
   * whenever fewer than about fifteen pages had been visited, which is a section
   * that looks like analysis and repeats what is directly above it. So: exclude
   * anything already shown, and drop the section entirely if too little is left
   * to be a tail.
   *
   * Note this can only rank pages that were visited at least once. A page with
   * no views at all does not appear in page_views and so cannot appear here; that
   * needs the route inventory in the Worker and is not yet done. */
  const TOP_N = 8;
  const topPages = listTable(
    d.pages.slice(0, TOP_N).map((p) => ({
      left: p.path,
      sub: p.median_dwell_s ? `· ${dur(p.median_dwell_s)} median` : "",
      right: `${p.views} views, ${p.visitors} people`,
    })),
  );
  const shown = new Set(d.pages.slice(0, TOP_N).map((p) => p.path));
  const tail = d.pages.filter((p) => !shown.has(p.path)).slice(-6).reverse();
  const quietPages = tail.length >= 3 ? listTable(tail.map((p) => ({ left: p.path, right: `${p.views} views` }))) : "";

  const sourceRows = listTable(
    d.sources.slice(0, 8).map((x) => ({ left: x.source, right: String(x.visitors) })),
  );

  const pick = (dim: string) => d.audience.filter((a) => a.dimension === dim).slice(0, 6);
  const audienceRows = listTable(
    [...pick("country"), ...pick("device")].map((a) => ({
      left: a.value,
      sub: `· ${a.dimension}`,
      right: String(a.visitors),
    })),
  );

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>Site report</title>
</head>
<body style="margin:0;padding:0;background:${PAPER};">
<!-- Preheader: the line mail clients show beside the subject. Hidden in the body. -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Last ${d.days} days against the ${d.days} before.</div>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${PAPER};border-collapse:collapse;">
<tr><td align="center" style="padding:24px 12px;">

  <!-- 600px is the width that survives every client, and it degrades to full
       width on a phone because the table is width:100% with a max-width. -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:100%;max-width:600px;background:#ffffff;border:1px solid ${LINE};border-collapse:collapse;">

    <tr><td style="padding:24px 24px 0 24px;font-family:${SANS};">
      <div style="font-size:17px;font-weight:600;color:${INK};">sumitgundawar.com</div>
      <div style="font-size:13px;color:${DIM};padding-top:2px;">Week to ${to}, compared with the ${d.days} days before</div>
    </td></tr>

    <tr><td style="padding:20px 24px 0 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
        <tr>${headline}</tr>
      </table>
    </td></tr>

    ${
      empty
        ? `<tr><td style="padding:20px 24px 0 24px;font-family:${SANS};font-size:13px;color:${WARN};">
             No traffic recorded this period. If that is unexpected, the tracking call is the thing to check before the numbers.
           </td></tr>`
        : ""
    }

    ${section("How long people stay", "A visit is a run of page views with no gap longer than 30 minutes", shapeRows)}
    ${section("Most clicked", "What people actually reached for, by section and by name", clickRows)}
    ${section("Most visited pages", "Views, distinct people, and how long the page held them", topPages)}
    ${section("Least visited pages", "Not a failure of the page so much as of its title or its placement", quietPages)}
    ${section("Where people came from", "Referring host, or direct where there was none", sourceRows)}
    ${section("Who they are", "Country and device, counted by visitor", audienceRows)}
    ${section("Most read topics", "What drew people in, and how long it held them", readRows)}
    ${section("Most often wrong", "A question most people fail is usually a bad explanation, not a hard idea", wrongRows)}
    ${section("Where people stopped", "The last topic of a session is where the material lost them", dropRows)}

    <tr><td style="padding:24px;font-family:${SANS};">
      <div style="border-top:1px solid ${LINE};padding-top:14px;font-size:12px;color:${DIM};">
        Measured by the site itself. No personal data stored, and no third party involved in these numbers.
      </div>
    </td></tr>

  </table>
</td></tr>
</table>
</body>
</html>`;
}

/* The welcome, which is the only email most subscribers will ever judge.
 *
 * It used to be two bare paragraphs written inline in the subscribe handler. It
 * arrived, and it read like a system notification, which is the wrong first
 * impression for a list whose entire pitch is that the writing is worth reading.
 *
 * Same constraints as everything else here, for the same reasons: no style
 * block, tables rather than flexbox, no remote images, 600px with a max-width so
 * it collapses cleanly on a phone. The one deliberate flourish is a rule under
 * the wordmark, drawn as a coloured table cell, because that is the only kind of
 * graphic every client renders without being asked.
 *
 * It sets the frequency expectation in the first line. The commonest reason a
 * new subscriber marks mail as spam is not disliking it, it is being surprised
 * by it, and a spam complaint costs a new sending domain far more than an
 * unsubscribe does.
 */
export function renderWelcomeEmail(opts: { site: string; unsubscribe: string }): string {
  const { site, unsubscribe } = opts;
  const host = site.replace(/^https?:\/\//, "");

  /* Written as a letter, not as a landing page.
   *
   * The previous version had three bulleted sections and a large dark call to
   * action button, which is precisely the shape Gmail classifies as promotional,
   * and it is also just worse: a first email from a person should read like one.
   * One idea, one link, a signature. See docs/EMAIL-DESIGN.md, the section on
   * landing in the inbox. */
  const body = [
    block(heading("You are on the list.")),
    block(
      para(
        "Thank you for subscribing. You will get an occasional note from me about building systems that survive production: what broke, why, and what the fix actually cost. Roughly once a month, and nothing else, ever.",
      ) +
        para(
          "Everything I write starts with something that actually happened, usually an incident, rather than with a framework or a list of best practices. If that is not what you were after, the link at the bottom removes you in one click and I will not email you again.",
        ) +
        para(`In the meantime, the writing and the learning material are both at ${host}.`),
      14,
    ),
    block(
      `<div style="font-size:15px;line-height:1.65;color:${INK};">Sumit</div>` +
        `<div style="font-family:${MONO};font-size:12px;color:${DIM};padding-top:4px;">Software Engineer, London</div>`,
      24,
    ),
  ].join("");

  return shell({
    preheader: "Occasional writing on building systems that survive production. Roughly once a month.",
    title: "You are on the list",
    body,
    footer:
      `You are receiving this because you subscribed at ${esc(host)}. Your address is stored to send this and nothing else, and is never passed on. ` +
      `${link(unsubscribe, "Unsubscribe in one click")}.`,
  });
}

export function renderWelcomeText(opts: { site: string; unsubscribe: string }): string {
  const host = opts.site.replace(/^https?:\/\//, "");
  return [
    "You are on the list.",
    "",
    "Thank you for subscribing. You will get an occasional note from me about",
    "building systems that survive production: what broke, why, and what the fix",
    "actually cost. Roughly once a month, and nothing else, ever.",
    "",
    "Everything I write starts with something that actually happened, usually an",
    "incident, rather than with a framework or a list of best practices. If that is",
    "not what you were after, the link below removes you in one click.",
    "",
    `In the meantime, the writing and the learning material are both at ${host}.`,
    "",
    "Sumit",
    "Software Engineer, London",
    "",
    `Unsubscribe: ${opts.unsubscribe}`,
  ].join("\n");
}

/* Alerts, which are a different kind of mail from the weekly report.
 *
 * The report is read at leisure and is mostly numbers. An alert is read once,
 * probably on a phone, and its whole job is to say what happened in the subject
 * line and the first two lines of the body. So: no charts, no comparison
 * columns, one warn-coloured rule down the side of each item, and nothing that
 * needs images enabled to make sense.
 *
 * Same table-and-inline-styles constraints as the report, for the same reasons.
 */
export function renderAlertsEmail(fired: string[]): string {
  const rows = fired
    .map(
      (f) => `
    <tr>
      <td style="padding:0 0 10px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
          <tr>
            <td width="3" style="background:${WARN};font-size:0;line-height:3px;">&nbsp;</td>
            <td style="padding:10px 0 10px 14px;font-family:${SANS};font-size:14px;line-height:1.55;color:${INK};background:#fdf8f1;">
              ${esc(f)}
            </td>
          </tr>
        </table>
      </td>
    </tr>`,
    )
    .join("");

  const count = `${fired.length} thing${fired.length === 1 ? "" : "s"} to look at`;

  const body = [
    block(heading("Site alerts") + lede(count)),
    block(
      `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">${rows}</table>`,
      18,
    ),
  ].join("");

  return shell({
    preheader: count,
    title: "Site alerts",
    body,
    footer:
      "Sent only when something fired. There is no mail on a normal day, so silence here means nothing tripped rather than nothing ran.",
  });
}

export function renderAlertsText(fired: string[]): string {
  return [`Site alerts, ${new Date().toISOString().slice(0, 10)}`, "", ...fired.map((f) => `- ${f}`)].join("\n");
}

/** Plain text alternative. Some clients prefer it, and every client falls back
 *  to it when HTML is blocked, so it has to carry the same numbers. */
export function renderReportText(d: ReportData): string {
  const lines = [`Site report, week to ${new Date().toISOString().slice(0, 10)}`, ""];
  for (const m of d.digest) {
    const pct = m.pct_change === null ? "new" : `${m.pct_change > 0 ? "+" : ""}${m.pct_change}%`;
    lines.push(`${LABEL[m.metric] ?? m.metric}: ${m.current_period} (was ${m.previous_period}, ${pct})`);
  }
  const s = d.shape[0];
  if (s) {
    lines.push(
      "",
      "How long people stay",
      `  ${s.visits} visits from ${s.visitors} visitors`,
      `  ${dur(s.median_seconds)} median length, ${s.median_pages ?? "n/a"} pages a visit`,
      `  ${s.single_page_pct ?? 0}% saw one page only, ${s.returning_pct ?? 0}% were returning`,
    );
  }
  if (d.clicks.length) {
    lines.push("", "Most clicked");
    for (const c of d.clicks.slice(0, 10)) {
      lines.push(`  ${c.event.replace(/_/g, " ")}${c.target ? ` (${c.target.slice(0, 52)})` : ""}: ${c.clicks}`);
    }
  }
  if (d.pages.length) {
    lines.push("", "Most visited pages");
    for (const p of d.pages.slice(0, 8)) lines.push(`  ${p.path}: ${p.views} views, ${p.visitors} people`);
    const shownPaths = new Set(d.pages.slice(0, 8).map((p) => p.path));
    const tail = d.pages.filter((p) => !shownPaths.has(p.path)).slice(-6).reverse();
    if (tail.length >= 3) {
      lines.push("", "Least visited pages");
      for (const p of tail) lines.push(`  ${p.path}: ${p.views} views`);
    }
  }
  if (d.sources.length) {
    lines.push("", "Where people came from");
    for (const x of d.sources.slice(0, 8)) lines.push(`  ${x.source}: ${x.visitors}`);
  }
  if (d.audience.length) {
    lines.push("", "Who they are");
    for (const a of d.audience.slice(0, 12)) lines.push(`  ${a.value} (${a.dimension}): ${a.visitors}`);
  }
  if (d.engagement.length) {
    lines.push("", "Most read topics");
    for (const e of d.engagement.slice(0, 8)) lines.push(`  ${e.topic_id}: ${e.views} views, ${e.readers} readers`);
  }
  if (d.struggling.length) {
    lines.push("", "Most often wrong");
    for (const s of d.struggling.slice(0, 6)) lines.push(`  ${s.topic_id}: ${s.wrong_pct}% wrong of ${s.answers}`);
  }
  if (d.dropoff.length) {
    lines.push("", "Where people stopped");
    for (const x of d.dropoff.slice(0, 5)) lines.push(`  ${x.topic_id}: last for ${x.times_last} sessions`);
  }
  return lines.join("\n");
}
