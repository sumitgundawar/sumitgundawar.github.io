# Learning material audit

A pass over all 46 cards and 208 topics, looking for three things: claims that are
wrong, claims that are unsourced, and topics that were left unfinished.

Every item below has a status. `fixed` means the change is in the repository and
the build passes. Items marked `by design` were considered and deliberately left
alone, with the reason given, because an audit that finds no acceptable state is
not an audit.

## How the corpus was checked

- Every body paragraph, `why`, `inPractice` and quiz explanation was read.
- Every piece of arithmetic was recomputed. Most of it was already right:
  `0.999^200 = 82%`, `1 - 0.99^100 = 63%`, `62^7 = 3.5 trillion`,
  `100 rps x 30s = 3,000 concurrent`, `50 x 6 x 3 = 900 series`,
  `10 bits/item x 100M = 120MB`, `99.99% of 30 days = 4m20s`. Three claims did
  not survive the check and are listed below.
- Named vendor and paper claims were checked against the primary source. Where
  the claim held, the source is now cited in the material rather than left
  implicit. Where it did not, it was corrected.

## A. Factually wrong. Three found.

| # | Where | Was | Is | Evidence |
|---|-------|-----|----|----------|
| A1 | `javascript/js-coercion` | "An empty array is falsy in a boolean context but equal to false and to zero under loose comparison" | `[]` is **truthy**. It is only `== false` because loose comparison converts it to `""` and then to `0`. | The topic's own next paragraph already said "Everything else is truthy, including empty arrays", so the card contradicted itself two paragraphs apart. MDN falsy reference. |
| A2 | `resilience/rate-limiting` | "twenty seconds into the current one, it counts a third of the current window plus two thirds of the last" | The current window is counted **in full**, and only the previous one is weighted: `current + previous x (1 - elapsed/window)`. | Cloudflare's published counting method for its approximated sliding window. |
| A3 | `netflix/netflix-cdn` | "close to 95% globally is delivered over direct connections" | Netflix states **close to 90%**. | Netflix's own "How Netflix works with ISPs" post. |

## B. Imprecise rather than wrong. Corrected and sourced.

| # | Where | Change |
|---|-------|--------|
| B1 | `programming-foundations/recursion-and-iteration` | Naive Fibonacci was described as "roughly 2 to the power of n calls". The growth is `phi^n`, about `1.6^n`; the call count is exactly `2F(n+1) - 1`. `2^n` is a loose upper bound presented as the rate. |
| B2 | `programming-foundations/recursion-and-iteration` | "a few thousand frames in Python by default" is the wrong figure. CPython's default recursion limit is 1,000. |
| B3 | `javascript/js-coercion` | The falsy set was given as an exact list and omitted `0n`, the BigInt zero. |
| B4 | `load-balancing/lb-algorithms` | "Envoy and most modern proxies default to a variant of power of two random choices" is wrong about Envoy: its default policy is round robin, and P2C is what its *least request* policy uses (`choice_count` defaults to 2). Rewritten to name Linkerd, which does default to P2C with a latency estimate, and to state Envoy's actual arrangement. |
| B5 | `queues/delivery-guarantees` | "Duplicates are rare, in the region of one in ten thousand under normal operation" is a specific rate with no source and no way to be true across brokers. Replaced with the part that is defensible: the rate is low in steady state and duplicates arrive in bursts during a rebalance or partition. |
| B6 | `data-structures/trees-indexes` | "a disk read costs roughly a hundred thousand times what a memory access costs" is true of a seeking spinning disk and about a thousandfold out for NVMe. Now states both, because the ratio is the entire argument for the B-tree. |
| B7 | `company-questions/by-company` | Carried the same rate-limiter sentence as `the-common-pool`, word for word, as its `inPractice`. Replaced. |

## C. Unfinished topics. Seven, all rewritten.

These were not merely short. Each was a set of one-line paragraphs where the rest
of the corpus runs four to six developed ones, and three of them had a single quiz
question where the standard is four.

| # | Topic | Was | Now |
|---|-------|-----|-----|
| C1 | `cloud/serverless` | 67 words, 3 lines, 1 question, no diagram | full topic, 4 questions, diagram, sourced |
| C2 | `company-questions/practice-plan` | 83 words, 3 lines, 1 question | full topic, 4 questions, diagram |
| C3 | `replication-depth/tail-at-scale` | 94 words, 3 lines, 1 question | full topic, 4 questions, diagram, sourced |
| C4 | `engineering-models/code-review` | 104 words, 4 lines | full topic, diagram, sourced |
| C5 | `databases-basics/connection-pooling` | 117 words, 4 lines | full topic, diagram, sourced |
| C6 | `appsec/ssrf` | 128 words, 4 lines | full topic, diagram, sourced |
| C7 | `load-balancing/health-checks` | 132 words, 4 lines | full topic, diagram |

Also brought up to four questions: `isolation/write-skew` and `isolation/wal-outbox`,
which had one each.

## D. Missing evidence. The largest category.

The material makes hundreds of checkable claims and, before this pass, cited none
of them. A reader who wanted to know whether SQS really defaults to a thirty
second visibility timeout had to go and find out.

