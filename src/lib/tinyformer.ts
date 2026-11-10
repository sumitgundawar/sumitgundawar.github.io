export type QTensor = { s: number; d: string };

export type Weights = {
  config: { D: number; HEADS: number; DH: number; LAYERS: number; FF: number; BLOCK: number; V: number };
  vocab: string;
  weights: {
    wte: QTensor;
    wpe: QTensor;
    lnfg: QTensor;
    lnfb: QTensor;
    head: QTensor;
    blocks: {
      ln1g: QTensor;
      ln1b: QTensor;
      heads: { wq: QTensor; wk: QTensor; wv: QTensor; wo: QTensor }[];
      ln2g: QTensor;
      ln2b: QTensor;
      wf1: QTensor;
      bf1: QTensor;
      wf2: QTensor;
      bf2: QTensor;
    }[];
  };
};

export type Mat = { rows: number; cols: number; data: Float32Array };

function dequant(q: QTensor, rows: number, cols: number): Mat {
  const bin = atob(q.d);
  const data = new Float32Array(rows * cols);
  for (let i = 0; i < data.length; i += 1) {
    const byte = bin.charCodeAt(i);
    data[i] = (byte > 127 ? byte - 256 : byte) * q.s;
  }
  return { rows, cols, data };
}

function matmul(a: Mat, b: Mat): Mat {
  const out: Mat = { rows: a.rows, cols: b.cols, data: new Float32Array(a.rows * b.cols) };
  for (let i = 0; i < a.rows; i += 1) {
    for (let p = 0; p < a.cols; p += 1) {
      const av = a.data[i * a.cols + p];
      if (av === 0) continue;
      for (let j = 0; j < b.cols; j += 1) out.data[i * b.cols + j] += av * b.data[p * b.cols + j];
    }
  }
  return out;
}

function addRow(a: Mat, bias: Mat) {
  for (let i = 0; i < a.rows; i += 1)
    for (let j = 0; j < a.cols; j += 1) a.data[i * a.cols + j] += bias.data[j];
  return a;
}

function addInto(a: Mat, b: Mat) {
  for (let i = 0; i < a.data.length; i += 1) a.data[i] += b.data[i];
  return a;
}

function gelu(a: Mat) {
  const c = Math.sqrt(2 / Math.PI);
  for (let i = 0; i < a.data.length; i += 1) {
    const x = a.data[i];
    a.data[i] = 0.5 * x * (1 + Math.tanh(c * (x + 0.044715 * x * x * x)));
  }
  return a;
}

function layernorm(a: Mat, g: Mat, b: Mat): Mat {
  const n = a.cols;
  const out: Mat = { rows: a.rows, cols: n, data: new Float32Array(a.data.length) };
  for (let i = 0; i < a.rows; i += 1) {
    let mu = 0;
    for (let j = 0; j < n; j += 1) mu += a.data[i * n + j];
    mu /= n;
    let v = 0;
    for (let j = 0; j < n; j += 1) {
      const d = a.data[i * n + j] - mu;
      v += d * d;
    }
    const inv = 1 / Math.sqrt(v / n + 1e-5);
    for (let j = 0; j < n; j += 1)
      out.data[i * n + j] = (a.data[i * n + j] - mu) * inv * g.data[j] + b.data[j];
  }
  return out;
}

function transpose(a: Mat): Mat {
  const out: Mat = { rows: a.cols, cols: a.rows, data: new Float32Array(a.data.length) };
  for (let i = 0; i < a.rows; i += 1)
    for (let j = 0; j < a.cols; j += 1) out.data[j * a.rows + i] = a.data[i * a.cols + j];
  return out;
}

function causalSoftmax(a: Mat): Mat {
  const n = a.cols;
  const out: Mat = { rows: a.rows, cols: n, data: new Float32Array(a.data.length) };
  for (let i = 0; i < a.rows; i += 1) {
    let max = -Infinity;
    for (let j = 0; j <= i && j < n; j += 1) max = Math.max(max, a.data[i * n + j]);
    let sum = 0;
    for (let j = 0; j <= i && j < n; j += 1) {
      const e = Math.exp(a.data[i * n + j] - max);
      out.data[i * n + j] = e;
      sum += e;
    }
    for (let j = 0; j <= i && j < n; j += 1) out.data[i * n + j] /= sum;
  }
  return out;
}

