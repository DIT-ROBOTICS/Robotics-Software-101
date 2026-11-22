// The course site and its live-session relay in one small server, for hosting on our own machine
// (see README.md). It serves the course pages as static files, and does what worker.js does for
// Cloudflare: one room per 4-digit PIN, only the presenter may send, a newcomer gets the
// presenter's latest position at once.
//   GET /room/1234                      follower (WebSocket)
//   GET /room/1234?role=host&key=...    presenter (WebSocket)
//   GET /healthz                        "ok"
//   anything else                       a file under SITE
// Rooms live in memory: a restart ends every live session (the pages reconnect and the presenter
// gets their PIN back).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { WebSocketServer } from 'ws';

const PORT = +process.env.PORT || 8080;
const SITE = path.resolve(process.env.SITE || new URL('..', import.meta.url).pathname);
const HOLD_MS = 12 * 3600 * 1000;   // a PIN stays with its presenter for 12 h after their last connect

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8',
  '.py': 'text/plain; charset=utf-8', '.c': 'text/plain; charset=utf-8', '.cpp': 'text/plain; charset=utf-8',
  '.sh': 'text/plain; charset=utf-8', '.yaml': 'text/plain; charset=utf-8', '.pdf': 'application/pdf',
};

function serveFile(req, res) {
  let rel;
  try { rel = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400).end(); return; }
  let file = path.join(SITE, rel);
  if (file !== SITE && !file.startsWith(SITE + path.sep)) { res.writeHead(403).end(); return; }
  if (rel.split('/').some(p => p.startsWith('.'))) { res.writeHead(404).end('not found\n'); return; }
  fs.stat(file, (err, st) => {
    if (!err && st.isDirectory()) {
      if (!rel.endsWith('/')) { res.writeHead(301, { location: rel + '/' }).end(); return; }
      file = path.join(file, 'index.html');
    }
    fs.stat(file, (err2, st2) => {
      if (err2 || !st2.isFile()) { res.writeHead(404, { 'content-type': 'text/plain' }).end('not found\n'); return; }
      res.writeHead(200, {
        'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'content-length': st2.size, 'cache-control': 'no-cache',
      });
      if (req.method === 'HEAD') { res.end(); return; }
      fs.createReadStream(file).pipe(res);
    });
  });
}

const server = http.createServer((req, res) => {
  if (req.url === '/healthz') { res.writeHead(200, { 'content-type': 'text/plain' }).end('ok\n'); return; }
  if (/^\/room\//.test(req.url)) { res.writeHead(426, { 'content-type': 'text/plain' }).end('expected a WebSocket\n'); return; }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
  serveFile(req, res);
});

// ---------- the relay ----------
const rooms = new Map();   // pin -> { host: {key, at} | null, last: string | null, hosts: Set, guests: Set }
const room = pin => {
  if (!rooms.has(pin)) rooms.set(pin, { host: null, last: null, hosts: new Set(), guests: new Set() });
  return rooms.get(pin);
};
const count = r => {
  const n = [...r.guests].filter(s => s.readyState === 1).length;
  for (const s of r.hosts) { try { s.send(JSON.stringify({ t: 'n', n })); } catch (e) {} }
};

const wss = new WebSocketServer({ noServer: true, maxPayload: 4096 });
server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, 'http://x');
  const m = url.pathname.match(/^\/room\/(\d{4})$/);
  if (!m) { socket.destroy(); return; }
  wss.handleUpgrade(req, socket, head, ws => join(ws, m[1], url.searchParams));
});

function join(ws, pin, q) {
  const r = room(pin);
  const isHost = q.get('role') === 'host';
  if (isHost) {
    const key = q.get('key') || '';
    if (!/^[0-9a-f]{16,64}$/.test(key) || (r.host && r.host.key !== key && Date.now() - r.host.at < HOLD_MS)) {
      ws.send(JSON.stringify({ t: 'taken' })); ws.close(4009, 'taken'); return;
    }
    if (!r.host || r.host.key !== key) r.last = null;   // a new session: forget the old position
    r.host = { key, at: Date.now() };
    r.hosts.add(ws);
  } else {
    r.guests.add(ws);
    if (r.last) ws.send(r.last);
  }
  count(r);

  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', (data, binary) => {
    if (!isHost || binary || data.length > 1000) return;   // followers can't send anything
    const msg = data.toString();
    let mm; try { mm = JSON.parse(msg); } catch (e) { return; }
    if (mm.t === 'at') r.last = msg;
    if (mm.t === 'end') { r.last = null; r.host = null; }
    for (const s of r.guests) { try { s.send(msg); } catch (e) {} }
  });
  ws.on('close', () => {
    (isHost ? r.hosts : r.guests).delete(ws);
    if (isHost && r.host) r.host.at = Date.now();
    count(r);
  });
  ws.on('error', () => {});
}

// drop dead connections, and forget rooms nobody has used for HOLD_MS
setInterval(() => {
  for (const ws of wss.clients) { if (!ws.isAlive) { ws.terminate(); continue; } ws.isAlive = false; try { ws.ping(); } catch (e) {} }
  for (const [pin, r] of rooms) {
    if (!r.hosts.size && !r.guests.size && (!r.host || Date.now() - r.host.at > HOLD_MS)) rooms.delete(pin);
  }
}, 30000).unref();

server.listen(PORT, () => console.log(`DIT courses on :${PORT}, serving ${SITE}`));
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => { server.close(); process.exit(0); });
