// The live-session relay for the course pages (assets/present.js). A Cloudflare Worker.
// One room per 4-digit PIN, held by a Durable Object. The presenter connects with a secret key and is
// the only one who may send; everyone else in the room receives what the presenter sends. A newcomer
// gets the presenter's latest position at once. Only slide positions and the laser go through here.
//   GET /room/1234                      follower (WebSocket)
//   GET /room/1234?role=host&key=...    presenter (WebSocket)
const HOLD_MS = 12 * 3600 * 1000;   // a PIN stays with its presenter for 12 h after their last connect

export default {
  async fetch(req, env) {
    const m = new URL(req.url).pathname.match(/^\/room\/(\d{4})$/);
    if (!m) return new Response('DIT course live relay\n', { headers: { 'content-type': 'text/plain' } });
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('expected a WebSocket\n', { status: 426 });
    return env.ROOMS.get(env.ROOMS.idFromName(m[1])).fetch(req);
  },
};

export class Room {
  constructor(state) { this.state = state; }

  async fetch(req) {
    const url = new URL(req.url);
    const host = url.searchParams.get('role') === 'host';
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    if (host) {
      const key = url.searchParams.get('key') || '';
      const cur = await this.state.storage.get('host');
      if (!/^[0-9a-f]{16,64}$/.test(key) || (cur && cur.key !== key && Date.now() - cur.at < HOLD_MS)) {
        server.accept(); server.send(JSON.stringify({ t: 'taken' })); server.close(4009, 'taken');
        return new Response(null, { status: 101, webSocket: client });
      }
      if (!cur || cur.key !== key) await this.state.storage.delete('last');   // a new session: forget the old position
      await this.state.storage.put('host', { key, at: Date.now() });
    }
    this.state.acceptWebSocket(server, [host ? 'host' : 'guest']);
    if (!host) { const last = await this.state.storage.get('last'); if (last) server.send(last); }
    this.count();
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, msg) {
    if (!this.state.getTags(ws).includes('host')) return;       // followers can't send anything
    if (typeof msg !== 'string' || msg.length > 1000) return;
    let m; try { m = JSON.parse(msg); } catch (e) { return; }
    if (m.t === 'at') await this.state.storage.put('last', msg);
    if (m.t === 'end') { await this.state.storage.delete('last'); await this.state.storage.delete('host'); }
    for (const s of this.state.getWebSockets('guest')) { try { s.send(msg); } catch (e) {} }
  }

  webSocketClose(ws, code) { try { ws.close(code === 1005 ? 1000 : code); } catch (e) {} this.count(ws); }
  webSocketError(ws) { this.count(ws); }

  // tell the presenter how many are watching
  count(gone) {
    const n = this.state.getWebSockets('guest').filter(s => s !== gone && s.readyState === 1).length;
    for (const s of this.state.getWebSockets('host')) { try { s.send(JSON.stringify({ t: 'n', n })); } catch (e) {} }
  }
}
