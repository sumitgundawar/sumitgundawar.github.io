-- Analytics depth: clicks, visit shape, and page popularity.
--
-- Run this once in the Supabase SQL editor. Everything here is additive and
-- idempotent, so re-running it is safe and it cannot disturb the existing
-- sessions, page_views, quiz_events, ai_* or subscribers tables.
--
-- Why this exists: the weekly report had four numbers in it because four numbers
-- were all the database could answer. Clicks were never stored at all (they went
-- only to Google Analytics), and referrer, country, path and dwell were stored
-- but never aggregated. This adds the one missing table and the queries that
-- turn what is already collected into something worth reading.
--
-- One modelling note that shapes most of the SQL below. The session key is held
-- in localStorage, so it identifies a VISITOR across visits, not a single visit.
-- Taking max(created_at) - min(created_at) per key would therefore report a
-- "session length" of several days for anyone who came back. Visits are instead
-- cut out of the page_view stream on a 30 minute inactivity gap, which is the
-- conventional definition and the only one that makes the number mean anything.

-- ---------------------------------------------------------------------------
-- 1. Clicks
-- ---------------------------------------------------------------------------

create table if not exists click_events (
  id          bigserial primary key,
  session_key text        not null,
  event       text        not null,          -- article_click, cv_download, ...
  target      text,                          -- which article, which podcast
  path        text,                          -- where on the site it happened
  created_at  timestamptz not null default now()
);

-- Every query below filters on created_at and groups by event, so both earn an
-- index. click_events is append-only and will be the largest table here.
create index if not exists click_events_created_idx on click_events (created_at desc);
create index if not exists click_events_event_idx   on click_events (event, created_at desc);

-- Coarse device class, set from the user agent at write time. Deliberately not
-- a full UA string: the class is what changes a decision about layout, and the
-- full string is a fingerprinting surface with no matching benefit.
alter table sessions add column if not exists device text;

-- ---------------------------------------------------------------------------
-- 2. Visits, cut on a 30 minute inactivity gap
-- ---------------------------------------------------------------------------

-- Shared by the visit-shape and returning-visitor queries. Returns one row per
-- visit rather than per visitor.
create or replace function visits_in_window(days int)
returns table (
  session_key text,
  visit_no    bigint,
  started_at  timestamptz,
  pages       bigint,
  span_s      numeric,
  dwell_s     numeric
)
language sql
stable
as $$
  with ordered as (
    select
      p.session_key,
      p.created_at,
      p.dwell_ms,
      case
        when lag(p.created_at) over w is null
          or p.created_at - lag(p.created_at) over w > interval '30 minutes'
        then 1 else 0
      end as starts_visit
    from page_views p
    where p.created_at >= now() - make_interval(days => days)
    window w as (partition by p.session_key order by p.created_at)
  ),
  marked as (
    select
      o.*,
      sum(o.starts_visit) over (partition by o.session_key order by o.created_at) as visit_no
    from ordered o
  )
  select
    m.session_key,
    m.visit_no,
    min(m.created_at)                                          as started_at,
    count(*)                                                   as pages,
    extract(epoch from (max(m.created_at) - min(m.created_at))) as span_s,
    sum(coalesce(m.dwell_ms, 0)) / 1000.0                      as dwell_s
  from marked m
  group by m.session_key, m.visit_no
$$;

-- How long people stay and how much they look at, as one row of numbers.
--
-- Length is the greater of elapsed span and summed dwell. Span alone reports 0
-- for a single-page visit, which is the commonest visit there is and not a
-- zero-second one; dwell alone undercounts a visit that sat idle between pages.
create or replace function visit_shape(days int default 7)
returns table (
  visits           bigint,
  visitors         bigint,
  median_seconds   numeric,
  median_pages     numeric,
  single_page_pct  numeric,
  returning_pct    numeric
)
language sql
stable
as $$
  with v as (select * from visits_in_window(days)),
  prior as (
    -- Seen before this window at all, which is what makes a visitor returning.
    select distinct p.session_key
    from page_views p
    where p.created_at < now() - make_interval(days => days)
  )
  select
    count(*)::bigint,
    count(distinct v.session_key)::bigint,
    round(percentile_cont(0.5) within group (order by greatest(v.span_s, v.dwell_s))::numeric, 1),
    round(percentile_cont(0.5) within group (order by v.pages)::numeric, 1),
    round(100.0 * count(*) filter (where v.pages = 1) / greatest(count(*), 1)),
    round(100.0 * count(distinct v.session_key) filter (where v.session_key in (select session_key from prior))
                / greatest(count(distinct v.session_key), 1))
  from v
