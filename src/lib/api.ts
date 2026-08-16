/* Client for the site API.
 *
 * Everything here is best-effort by design. Analytics, progress sync and the
 * assistant are all additions to a page that already works without them, so a
 * failed call must never surface to the reader or block anything. The one
 * exception is ask(), where the reader is waiting for an answer and silence
 * would be worse than an error.
 */

const API = "https://site-agent-relay.sumitgundawar3.workers.dev";
const SESSION_KEY = "sg-session-v1";

/* A random id, minted once and kept. Enough to count returning readers and
   follow a path through the site; not enough to identify anyone, which is what
   keeps this clear of the consent banner that the Google Analytics cookies
   would otherwise require. */
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

export async function ask(question: string, topicId?: string, topicText?: string): Promise<string> {
  const res = await post("/api/ask", { question, topicId, topicText });
  if (!res) throw new Error("offline");
  if (res.status === 429) throw new Error("Too many questions at once. Give it a moment.");
  if (!res.ok) throw new Error("The assistant is unavailable right now.");
  const j = (await res.json()) as { answer?: string };
  if (!j.answer) throw new Error("The assistant is unavailable right now.");
  return j.answer;
}
