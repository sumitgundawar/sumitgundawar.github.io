/* The fallback chain, ordered from evidence rather than from the catalogue.
 *
 * NVIDIA lists 102 models on this account. Calling each one with a one-token
 * prompt found that 17 actually answer: 43 return 404 despite being listed, 9
 * time out, 6 return HTTP 200 with empty content, and one was rate limited at
 * the moment of asking. So "use every model" is not available; what is
 * available is every model that genuinely responds, tried in an order that
 * spends the good ones first.
 *
 * Ordering is capability first, then measured latency, because a fallback list
 * sorted purely by speed answers fastest with the weakest model on the account.
 * The measured round trip from the probe is in the comment beside each entry so
 * the next person reordering this has the same evidence rather than a hunch.
 *
 * The 200-with-empty-body case is why the runner treats an empty completion as
 * a failure and moves on. An HTTP status is not proof that a model answered.
 */

export interface ModelSpec {
  id: string;
  /** Rough capability tier. 1 is frontier, 3 is a last resort that still beats an error page. */
  tier: 1 | 2 | 3;
  /** False when the model answers a normal request properly but does not
   *  usefully honour stream: true. Skipped by the streaming path only. */
  streams?: false;
}

export const MODEL_CHAIN: ModelSpec[] = [
  // Tier 1: frontier reasoning. GLM 5.2 leads because it is both the strongest
  // general model on the account and quick with it.
  /* Best model here for a whole answer, and it does not stream. Asked with
     stream: true it emits about thirty characters and closes: measured at 32,
     29 and 45 characters on three separate questions, each time a clean end of
     stream, while the same question answered without streaming returns hundreds
     of characters. Leaving it first on the streaming path cost roughly four
     seconds per question discovering that again, so the streaming path skips it
     and it stays first for everything else. */
  { id: "z-ai/glm-5.2", tier: 1, streams: false }, //           1116ms
  { id: "nvidia/nemotron-3-ultra-550b-a55b", tier: 1 }, //      592ms
  { id: "nvidia/nemotron-3-super-120b-a12b", tier: 1 }, //     1481ms
  { id: "minimaxai/minimax-m3", tier: 1 }, //                   702ms
  { id: "deepseek-ai/deepseek-v4-flash-0731", tier: 1 }, //     verified separately

  // Tier 2: strong, and enough for an explanation or a follow-up question.
  { id: "meta/llama-3.1-70b-instruct", tier: 2 }, //           1059ms
  { id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning", tier: 2 }, // 837ms
  { id: "nvidia/nemotron-3.5-lightning-30b-a3b", tier: 2 }, //  424ms
  { id: "nvidia/nemotron-3-nano-30b-a3b", tier: 2 }, //         442ms
  { id: "mistralai/mistral-nemotron", tier: 2 }, //             292ms
  { id: "meta/llama-3.3-70b-instruct", tier: 2 }, //          17229ms, slow but real

  // Tier 3: small and fast. Reached only when everything above is down, where
  // a plain answer beats an apology.
  { id: "meta/llama-3.1-8b-instruct", tier: 3 }, //             289ms
  { id: "nvidia/mistral-nemo-minitron-8b-8k-instruct", tier: 3 },
  { id: "nvidia/nemotron-mini-4b-instruct", tier: 3 }, //        76ms
  { id: "nvidia/llama-3.3-nemotron-super-49b-v1", tier: 3 }, // 35239ms, genuinely last
];

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChainResult {
  text: string;
  model: string;
  /** Models that failed before one answered. Logged, never shown to the reader. */
  attempts: { model: string; reason: string }[];
}

/** Anything that means "try the next model" rather than "give up". */
function retriable(status: number): boolean {
  return status === 404 || status === 408 || status === 409 || status === 429 || status >= 500;
}

/**
 * Walk the chain until something answers.
 *
 * The whole message history goes to every attempt, so a model picked up after
 * three failures sees exactly what the first one saw and the thread does not
 * reset mid-conversation. Failures are collected and returned for logging; the
 * caller sends only the text onward, which is what makes the fallback invisible
 * from the outside.
 */
export async function runChain(
  apiKey: string,
  messages: ChatMessage[],
  opts: { maxTokens?: number; temperature?: number; startAt?: number } = {},
): Promise<ChainResult> {
  const attempts: { model: string; reason: string }[] = [];
  const chain = MODEL_CHAIN.slice(opts.startAt ?? 0);

  for (const spec of chain) {
    try {
      const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: spec.id,
          messages,
          max_tokens: opts.maxTokens ?? 700,
          temperature: opts.temperature ?? 0.4,
        }),
        // A slow model must not hold the reader; 20s then move on. The one
        // 35-second model in the chain is deliberately last for this reason.
        signal: AbortSignal.timeout(20_000),
      });

      if (!res.ok) {
        attempts.push({ model: spec.id, reason: `http ${res.status}` });
        if (retriable(res.status)) continue;
        // A 400 or 401 is our bug or our key, and will fail identically on
        // every other model, so there is nothing to gain by walking the chain.
        break;
      }

      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = json.choices?.[0]?.message?.content?.trim() ?? "";
      if (!text) {
        // Six models on this account answer 200 with nothing in the body.
        attempts.push({ model: spec.id, reason: "empty completion" });
        continue;
      }
      return { text, model: spec.id, attempts };
    } catch (err) {
      attempts.push({ model: spec.id, reason: err instanceof Error ? err.name : "error" });
      continue;
    }
  }

  throw Object.assign(new Error("every model in the chain failed"), { attempts });
}