export class Tinyformer {
  readonly vocab: string;
  readonly config: Weights["config"];
  private stoi = new Map<string, number>();
  private wte: Mat;
  private wpe: Mat;
  private lnfg: Mat;
  private lnfb: Mat;
  private head: Mat;
  private blocks: {
    ln1g: Mat;
    ln1b: Mat;
    heads: { wq: Mat; wk: Mat; wv: Mat; wo: Mat }[];
    ln2g: Mat;
    ln2b: Mat;
    wf1: Mat;
    bf1: Mat;
    wf2: Mat;
    bf2: Mat;
  }[];

  constructor(w: Weights) {
    const { D, DH, FF, BLOCK, V } = w.config;
    this.config = w.config;
    this.vocab = w.vocab;
    [...w.vocab].forEach((c, i) => this.stoi.set(c, i));
    this.wte = dequant(w.weights.wte, V, D);
    this.wpe = dequant(w.weights.wpe, BLOCK, D);
    this.lnfg = dequant(w.weights.lnfg, 1, D);
    this.lnfb = dequant(w.weights.lnfb, 1, D);
    this.head = dequant(w.weights.head, D, V);
    this.blocks = w.weights.blocks.map((b) => ({
      ln1g: dequant(b.ln1g, 1, D),
      ln1b: dequant(b.ln1b, 1, D),
      heads: b.heads.map((h) => ({
        wq: dequant(h.wq, D, DH),
        wk: dequant(h.wk, D, DH),
        wv: dequant(h.wv, D, DH),
        wo: dequant(h.wo, DH, D),
      })),
      ln2g: dequant(b.ln2g, 1, D),
      ln2b: dequant(b.ln2b, 1, D),
      wf1: dequant(b.wf1, D, FF),
      bf1: dequant(b.bf1, 1, FF),
      wf2: dequant(b.wf2, FF, D),
      bf2: dequant(b.bf2, 1, D),
    }));
  }

  encode(text: string) {
    const out: number[] = [];
    for (const ch of text) {
      const id = this.stoi.get(ch);
      if (id !== undefined) out.push(id);
    }
    return out;
  }

  forward(ids: number[]) {
    const { D } = this.config;
    const T = ids.length;
    let x: Mat = { rows: T, cols: D, data: new Float32Array(T * D) };
    for (let i = 0; i < T; i += 1)
      for (let j = 0; j < D; j += 1)
        x.data[i * D + j] = this.wte.data[ids[i] * D + j] + this.wpe.data[i * D + j];

    const attention: Mat[] = [];
    for (const b of this.blocks) {
      const n1 = layernorm(x, b.ln1g, b.ln1b);
      const sum: Mat = { rows: T, cols: D, data: new Float32Array(T * D) };
      for (const h of b.heads) {
        const q = matmul(n1, h.wq);
        const k = matmul(n1, h.wk);
        const v = matmul(n1, h.wv);
        const scores = matmul(q, transpose(k));
        const inv = 1 / Math.sqrt(this.config.DH);
        for (let i = 0; i < scores.data.length; i += 1) scores.data[i] *= inv;
        const att = causalSoftmax(scores);
        attention.push(att);
        addInto(sum, matmul(matmul(att, v), h.wo));
      }
      x = addInto(x, sum);
      const n2 = layernorm(x, b.ln2g, b.ln2b);
      const f = matmul(gelu(addRow(matmul(n2, b.wf1), b.bf1)), b.wf2);
      x = addInto(x, addRow(f, b.bf2));
    }

    const logits = matmul(layernorm(x, this.lnfg, this.lnfb), this.head);
    return { logits, attention };
  }

  nextDistribution(ids: number[], temperature = 0.8) {
    const window = ids.slice(-this.config.BLOCK);
    const { logits, attention } = this.forward(window);
    const V = this.config.V;
    const row = (window.length - 1) * V;
    const probs = new Float32Array(V);
    let max = -Infinity;
    for (let j = 0; j < V; j += 1) max = Math.max(max, logits.data[row + j]);
    let sum = 0;
    for (let j = 0; j < V; j += 1) {
      const e = Math.exp((logits.data[row + j] - max) / temperature);
      probs[j] = e;
      sum += e;
    }
    for (let j = 0; j < V; j += 1) probs[j] /= sum;
    return { probs, attention, window };
  }

  argmax(probs: Float32Array) {
    let best = 0;
    let bv = -Infinity;
    for (let j = 0; j < probs.length; j += 1) {
      if (probs[j] > bv) {
        bv = probs[j];
        best = j;
      }
    }
    return best;
  }

  decode(ids: number[]) {
    return ids.map((i) => this.vocab[i] ?? "").join("");
  }
}

export async function loadTinyformer(): Promise<Tinyformer> {
  const mod = await import("@/data/tinyformer.json");
  return new Tinyformer((mod.default ?? mod) as unknown as Weights);
}
