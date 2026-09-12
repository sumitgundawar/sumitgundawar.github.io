const MAX_ROWS = 50_000;
const VISIT_GAP_MS = 30 * 60 * 1000;

export interface PageViewRow {
  session_key: string;
  path: string | null;
  dwell_ms: number | null;
  created_at: string;
}
export interface SessionRow {
  referrer: string | null;
  country: string | null;
  device: string | null;
  last_seen: string;
}

export type Query = (path: string) => Promise<unknown>;

const since = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

async function rows<T>(query: Query, path: string): Promise<T[]> {
  try {
    const r = await query(path);
    return Array.isArray(r) ? (r as T[]) : [];
  } catch {
    return [];
  }
}

function visitsOf(views: PageViewRow[]): { session: string; pages: number; seconds: number }[] {
  const bySession = new Map<string, PageViewRow[]>();
  for (const v of views) {
    const list = bySession.get(v.session_key);
    if (list) list.push(v);
    else bySession.set(v.session_key, [v]);
  }

  const visits: { session: string; pages: number; seconds: number }[] = [];
  for (const [session, list] of bySession) {
    list.sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
    let start = 0;
    for (let i = 1; i <= list.length; i++) {
      const broke =
        i === list.length ||
        new Date(list[i].created_at).getTime() - new Date(list[i - 1].created_at).getTime() > VISIT_GAP_MS;
      if (!broke) continue;
      const slice = list.slice(start, i);
      const span = (new Date(slice[slice.length - 1].created_at).getTime() - new Date(slice[0].created_at).getTime()) / 1000;
      const dwell = slice.reduce((s, v) => s + (v.dwell_ms ?? 0), 0) / 1000;

      visits.push({ session, pages: slice.length, seconds: Math.max(span, dwell) });
      start = i;
    }
  }
  return visits;
}

const median = (xs: number[]): number | null => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export async function visitShape(query: Query, days: number) {
  const views = await rows<PageViewRow>(
    query,
    `page_views?select=session_key,created_at,dwell_ms&created_at=gte.${since(days)}&limit=${MAX_ROWS}`,
  );
  if (!views.length) return [];

  const visits = visitsOf(views);
  const visitors = new Set(visits.map((v) => v.session)).size;

  const earlier = await rows<{ session_key: string }>(
    query,
    `page_views?select=session_key&created_at=lt.${since(days)}&limit=${MAX_ROWS}`,
  );
  const known = new Set(earlier.map((r) => r.session_key));
  const returning = new Set(visits.map((v) => v.session).filter((s) => known.has(s))).size;

  return [
    {
      visits: visits.length,
      visitors,
      median_seconds: Number((median(visits.map((v) => v.seconds)) ?? 0).toFixed(1)),
      median_pages: Number((median(visits.map((v) => v.pages)) ?? 0).toFixed(1)),
      single_page_pct: Math.round((100 * visits.filter((v) => v.pages === 1).length) / Math.max(visits.length, 1)),
      returning_pct: Math.round((100 * returning) / Math.max(visitors, 1)),
    },
  ];
}

export async function pagePopularity(query: Query, days: number) {
  const [cur, prev] = await Promise.all([
    rows<PageViewRow>(query, `page_views?select=path,session_key,dwell_ms,created_at&created_at=gte.${since(days)}&limit=${MAX_ROWS}`),
    rows<PageViewRow>(
      query,
      `page_views?select=path,created_at&created_at=gte.${since(days * 2)}&created_at=lt.${since(days)}&limit=${MAX_ROWS}`,
    ),
  ]);

  const before = new Map<string, number>();
  for (const r of prev) if (r.path) before.set(r.path, (before.get(r.path) ?? 0) + 1);

  const acc = new Map<string, { views: number; visitors: Set<string>; dwell: number[] }>();
  for (const r of cur) {
    if (!r.path) continue;
    const e = acc.get(r.path) ?? { views: 0, visitors: new Set<string>(), dwell: [] };
    e.views++;
    e.visitors.add(r.session_key);
    if (typeof r.dwell_ms === "number") e.dwell.push(r.dwell_ms);
    acc.set(r.path, e);
  }

  return [...acc.entries()]
    .map(([path, e]) => {
      const was = before.get(path);
      const med = median(e.dwell);
      return {
        path,
        views: e.views,
        visitors: e.visitors.size,
        median_dwell_s: med === null ? null : Number((med / 1000).toFixed(1)),
        pct_change: was ? Math.round(((e.views - was) / was) * 100) : null,
      };
    })
    .sort((a, b) => b.views - a.views);
}

export async function trafficSources(query: Query, days: number) {
  const rs = await rows<SessionRow>(query, `sessions?select=referrer,last_seen&last_seen=gte.${since(days)}&limit=${MAX_ROWS}`);
  const acc = new Map<string, number>();
  for (const r of rs) {
    let source = "direct";
    if (r.referrer) {
      const m = /^https?:\/\/(?:www\.)?([^/?#]+)/.exec(r.referrer);
      if (m) source = m[1];
    }
    acc.set(source, (acc.get(source) ?? 0) + 1);
  }
  return [...acc.entries()].map(([source, visitors]) => ({ source, visitors })).sort((a, b) => b.visitors - a.visitors);
}

export async function audienceSplit(query: Query, days: number) {
  const rs = await rows<SessionRow>(
    query,
    `sessions?select=country,device,last_seen&last_seen=gte.${since(days)}&limit=${MAX_ROWS}`,
  );
  const out: { dimension: string; value: string; visitors: number }[] = [];
  for (const dim of ["country", "device"] as const) {
    const acc = new Map<string, number>();
    for (const r of rs) {
      const v = (r[dim] ?? "unknown") || "unknown";
      acc.set(v, (acc.get(v) ?? 0) + 1);
    }
    for (const [value, visitors] of acc) out.push({ dimension: dim, value, visitors });
  }
  return out.sort((a, b) => (a.dimension === b.dimension ? b.visitors - a.visitors : a.dimension < b.dimension ? -1 : 1));
}
