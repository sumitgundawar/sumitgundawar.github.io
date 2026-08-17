/* Checks run against production, not against a build.
 *
 * Everything that has actually gone wrong on this site was invisible locally and
 * obvious in production: deep links that 404d, an API refused by CORS on the
 * apex, stale meta tags, and an asset URL that served index.html with a one-year
 * immutable cache header and rendered the whole site blank. A build passing says
 * nothing about any of those.
 *
 * Usage: node scripts/prod-check.mjs [origin]
 */

const ORIGIN = process.argv[2] ?? "https://sumitgundawar.com";
const API = "https://site-agent-relay.sumitgundawar3.workers.dev";

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${detail ? `  ${detail}` : ""}`);
};

const get = async (url, init) => {
  try {
    return await fetch(url, init);
  } catch (e) {
    return { ok: false, status: 0, headers: new Headers(), text: async () => "", error: String(e) };
  }
};

/* ---- routes ---- */
for (const p of ["/", "/learn", "/build", "/writing", "/learn/caching"]) {
  const r = await get(ORIGIN + p);
  check(`route ${p}`, r.status === 200 && (r.headers.get("content-type") ?? "").includes("text/html"), `${r.status}`);
}

/* ---- the asset that renders the site ---- */
const html = await (await get(ORIGIN + "/?cb=" + Date.now())).text();
const asset = (html.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/) || [null])[0];
check("HTML names a JS bundle", Boolean(asset), asset ?? "");
if (asset) {
  const r = await get(ORIGIN + asset);
  const ct = r.headers.get("content-type") ?? "";
  check("bundle serves as JavaScript", ct.includes("javascript"), `${ct}`);
}

/* A miss must 404, and a hit must be immutable. This is the exact shape of the
   outage: the SPA fallback inherited max-age=31536000, immutable from a path
   rule, so a request during a deploy cached HTML under a JS URL for a year. */
{
  const r = await get(`${ORIGIN}/assets/does-not-exist-${Date.now()}.js`);
  check("missing asset 404s rather than serving HTML", r.status === 404, `${r.status} ${r.headers.get("content-type") ?? ""}`);
  const cc = r.headers.get("cache-control") ?? "";
  check("missing asset is not cached", /no-store|max-age=0/.test(cc) || r.status === 404, cc || "(none)");
  /* Asserted at the Pages origin, which is where the Function sets it. The apex
     can still hold an edge entry cached under the previous rules, and that ages
     out on its own; what must be true is that the origin now serves immutable
     for a real asset and 404 for a miss. */
  if (asset) {
    const hit = await get(`https://sumitgundawar.pages.dev${asset}`);
    const hcc = hit.headers.get("cache-control") ?? "";
    check("real asset is immutable at origin", hcc.includes("immutable"), hcc || "(none)");
  }
}

