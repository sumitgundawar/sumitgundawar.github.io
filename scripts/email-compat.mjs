const mod = await import(process.argv[2] ?? "/tmp/em.mjs");

const samples = {
  welcome: mod.renderWelcomeEmail({
    site: "https://sumitgundawar.com",
    unsubscribe: "https://x.dev/api/unsubscribe?token=t",
  }),
  alerts: mod.renderAlertsEmail(["The model chain fell through to fallback 7 on 41% of requests."]),
  report: mod.renderReportEmail({
    days: 7,
    digest: [{ metric: "sessions", current_period: 214, previous_period: 151, pct_change: 42 }],
    engagement: [{ topic_id: "caching", views: 88, readers: 54, median_dwell_s: 208, pct_change: 12 }],
    struggling: [{ topic_id: "idempotency", answers: 22, wrong: 19, wrong_pct: 86 }],
    dropoff: [{ topic_id: "backpressure", times_last: 17 }],
    shape: [{ visits: 268, visitors: 214, median_seconds: 194, median_pages: 3, single_page_pct: 38, returning_pct: 19 }],
    clicks: [{ event: "article_click", target: "A piece", clicks: 61, visitors: 47, pct_change: 34 }],
    pages: [{ path: "/", views: 402, visitors: 198, median_dwell_s: 74, pct_change: 18 }],
    sources: [{ source: "linkedin.com", visitors: 54 }],
    audience: [{ dimension: "country", value: "GB", visitors: 88 }],
  }),
};

const RULES = [
  ["Gmail: no <style> block, it is stripped in several contexts", (h) => !/<style[\s>]/i.test(h)],
  ["Gmail: no <link> to a stylesheet", (h) => !/<link[^>]+stylesheet/i.test(h)],
  ["Gmail clips at 102KB, taking the unsubscribe link with it", (h) => h.length < 102400],
  ["Outlook (Word): no flexbox or grid", (h) => !/display:\s*(flex|inline-flex|grid)/i.test(h)],
  ["Outlook (Word): no position absolute or fixed", (h) => !/position:\s*(absolute|fixed)/i.test(h)],
  ["Outlook (Word): no float for layout", (h) => !/float:\s*(left|right)/i.test(h)],
  ["Outlook (Word): no background-image", (h) => !/background-image/i.test(h)],

  ["Outlook (Word): no box-shadow or CSS transform", (h) => !/(box-shadow|[^-]\btransform:)/i.test(h)],
  ["Outlook (Word): no rem, vh or vw units, it understands px and pt", (h) => !/:\s*[\d.]+(rem|vh|vw)\b/i.test(h)],
  ["Outlook: every layout table declares cellpadding, cellspacing and border", (h) => {
    const tables = h.match(/<table[^>]*>/gi) ?? [];
    return tables.every((t) => /cellpadding=/i.test(t) && /cellspacing=/i.test(t) && /border=/i.test(t));
  }],
  ["Outlook: coloured cells carry a bgcolor attribute, not only CSS", (h) => {
    const coloured = h.match(/<td[^>]*style="[^"]*background:#[0-9a-f]{6}[^"]*"[^>]*>/gi) ?? [];
    return coloured.every((td) => /bgcolor=/i.test(td));
  }],
  ["Apple Mail and Outlook hide remote images by default: none used", (h) => !/<img[\s>]/i.test(h)],
  ["SVG is stripped almost everywhere: none used", (h) => !/<svg|\.svg/i.test(h)],
  ["No web fonts: they do not load in most clients", (h) => !/@font-face|fonts\.googleapis/i.test(h)],
  ["Every font declaration has a generic fallback", (h) => {
    const fams = h.match(/font-family:[^;"]+/gi) ?? [];
    return fams.every((f) => /(sans-serif|serif|monospace)/i.test(f));
  }],
  ["Mobile: fluid width, width=100% with a max-width", (h) => /width:100%;max-width:\d+px/i.test(h)],
  ["Mobile: viewport meta present", (h) => /name="viewport"/i.test(h)],
  ["Dark mode: color-scheme declared so clients invert predictably", (h) => /name="color-scheme"/i.test(h)],
  ["Accessibility: layout tables marked role=presentation", (h) => {
    const tables = h.match(/<table[^>]*>/gi) ?? [];
    return tables.every((t) => /role="presentation"/i.test(t));
  }],
  ["Accessibility: lang declared", (h) => /<html[^>]+lang=/i.test(h)],
  ["No JavaScript, which every client strips and some flag", (h) => !/<script/i.test(h)],
  ["No form elements, unsupported and a phishing signal", (h) => !/<(form|input|button)[\s>]/i.test(h)],
  ["Typography rule: no em or en dashes", (h) => !/[—–]/.test(h)],
];

let failed = 0;
for (const [name, html] of Object.entries(samples)) {
  console.log(`\n${name} (${(html.length / 1024).toFixed(1)}KB)`);
  for (const [rule, fn] of RULES) {
    const ok = fn(html);
    if (!ok) failed++;
    console.log(`  ${ok ? "pass" : "FAIL"}  ${rule}`);
  }
}

console.log(`\n${Object.keys(samples).length * RULES.length - failed} passed, ${failed} failed`);
console.log(
  [
    "",
    "What this does NOT prove, stated plainly:",
    "  Outlook 2016 to 2021 on Windows renders through Word and cannot be",
    "  emulated here. The rules above are what that engine needs, and they hold,",
    "  but only a real client or a service like Litmus proves the pixels.",
    "  Rendering is separately checked in WebKit, which is the engine Apple Mail",
    "  and iOS Mail actually use, and in Chromium, which is close to Gmail web.",
  ].join("\n"),
);

process.exit(failed ? 1 : 0);
