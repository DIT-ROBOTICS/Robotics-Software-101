# The course server and live-session relay

Present mode (`assets/present.js`) can run a live session: the presenter gets a 4-digit PIN, and
everyone who joins with it follows the presenter's slides, walkthrough steps and laser. The pages
are static, so the messages go through a small relay. It only passes on slide positions and the
laser position: nothing typed by anyone, no names. Only the presenter (who holds a secret key for
the PIN) can send.

There are two ways to run it. Use the first.

## 1. On our own server (recommended)

`server.mjs` serves the course pages **and** the relay from one address, so the pages find the
relay by themselves: nothing to configure. One container, built from the whole repository. On the
server (it needs Docker with the compose plugin):

```bash
git clone https://github.com/DIT-ROBOTICS/Robotics-Software-101.git
cd Robotics-Software-101
docker compose -f relay/compose.yaml up -d --build
```

The site is then at `http://<server>/`. To publish new pages: `git pull`, then the same
`docker compose ... up -d --build`. Check it with `curl http://<server>/healthz` (prints `ok`).

- **Port.** It serves on port 80. Change the left number in `compose.yaml` (`"80:8080"`) to
  serve elsewhere, e.g. `"8080:8080"` on a machine where 80 is taken.
- **Behind your own reverse proxy** (nginx, Caddy) instead of the tunnel: pass WebSocket upgrades through for
  `/room/`. Caddy does this by itself (`reverse_proxy localhost:8080`). For nginx:

  ```nginx
  location / {
      proxy_pass http://127.0.0.1:8080;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
      proxy_read_timeout 1h;
  }
  ```

  A page served over `https://` connects with `wss://`, a page over `http://` with `ws://`: both
  work as long as the pages and the relay share the address.
- Rooms live in memory. Restarting the container ends live sessions; pages reconnect by
  themselves and the presenter gets their PIN back.

Try it on your own machine the same way, then open `http://localhost/os-1/`.

### A domain and HTTPS: the Cloudflare tunnel

To reach the site as, say, `https://courses.ditrobotics.com` (the way the OJ was
`oj.ditrobotics.com`), add a Cloudflare tunnel. The server then needs no open port and no
certificate; Cloudflare does HTTPS, and live sessions pass through it. Do this once, on the day
you deploy:

1. Cloudflare dashboard → **Zero Trust → Networks → Tunnels → Create a tunnel** (type
   Cloudflared). Name it, e.g. `dit-courses`.
2. On the install step, choose **Docker** and copy only the token (the long string after
   `--token`). On the server, put it in `relay/.env`, which git ignores:

   ```
   TUNNEL_TOKEN=eyJh...
   ```

   Never commit or paste the token anywhere else: it lets anyone serve pages under our domain.
3. **Public hostname**: subdomain `courses`, domain `ditrobotics.com`, service type **HTTP**,
   URL `dit-courses:8080` (the container's name on the compose network, not `localhost`).
4. Start both containers:

   ```bash
   docker compose -f relay/compose.yaml --profile tunnel up -d --build
   ```

   The tunnel shows **Healthy** in the dashboard, and the site opens at the new address. Use the
   same command after each `git pull`.

Cloudflare adds the DNS record for the hostname by itself. If the hostname was used before (e.g.
by an old tunnel), delete the old record or route first.

## 2. On Cloudflare (if the pages stay on GitHub Pages)

GitHub Pages can't run a relay, so it must live elsewhere. `worker.js` is the same relay as a
Cloudflare Worker (free plan, a Durable Object per PIN). You need a Cloudflare account and Node.js:

```bash
cd relay
npx wrangler login
npx wrangler deploy        # prints e.g. https://dit-live.<your-subdomain>.workers.dev
```

Then set `RELAY_DEFAULT` in `assets/present.js` to that address with `wss://` instead of
`https://`, and push. Until a relay is reachable, present mode and the laser still work; opened
from a file or GitHub Pages without `RELAY_DEFAULT`, the bar says "relay not set up".

## Testing against another relay

Open any page once with `?relay=ws://localhost:8080` (or `8787` for `npx wrangler dev`); the tab
remembers it.

## Protocol

- `GET /room/1234?role=host&key=…`: the presenter. The first key to claim a PIN keeps it for 12 h.
  Another presenter who picks the same PIN gets `{t:'taken'}` (close code 4009), and their page
  picks a new one.
- `GET /room/1234`: a follower. It receives the presenter's last position at once, then every move.
- Messages are JSON: `{t:'at', page, pid | step}` (where the presenter is), `{t:'laser', pid, fx, fy}`
  or `{t:'laser', off:1}`, `{t:'end'}`, and `{t:'n', n}` (how many follow, to the presenter only).
