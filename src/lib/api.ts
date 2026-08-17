/* Client for the site API.
 *
 * Everything here is best-effort by design. Analytics, progress sync and the
 * assistant are all additions to a page that already works without them, so a
 * failed call must never surface to the reader or block anything. The one
 * exception is ask(), where the reader is waiting for an answer and silence
 * would be worse than an error.
 */

export const API = "https://site-agent-relay.sumitgundawar3.workers.dev";
const SESSION_KEY = "sg-session-v1";

/* A random id, minted once and kept. Enough to count returning readers and
   follow a path through the site; not enough to identify anyone.
   
   Note this is only true of this analytics path. Google Analytics is still
   loaded in index.html and sets its own cookies, which under UK PECR does need
   consent. Removing GA would make the whole site's claim honest, and everything
   the weekly report uses already comes from here rather than from GA. */
export function sessionKey(): string {
  if (typeof window === "undefined") return "";
  try {
    let k = localStorage.getItem(SESSION_KEY);
    if (!k) {
      k = crypto.randomUUID().replace(/-/g, "").slice(0, 32);
      localStorage.setItem(SESSION_KEY, k);
    }
    return k;
  } catch {
    // Private browsing. Analytics is not worth breaking a page over.
    return "";
  }
}

async function post(path: string, body: unknown, keepalive = false): Promise<Response | null> {
  const session = sessionKey();
  if (!session) return null;
  try {
    return await fetch(`${API}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session, ...(body as object) }),
      keepalive, // survives the page being closed, which is when dwell is sent
    });
  } catch {
    return null;
  }
}

export function trackView(path: string, topicId?: string, dwellMs?: number): void {
  void post("/api/track", { path, topicId, dwellMs, referrer: document.referrer || undefined }, true);
}

export function trackQuiz(topicId: string, chosen: number, correct: boolean): void {
  void post("/api/track", { event: "quiz", topicId, chosen, correct });
}

/* Clicks, to this API rather than only to Google Analytics.
 *
 * Every click on the site used to go to gtag alone, and trackClick returned
 * early when gtag was absent. So the question the owner actually asked of this
 * data, which cards and sections people care about, could not be answered from
 * his own database at all, and for the share of a technical audience that blocks
 * analytics it was not recorded anywhere.
 *
 * keepalive, because the most interesting clicks are the ones that navigate away
 * from the page. */
export function trackClickEvent(event: string, target?: string, path?: string): void {
  void post("/api/track", { event: "click", clickEvent: event, target, path }, true);
}

export function saveProgress(topicId: string, correct: boolean): void {
  void post("/api/progress", { topicId, correct });
}

export async function loadProgress(): Promise<Record<string, boolean> | null> {
  const res = await post("/api/progress", { read: true });
  if (!res?.ok) return null;
  try {
    const j = (await res.json()) as { progress?: Record<string, boolean> };
    return j.progress ?? null;
  } catch {
    return null;
  }
}

/* topicText is deliberately not sent. The server looks the topic up by id from
   its own copy of the material: a client-supplied body went into the system
   prompt, which made every guardrail negotiable by the caller and made the
   answer cache poisonable. */
export async function ask(question: string, topicId?: string): Promise<string> {
  const res = await post("/api/ask", { question, topicId });
  if (!res) throw new Error("offline");
  if (res.status === 429) throw new Error("Too many questions at once. Give it a moment.");
  if (!res.ok) throw new Error("The assistant is unavailable right now.");
  const j = (await res.json()) as { answer?: string };
  if (!j.answer) throw new Error("The assistant is unavailable right now.");
  return j.answer;
}

/* The same question, answered as it is written.
 *
 * An uncached answer took twelve to sixteen seconds to arrive as one blob, and
 * the reader spent all of it looking at the word "Thinking". The total is not
 * much better when streamed; what changes is that words start appearing in about
 * a second, which is the difference between a page that is working and a page
 * that appears to have hung.
 *
 * onToken is called with each piece as it arrives. The full text is returned at
 * the end so the caller does not have to accumulate it as well. A cached answer
 * comes back as a single token, so there is one code path rather than two.
 */
export async function askStream(
  question: string,
  topicId: string | undefined,
  onToken: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const session = sessionKey();
  if (!session) throw new Error("offline");

  const res = await fetch(`${API}/api/ask?stream=1`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session, question, topicId }),
    signal,
  }).catch(() => null);

  if (!res) throw new Error("offline");
  if (res.status === 429) throw new Error("Too many questions at once. Give it a moment.");
  if (!res.ok || !res.body) throw new Error("The assistant is unavailable right now.");

  /* The server falls back to a plain JSON answer if no model would stream, so
     the client has to cope with being handed either shape. */
  if (!(res.headers.get("content-type") ?? "").includes("text/event-stream")) {
    const j = (await res.json()) as { answer?: string };
    if (!j.answer) throw new Error("The assistant is unavailable right now.");
    onToken(j.answer);
    return j.answer;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let whole = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    // Events are separated by a blank line and a chunk boundary lands inside
    // one often enough that this has to be exact.
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      if (!line.startsWith("data:")) continue;
      try {
        const j = JSON.parse(line.slice(5).trim()) as { t?: string; done?: boolean };
        if (j.t) {
          whole += j.t;
          onToken(j.t);
        }
      } catch {
        /* A partial payload means the event was not complete after all; the
           bytes are still in the buffer, so dropping this parse is correct. */
      }
    }
  }

  if (!whole) throw new Error("The assistant is unavailable right now.");
  return whole;
}