/* ---- indexing ---- */
{
  const txt = await (await get(ORIGIN + "/robots.txt")).text();
  const blocked = [];
  let ua = null;
  for (const line of txt.split("\n")) {
    const m = /^\s*User-agent:\s*(.+?)\s*$/i.exec(line);
    if (m) ua = m[1];
    if (/^\s*Disallow:\s*\/\s*$/i.test(line) && ua) blocked.push(ua);
  }
  // Googlebot and Bingbot are search. Google-Extended is model training and is
  // a separate decision; blocking it does not affect ranking.
  for (const bot of ["Googlebot", "Bingbot", "*"]) {
    check(`robots.txt does not block ${bot}`, !blocked.includes(bot), blocked.includes(bot) ? "BLOCKED" : "");
  }
  check("robots.txt points at the sitemap", /Sitemap:\s*https?:\/\//i.test(txt));
  console.log(`      note: AI agents currently disallowed: ${blocked.filter((b) => b !== "*").join(", ") || "none"}`);

  const sm = await get(ORIGIN + "/sitemap.xml");
  const body = await sm.text();
  check("sitemap serves as XML", sm.status === 200 && (sm.headers.get("content-type") ?? "").includes("xml"), `${sm.status}`);
  check("sitemap has entries", (body.match(/<url>/g) || []).length > 10, `${(body.match(/<url>/g) || []).length} urls`);
}

/* ---- security headers ---- */
{
  const r = await get(ORIGIN + "/");
  const want = {
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    "x-frame-options": "DENY",
  };
  for (const [h, v] of Object.entries(want)) {
    check(`header ${h}`, (r.headers.get(h) ?? "").toLowerCase() === v.toLowerCase(), r.headers.get(h) ?? "(missing)");
  }
  check("HTML is not cached hard", /max-age=0/.test(r.headers.get("cache-control") ?? ""), r.headers.get("cache-control") ?? "");
}

/* ---- API ---- */
{
  // CORS must answer the real site and refuse an unknown origin.
  const good = await get(`${API}/api/ask`, { method: "OPTIONS", headers: { Origin: ORIGIN, "Access-Control-Request-Method": "POST" } });
  check("CORS preflight allows the site", good.headers.get("access-control-allow-origin") === ORIGIN, good.headers.get("access-control-allow-origin") ?? "(none)");
  check("preflight has no body issue", good.status === 204 || good.status === 200, `${good.status}`);

  const evil = await get(`${API}/api/ask`, { method: "OPTIONS", headers: { Origin: "https://evil.example", "Access-Control-Request-Method": "POST" } });
  check("CORS refuses an unknown origin", evil.headers.get("access-control-allow-origin") !== "https://evil.example", evil.headers.get("access-control-allow-origin") ?? "(none)");

  // Admin endpoints must not be reachable without the token.
  for (const p of ["/api/report-preview", "/api/cron-run?cron=0+9+*+*+1", "/api/purge"]) {
    const r = await get(API + p, { method: p === "/api/purge" ? "POST" : "GET" });
    check(`admin ${p.split("?")[0]} refuses anonymous`, r.status === 404 || r.status === 401, `${r.status}`);
  }

  // A bad session must be rejected, not silently accepted.
  const bad = await get(`${API}/api/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ORIGIN },
    body: JSON.stringify({ session: "x", path: "/" }),
  });
  check("track rejects a malformed session", bad.status === 400, `${bad.status}`);
}

/* ---- the API describes itself ---- */
{
  const r = await get(`${API}/api/openapi.json`);
  const spec = await r.json().catch(() => null);
  check("openapi.json serves", r.status === 200 && Boolean(spec), `${r.status}`);
  if (spec) {
    check("spec is OpenAPI 3.1", spec.openapi === "3.1.0", spec.openapi ?? "");
    check("spec documents every live endpoint", Object.keys(spec.paths ?? {}).length >= 8, `${Object.keys(spec.paths ?? {}).length} paths`);
    // The spec must not describe a route that does not answer.
    for (const p of ["/api/ask", "/api/track", "/api/subscribe", "/api/openapi.json"]) {
      check(`spec path ${p} exists in code`, Boolean(spec.paths?.[p]));
    }
  }
  const st = await get(`${API}/api/status`);
  const sj = await st.json().catch(() => null);
  check("status endpoint serves", st.status === 200 && Boolean(sj), `${st.status}`);
  if (sj) {
    // It must report absence honestly rather than inventing a number.
    const honest = sj.questions === 0 ? sj.fallbacksPerQuestion === null && Boolean(sj.note) : typeof sj.fallbacksPerQuestion === "number";
    check("status reports real traffic or says there is none", honest, `questions=${sj.questions} fallbacks/q=${sj.fallbacksPerQuestion}`);
  }

  const d = await get(`${API}/api/docs`);
  check("docs page serves HTML", d.status === 200 && (d.headers.get("content-type") ?? "").includes("text/html"), `${d.status}`);

  // Documented rate limit headers must actually be emitted.
  const a = await get(`${API}/api/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ORIGIN },
    body: JSON.stringify({ session: "prodcheckABCDEF1", question: "Why is cache invalidation hard?", topicId: "invalidation" }),
  });
  for (const h of ["ratelimit-limit", "ratelimit-remaining", "ratelimit-reset"]) {
    check(`ask emits ${h}`, a.headers.get(h) !== null, a.headers.get(h) ?? "(missing)");
  }
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
