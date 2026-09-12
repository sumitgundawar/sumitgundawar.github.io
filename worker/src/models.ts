export interface ModelSpec {
  id: string;

  tier: 1 | 2 | 3;

  streams?: false;
}

export const MODEL_CHAIN: ModelSpec[] = [
  { id: "z-ai/glm-5.2", tier: 1, streams: false },
  { id: "nvidia/nemotron-3-ultra-550b-a55b", tier: 1 },
  { id: "nvidia/nemotron-3-super-120b-a12b", tier: 1 },
  { id: "minimaxai/minimax-m3", tier: 1 },
  { id: "deepseek-ai/deepseek-v4-flash-0731", tier: 1 },

  { id: "meta/llama-3.1-70b-instruct", tier: 2 },
  { id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning", tier: 2 },
  { id: "nvidia/nemotron-3.5-lightning-30b-a3b", tier: 2 },
  { id: "nvidia/nemotron-3-nano-30b-a3b", tier: 2 },
  { id: "mistralai/mistral-nemotron", tier: 2 },
  { id: "meta/llama-3.3-70b-instruct", tier: 2 },

  { id: "meta/llama-3.1-8b-instruct", tier: 3 },
  { id: "nvidia/mistral-nemo-minitron-8b-8k-instruct", tier: 3 },
  { id: "nvidia/nemotron-mini-4b-instruct", tier: 3 },
  { id: "nvidia/llama-3.3-nemotron-super-49b-v1", tier: 3 },
];

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChainResult {
  text: string;
  model: string;

  attempts: { model: string; reason: string }[];
}

function retriable(status: number): boolean {
  if (status === 403 || status === 404 || status === 410) return true;
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

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

        signal: AbortSignal.timeout(20_000),
      });

      if (!res.ok) {
        attempts.push({ model: spec.id, reason: `http ${res.status}` });
        if (retriable(res.status)) continue;

        break;
      }

      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = json.choices?.[0]?.message?.content?.trim() ?? "";
      if (!text) {
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

const MIN_PRIME_CHARS = 24;
const MIN_COMPLETE_CHARS = 120;

export interface ChainStream {
  stream: ReadableStream<string>;
  model: string;
  attempts: { model: string; reason: string }[];

  pump: Promise<void>;
}

export async function runChainStream(
  apiKey: string,
  messages: ChatMessage[],
  opts: { maxTokens?: number; temperature?: number } = {},
): Promise<ChainStream> {
  const attempts: { model: string; reason: string }[] = [];

  for (const spec of MODEL_CHAIN.filter((m) => m.streams !== false)) {
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

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

      if (ended && first.trim().length < MIN_COMPLETE_CHARS) {
        attempts.push({ model: spec.id, reason: first ? `stream ended at ${first.trim().length} chars` : "empty stream" });
        await reader.cancel().catch(() => {});
        continue;
      }

      const captured = reader;
      let tail = buffer;
      const { readable, writable } = new TransformStream<string, string>();
      const writer = writable.getWriter();

      const pump = (async () => {
        try {
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
      }
    }
  }
  return { deltas, rest };
}
