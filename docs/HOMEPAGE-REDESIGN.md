# Homepage redesign: cinematic, type-led, one accent

Working spec. Everything here is decided; nothing in it is a suggestion.

## The direction, in one sentence

A cinematic, type-led, near-black page where Sumit is the subject, the accent is used almost
nowhere, and every piece of motion is a scripted entrance that plays once and then rests.

Three rules that follow from it, and that the current page breaks:

1. **The hero event is the type.** Not a panel, not a card, not a form. A giant surname with the
   portrait composited in front of it.
2. **Motion is orchestrated, finite and front-loaded.** An entrance sequence on load, scroll-triggered
   reveals that fire once and never reverse, and then the page is still. Nothing loops. Nothing
   recomputes at rest.
3. **One accent, spent deliberately.** Red on the surname, the eyebrow dots, the outcome figures and
   the live states. Everything else is off-white on near-black.

## Stack decisions

- **TSX, in the existing React app.** Not a single HTML file. The site has 56 prerendered routes and
  15 build gates; those stay.
- **No WebGL.** Removed. `TransformerScene` and `ShaderField` are off the homepage.
- **No perpetual loops.** `check:motion` enforces this: the page must rest at 3 frames a second or
  fewer, with no more than 2 of 7 sampled frames differing, and be completely still under
  `prefers-reduced-motion`.
- **No Lenis.** Smooth-scroll hijacking fights the browser, costs a frame budget forever, and the
  gate above would fail. Native scroll.
- **Springs are hand-rolled** in `src/lib/motion.ts` (already written): one shared `requestAnimationFrame`
  loop, reference counted, which starts on the first subscriber and cancels on the last. Each reveal
  unsubscribes the moment it settles, so the loop stops.

## Tokens

### Palette

Replaces the Electric Violet set. All four text values clear the contrast gate on `#08080a`.

| Token | Value | Role | Measured |
|---|---|---|---|
| `--base` | `#08080a` | the page | — |
| `--surface` | `#111114` | raised panels | 1.06 on base |
| `--sunken` | `#17171b` | wells, inputs | 1.12 on base |
| `--text-hi` | `#f3f1ea` | all prose | **17.71:1** (needs 7) |
| `--text-mid` | `#f3f1ea` | body at 90% | 17.71:1 |
| `--text-lo` | `#807f78` | muted labels | **4.98:1** (needs 4.5) |
| `--signal` | `#ff3b1d` | the accent | **5.62:1** (needs 4.5) |
| `--signal-fill` | `#ff3b1d` | flood, dots | black on it **5.62:1** |
| `--signal-lift` | `#ff6a3d` | hover | 7.03:1 |
| `--rule` | `rgb(243 241 234 / 0.10)` | hairlines | — |
| `--edge` | `rgb(243 241 234 / 0.22)` | stronger rules, brackets | — |

`::selection` is `#ff3b1d` on `#08080a`.

**Knock-on work:** `--signal-fill` is read by `scripts/brand-check.mjs`, the favicon and the OG image.
Run `npm run gen:og` after the swap or `check:brand` fails.

### Type

Two faces.

- **Display — Anton** (`@fontsource/anton`, 5.3.0, one weight). Tall, heavy, condensed. Carries the
  surname, every section heading, the stat figures, the marquee and the footer signature.
- **Body — IBM Plex Sans** (`@fontsource-variable/ibm-plex-sans`, already installed). Everything a
  person reads: prose, principle titles, system names, nav, the email link.

Plex Mono stays for data read-outs in the gateway only.

**The root font-size stays 16px.** The references drive the root with `vw` media queries so a `rem`
is a design pixel. Doing that here would rescale all 56 routes, not just the homepage. Instead the
display scale is expressed in `clamp()` so only this page moves:

| Token | Value | Use |
|---|---|---|
| `--d0` | `clamp(72px, 2rem + 14vw, 260px)` | the surname |
| `--d1` | `clamp(40px, 1.5rem + 5.2vw, 96px)` | section headings |
| `--d2` | `clamp(30px, 1.2rem + 2.6vw, 52px)` | sub-headings, marquee |
| `--d3` | `clamp(26px, 1rem + 1.6vw, 40px)` | stat figures |
| `--t1` | `22px` | lead paragraphs |
| `--t2` | `17px` | body |
| `--t3` | `13px` | eyebrows, labels, meta |

Tracking: display `-0.01em`. Eyebrows and labels `0.22em`. Stat labels `0.14em`.
Display line-heights: surname `0.78`, headings `0.95`.

### Spacing

