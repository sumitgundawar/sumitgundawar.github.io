// Wait for the edge to serve the bundle the current HTML names, so the check
// measures the deploy rather than the propagation window that kept fooling me.
import fs from "node:fs";
const want = fs.readFileSync("dist/index.html", "utf8").match(/\/assets\/index-[A-Za-z0-9_-]+\.js/)[0];
for (let i = 0; i < 40; i++) {
  const html = await fetch("https://sumitgundawar.com/?cb=" + Date.now()).then(r => r.text());
  const got = (html.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/) || ["none"])[0];
  const res = await fetch("https://sumitgundawar.com" + want);
  const ct = res.headers.get("content-type") ?? "";
  if (got === want && ct.includes("javascript")) { console.log(`settled after ${i * 3}s: ${want}`); process.exit(0); }
  await new Promise(r => setTimeout(r, 3000));
}
console.log("did not settle"); process.exit(1);