$$;

-- ---------------------------------------------------------------------------
-- 3. What gets clicked
-- ---------------------------------------------------------------------------

create or replace function click_breakdown(days int default 7)
returns table (
  event      text,
  target     text,
  clicks     bigint,
  visitors   bigint,
  pct_change numeric
)
language sql
stable
as $$
  with cur as (
    select c.event, coalesce(c.target, '') as target,
           count(*) as clicks, count(distinct c.session_key) as visitors
    from click_events c
    where c.created_at >= now() - make_interval(days => days)
    group by 1, 2
  ),
  prev as (
    select c.event, coalesce(c.target, '') as target, count(*) as clicks
    from click_events c
    where c.created_at >= now() - make_interval(days => days * 2)
      and c.created_at <  now() - make_interval(days => days)
    group by 1, 2
  )
  select
    cur.event, cur.target, cur.clicks, cur.visitors,
    case
      when prev.clicks is null or prev.clicks = 0 then null
      else round(((cur.clicks - prev.clicks)::numeric / prev.clicks) * 100)
    end
  from cur
  left join prev on prev.event = cur.event and prev.target = cur.target
  order by cur.clicks desc
$$;

-- ---------------------------------------------------------------------------
-- 4. Which pages are read, and which are ignored
-- ---------------------------------------------------------------------------

-- The interesting half of this is the tail, not the head. A page nobody opens is
-- either badly titled or badly placed, and neither is visible from a list sorted
-- by popularity alone, so the report reads this from both ends.
create or replace function page_popularity(days int default 7)
returns table (
  path           text,
  views          bigint,
  visitors       bigint,
  median_dwell_s numeric,
  pct_change     numeric
)
language sql
stable
as $$
  with cur as (
    select p.path,
           count(*) as views,
           count(distinct p.session_key) as visitors,
           round((percentile_cont(0.5) within group (order by p.dwell_ms))::numeric / 1000.0, 1) as median_dwell_s
    from page_views p
    where p.created_at >= now() - make_interval(days => days)
    group by 1
  ),
  prev as (
    select p.path, count(*) as views
    from page_views p
    where p.created_at >= now() - make_interval(days => days * 2)
      and p.created_at <  now() - make_interval(days => days)
    group by 1
  )
  select
    cur.path, cur.views, cur.visitors, cur.median_dwell_s,
    case
      when prev.views is null or prev.views = 0 then null
      else round(((cur.views - prev.views)::numeric / prev.views) * 100)
    end
  from cur
  left join prev on prev.path = cur.path
  order by cur.views desc
$$;

-- ---------------------------------------------------------------------------
-- 5. Where people come from
-- ---------------------------------------------------------------------------

-- Referrers are normalised to a host. The full URL splits one source across
-- dozens of rows and answers nothing that the host does not.
create or replace function traffic_sources(days int default 7)
returns table (
  source   text,
  visitors bigint
)
language sql
stable
as $$
  select
    case
      when s.referrer is null or s.referrer = '' then 'direct'
      else coalesce(
        nullif(regexp_replace(s.referrer, '^https?://(www\.)?([^/?#]+).*$', '\2'), ''),
        'direct'
      )
    end as source,
    count(*)::bigint as visitors
  from sessions s
  where s.last_seen >= now() - make_interval(days => days)
  group by 1
  order by 2 desc
$$;

create or replace function audience_split(days int default 7)
returns table (
  dimension text,
  value     text,
  visitors  bigint
)
language sql
stable
as $$
  select 'country', coalesce(s.country, 'unknown'), count(*)::bigint
  from sessions s
  where s.last_seen >= now() - make_interval(days => days)
  group by 2
  union all
  select 'device', coalesce(s.device, 'unknown'), count(*)::bigint
  from sessions s
  where s.last_seen >= now() - make_interval(days => days)
  group by 2
  order by 1, 3 desc
$$;
