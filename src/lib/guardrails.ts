export type Verdict = "pass" | "block" | "refuse";

export type CheckResult = {
  id: string;
  name: string;
  verdict: Verdict;
  detail: string;
};

const INJECTION = [
  /ignore (?:all |any )?(?:previous|prior|above) instructions/i,
  /disregard (?:the |your )?(?:system|previous|above)/i,
  /reveal (?:your |the )?(?:system )?prompt/i,
  /you are now (?:a|an|in) /i,
  /act as (?:a |an )?(?:unrestricted|jailbroken|developer mode)/i,
  /print (?:your |the )?(?:instructions|system prompt|rules)/i,
  /\bDAN\b|\bjailbreak\b/i,
];

const PII = [
  { label: "email address", re: /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i },
  { label: "UK phone number", re: /\b(?:0|\+44)\s?7\d{3}\s?\d{6}\b/ },
  { label: "NHS number", re: /\b\d{3}\s?\d{3}\s?\d{4}\b/ },
  { label: "UK postcode", re: /\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/i },
];

const STOP = new Set([
  "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "be", "been", "of", "to", "in",
  "on", "for", "with", "that", "this", "it", "as", "at", "by", "from", "not", "no", "do", "does",
  "you", "your", "i", "we", "they", "he", "she", "what", "which", "how", "why", "when", "can",
  "will", "would", "should", "could", "has", "have", "had", "if", "so", "than", "then", "there",
]);

export const CORPUS = [
  "A timeout is not a failure, it is an unknown, and retrying an unknown is how a customer gets billed twice.",
  "Record the raw event before touching it, acknowledge fast, make every retry idempotent, and reconcile the ledger on a schedule.",
  "Nothing about a fluent answer indicates whether it is grounded in a source.",
  "An answer with no citation is a claim, not a result, so the system should refuse rather than invent.",
  "Treat model output as untrusted input, because that is exactly what it is.",
  "Prompt injection is an authorisation problem, not a prompt problem.",
];

const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));

const CORPUS_WORDS = new Set(CORPUS.flatMap(words));

export function checkInjection(prompt: string): CheckResult {
  const hit = INJECTION.find((re) => re.test(prompt));
  return {
    id: "injection",
    name: "Prompt injection",
    verdict: hit ? "block" : "pass",
    detail: hit
      ? `matched /${hit.source.slice(0, 38)}/ in the user turn`
      : "no override pattern in the user turn",
  };
}

export function checkPii(text: string): CheckResult {
  const hit = PII.find((p) => p.re.test(text));
  return {
    id: "pii",
    name: "PII egress",
    verdict: hit ? "block" : "pass",
    detail: hit ? `${hit.label} found in the candidate output` : "no identifiers in the candidate output",
  };
}

export function checkGrounding(answer: string): CheckResult & { coverage: number } {
  const w = words(answer);
  const supported = w.filter((x) => CORPUS_WORDS.has(x)).length;
  const coverage = w.length ? supported / w.length : 0;
  const ok = coverage >= 0.34 && w.length >= 3;
  return {
    id: "grounding",
    name: "Groundedness",
    verdict: ok ? "pass" : "refuse",
    coverage,
    detail: ok
      ? `${supported}/${w.length} content words trace to the corpus`
      : `only ${supported}/${w.length} content words trace to the corpus`,
  };
}

export function decide(checks: CheckResult[]) {
  const blocked = checks.find((c) => c.verdict === "block");
  if (blocked) return { allowed: false, rule: blocked.name, verdict: "BLOCKED" as const };
  const refused = checks.find((c) => c.verdict === "refuse");
  if (refused) return { allowed: false, rule: refused.name, verdict: "REFUSED" as const };
  return { allowed: true, rule: "all checks", verdict: "ALLOWED" as const };
}
