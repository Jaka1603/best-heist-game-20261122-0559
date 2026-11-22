// A tiny static server for game/ (Node 22, standard library only).
// It exists so the entry can be played locally without a build step:
//   node serve.ts               serves game/ on http://localhost:8080
//   node serve.ts --port 9000   serves it on port 9000 instead
// It answers with the MIME types a browser game needs, refuses every
// path that escapes game/, and otherwise does nothing clever. This is a
// development convenience, not a web server for the internet.

import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('./game', import.meta.url)));

function pickPort(argv) {
  const flag = argv.indexOf('--port');
  const wanted = flag === -1 ? 8080 : Number(argv[flag + 1]);
  if (Number.isInteger(wanted) && wanted > 0 && wanted < 65536) return wanted;
  return 8080;
}

const port = pickPort(process.argv.slice(2));

const TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.webp', 'image/webp'],
  ['.svg', 'image/svg+xml'],
  ['.ico', 'image/x-icon'],
  ['.woff2', 'font/woff2'],
  ['.glb', 'model/gltf-binary'],
  ['.gltf', 'model/gltf+json'],
  ['.bin', 'application/octet-stream'],
  ['.wasm', 'application/wasm'],
  ['.wav', 'audio/wav'],
  ['.mp3', 'audio/mpeg'],
  ['.ogg', 'audio/ogg'],
  ['.txt', 'text/plain; charset=utf-8'],
]);

function typeFor(file) {
  return TYPES.get(extname(file).toLowerCase()) ?? 'application/octet-stream';
}

// Resolve the request path inside game/; null when it escapes or is not
// a file.
function resolveFile(pathname) {
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = resolve(join(root, normalize(pathname)));
  if (file !== root && !file.startsWith(root + sep)) return null;
  try {
    const stats = statSync(file);
    if (!stats.isFile()) return null;
    return { file, size: stats.size };
  } catch {
    return null;
  }
}

createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    response.writeHead(400).end('bad request');
    return;
  }
  const found = resolveFile(pathname);
  if (!found) {
    response.writeHead(404).end('not found');
    return;
  }
  response.writeHead(200, {
    'content-type': typeFor(found.file),
    'content-length': found.size,
    'cache-control': 'no-store',
  });
  createReadStream(found.file).pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`game/ is on http://localhost:${port}`);
});
