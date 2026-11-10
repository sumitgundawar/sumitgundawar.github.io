import { readFileSync } from "node:fs";
const w = JSON.parse(readFileSync("src/data/tinyformer.json", "utf8"));
const { D, DH, FF, BLOCK, V } = w.config;
const deq = (q, rows, cols) => {
  const b = Buffer.from(q.d, "base64");
  const out = new Float32Array(rows * cols);
  for (let i = 0; i < out.length; i += 1) out[i] = b.readInt8(i) * q.s;
  return { rows, cols, data: out };
};
const mm = (a, b) => {
  const o = { rows: a.rows, cols: b.cols, data: new Float32Array(a.rows * b.cols) };
  for (let i = 0; i < a.rows; i++) for (let p = 0; p < a.cols; p++) {
    const av = a.data[i * a.cols + p]; if (!av) continue;
    for (let j = 0; j < b.cols; j++) o.data[i * b.cols + j] += av * b.data[p * b.cols + j];
  }
  return o;
};
const addRow = (a, bias) => { for (let i = 0; i < a.rows; i++) for (let j = 0; j < a.cols; j++) a.data[i*a.cols+j] += bias.data[j]; return a; };
const addIn = (a, b) => { for (let i = 0; i < a.data.length; i++) a.data[i] += b.data[i]; return a; };
const gelu = (a) => { const c = Math.sqrt(2/Math.PI); for (let i=0;i<a.data.length;i++){const x=a.data[i];a.data[i]=0.5*x*(1+Math.tanh(c*(x+0.044715*x*x*x)));} return a; };
const ln = (a,g,b) => { const n=a.cols,o={rows:a.rows,cols:n,data:new Float32Array(a.data.length)};
  for(let i=0;i<a.rows;i++){let mu=0;for(let j=0;j<n;j++)mu+=a.data[i*n+j];mu/=n;let v=0;
  for(let j=0;j<n;j++){const d=a.data[i*n+j]-mu;v+=d*d;}const inv=1/Math.sqrt(v/n+1e-5);
  for(let j=0;j<n;j++)o.data[i*n+j]=(a.data[i*n+j]-mu)*inv*g.data[j]+b.data[j];}return o;};
const tr = (a) => { const o={rows:a.cols,cols:a.rows,data:new Float32Array(a.data.length)};
  for(let i=0;i<a.rows;i++)for(let j=0;j<a.cols;j++)o.data[j*a.rows+i]=a.data[i*a.cols+j];return o;};
const csm = (a) => { const n=a.cols,o={rows:a.rows,cols:n,data:new Float32Array(a.data.length)};
  for(let i=0;i<a.rows;i++){let m=-Infinity;for(let j=0;j<=i&&j<n;j++)m=Math.max(m,a.data[i*n+j]);
  let s=0;for(let j=0;j<=i&&j<n;j++){const e=Math.exp(a.data[i*n+j]-m);o.data[i*n+j]=e;s+=e;}
  for(let j=0;j<=i&&j<n;j++)o.data[i*n+j]/=s;}return o;};

const W = w.weights;
const wte=deq(W.wte,V,D), wpe=deq(W.wpe,BLOCK,D), lnfg=deq(W.lnfg,1,D), lnfb=deq(W.lnfb,1,D), head=deq(W.head,D,V);
const blocks = W.blocks.map(b=>({ln1g:deq(b.ln1g,1,D),ln1b:deq(b.ln1b,1,D),
  heads:b.heads.map(h=>({wq:deq(h.wq,D,DH),wk:deq(h.wk,D,DH),wv:deq(h.wv,D,DH),wo:deq(h.wo,DH,D)})),
  ln2g:deq(b.ln2g,1,D),ln2b:deq(b.ln2b,1,D),wf1:deq(b.wf1,D,FF),bf1:deq(b.bf1,1,FF),wf2:deq(b.wf2,FF,D),bf2:deq(b.bf2,1,D)}));

const stoi = new Map([...w.vocab].map((c,i)=>[c,i]));
function fwd(ids){
  const T=ids.length;
  let x={rows:T,cols:D,data:new Float32Array(T*D)};
  for(let i=0;i<T;i++)for(let j=0;j<D;j++)x.data[i*D+j]=wte.data[ids[i]*D+j]+wpe.data[i*D+j];
  for(const b of blocks){
    const n1=ln(x,b.ln1g,b.ln1b);
    const sum={rows:T,cols:D,data:new Float32Array(T*D)};
    for(const h of b.heads){
      const q=mm(n1,h.wq),k=mm(n1,h.wk),v=mm(n1,h.wv);
      const sc=mm(q,tr(k)); const inv=1/Math.sqrt(DH);
      for(let i=0;i<sc.data.length;i++)sc.data[i]*=inv;
      addIn(sum, mm(mm(csm(sc),v),h.wo));
    }
    x=addIn(x,sum);
    const n2=ln(x,b.ln2g,b.ln2b);
    x=addIn(x, addRow(mm(gelu(addRow(mm(n2,b.wf1),b.bf1)),b.wf2), b.bf2));
  }
  return mm(ln(x,lnfg,lnfb),head);
}
const prompt = process.argv[2] ?? "a timeout is not a failure, it is an ";
let ids=[...prompt].map(c=>stoi.get(c)).filter(x=>x!==undefined);
let out="";
for(let n=0;n<70;n++){
  const win=ids.slice(-BLOCK);
  const lg=fwd(win);
  const row=(win.length-1)*V;
  let best=0,bv=-Infinity;
  for(let j=0;j<V;j++){const v=lg.data[row+j];if(v>bv){bv=v;best=j;}}
  ids.push(best); out+=w.vocab[best];
}
console.log("prompt :", JSON.stringify(prompt));
console.log("greedy :", JSON.stringify(out));
