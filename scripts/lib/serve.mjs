import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp",
  ".ico": "image/x-icon", ".json": "application/json", ".xml": "application/xml",
  ".woff": "font/woff", ".woff2": "font/woff2", ".pdf": "application/pdf",
  ".txt": "text/plain", ".mp4": "video/mp4", ".webmanifest": "application/manifest+json",
};

export function serveDist(root = "dist") {
  const server = createServer((req, res) => {
    const url = (req.url || "/").split("?")[0];
    let p = join(root, normalize(url));
    if (existsSync(p) && statSync(p).isDirectory()) p = join(p, "index.html");
    if (!existsSync(p)) p = existsSync(`${p}.html`) ? `${p}.html` : join(root, "index.html");
    res.writeHead(200, { "content-type": MIME[extname(p)] || "application/octet-stream" });
    createReadStream(p).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, () => resolve(server)));
}

export async function startDist(root = "dist") {
  if (process.env.CHECK_BASE) {
    return { base: process.env.CHECK_BASE, close: () => {} };
  }
  const server = await serveDist(root);
  return {
    base: `http://127.0.0.1:${server.address().port}`,
    close: () => server.close(),
  };
}
