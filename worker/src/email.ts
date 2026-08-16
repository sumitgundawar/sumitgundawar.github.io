/* The weekly report as HTML mail.
 *
 * Email is not the web and most of what works on the site is unavailable here.
 * Gmail strips <style> blocks on some clients, so every rule is inline. Outlook
 * on Windows renders through Word, which has no flexbox, no grid, no
 * border-radius worth relying on and no background-image, so the layout is
 * tables and the charts are table cells with a width and a background colour.
 * SVG is blocked or stripped almost everywhere, and remote images are hidden by
 * default in Apple Mail and Outlook, which is why no chart here is an image:
 * a bar drawn as a coloured cell is visible before anyone clicks "load images".
 *
 * Dark mode is deliberately not fought. Clients invert unpredictably, so the
 * palette is light with genuinely dark text, which survives inversion legibly
 * instead of producing grey on grey.
 */

const INK = "#111827";
const DIM = "#6b7280";
const LINE = "#e5e7eb";
const ACCENT = "#0f766e";
const WARN = "#b45309";
const BG = "#f6f7f8";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** A horizontal bar as a table row. Two cells: filled and empty. Nothing here
 *  needs a client to support anything invented after about 2003. */
function bar(label: string, value: number, max: number, sub: string, colour = ACCENT): string {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 2;
  return `
  <tr>
    <td style="padding:0 0 10px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
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
  days: number;
}

const LABEL: Record<string, string> = {
  sessions: "Sessions",
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
      <td width="25%" style="padding:0 8px 0 0;vertical-align:top;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
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
      (x) => `<tr><td style="padding:3px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;color:${INK};">
        ${esc(x.topic_id)} <span style="color:${DIM};">last topic for ${x.times_last} sessions</span></td></tr>`,
    )
    .join("");

  const section = (title: string, note: string, inner: string) =>
    inner
      ? `
    <tr><td style="padding:26px 24px 0 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
      <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:${INK};font-weight:600;">${esc(title)}</div>
      <div style="font-size:12px;color:${DIM};padding:3px 0 12px 0;">${esc(note)}</div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">${inner}</table>
    </td></tr>`
      : "";

  const empty = d.digest.every((m) => m.current_period === 0);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>Site report</title>
</head>
<body style="margin:0;padding:0;background:${BG};">
<!-- Preheader: the line mail clients show beside the subject. Hidden in the body. -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Last ${d.days} days against the ${d.days} before.</div>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BG};border-collapse:collapse;">
<tr><td align="center" style="padding:24px 12px;">

  <!-- 600px is the width that survives every client, and it degrades to full
       width on a phone because the table is width:100% with a max-width. -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:100%;max-width:600px;background:#ffffff;border:1px solid ${LINE};border-collapse:collapse;">

    <tr><td style="padding:24px 24px 0 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
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
        ? `<tr><td style="padding:20px 24px 0 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;color:${WARN};">
             No traffic recorded this period. If that is unexpected, the tracking call is the thing to check before the numbers.
           </td></tr>`
        : ""
    }

    ${section("Most read", "What drew people in, and how long it held them", readRows)}
    ${section("Most often wrong", "A question most people fail is usually a bad explanation, not a hard idea", wrongRows)}
    ${section("Where people stopped", "The last topic of a session is where the material lost them", dropRows)}

    <tr><td style="padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
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

/** Plain text alternative. Some clients prefer it, and every client falls back
 *  to it when HTML is blocked, so it has to carry the same numbers. */
export function renderReportText(d: ReportData): string {
  const lines = [`Site report, week to ${new Date().toISOString().slice(0, 10)}`, ""];
  for (const m of d.digest) {
    const pct = m.pct_change === null ? "new" : `${m.pct_change > 0 ? "+" : ""}${m.pct_change}%`;
    lines.push(`${LABEL[m.metric] ?? m.metric}: ${m.current_period} (was ${m.previous_period}, ${pct})`);
  }
  if (d.engagement.length) {
    lines.push("", "Most read");
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
