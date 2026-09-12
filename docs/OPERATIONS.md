# Operations

Constraints that were discovered by breaking things, and that are not derivable
from reading the code. They used to live as comments inside the files they
describe. The code is now comment-free, so they live here instead.

## Production is Cloudflare Pages, not GitHub Pages

`sumitgundawar.com` and `www.sumitgundawar.com` are served by the Cloudflare
Pages project `sumitgundawar`, which is **not** connected to git. Pushing to
`main` does not publish. The GitHub Actions workflow publishes to
`sumitgundawar.github.io`, which is not the live site.

To publish:

```bash
npm run build
npx wrangler pages deploy dist --project-name sumitgundawar --branch main
cd worker && npx wrangler deploy
```

Wrangler needs Node 22 or newer. If the default is older,
`export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"` first.

The Worker is deployed separately and holds `worker/src/topics.generated.ts`,
which is generated from the learn material by `npm run gen:topics`. If the
material changes and the Worker is not redeployed, the assistant answers from
stale text.

## The SPA catch-all, and why there is no 404.html

`public/_redirects` ends with `/*  /index.html  200`. That single line is the
reason the site moved to Cloudflare Pages: `/learn/caching` is served as
`index.html` with a 200 so the client router resolves it. On GitHub Pages the
same request is a real 404 that has to be bounced through `404.html` and a
redirect shim, and that shim shipped broken, turning `/` + `/learn` into
`//learn`, which the browser read as a hostname. Every shared link died.

Two attempts to make a missing asset honest were measured on preview
deployments, not reasoned about:

- `/assets/*  /404.html  404` with no such file: no effect at all. The rule is
  inert when its destination does not exist.
- The same rule plus a real `public/404.html`: the file's mere presence takes
  over routing, and `/learn`, `/build`, `/writing` and every `/learn/<card>`
  deep link returned 404. Confirmed on `redirect-test2.sumitgundawar.pages.dev`.

So a `404.html` cannot exist in this output while these routes are client-side.
The consequence is that an unknown URL answers 200 with the home page, which is
a soft 404. It is survivable because the home page canonicals to `/`, so search
engines consolidate rather than index the junk. The clean fix, if it is ever
worth doing, is in `functions/_middleware.ts`: it already runs on every request
and can return the shell with a 404 status for any path not in the generated
route list. That needs a preview deployment and a check that all 53 real routes
still answer 200.

## The www redirect cannot live in _redirects

The source side of a `_redirects` rule is a path, so it cannot match on
hostname. A rule written there with an absolute URL on the left is inert,
verified by deploying one and watching `www` keep answering 200. It lives in
`functions/_middleware.ts`, where the hostname is readable. Path and query are
preserved so a shared deep link on the wrong host lands on the right page.

Search Console had reported four URLs as "page with redirect". Three behaved.
The fourth, `https://www.sumitgundawar.com/`, served the whole site with a 200,
so the same content had two live addresses with only a canonical tag arguing
which counted. A canonical is a hint; a 301 is not.

## Asset caching has to be a Function

`_headers` matches on the request **path**, and a hit and a miss for a hashed
asset share one path, so there is no way to give them different caching there.
A rule saying `/assets/* max-age=31536000, immutable` therefore also applied to
the SPA fallback that Pages serves when an asset is missing, so one request in
the seconds after a deploy cached `index.html` under the new bundle's URL for a
year. The browser refuses `text/html` as a module script, so the whole site
rendered blank for everyone on that colo, with no remedy but a cache purge.
Measured: a request for `/assets/definitely-missing-xyz.js` returned 200,
`text/html`, `max-age=31536000, immutable`.

`functions/assets/[[path]].ts` sees the **response** and can tell a hit from a
miss. The discriminator is the content type: everything genuinely under
`/assets/` is JavaScript, CSS or a font, so an HTML response to an `/assets/`
request is the fallback, which means the asset is gone, which means the honest
answer is 404 and it must not be cached.

HTML itself must stay at `max-age=0, must-revalidate` or a deploy takes a day to
reach anyone.

## robots.txt has a managed block above it

Cloudflare prepends an AI Crawl Control block that disallows nine agents. It is
a dashboard default rather than a choice anyone made. `public/robots.txt` then
re-allows ClaudeBot, GPTBot, Google-Extended and the browser rendering crawler,
which works because RFC 9309 combines groups matching the same user-agent and
the least restrictive rule wins on an equal path match. Googlebot and Bingbot
were never in the managed block, so indexing was never affected by it. The
authoritative fix is to turn the setting off under AI Crawl Control in the
Cloudflare dashboard.

## DNS rollback

`DNS-ROLLBACK.md` holds the record state captured immediately before the
Cloudflare Pages migration, for going back to GitHub Pages.
