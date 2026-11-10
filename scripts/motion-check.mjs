import { createHash } from "node:crypto";
import { chromium } from "playwright";
import { startDist } from "./lib/serve.mjs";

const MAX_IDLE_RAF_PER_SEC = 3;
const MAX_IDLE_DISTINCT = 2;
const SAMPLES = 7;
const GAP_MS = 500;

const instrument = () => {
  window.__raf = 0;
  const raf = window.requestAnimationFrame;
  window.requestAnimationFrame = function (cb) {
    window.__raf += 1;
    return raf.call(window, cb);
  };
};

const hash = (buffer) => createHash("sha1").update(buffer).digest("hex");

const sample = async (page) => {
  const frames = [];
  const counts = [];
  for (let i = 0; i < SAMPLES; i += 1) {
    frames.push(hash(await page.screenshot({ type: "png" })));
    counts.push(await page.evaluate(() => window.__raf));
    await page.waitForTimeout(GAP_MS);
  }
  return {
    distinct: new Set(frames).size,
    last: frames[frames.length - 1],
    rafPerSec: (counts[SAMPLES - 1] - counts[2]) / ((SAMPLES - 3) * (GAP_MS / 1000)),
  };
};

const server = await startDist();
const browser = await chromium.launch();
const problems = [];

try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(instrument);
  const page = await ctx.newPage();
  await page.goto(server.base, { waitUntil: "networkidle" });
  await page.waitForTimeout(14000);

  const moving = await sample(page);

  if (moving.rafPerSec > MAX_IDLE_RAF_PER_SEC) {
    problems.push(
      `the page is still drawing ${moving.rafPerSec.toFixed(0)} animation frames a second once settled, above the ${MAX_IDLE_RAF_PER_SEC} ceiling, so something is burning the processor at rest`,
    );
  }
  if (moving.distinct > MAX_IDLE_DISTINCT) {
    problems.push(
      `${moving.distinct} of ${SAMPLES} frames still differ once settled, above the ${MAX_IDLE_DISTINCT} ceiling, so motion is running unprompted`,
    );
  }

  await ctx.close();

  const stillCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  await stillCtx.addInitScript(instrument);
  const stillPage = await stillCtx.newPage();
  await stillPage.goto(server.base, { waitUntil: "networkidle" });
  await stillPage.waitForTimeout(14000);
  const still = await sample(stillPage);
  if (still.distinct > 1) {
    problems.push(
      `under prefers-reduced-motion ${still.distinct} of ${SAMPLES} frames still differ, so motion is not being honoured`,
    );
  }
  await stillCtx.close();

  if (problems.length) {
    for (const p of problems) console.error(`FAIL  ${p}`);
    console.error(`\n${problems.length} motion failure(s)`);
    process.exitCode = 1;
  } else {
    console.log(
      `motion: clean, the page rests at ${moving.rafPerSec.toFixed(1)} frames a second with ${moving.distinct}/${SAMPLES} frames differing, and is still under reduced motion`,
    );
  }
} finally {
  await browser.close();
  await server.close();
}
