import { writeFileSync } from "node:fs";
import {
  tensor,
  matmul,
  addRow,
  add,
  gelu,
  layernorm,
  scale,
  transpose,
  causalSoftmax,
  crossEntropy,
  backprop,
} from "./autograd.mjs";

const CORPUS = `a model sounds right and is wrong. nothing about a fluent answer indicates whether it is grounded.
the system has no way to say it does not know, so it invents, and the invention arrives in the same tone as the truth.
ask a clinical question and get the passage the answer came from, or a refusal when the corpus does not support one.
no ai output reaches a patient without a human reading it first.
the retry that charges twice. a timeout is not a failure, it is an unknown, and retrying an unknown is how a customer gets billed again.
record the intent, acknowledge once, make the write idempotent, and keep a ledger you can replay.
design your ai agents around how they fail, not what they can do.
a guardrail that only runs on the output is a guardrail you have already paid for.
the queue is the part of the system that tells you the truth about load.
every integration is a promise about a system you do not control.
measure the pipeline end to end, because a percentage on its own is not checkable.
an answer with no citation is a claim, not a result.
refuse early, refuse loudly, and say which rule refused.
latency is a distribution, not a number, and the tail is where the users are.
a cache is a correctness decision wearing a performance costume.
back pressure is the only honest answer to a queue that is growing.
the model is the easy part. the serving path is where it breaks.
quantise the weights, batch the requests, and keep the kv cache warm.
prompt injection is not a prompt problem, it is an authorisation problem.
treat model output as untrusted input, because that is exactly what it is.
`;

const chars = [...new Set(CORPUS)].sort();
const stoi = new Map(chars.map((c, i) => [c, i]));
const V = chars.length;
const data = Int32Array.from([...CORPUS].map((c) => stoi.get(c)));

const D = 32;
const HEADS = 2;
const DH = D / HEADS;
const LAYERS = 2;
const FF = 64;
const BLOCK = 64;
const BATCH = 12;
const STEPS = Number(process.env.STEPS ?? 2600);
const LR = 3e-3;

