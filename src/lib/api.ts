export const API = "https://site-agent-relay.sumitgundawar3.workers.dev";
const SESSION_KEY = "sg-session-v1";

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
      keepalive,
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

export async function ask(question: string, topicId?: string): Promise<string> {
  const res = await post("/api/ask", { question, topicId });
  if (!res) throw new Error("offline");
  if (res.status === 429) throw new Error("Too many questions at once. Give it a moment.");
  if (!res.ok) throw new Error("The assistant is unavailable right now.");
  const j = (await res.json()) as { answer?: string };
  if (!j.answer) throw new Error("The assistant is unavailable right now.");
  return j.answer;
}

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
      }
    }
  }

  if (!whole) throw new Error("The assistant is unavailable right now.");
  return whole;
}

export interface NextQuestion {
  ask: string;
  prompt: string;
  help: string;
  reason: string;
  infer: Record<string, string>;
}

export async function nextQuestion(
  answers: Record<string, string>,
  remaining: { id: string; prompt: string; options: string[] }[],
  timeoutMs = 4500,
): Promise<NextQuestion | null> {
  const session = sessionKey();
  if (!session || !remaining.length) return null;
  try {
    const res = await fetch(`${API}/api/build-next`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session, answers, remaining }),

      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as Partial<NextQuestion> & { ok?: boolean };
    if (!j.ok || typeof j.ask !== "string") return null;
    return {
      ask: j.ask,
      prompt: j.prompt ?? "",
      help: j.help ?? "",
      reason: j.reason ?? "",
      infer: j.infer && typeof j.infer === "object" ? j.infer : {},
    };
  } catch {
    return null;
  }
}

export interface IssueSummary {
  slug: string;
  subject: string;
  sent_at: number;
}

export interface Issue extends IssueSummary {
  html: string;
  text: string | null;
}

export async function listIssues(): Promise<IssueSummary[]> {
  try {
    const res = await fetch(`${API}/api/newsletter`);
    if (!res.ok) return [];
    const j = (await res.json()) as { issues?: IssueSummary[] };
    return Array.isArray(j.issues) ? j.issues : [];
  } catch {
    return [];
  }
}

export async function readIssue(slug: string): Promise<Issue | null> {
  try {
    const res = await fetch(`${API}/api/newsletter/${encodeURIComponent(slug)}`);
    if (!res.ok) return null;
    const j = (await res.json()) as { issue?: Issue };
    return j.issue ?? null;
  } catch {
    return null;
  }
}