Gutter `40px`, falling to `16px` below 640. Section padding `clamp(72px, 9vw, 144px)` vertical.
All spacing stays on the existing 13-step token scale, because `check:brand` enforces it.

## The motion system

Spring configs, already in `src/lib/motion.ts`:

| Name | Tension / friction | Drives |
|---|---|---|
| `REVEAL` | 90 / 26 | the boot wipe, block entrances |
| `COPY` | 110 / 26 | paragraphs |
| `ROW` | 170 / 24 | list rows, nav items |
| `TYPE` | 210 / 24 | letters |
| `NAME` | 190 / 24 | the surname's letters |
| `FIGURE` | 200 / 24 | stat figures |
| `SHEET` | 190 / 26 | the mobile menu |

### Reveal primitives

`src/components/Reveal.tsx` is written and splits on words or letters, runs each unit on its own
spring from `{opacity 0, translateY}` to `{1, 0}`, keeps a visually-hidden plain copy for screen
readers, marks the animated spans `aria-hidden`, and **never clips overflow** — the display
line-heights would shave descenders.

- **Letters:** lift `0.3em`, stagger `52ms`.
- **Words:** lift `0.35em`, stagger `110ms` for headings, `30ms` for body.
- **Reduced motion:** every unit is set to its final state on mount and no loop starts.

### In-view triggers

One `IntersectionObserver` per block, `rootMargin: 0% 0% -18% 0%`, **fires once and disconnects**.
Never reverses. Stagger is added per index on top.

### The entrance sequence

Measured from the boot wipe starting, exactly as the references clock it:

| At | What |
|---|---|
| 0 | nav fades |
| 180 | eyebrow `driver_012`-equivalent (`engineer_013`) |
| 180 | surname line 1 letters begin |
| 420 | surname line 2 letters begin |
| 300 + i·80 | the four role words |
| 700 | the description paragraph |
| 1100 | the contact row |
| 1400 | the scroll cue |

## The blocks

### 0. Boot

Full-screen, `position: fixed`, `z-index: 100`, background `--base`. Bottom-left: `SUMIT GUNDAWAR`
in Anton. Bottom-right: a counter in Anton at `--d3`, tabular numerals, counting **0 → 100** over
**1600ms**, with `%` in red.

**It counts something real.** The tinyformer weights are a 28.4kB lazy chunk; the counter tracks that
fetch, and completes when the weights resolve. A warm cache finishes it almost instantly, which is
correct — nothing is being faked.

On rest: labels fade over 300ms, 200ms pause, then the whole veil wipes **upward**
(`translateY(0 → -100%)`) on `REVEAL`, ~650ms. The veil element is removed only when its *rendered*
opacity is under 0.004, polled per frame, with a 3000ms backstop for a backgrounded tab — never on a
bare timer. Under reduced motion the veil never mounts.

### 1. Nav

The existing `Masthead`, restyled. Fixed, `pointer-events: none` on the header and `auto` on the
nav. Monogram `SG` in a 40px outlined circle, name beside it in `--t3` uppercase at `0.22em`.
Links `Profile · Learn · Build · Writing`, muted, hover to `--text-hi` with a **red underline growing
from width 0** over 150ms. Below `md`, a burger opening a full-screen sheet appended to `<body>`,
fading in on `SHEET`, links at `--d2` in Anton, each rising `translateY(0.75rem → 0)` on `ROW` at
`120 + i·55`ms. Escape closes; focus moves to the close button; scroll locks while open.

### 2. Hero

```
┌──────────────────────────────────────────────────────────────┐
│  engineer_013                                                │
│  BACKEND            I build systems that survive production. │
│  PLATFORM           Sole engineer on a multi-product         │
│  AI INFERENCE       clinical platform in London.             │
│  GUARDRAILS                                                  │
│                                                              │
│              ┌─────────────┐                                 │
│   S U M I T  │   portrait  │                                 │
│  G U N D A W A W A R  ← red, behind the portrait             │
│  ────────────── gradient to #08080a ──────────────           │
│  | Scroll          sumitgundawar3@gmail.com                  │
└──────────────────────────────────────────────────────────────┘
```

- `min-height: 100svh`, `overflow: hidden`, three layers.
- **Layer 1 (`z-10`) — the surname.** Absolute, `inset-inline: 0; bottom: 0`, `translateY(6%)`,
  centred column, Anton, uppercase, `--d0`, line-height `0.78`, colour `--signal`. Two lines,
  `SUMIT` then `GUNDAWAR`, each `white-space: nowrap`. Letter-by-letter, rising from below, stagger
  52ms, line 2 delayed 240ms.
