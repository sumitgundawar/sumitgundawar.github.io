const { handleNewsletterBatch } = await import(process.argv[2] ?? "/tmp/nl.mjs");

function kv(initial = {}) {
  const store = { ...initial };
  return { store, get: async (k) => store[k] ?? null, put: async (k, v) => { store[k] = v; } };
}
function msg(id, email) {
  const m = { body: { id, email, subject: "s", html: "h", text: "t", unsubscribe: "u" }, acked: false, retried: null };
  m.ack = () => { m.acked = true; };
  m.retry = (o) => { m.retried = o ?? {}; };
  return m;
}
const results = [];
const t = (name, ok, detail = "") => { results.push(ok); console.log(`${ok ? "pass" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`); };

{
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response("{}", { status: 200 }); };
  const RATE = kv();
  const msgs = [msg("a", "a@x.com"), msg("b", "b@x.com")];
  await handleNewsletterBatch({ messages: msgs }, { RATE, RESEND_API_KEY: "k" });
  t("sends when budget allows", calls === 2 && msgs.every(m => m.acked));
  t("records what it spent", RATE.store[Object.keys(RATE.store).find(k => k.startsWith("nl:sent:"))] === "2");
}

{
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response("{}", { status: 200 }); };
  const today = `nl:sent:${new Date().toISOString().slice(0,10)}`;
  const RATE = kv({ [today]: "90" });
  const msgs = [msg("c", "c@x.com"), msg("d", "d@x.com")];
  await handleNewsletterBatch({ messages: msgs }, { RATE, RESEND_API_KEY: "k" });
  t("sends nothing once the cap is reached", calls === 0);
  t("returns them to the queue rather than dropping", msgs.every(m => !m.acked && m.retried));
  t("delays into a later window", msgs.every(m => m.retried.delaySeconds >= 3600), `${msgs[0].retried.delaySeconds}s`);
}

{
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response("{}", { status: 200 }); };
  const today = `nl:sent:${new Date().toISOString().slice(0,10)}`;
  const RATE = kv({ [today]: "89" });
  const msgs = [msg("e", "e@x.com"), msg("f", "f@x.com"), msg("g", "g@x.com")];
  await handleNewsletterBatch({ messages: msgs }, { RATE, RESEND_API_KEY: "k" });
  t("spends exactly the remaining allowance", calls === 1, `${calls} sent`);
  t("first acked, rest deferred", msgs[0].acked && !msgs[1].acked && !msgs[2].acked);
  t("nobody is silently skipped", msgs.filter(m => m.acked || m.retried).length === 3);
}

{
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response("{}", { status: 200 }); };
  const RATE = kv({ "nl:done:h": "1" });
  const m = msg("h", "h@x.com");
  await handleNewsletterBatch({ messages: [m] }, { RATE, RESEND_API_KEY: "k" });
  t("does not re-send an already delivered message", calls === 0 && m.acked);
}

{
  globalThis.fetch = async () => new Response("rate limited", { status: 429 });
  const RATE = kv();
  const msgs = [msg("i", "i@x.com"), msg("j", "j@x.com")];
  await handleNewsletterBatch({ messages: msgs }, { RATE, RESEND_API_KEY: "k" });
  t("a provider 429 defers the whole rest of the batch", msgs.every(m => !m.acked && m.retried));
}

{
  globalThis.fetch = async () => new Response("bad address", { status: 422 });
  const RATE = kv();
  const m = msg("k", "not-an-address");
  await handleNewsletterBatch({ messages: [m] }, { RATE, RESEND_API_KEY: "k" });
  t("gives up on a permanent rejection", m.acked && !m.retried);
}

{
  globalThis.fetch = async () => new Response("oops", { status: 503 });
  const RATE = kv();
  const m = msg("l", "l@x.com");
  await handleNewsletterBatch({ messages: [m] }, { RATE, RESEND_API_KEY: "k" });
  t("retries a transient provider failure", !m.acked && Boolean(m.retried));
}

console.log(`\n${results.filter(Boolean).length} passed, ${results.filter(x => !x).length} failed`);
process.exit(results.every(Boolean) ? 0 : 1);