let seed = 1337;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const randn = () => {
  const u = Math.max(rand(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
};

const params = [];
const p = (rows, cols, sd) => {
  const t = tensor(rows, cols, sd === 0 ? () => 0 : () => randn() * sd);
  params.push(t);
  return t;
};
const ones = (n) => {
  const t = tensor(1, n, () => 1);
  params.push(t);
  return t;
};

const wte = p(V, D, 0.08);
const wpe = p(BLOCK, D, 0.02);
const blocks = [];
for (let l = 0; l < LAYERS; l += 1) {
  blocks.push({
    ln1g: ones(D),
    ln1b: p(1, D, 0),
    heads: Array.from({ length: HEADS }, () => ({
      wq: p(D, DH, 0.12),
      wk: p(D, DH, 0.12),
      wv: p(D, DH, 0.12),
      wo: p(DH, D, 0.12),
    })),
    ln2g: ones(D),
    ln2b: p(1, D, 0),
    wf1: p(D, FF, 0.1),
    bf1: p(1, FF, 0),
    wf2: p(FF, D, 0.1),
    bf2: p(1, D, 0),
  });
}
const lnfg = ones(D);
const lnfb = p(1, D, 0);
const head = p(D, V, 0.08);

function forward(idx, collect) {
  const T = idx.length;
  const x0 = tensor(T, D);
  for (let i = 0; i < T; i += 1)
    for (let j = 0; j < D; j += 1) x0.data[i * D + j] = wte.data[idx[i] * D + j] + wpe.data[i * D + j];
  x0.backward = () => {
    for (let i = 0; i < T; i += 1)
      for (let j = 0; j < D; j += 1) {
        wte.grad[idx[i] * D + j] += x0.grad[i * D + j];
        wpe.grad[i * D + j] += x0.grad[i * D + j];
      }
  };

  let x = x0;
  const maps = [];
  for (const b of blocks) {
    const n1 = layernorm(x, b.ln1g, b.ln1b);
    let attnSum = null;
    for (const h of b.heads) {
      const q = matmul(n1, h.wq);
      const k = matmul(n1, h.wk);
      const v = matmul(n1, h.wv);
      const att = causalSoftmax(scale(matmul(q, transpose(k)), 1 / Math.sqrt(DH)));
      if (collect) maps.push(att);
      const o = matmul(matmul(att, v), h.wo);
      attnSum = attnSum ? add(attnSum, o) : o;
    }
    x = add(x, attnSum);
    const n2 = layernorm(x, b.ln2g, b.ln2b);
    const f = matmul(gelu(addRow(matmul(n2, b.wf1), b.bf1)), b.wf2);
    x = add(x, addRow(f, b.bf2));
  }
  const logits = matmul(layernorm(x, lnfg, lnfb), head);
  return { logits, maps };
}

const m = params.map((t) => new Float32Array(t.data.length));
const v = params.map((t) => new Float32Array(t.data.length));
let step = 0;

const t0 = Date.now();
for (let s = 0; s < STEPS; s += 1) {
  for (const t of params) t.grad.fill(0);
  let loss = 0;
  for (let b = 0; b < BATCH; b += 1) {
    const start = Math.floor(rand() * (data.length - BLOCK - 1));
    const idx = Array.from({ length: BLOCK }, (_, i) => data[start + i]);
    const tgt = Array.from({ length: BLOCK }, (_, i) => data[start + i + 1]);
    const { logits } = forward(idx, false);
    const l = crossEntropy(logits, tgt);
    l.grad[0] = 1 / BATCH;
    backprop(l);
    loss += l.data[0] / BATCH;
  }
  step += 1;
  const bc1 = 1 - Math.pow(0.9, step);
  const bc2 = 1 - Math.pow(0.999, step);
  for (let i = 0; i < params.length; i += 1) {
    const t = params[i];
    for (let j = 0; j < t.data.length; j += 1) {
      const g = Math.max(-1, Math.min(1, t.grad[j]));
      m[i][j] = 0.9 * m[i][j] + 0.1 * g;
      v[i][j] = 0.999 * v[i][j] + 0.001 * g * g;
      t.data[j] -= (LR * (m[i][j] / bc1)) / (Math.sqrt(v[i][j] / bc2) + 1e-8);
    }
  }
  if (s % 200 === 0 || s === STEPS - 1)
    console.log(`step ${String(s).padStart(4)}  loss ${loss.toFixed(4)}  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

const quant = (t) => {
  let max = 0;
  for (const x of t.data) max = Math.max(max, Math.abs(x));
  const sc = max / 127 || 1;
  const q = new Int8Array(t.data.length);
  for (let i = 0; i < t.data.length; i += 1) q[i] = Math.max(-127, Math.min(127, Math.round(t.data[i] / sc)));
  return { s: Number(sc.toPrecision(7)), d: Buffer.from(q.buffer).toString("base64") };
};

const out = {
  config: { D, HEADS, DH, LAYERS, FF, BLOCK, V },
  vocab: chars.join(""),
  weights: {
    wte: quant(wte),
    wpe: quant(wpe),
    lnfg: quant(lnfg),
    lnfb: quant(lnfb),
    head: quant(head),
    blocks: blocks.map((b) => ({
      ln1g: quant(b.ln1g),
      ln1b: quant(b.ln1b),
      heads: b.heads.map((h) => ({ wq: quant(h.wq), wk: quant(h.wk), wv: quant(h.wv), wo: quant(h.wo) })),
      ln2g: quant(b.ln2g),
      ln2b: quant(b.ln2b),
      wf1: quant(b.wf1),
      bf1: quant(b.bf1),
      wf2: quant(b.wf2),
      bf2: quant(b.bf2),
    })),
  },
};

const json = JSON.stringify(out);
writeFileSync("src/data/tinyformer.json", json);
const paramCount = params.reduce((n, t) => n + t.data.length, 0);
console.log(`\nparams ${paramCount}  int8 json ${(json.length / 1024).toFixed(1)}kB  vocab ${V}`);
