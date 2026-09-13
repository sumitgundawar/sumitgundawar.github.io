import { useRef, useState } from "react";
import { askStream } from "@/lib/api";
import { trackClick } from "@/lib/hooks";

const SUGGESTIONS = [
  "Why not the simpler option?",
  "What breaks at ten times the load?",
  "How would this fail in production?",
];

export function AskBox({ topicId }: { topicId: string }) {
  const [q, setQ] = useState("");
  const [thread, setThread] = useState<{ q: string; a: string }[]>([]);
  const [busy, setBusy] = useState(false);

  const [live, setLive] = useState("");

  const [pending, setPending] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function submit(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    setQ("");
    trackClick("ask_question", { topic: topicId });
    setLive("");
    setPending(text);
    try {
      const a = await askStream(text, topicId, (chunk) => setLive((prev) => prev + chunk));
      setThread((t) => [...t, { q: text, a }]);
      setLive("");
      setPending("");
    } catch (err) {
      setLive("");
      setPending("");

      setError(err instanceof Error ? err.message : "Something went wrong.");
      setQ(text);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="mt-6 pt-5" style={{ borderTop: "1px solid var(--rule-2)" }}>
      <div className="eyebrow mb-3">Ask about this</div>

      {thread.map((t, i) => (
        <div key={i} className="mb-16">
          <div className="mono text-m2 mb-1.5" style={{ color: "var(--text-mid)" }}>
            {t.q}
          </div>
          <div className="text-t2 leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-hi)" }}>
            {t.a}
          </div>
        </div>
      ))}

      {busy && live && (
        <div className="mb-16" aria-live="polite">
          <div className="mono text-m2 mb-1.5" style={{ color: "var(--text-mid)" }}>
            {pending}
          </div>
          <div className="text-t2 leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-hi)" }}>
            {live}
            <span className="inline-block w-[7px] h-[1em] align-[-0.15em] ml-0.5" style={{ background: "var(--accent)" }} />
          </div>
        </div>
      )}

      {thread.length === 0 && !live && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => void submit(s)}
              disabled={busy}
              className="mono text-m3 px-2.5 min-h-[44px] inline-flex items-center text-left"
              style={{ border: "1px solid var(--rule-2)", color: "var(--text-mid)" }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit(q);
        }}
        className="flex gap-8"
      >
        <label className="sr-only" htmlFor={`ask-${topicId}`}>
          Ask a question about this topic
        </label>
        <input
          id={`ask-${topicId}`}
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          disabled={busy}
          placeholder={busy ? (live ? "Writing the answer" : "Thinking") : "Ask a follow-up"}
          className="mono text-m1 flex-1 min-w-0 px-3 min-h-[44px]"
          style={{ background: "var(--ink-2)", border: "1px solid var(--rule-3)", color: "var(--text-hi)" }}
        />
        <button
          type="submit"
          disabled={busy || !q.trim()}
          className="mono text-m2 caps tracking-[0.08em] px-16 min-h-[44px]"
          style={{
            border: "1px solid var(--rule-3)",
            color: busy || !q.trim() ? "var(--text-mid)" : "var(--text-hi)",
            background: "var(--ink-3)",
          }}
        >
          {busy ? "…" : "ask"}
        </button>
      </form>

      {error && (
        <div className="mono text-m2 mt-8" style={{ color: "var(--warn)" }} role="status">
          {error}
        </div>
      )}
      <div className="mono text-m3 mt-8" style={{ color: "var(--text-mid)" }}>
        Answers are generated and can be wrong. The topic above is the reviewed version.
      </div>
    </div>
  );
}
