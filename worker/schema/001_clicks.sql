-- Click analytics.
--
-- In D1 rather than in Supabase, and that is a deliberate choice rather than a
-- shortcut. The existing analytics tables live in Supabase, but creating a new
-- one there needs DDL, which needs either the database password or a management
-- token, and neither is available to this project's tooling. D1 is provisioned
-- by the same wrangler credential that already deploys the Worker, so this
-- dataset can exist today instead of waiting on a secret.
--
-- It splits nothing: click_events never existed anywhere. Every click on the
-- site was going only to Google Analytics, and to nowhere at all for the share
-- of a technical audience that blocks it, so there is no table to be consistent
-- with. Consolidating on one store is worth doing the day the Supabase
-- credential exists; until then this answers the question that was asked, which
-- is which cards and sections people actually reach for.

create table if not exists click_events (
  id          integer primary key autoincrement,
  session_key text    not null,
  event       text    not null,           -- article_click, cv_download, ...
  target      text,                       -- which article, which episode
  path        text,                       -- where on the site it happened
  created_at  integer not null            -- epoch seconds, UTC
);

-- Every query filters on time and groups by event, so both earn an index.
create index if not exists click_events_time on click_events (created_at desc);
create index if not exists click_events_event on click_events (event, created_at desc);
