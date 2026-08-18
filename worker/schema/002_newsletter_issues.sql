-- The newsletter archive.
--
-- Until now a broadcast existed only in the inboxes it reached. Nothing kept a
-- copy, so an issue could not be linked to, could not be read by someone
-- deciding whether to subscribe, and could not be found by search at all. That
-- makes every issue a one-off cost with a one-off return, which is the wrong
-- shape for writing that is meant to be the reason to subscribe.
--
-- In D1 for the same reason click_events is: creating a table in Supabase needs
-- DDL and a credential this project does not hold, and D1 is provisioned by the
-- wrangler login that already deploys this Worker.
--
-- The HTML stored here is the same body that was mailed, so the archive cannot
-- drift from what people received. Rendering it for the web is the reader's
-- side of the problem, not a second copy of the text.

create table if not exists newsletter_issues (
  id          integer primary key autoincrement,
  slug        text    not null unique,    -- 2026-08-18-what-broke-this-week
  subject     text    not null,
  html        text    not null,
  text        text,                       -- plain part, for the reading view
  recipients  integer not null default 0, -- how many it was queued for
  sent_at     integer not null            -- epoch seconds, UTC
);

-- The archive is always read newest first, and an issue is fetched by slug.
create index if not exists newsletter_issues_sent on newsletter_issues (sent_at desc);
