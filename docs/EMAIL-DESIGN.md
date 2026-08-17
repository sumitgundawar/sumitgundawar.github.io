# Email design

The rules every email from this site follows. Read this before writing a new
one; the tokens and components in `worker/src/email.ts` are the implementation
of it, so use those rather than writing markup by hand.

The short version: these should look like they came from the same person who
built the site, and they should arrive in the inbox rather than the Promotions
tab. Those two goals agree more than they conflict. Restrained, typographic mail
looks better *and* reads as correspondence rather than marketing.

---

## Why email is not the web

None of the site's CSS survives here, and the reasons are worth stating once so
nobody re-litigates them per email.

| Constraint | Why |
|---|---|
| No `<style>` block | Gmail strips it in several contexts. Every rule is inline. |
| No flexbox, no grid | Outlook on Windows renders through Word, which supports neither. Layout is tables. |
| No web fonts | They do not load in most clients. System stacks only. |
| No remote images | Apple Mail and Outlook hide them by default, and Apple's Mail Privacy Protection pre-fetches them, so they are unreliable both ways. Anything visual is drawn with table cells. |
| No SVG | Blocked or stripped almost everywhere. |
| No border-radius reliance | Inconsistent, and the site is square anyway. |
| Keep under 102KB | Gmail clips the message past that and hides the unsubscribe link with it. |
| 600px, with `max-width` | The width every client agrees on, collapsing to full width on a phone. |

Dark mode is not fought. Clients invert unpredictably, so the palette is light
with genuinely dark text, which survives inversion legibly instead of turning
grey on grey.

---

## Palette

Derived from the site, adjusted for a light canvas. The site is dark; these are
the same hues at the contrast a white background needs. Ratios measured, not
guessed.

| Token | Value | Use | Contrast |
|---|---|---|---|
| `PAPER` | `#f4f4f2` | Page behind the card | — |
| `CARD` | `#ffffff` | The message surface | — |
| `INK` | `#14171a` | Headings and body | 17.99:1 on card |
| `DIM` | `#5f6660` | Secondary text, labels | 5.91:1 on card |
| `LINE` | `#e3e3df` | Hairlines and rules | 1.29:1, a boundary not text |
| `ACCENT` | `#0b6b46` | Links, the rule under the wordmark | 6.55:1 on card |
| `WARN` | `#b45309` | Alerts only | — |

The site's `--signal` green `#3dd68c` is **not** used as text or as a link. It
measures **1.88:1 on white**, which is invisible to a lot of people. It appears
only as a solid block where nothing is written on it.

Colour carries meaning. `WARN` means something needs attention. Nothing is
coloured for decoration.

---

## Type

| Role | Size | Family | Notes |
|---|---|---|---|
| Wordmark | 18px / 600 | sans | The domain, not a logo |
| Heading | 20px / 600 | sans | One per email |
| Body | 15px / 1.6 | sans | The default |
| Secondary | 14px / 1.55 | sans | Supporting lines |
| Label | 11px / uppercase / `.12em` | **mono** | Eyebrows, the site's own grammar |
| Figure | 26px / 600 | sans | A number worth reading alone |
| Fine print | 12px | sans | Footer, provenance |

Stacks:

```
sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif
mono: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace
```

The mono uppercase label is what makes these read as the site's mail rather than
a template. Use it for every eyebrow and every column header.

---

## Structure

Every email is the same skeleton, in this order:

1. **Preheader** — one hidden line. The text Gmail shows beside the subject. If
   it is missing the client invents one from the first words of the body, which
   is always worse.
2. **Wordmark** — `sumitgundawar.com`, with a 40px `ACCENT` rule under it. The
   rule is the only ornament in the system.
3. **Heading and lede** — what this is, in one sentence.
4. **Body** — sections, each with a mono label.
5. **Footer** — above a hairline: why they are receiving it, and how to stop.

Spacing is 28px horizontal padding, 22 to 28px between blocks. Generous, because
the alternative to whitespace in email is clutter.

---

## Landing in the inbox, not Promotions

Gmail's tabs are heuristic and personalised, so nothing here is a guarantee.
These are the levers that actually move it, in order of effect.

1. **Authenticate properly.** SPF, DKIM and **DMARC** all present. Gmail has
   required DMARC from bulk senders since February 2024, and its absence is the
   single biggest cause of Promotions or spam placement.
2. **Send from a person, with a display name.** `Sumit Gundawar <sumit@...>`
   beats `reports@...`. A bare role address reads as a system.
3. **Set `Reply-To`.** Mail nobody can reply to is not correspondence.
4. **Write like a letter.** One idea, one link, a signature. Multi-column
   layouts, several calls to action and a large coloured button are the exact
   shape Gmail classifies as promotional.
5. **Keep the text part real.** A plain-text alternative that matches the HTML
   improves the ratio Gmail looks at. Do not ship an empty one.
6. **Keep `List-Unsubscribe` with One-Click.** It does not cause Promotions. Its
   absence causes spam complaints, which are far worse.
7. **No image-only mail, no tracking pixel in the welcome.**

The transactional emails, welcome and alerts, follow all of these. The weekly
report is a dashboard by nature and is allowed its figures and bars; it goes to
one person, the owner, so its placement matters less.

---

## Components

Implemented in `worker/src/email.ts`. Compose from these; do not hand-write
table markup.

| Component | Purpose |
|---|---|
| `shell(...)` | Preheader, page table, card, wordmark, footer |
| `heading(text)` | The single 20px heading |
| `lede(text)` | The sentence under it |
| `para(text)` | Body paragraph |
| `label(text)` | Mono uppercase eyebrow |
| `rule()` | Hairline separator |
| `statRow(cells)` | Up to four figures across |
| `bar(...)` | A proportion, drawn as two table cells |
| `listRow(...)` | Label left, value right, hairline under |
| `link(href, text)` | An `ACCENT` link |

Everything escapes its input with `esc()`. Values that reach these come from
request data, so an unescaped one is an injection into the owner's own inbox.

---

## Checklist before shipping an email

Run against the rendered HTML, not the source:

- [ ] No `<style>`, no `flex`, no `grid`, no `<img>`, no SVG
- [ ] No em dashes, en dashes or the other banned characters
- [ ] Hostile input escapes (`<script>` in every interpolated field)
- [ ] Under 102KB
- [ ] No horizontal overflow at 390px and 800px
- [ ] Plain-text part carries the same information
- [ ] `List-Unsubscribe` and `List-Unsubscribe-Post` present on bulk mail
- [ ] Sent to a real inbox and confirmed delivered, not merely accepted
