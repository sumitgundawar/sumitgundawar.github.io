# sumitgundawar.com

Personal site, built as a status page rather than a portfolio: a profile that
reports what is running, plus a system design course, an architecture builder
and a writing index. React, TypeScript and Vite on the front, a Cloudflare
Worker behind it doing the work that needs a server.

Live at [sumitgundawar.com](https://sumitgundawar.com).

## What is here

| Route | What it is |
| --- | --- |
| `/` | Profile as a status page: work, writing, speaking, education, live signals |
| `/learn` | System design material: 34 cards, 143 topics, diagrams and quiz questions, including five long case studies |
| `/learn/:cardId` | One card, with its topics, diagrams and checks |
| `/build` | An interview that sizes an architecture to what you are building, and shows what was considered instead |
| `/writing` | Published articles, pointing at the publishers as canonical |

## Stack

**Site.** React 18, TypeScript, Vite 7, Tailwind CSS 4, React Router. No UI
framework and no animation library: the diagrams are hand-drawn SVG and the
motion is CSS, so the page weight stays where it should be.

**API.** A single Cloudflare Worker (`worker/`), deployed separately from the
site, with:

- **KV** for rate limiting and cached answers, because an in-memory limiter in a
  Worker lives in one isolate and does close to nothing
- **D1** for click analytics
- **Queues** for newsletter delivery, so a provider's daily cap becomes
  backpressure instead of silent truncation
- **Cron triggers** for the weekly report and the daily alert check
- **Supabase** over PostgREST for sessions, progress and assistant history
- **NVIDIA NIM** as a model chain with fallback, streamed to the browser
- **Resend** for transactional and newsletter email

**Hosting.** Cloudflare Pages, with a Pages Function restoring immutable caching
for hashed assets, and prerendered HTML for every route so each page carries its
own crawlable text.

## Running it

```bash
npm install
npm run dev            # site at localhost:5173
cd worker && npx wrangler dev
```

Wrangler needs Node 22 or newer, which is a stricter requirement than the site's.

## Checks

Everything the project claims to hold is a check, and each one caught a real
defect the first time it ran. `npm run build` runs the first five; the rest are
run against production or against a bundled Worker module.

| Command | What it proves |
| --- | --- |
| `npm run build` | Types, worker checks, prose, content, contrast, then Vite and prerender |
| `npm run check:worker` | Worker typechecks, and every cron and handler is actually wired up |
| `npm run check:prose` | No em dashes, en dashes or smart quotes anywhere in the content |
| `npm run check:content` | Quiz answers exist, are unique, and do not give themselves away by length |
| `npm run check:contrast` | Every colour pair in the palette meets WCAG contrast at its size |
| `npm run check:prod` | 45 assertions against the deployed site: headers, redirects, routes, feeds |
| `npm run check:security` | 30 assertions: CSP, CORS, rate limits, secret handling, input validation |
| `npm run check:email` | 69 rules for Outlook, Gmail and Apple Mail compatibility |
| `npm run check:newsletter` | 12 tests over the queue consumer, budget and idempotency |
| `npm run check:robots` | robots.txt behaviour under RFC 9309 group matching |
| `npm run routes` | Every route returns 200 with real text, not the SPA shell |

## Deploying

```bash
npm run build
npx wrangler pages deploy dist --project-name sumitgundawar --branch main
cd worker && npx wrangler deploy
```

Secrets are set with `wrangler secret put` and never live in `wrangler.jsonc`,
which is public. `scripts/SETUP.md` lists what has to exist.

## Contact

- Email: sumitgundawar3@gmail.com
- LinkedIn: https://www.linkedin.com/in/sumit-gundawar-759470129/
- GitHub: https://github.com/sumitgundawar
