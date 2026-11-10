export function tensor(rows, cols, init) {
  const data = new Float32Array(rows * cols);
  if (init) for (let i = 0; i < data.length; i += 1) data[i] = init(i);
  return { rows, cols, data, grad: new Float32Array(rows * cols), parents: [], backward: null };
}

export function like(t) {
  return tensor(t.rows, t.cols);
}

const node = (rows, cols, parents, backward) => ({
  rows,
  cols,
  data: new Float32Array(rows * cols),
  grad: new Float32Array(rows * cols),
  parents,
  backward,
});

export function matmul(a, b) {
  const out = node(a.rows, b.cols, [a, b], null);
  const { rows: m, cols: k } = a;
  const n = b.cols;
  for (let i = 0; i < m; i += 1) {
    for (let p = 0; p < k; p += 1) {
      const av = a.data[i * k + p];
      if (av === 0) continue;
      for (let j = 0; j < n; j += 1) out.data[i * n + j] += av * b.data[p * n + j];
    }
  }
  out.backward = () => {
    for (let i = 0; i < m; i += 1) {
      for (let p = 0; p < k; p += 1) {
        let acc = 0;
        for (let j = 0; j < n; j += 1) acc += out.grad[i * n + j] * b.data[p * n + j];
        a.grad[i * k + p] += acc;
      }
    }
    for (let p = 0; p < k; p += 1) {
      for (let j = 0; j < n; j += 1) {
        let acc = 0;
        for (let i = 0; i < m; i += 1) acc += out.grad[i * n + j] * a.data[i * k + p];
        b.grad[p * n + j] += acc;
      }
    }
  };
  return out;
}

export function addRow(a, bias) {
  const out = node(a.rows, a.cols, [a, bias], null);
  for (let i = 0; i < a.rows; i += 1)
    for (let j = 0; j < a.cols; j += 1) out.data[i * a.cols + j] = a.data[i * a.cols + j] + bias.data[j];
  out.backward = () => {
    for (let i = 0; i < a.rows; i += 1)
      for (let j = 0; j < a.cols; j += 1) {
        const g = out.grad[i * a.cols + j];
        a.grad[i * a.cols + j] += g;
        bias.grad[j] += g;
      }
  };
  return out;
}

export function add(a, b) {
  const out = node(a.rows, a.cols, [a, b], null);
  for (let i = 0; i < a.data.length; i += 1) out.data[i] = a.data[i] + b.data[i];
  out.backward = () => {
    for (let i = 0; i < a.data.length; i += 1) {
      a.grad[i] += out.grad[i];
      b.grad[i] += out.grad[i];
    }
  };
  return out;
}

export function gelu(a) {
  const out = node(a.rows, a.cols, [a], null);
  const c = Math.sqrt(2 / Math.PI);
  for (let i = 0; i < a.data.length; i += 1) {
    const x = a.data[i];
    out.data[i] = 0.5 * x * (1 + Math.tanh(c * (x + 0.044715 * x * x * x)));
  }
  out.backward = () => {
    for (let i = 0; i < a.data.length; i += 1) {
      const x = a.data[i];
      const inner = c * (x + 0.044715 * x * x * x);
      const th = Math.tanh(inner);
      const d = 0.5 * (1 + th) + 0.5 * x * (1 - th * th) * c * (1 + 3 * 0.044715 * x * x);
      a.grad[i] += out.grad[i] * d;
    }
  };
  return out;
}