- **Layer 2 (`z-20`) — the portrait.** Absolute, `bottom: 0; left: 50%; translateX(-50%)`,
  `height: 86vh`, width `80vw → 48vw` at `sm` → `36vw` at `lg`, `object-fit: cover`,
  `object-position: center bottom`. Uses the photo already in the repo for now.
  **The cut-out is the single biggest determinant of whether this lands** — a rectangular photo over
  the type reads as a pasted box. Until a transparent-edged frame exists, the portrait gets a
  bottom-weighted mask so its lower edge melts rather than cuts.
- **Layer 3 (`z-20`) — the base gradient.** `inset-inline: 0; bottom: 0; height: 26vh`,
  `linear-gradient(to bottom, transparent, #08080a)`.
- **Top row (`z-30`).** Left: four role words as stacked block lines in Anton at `--d2`, line
  reveals at `i·80ms`. Right: the description, `max-width: 26rem`, `--t2`, muted, right-aligned
  from `sm`, fading up at 700ms.
- **Foot (`z-30`).** Left: a `1px × 40px` red rule then `Scroll` in `--t3` at `0.22em`. Right: the
  email at `--t2`, springing to red on hover.

### 3. Marquee — the failure modes

Full-bleed strip, `border-block: 1px solid var(--rule)`, `padding-block: 32px`, `overflow: hidden`.
A doubled track translating `0% → -50%`, **linear, 26s, infinite**, as a CSS keyframe.

This is the one exception to "nothing loops", and it is deliberate: a CSS transform animation is
composited on the GPU without a JavaScript frame, so it costs no main-thread work and does not move
the `check:motion` numbers. It pauses under reduced motion and when off screen
(`animation-play-state`).

Words are the seven failure modes from `src/data/failures.ts`, verbatim, separated by a red dot:

> a model sounds right and is wrong · rows disappear and nothing errors · a timeout tells you
> nothing, so the retry charges twice · the script runs against the wrong host · the test passes and
> proves nothing · the same instant gets two answers · the system you did not need

### 4. The thesis, and four principles

Twelve-column grid, 1 column below `lg`.

**Left (6 cols).** Eyebrow `The argument` with its red dot. Heading in Anton at `--d1`,
`max-width: 16ch`, line-by-line, 90ms line stagger:

> Systems do not fail politely.

Then a lead paragraph at `--t1`, muted, `max-width: 46ch`, fading up.

**Right (6 cols).** Four principles as `<li>`s on a `[auto_1fr]` grid, `column-gap: 24px`,
`border-top: 1px solid var(--rule)`, `padding-block: 32px`, last also `border-bottom`. Each fades up
staggered `i·90ms`. Index numeral in Plex Sans at `--d3`, semibold, tabular, **red**. Title at
`--t1` semibold, body at `--t2` muted, `max-width: 44ch`.

Drawn from the three coined frameworks (RAIL, FRAME, JVS) and the published arguments, so every one
is already defended in writing elsewhere on the site.

### 5. Selected systems

Header row: eyebrow `Selected systems`, heading `The work that stayed up.` at `--d1`, and on the
right a label `04 / shipped`.

`<ul>`, 1 column → 2 at `md`, `column-gap: 40px; row-gap: 64px`. **Even cards offset down 96px at
`md` and delayed 120ms**, so the right column staggers after the left. Each card fades up `y: 60 → 0`
on `REVEAL`.

Per card: a 16/11 image, then a row with `border-top: 1px solid var(--rule)` holding the system name
(springing `--text-hi → --signal` on hover, 220/22) and a blurb, with the year and the **outcome in
red** right-aligned. Category underneath in `--t3` at `0.22em`.

| System | Category | Year | Outcome |
|---|---|---|---|
| API Platform & Integration Hub | Integration | 2025 | 5,000 req/sec/IP |
| DPD, Demand Planning Disaggregation | Data engineering | 2021 | $75M in sales impacted |
| Customer Retention Analytics | Applied ML | 2021 | +26% retention, $10M uplift |
| By Dr Vali, multi-product platform | Clinical software | 2025 | 13 products, one engineer |

Four of these are publicly reachable and link out.

### 6. By the numbers

Eyebrow `By the numbers`, heading `Measured, and checkable.` at `--d1`.

`<dl>`, `border-top: 1px solid var(--rule)`, 1 column → 2 at `sm` → 4 at `lg`. Each cell
`padding-block: 48px`, `border-bottom`, and a `border-left` plus `32px` left padding on every cell
that is not first in its row. Figure first in Anton at `--d3`, springing to red on hover (220/22);
label second at `--t2` uppercase `0.14em` muted. Cells fade up staggered `i·110ms`.

