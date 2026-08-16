import { useRef, useState } from "react";
import { ask } from "@/lib/api";
import { trackClick } from "@/lib/hooks";

/* Ask a follow-up about the topic you are reading.
 *
 * The material answers the question it chose to ask. This is for the question
 * the reader actually has, which is usually narrower: why this and not that,
 * what happens at ten times the load, how does it fail. The topic text goes up
 * with the question so the answer is grounded in what is on the page rather
 * than in whatever the model remembers about the subject.
 *
 * Nothing here mentions models. Fifteen of them sit behind this box and the
 * chain falls through several on a bad day; a reader who is told which one
 * answered has been handed a detail they cannot act on. */

const SUGGESTIONS = [
  "Why not the simpler option?",
  "What breaks at ten times the load?",
  "How would this fail in production?",
];

export function AskBox({ topicId }: { topicId: string }) {
  const [q, setQ] = useState("");
  const [thread, setThread] = useState<{ q: string; a: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function submit(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    setQ("");
    trackClick("ask_question", { topic: topicId });
    try {
      const a = await ask(text, topicId);
      setThread((t) => [...t, { q: text, a }]);
    } catch (err) {
      // The chain has already tried every model that answers. If it got here
      // the honest thing is to say so, not to retry in a loop the reader can see.
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setQ(text); // give them their question back rather than losing it
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="mt-6 pt-5" style={{ borderTop: "1px solid var(--hair)" }}>
      <div className="eyebrow mb-3">ask about this</div>

      {thread.map((t, i) => (
        <div key={i} className="mb-4">
          <div className="mono text-[12px] mb-1.5" style={{ color: "var(--c-text-dim)" }}>
            {t.q}
          </div>
          <div className="text-[15px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--c-text)" }}>
            {t.a}
          </div>
        </div>
      ))}

      {thread.length === 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => void submit(s)}
              disabled={busy}
              className="mono text-[11px] px-2.5 min-h-[44px] inline-flex items-center text-left"
              style={{ border: "1px solid var(--hair)", color: "var(--c-text-dim)" }}
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
        className="flex gap-2"
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
          placeholder={busy ? "Thinking…" : "Ask a follow-up"}
          className="mono text-[13px] flex-1 min-w-0 px-3 min-h-[44px]"
          style={{ background: "var(--surface)", border: "1px solid var(--hair-strong)", color: "var(--c-text)" }}
        />
        <button
          type="submit"
          disabled={busy || !q.trim()}
          className="mono text-[12px] uppercase tracking-[0.08em] px-3.5 min-h-[44px]"
          style={{
            border: "1px solid var(--hair-strong)",
            color: busy || !q.trim() ? "var(--c-text-dim)" : "var(--c-text)",
            background: "var(--surface-2)",
          }}
        >
          {busy ? "…" : "ask"}
        </button>
      </form>

      {error && (
        <div className="mono text-[12px] mt-2" style={{ color: "var(--warn)" }} role="status">
          {error}
        </div>
      )}
      <div className="mono text-[11px] mt-2" style={{ color: "var(--c-text-dim)" }}>
        Answers are generated and can be wrong. The topic above is the reviewed version.
      </div>
    </div>
  );
}
