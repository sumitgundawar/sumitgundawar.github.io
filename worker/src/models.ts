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
}

export const MODEL_CHAIN: ModelSpec[] = [
  // Tier 1: frontier reasoning. GLM 5.2 leads because it is both the strongest
  // general model on the account and quick with it.
  { id: "z-ai/glm-5.2", tier: 1 }, //                          1116ms
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