/* Two different thresholds, for two different questions.
 *
 * MIN_PRIME_CHARS is how much text is needed before handing the stream over:
 * small, so a model that is genuinely streaming is not held up.
 *
 * MIN_COMPLETE_CHARS only applies when the stream has ALREADY ENDED by the time
 * priming finishes, which means the text in hand is the entire answer. NVIDIA's
 * glm-5.2 answers a non-streaming request with two thousand characters and, with
 * stream: true, emits about thirty and closes. That is not an answer, and it is
 * the streaming equivalent of the 200-with-empty-body case the chain already
 * knows about, so it falls through to the next model.
 *
 * A short answer is not lost by this. If every model in the chain under-delivers
 * on the streaming path, the caller falls back to the non-streaming request,
 * which is where a genuinely brief reply such as a guardrail refusal ends up.
 */
const MIN_PRIME_CHARS = 24;
const MIN_COMPLETE_CHARS = 120;

export interface ChainStream {
  /** Text deltas, in order. The first one has already arrived. */
  stream: ReadableStream<string>;
  model: string;
  attempts: { model: string; reason: string }[];
  /** Resolves when the upstream has been fully drained. The caller MUST pass
   *  this to ctx.waitUntil, or the subrequest is cancelled the moment the
   *  handler returns and the reader gets only the primed chunk. */
  pump: Promise<void>;
}

/**
 * The same walk, streamed.
 *
 * The reason this is not simply runChain with `stream: true` is that fallback
 * and streaming pull against each other: the moment a byte is sent to the
 * reader, the choice of model is final, and a model that dies halfway cannot be
 * silently replaced the way a failed request can.
 *
 * So the chain is walked normally, and a model is only accepted once its FIRST
 * token has actually arrived. An HTTP 200, a hung connection and a 200 with an
 * empty body all still fall through to the next model, because none of them has
 * produced a token. After the first token the stream is handed over and the
 * chain is done; a mid-stream failure ends the stream with what was received
 * rather than silently restarting under the reader.
 *
 * That is the whole trade, and it is the same one the talk argues for: the cost
 * that matters is time to first byte, not total time. Uncached answers were
 * taking twelve to sixteen seconds behind a spinner.
 */