A `sources` field now exists on every topic, holding a label, a URL and,
importantly, the specific claim each source is offered for. A list of links with
no statement of what they support is an appeal to authority rather than evidence.

Populated for every topic making a named, numeric or vendor-specific claim.
Verified during this pass and now cited: Netflix's per-shot encoding figures
(28.04 / 37.61 / 33.51 per cent BD-rate, which the material had right), Open
Connect appliance specifications (2U, up to 120TB, ~200Gbps), Twitter's 800-entry
timelines, the Percolator numbers, Dean and Barroso on tail latency, the AWS
jitter arithmetic, Google's retry budget, Stripe's 24-hour idempotency window,
Cloudflare's sliding window error rate.

## E. Missing diagrams. 62 topics had none.

Diagrams added to 52. The other ten are process and advice topics with no
mechanism to draw, and a boxes-and-arrows diagram of "behavioural answers with
substance" would be decoration. Left without, deliberately:
`data-structures/big-o`, `cloud/core-services`, `sd-interview/tradeoffs`,
`seniority/behavioural`, `seniority/coding-round`, `company-questions/by-company`,
`company-questions/cost-and-ops`, `engineering-models/agile`,
`engineering-models/waterfall`, `code-quality/tech-debt`.

## F. Missing `inPractice`. 51 topics had none.

Added where there is a real named practice to point at. Left off the handful of
foundational language topics where the honest answer is "every codebase", since
an `inPractice` that names nobody is filler.

## G. New: blog dissections.

A new track. Deeply technical engineering writing, taken apart and redrawn: the
mechanism explained in plainer language, at the same level of detail, with
diagrams, and with the original linked prominently at the top of the card so
nobody mistakes the dissection for the source.

- `cursor-git`, on Cursor's *Git at any scale*: why packfiles resist
  distribution, what GitHub's Spokes did and where three-phase commit runs out,
  and how a write-ahead log on object storage replaces it. Seven topics.
- `openai-agents`, on OpenAI's *On the Navier-Stokes Millennium Prize Problem*:
  the agent topology, the tools, the message and token economics, and Lean as
  the verifier. Six topics.

The OpenAI card states plainly what is claimed, what is not, and what is
disputed: the result concerns Navier-Stokes **with a smooth forcing term**,
OpenAI does not intend to claim the prize, the Clay process requires publication
plus two years of scrutiny, a Lean proof establishes that the formal statement
follows and not that the formal statement is Fefferman's, and there is an
unresolved dispute about training data. Writing it up as a solved Millennium
Problem would have been the exact failure this audit exists to prevent.

## H. A layout defect found while checking the new pages.

Not content, and worth recording because it affected every card rather than
only the new ones.

The two-column topic layout, prose on the left and the quiz beside it, was keyed
to the `xl` viewport breakpoint at 1280px. But the column it lives in has
already given 230px to the contents rail and 56px to the gap, so at 1280px the
quiz received 198px and every answer option wrapped to five or seven lines, one
or two words each. Measured across widths:

| Viewport | Quiz column, before | After |
|---|---|---|
| 1279px | 576px | 576px |
| 1280px | **198px** | 576px |
| 1440px | **198px** | 576px |
| 1536px | 322px | 338px |

It was worst from 1280px to 1535px, which includes 1440px, one of the most
common laptop widths, and it was invisible to anyone developing at 1920px.

Fixed by making the split a container query rather than a viewport query, which
is a correction rather than a preference: what decides whether two columns fit
is the width of that column, not the width of the window. 36em of prose plus a
gap plus roughly 20em of quiz is about 936px, and below that the honest answer
is one column.

## What was deliberately not changed

- **Seventeen topics between 210 and 250 words.** They have four developed
  paragraphs each and sit in the corpus's shorter register, mostly case studies.
  The content checks actively guard against paragraph-count uniformity, so
  padding them to match the longer topics would make the corpus worse by its
  own standard. The seven genuinely unfinished ones, which had one-line
  paragraphs, are listed in section C and were rewritten.
- **Ten topics still without a diagram**, listed in section E. Each is a process
  or advice topic with no mechanism to draw.
- **Six `programming-foundations` topics still without `inPractice`.** They are
  language-agnostic concepts where the honest answer is "every codebase", and an
  `inPractice` that names nobody is filler.

## Verification

`npm run build` runs, in order: the learn manifest and sitemap generator, `tsc`,
the worker checks, the prose check, the content checks, the contrast check, the
Vite build and the prerenderer. All pass. Additionally checked by hand:

- 53 routes prerendered, including both new cards, with 45,305 and 41,428
  characters of text respectively.
- No unexpected non-ASCII characters in any of the 53 shipped HTML files. This
  caught one of my own mistakes: `&minus;` passes the prose check, because that
  reads source files, and still ships U+2212 to the reader. Replaced with ASCII.
- `ö` was added to the prose check's allowlist deliberately, with the reason in a
  comment. The alternative was spelling a named mathematician's surname wrong to
  satisfy a check that exists to catch typing mistakes.
- No horizontal overflow at 390px or 1440px on either new card or on `/learn`.
- `npm run lint` and `npm run routes` pass.