export function layernorm(a, g, b, eps = 1e-5) {
  const out = node(a.rows, a.cols, [a, g, b], null);
  const n = a.cols;
  const mus = new Float32Array(a.rows);
  const invs = new Float32Array(a.rows);
  const norm = new Float32Array(a.data.length);
  for (let i = 0; i < a.rows; i += 1) {
    let mu = 0;
    for (let j = 0; j < n; j += 1) mu += a.data[i * n + j];
    mu /= n;
    let v = 0;
    for (let j = 0; j < n; j += 1) {
      const d = a.data[i * n + j] - mu;
      v += d * d;
    }
    v /= n;
    const inv = 1 / Math.sqrt(v + eps);
    mus[i] = mu;
    invs[i] = inv;
    for (let j = 0; j < n; j += 1) {
      const nh = (a.data[i * n + j] - mu) * inv;
      norm[i * n + j] = nh;
      out.data[i * n + j] = nh * g.data[j] + b.data[j];
    }
  }
  out.backward = () => {
    for (let i = 0; i < a.rows; i += 1) {
      const inv = invs[i];
      let sg = 0;
      let sgn = 0;
      for (let j = 0; j < n; j += 1) {
        const go = out.grad[i * n + j];
        const gh = go * g.data[j];
        sg += gh;
        sgn += gh * norm[i * n + j];
        g.grad[j] += go * norm[i * n + j];
        b.grad[j] += go;
      }
      for (let j = 0; j < n; j += 1) {
        const gh = out.grad[i * n + j] * g.data[j];
        a.grad[i * n + j] += (inv / n) * (n * gh - sg - norm[i * n + j] * sgn);
      }
    }
  };
  return out;
}

export function scale(a, s) {
  const out = node(a.rows, a.cols, [a], null);
  for (let i = 0; i < a.data.length; i += 1) out.data[i] = a.data[i] * s;
  out.backward = () => {
    for (let i = 0; i < a.data.length; i += 1) a.grad[i] += out.grad[i] * s;
  };
  return out;
}

export function transpose(a) {
  const out = node(a.cols, a.rows, [a], null);
  for (let i = 0; i < a.rows; i += 1)
    for (let j = 0; j < a.cols; j += 1) out.data[j * a.rows + i] = a.data[i * a.cols + j];
  out.backward = () => {
    for (let i = 0; i < a.rows; i += 1)
      for (let j = 0; j < a.cols; j += 1) a.grad[i * a.cols + j] += out.grad[j * a.rows + i];
  };
  return out;
}

export function causalSoftmax(a) {
  const out = node(a.rows, a.cols, [a], null);
  const n = a.cols;
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
  out.backward = () => {
    for (let i = 0; i < a.rows; i += 1) {
      let dot = 0;
      for (let j = 0; j <= i && j < n; j += 1) dot += out.grad[i * n + j] * out.data[i * n + j];
      for (let j = 0; j <= i && j < n; j += 1)
        a.grad[i * n + j] += out.data[i * n + j] * (out.grad[i * n + j] - dot);
    }
  };
  return out;
}

export function crossEntropy(logits, targets) {
  const out = node(1, 1, [logits], null);
  const V = logits.cols;
  const probs = new Float32Array(logits.data.length);
  let loss = 0;
  for (let i = 0; i < logits.rows; i += 1) {
    let max = -Infinity;
    for (let j = 0; j < V; j += 1) max = Math.max(max, logits.data[i * V + j]);
    let sum = 0;
    for (let j = 0; j < V; j += 1) {
      const e = Math.exp(logits.data[i * V + j] - max);
      probs[i * V + j] = e;
      sum += e;
    }
    for (let j = 0; j < V; j += 1) probs[i * V + j] /= sum;
    loss += -Math.log(Math.max(probs[i * V + targets[i]], 1e-9));
  }
  out.data[0] = loss / logits.rows;
  out.backward = () => {
    const sc = out.grad[0] / logits.rows;
    for (let i = 0; i < logits.rows; i += 1)
      for (let j = 0; j < V; j += 1)
        logits.grad[i * V + j] += sc * (probs[i * V + j] - (j === targets[i] ? 1 : 0));
  };
  return out;
}

export function backprop(root) {
  const order = [];
  const seen = new Set();
  const visit = (n) => {
    if (seen.has(n)) return;
    seen.add(n);
    for (const p of n.parents) visit(p);
    order.push(n);
  };
  visit(root);
  root.grad[0] = 1;
  for (let i = order.length - 1; i >= 0; i -= 1) if (order[i].backward) order[i].backward();
}