`$75M+` enterprise value influenced · `25M+` records a week · `13h → 8h` pipeline · `13+` products
shipped alone.

### 7. Evidence

The references put invented testimonials here. Yours are citations, because the site's whole thesis
is checkable claims.

Eyebrow `Evidence`, heading `Where my name appears.` Grid 1 column → 12 at `lg`.

- **Selector (5 cols).** A list of buttons, one per outlet, `border-top`, `padding-block: 28px`,
  first active by default. Index `01`–`04` in red when active, outlet name at `--t1` semibold,
  role line underneath, and a `1px` red rule growing to `40px` when active.
- **Panel (7 cols).** The piece's own argument in a `<blockquote>` at `--t1`, `max-width: 30ch`,
  replaying a **word-by-word reveal every time the selection changes** — 22ms word stagger,
  `COPY`. A footer line gives the outlet and date. Beside it, the article's card art at 4/5,
  fading and scaling in `1.06 → 1` on first view.

Sources: 9 articles across 4 outlets, 2 podcasts, JAX London 2026, AI Awards judge.

### 8. The gateway

The one block nobody else has, and the reason the page is not a template. Kept, trimmed, and
**bounded**: one pass through the three presets — in corpus, injection, out of corpus — and then it
stops for good. Roughly 0.5s of total compute.

Stage rail, prompt tokens, the four attention maps on one small 2D canvas painted per token, the
live top-k distribution, the generated text, the three guardrail lamps, and the verdict.

Framed in the brackets rather than a card: four 10px corner strokes in `--edge`, no fill, no pill
tabs, no status dot. The commercial chrome is what made it read as a SaaS feature.

### 9. Contact

Eyebrow `Get in touch`. Heading `Have something that has to stay up?` at `--d1`,
`max-width: 18ch`, line-by-line. Lead paragraph. Then the email at `--d2` in Plex Sans semibold,
`word-break: break-all`, which on hover **springs 14px to the right and to red** (220/22), with a
red `↗`.

Footer bar: `border-top`, 12 columns. Left, the signature `SUMIT GUNDAWAR` in Anton at `--d2` with a
line underneath. Middle, LinkedIn and the newsletter. Right, the copyright in `--t3` at `0.18em`.

## Work list

| File | Change |
|---|---|
| `src/index.css` | palette swap to the red set, the `clamp()` display scale, Anton face, marquee keyframe, bracket and chamfer styles (done), stack styles (done) |
| `tailwind.config.js` | `display: Anton`, keep Plex Sans and Plex Mono |
| `src/main.tsx` | import `@fontsource/anton` |
| `src/lib/motion.ts` | **done** — ticker, spring solver, in-view, scroll progress |
| `src/components/Reveal.tsx` | **done** — word and letter reveals |
| `src/components/Boot.tsx` | new — the counter and wipe, tracking the real weight fetch |
| `src/components/HeroName.tsx` | new — the two-line surname, portrait, gradient base |
| `src/components/Marquee.tsx` | new — the failure-mode strip |
| `src/components/Principles.tsx` | new — thesis plus four numbered rows |
| `src/components/SystemCards.tsx` | new — offset two-column grid |
| `src/components/Numbers.tsx` | new — the four-up stat row |
| `src/components/Evidence.tsx` | new — selector plus replaying quote |
| `src/components/InferenceField.tsx` | reframe in brackets, drop the card chrome |
| `src/components/StatusPage.tsx` | rebuild around the nine blocks |
| `src/components/Frames.tsx` | **done** — brackets, chamfer link, dissolve seam |
| `scripts/motion-check.mjs` | **done** — inverted to a quiet-at-rest ceiling |
| `scripts/gen-og.mjs` | rerun after the palette swap |
| retire | `ShaderField.tsx`, `TransformerScene.tsx`, `ContourField.tsx`, `ArticleSlider.tsx`, `CareerRail.tsx`, `inferenceBus.ts` |

## Budget

- **Idle cost: zero.** No `requestAnimationFrame` running once the page settles. Enforced by
  `check:motion`.
- **Entrance cost:** one shared ticker, which stops when the last reveal settles.
- **Inference cost:** one bounded pass, about 0.5s of main-thread work, lazily loaded on intersection,
  never on first paint.
- **Length target: 6 screens.** Measured, not estimated, and reported honestly.

## Gates

All 15 must pass: `worker · brand · prose · content · contrast · seo · layout · type · diagrams ·
motion`. The two that will need attention are **contrast** (the whole palette changes; the 81
pairings must be re-derived) and **brand** (the mark colour changes, so the favicon and OG image
must be regenerated).

Nothing is committed or deployed until signed off.