export async function runChainStream(
  apiKey: string,
  messages: ChatMessage[],
  opts: { maxTokens?: number; temperature?: number } = {},
): Promise<ChainStream> {
  const attempts: { model: string; reason: string }[] = [];

  for (const spec of MODEL_CHAIN.filter((m) => m.streams !== false)) {
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    /* A manual controller, not AbortSignal.timeout.
     *
     * The signal on a streaming fetch governs the whole response, body included,
     * so a twenty second timeout does not bound the wait for the first token, it
     * guillotines the answer twenty seconds in. Measured: the first token
     * arrived at 8.3s and the stream was cut at 20.36s mid-sentence, with the
     * terminating event never sent, so the client could not even tell it had
     * been truncated. The timer is cleared the moment a token proves the model
     * is alive, and after that the answer is allowed to finish. */
    const ac = new AbortController();
    const firstTokenTimer = setTimeout(() => ac.abort(), 20_000);
    try {
      const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: spec.id,
          messages,
          max_tokens: opts.maxTokens ?? 700,
          temperature: opts.temperature ?? 0.4,
          stream: true,
        }),
        signal: ac.signal,
      });

      if (!res.ok || !res.body) {
        clearTimeout(firstTokenTimer);
        attempts.push({ model: spec.id, reason: `http ${res.status}` });
        if (retriable(res.status)) continue;
        break;
      }

      reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let first = "";
      let ended = false;

      /* Prime until there is enough text to be sure this model is really
         answering, or the stream ends.
         *
         * Waiting for one token is not enough. glm-5.2 answers fully when asked
         * for a whole response and, asked to stream, emits "An" and closes: two
         * characters, then a clean end of stream. Committing on the first token
         * handed the reader that and nothing else. This is the same rule the
         * non-streaming path already applies when a model returns 200 with an
         * empty body, just measured over a few more characters, and it costs
         * nothing on a model that is genuinely streaming because the threshold
         * is reached in the first chunk or two. */
      while (first.length < MIN_PRIME_CHARS) {
        const { done, value } = await reader.read();
        if (done) {
          ended = true;
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const { deltas, rest } = drainSse(buffer);
        buffer = rest;
        if (deltas.length) first += deltas.join("");
      }

      clearTimeout(firstTokenTimer);

      /* If the stream is already over, what is in hand is the whole answer, so
         it can be judged as one. If it is still open, a short prime is just a
         slow start and says nothing. */
      if (ended && first.trim().length < MIN_COMPLETE_CHARS) {
        attempts.push({ model: spec.id, reason: first ? `stream ended at ${first.trim().length} chars` : "empty stream" });
        await reader.cancel().catch(() => {});
        continue;
      }

      /* Pushed into a TransformStream rather than pulled from a custom
         ReadableStream.
       *
       * The pull-based version looked right and failed in production only: the
       * reader got the primed chunk and then the response simply ended, with no
       * terminating event and no error. A pull handler runs after the handler
       * has returned, and by then the upstream subrequest it reads from has been
       * cancelled, so nothing further ever arrives. Locally, with a stubbed
       * fetch, it passed every time.
       *
       * Pushing instead means the pump is an ordinary promise. The caller hands
       * it to waitUntil, which is what actually keeps the subrequest alive for
       * as long as it takes to drain. */
      const captured = reader;
      let tail = buffer;
      const { readable, writable } = new TransformStream<string, string>();
      const writer = writable.getWriter();

      const pump = (async () => {
        try {
          /* Inside the pump, not before it. Awaiting this write before returning
             deadlocks: nothing is reading the readable end yet, so backpressure
             never releases and runChainStream never resolves. */
          await writer.write(first);
          for (;;) {
            const { done, value } = await captured.read();
            if (done) {
              const { deltas } = drainSse(tail);
              if (deltas.length) await writer.write(deltas.join(""));
              break;
            }
            tail += decoder.decode(value, { stream: true });
            const { deltas, rest } = drainSse(tail);
            tail = rest;
            if (deltas.length) await writer.write(deltas.join(""));
          }
        } catch {
          /* Mid-stream failure. The reader keeps the partial answer, which is
             better than swapping models underneath them and starting again. */
        } finally {
          await writer.close().catch(() => {});
        }
      })();

      return { stream: readable, model: spec.id, attempts, pump };
    } catch (err) {
      clearTimeout(firstTokenTimer);
      attempts.push({ model: spec.id, reason: err instanceof Error ? err.name : "error" });
      await reader?.cancel().catch(() => {});
      continue;
    }
  }

  throw Object.assign(new Error("every model in the chain failed"), { attempts });
}

/** Pull complete SSE events out of a buffer, returning the deltas and whatever
 *  partial event is left over. Events are separated by a blank line and a
 *  chunk boundary lands mid-event often enough that this has to be exact. */
function drainSse(buffer: string): { deltas: string[]; rest: string } {
  const deltas: string[] = [];
  let rest = buffer;
  let idx: number;
  while ((idx = rest.indexOf("\n\n")) !== -1) {
    const raw = rest.slice(0, idx);
    rest = rest.slice(idx + 2);
    for (const line of raw.split("\n")) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const j = JSON.parse(payload) as { choices?: { delta?: { content?: string } }[] };
        const piece = j.choices?.[0]?.delta?.content;
        if (piece) deltas.push(piece);
      } catch {
        /* A partial JSON payload means the event was not actually complete;
           dropping it is correct because the bytes remain in `rest`. */
      }
    }
  }
  return { deltas, rest };
}
