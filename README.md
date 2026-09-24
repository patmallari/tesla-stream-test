# Tesla Dashboard

A self-hosted, full-screen launcher dashboard built for the Chromium-based
in-car browser on Tesla vehicles. It's a tile-based app launcher where every
tile — a link, a live camera, an app you don't control the headers of —
opens and stays **inside this same page**. Nothing here ever navigates the
Tesla browser away to load a tile; there is no `window.location.href =` or
`window.open()` triggered automatically anywhere in this codebase.

Two kinds of tiles, two rendering mechanisms:

- **Video-stream tiles** decode a live transcoded feed onto an HTML5
  `<canvas>` with audio through the Web Audio API — never a native
  `<video>`/`<audio>` element, which is what stops Tesla's browser from
  pausing playback when the tab loses focus or the screen dims.
- **Link tiles** open inside the dashboard too. With the optional backend
  configured, this uses a real headless browser tab on your server,
  streamed here as video and driven by your taps — see
  ["How link tiles actually render"](#how-link-tiles-actually-render) below
  for why that's necessary and how it works.

```
tesla-dashboard/
├── docker-compose.yml
├── backend/          Node.js relay: Express API + WebSocket + ffmpeg + Playwright
│   └── src/
│       ├── server.js           HTTP API + unified WS upgrade dispatch
│       ├── wsRelay.js           /ws/video/:streamId (video-stream tiles)
│       ├── streamManager.js     ref-counted ffmpeg process pool
│       ├── wsBrowseRelay.js     /ws/browse (in-dashboard link-tile browsing)
│       ├── browserSessions.js   Playwright/CDP headless-tab session pool
│       └── config.js            SQLite store for tiles + stream definitions
└── frontend/         Vite + React + Tailwind dashboard UI
    └── src/
        ├── components/
        │   ├── Dashboard.jsx, TileGrid.jsx, Tile.jsx
        │   ├── ConsoleHeader.jsx        clock / connection / weather strip
        │   ├── QuickSettingsDrawer.jsx  add / edit / reorder tiles, relay config
        │   ├── CanvasVideoPlayer.jsx    jsmpeg canvas + Web Audio player
        │   ├── PlayerScreen.jsx         fullscreen video-stream-tile route
        │   ├── RemoteBrowserView.jsx    relay-backed in-dashboard browsing
        │   ├── EmbeddedFrameView.jsx    zero-backend fallback (plain iframe)
        │   ├── FullscreenHelpModal.jsx  theater-mode help + QR share
        │   └── QRShare.jsx
        └── hooks/     useTiles, useClock, useConnectionStatus, useJsmpegLoader
```

## Fastest path: live on GitHub Pages, zero backend

The dashboard itself (tile launcher, weather/clock strip, settings) needs no
server at all — tiles are stored in the browser via `localStorage`. That
means you can have it live and open it on the car in about a minute:

1. Push this repo to your own GitHub repository.
2. In that repo's **Settings → Pages**, set **Source** to **GitHub Actions**.
3. Push to `main` (or run the workflow manually from the **Actions** tab).
   The included workflow (`.github/workflows/deploy-pages.yml`) builds the
   frontend and publishes it — no extra config needed, since the build uses
   relative asset paths that work under any `github.io/<repo>/` subpath.
4. Open the resulting `https://<you>.github.io/<repo>/` URL on the car and
   add it to the home screen shortcuts (see "Launching it in the Tesla"
   below).

At this point, link tiles work as a plain embedded box (see below for the
full explanation) and video-stream tiles are the only thing still missing.
Add/edit/reorder tiles from the settings drawer (gear icon).

**Video-stream tiles, and reliable link-tile browsing, need a real server**
— live transcoding runs `ffmpeg` continuously, and in-dashboard browsing of
sites that block iframes runs a real headless browser tab, neither of which
GitHub Pages' static hosting can do. To add that later without touching the
deployed site or rebuilding anything:

1. Run the backend relay somewhere with a persistent process — your home
   server, a small VPS, or any host that can run the provided Dockerfile
   (Railway, Render, Fly.io, etc. all build from a `Dockerfile` directly).
   Note this backend now bundles a headless Chromium (via Playwright) in
   addition to ffmpeg, so budget more RAM than a bare Node relay would need
   — see ["How link tiles actually render"](#how-link-tiles-actually-render).
2. **Put it behind HTTPS.** Your GitHub Pages dashboard is served over
   `https://`, so the browser will block plain `http://`/`ws://` calls to
   the relay as mixed content — this is a hard browser rule, not something
   this app can work around. The easiest ways to get HTTPS for a home
   server: a [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
   (no port forwarding, free TLS), a [Tailscale Funnel](https://tailscale.com/kb/1223/funnel),
   or a reverse proxy like [Caddy](https://caddyserver.com/) in front of the
   relay container, which issues certificates automatically.
3. On the dashboard, open settings (gear icon) → **Relay backend**, paste
   the relay's `https://` address, tap **test**, then **Save & reload**. The
   config is stored in this browser only, so it survives every future
   GitHub Pages deploy with no rebuild.

## How the video pipeline works

1. You register a source (an RTSP camera, an IPTV/HLS URL, or a local file
   path) with the relay via `POST /api/streams`.
2. When a viewer opens that tile, the browser opens a WebSocket to
   `/ws/video/:streamId`. On the first connection, the relay spawns
   `ffmpeg` to transcode the input to MPEG-1 video + MP2 audio muxed into an
   MPEG-TS stream, sent as raw binary WebSocket frames. Every subsequent
   viewer of the same `streamId` attaches to that one already-running
   process instead of starting a new transcode.
3. In the browser, [jsmpeg](https://github.com/phoboslab/jsmpeg) (loaded
   from a CDN, no native media element involved) demuxes that stream,
   decodes video frames onto a `<canvas>`, and decodes/plays audio through
   the Web Audio API. Because nothing is a `<video>`/`<audio>` element, the
   in-car Chromium browser has no media element to suspend when the tab is
   backgrounded.
4. jsmpeg's `streaming: true` mode discards stale buffered data instead of
   queuing it, keeping playback near the live edge on flaky LTE, and
   `reconnectInterval` retries the WebSocket automatically if the signal
   drops.

**Honest limitation:** audio and video are decoded from the same muxed
stream and share one WebSocket, so they stay in sync by construction — there
is no separate audio transport to keep synchronized. If you need a fully
independent audio path (e.g. a different audio destination than the video
decoder), that's a larger change to the relay and player and isn't included
here.

## Running everything yourself instead of GitHub Pages

If you'd rather self-host the dashboard too (e.g. it and the relay live on
the same home server), `docker-compose.yml` runs both:

```bash
git clone <this-repo>
cd tesla-dashboard
docker compose up -d --build
```

- Dashboard: `http://<server-ip>:8080`
- Relay API/WebSocket: `http://<server-ip>:4000`

The `docker-compose.yml` build args for `VITE_RELAY_HTTP_URL`/
`VITE_RELAY_WS_URL` only set a *default* the dashboard falls back to if
nothing is saved in its settings — you can still leave them as
`localhost` and just configure the relay address from the settings drawer
once the container is up, the same way you would on GitHub Pages.

### Local development

```bash
# Terminal 1 — relay (requires system ffmpeg on PATH)
cd backend
npm install
npx playwright install --with-deps chromium   # one-time, for in-dashboard browsing
npm run dev

# Terminal 2 — dashboard
cd frontend
cp .env.example .env   # adjust if the relay isn't on localhost:4000
npm install
npm run dev
```

## How link tiles actually render

**The problem this solves:** a plain `<iframe>` keeps a site inside the
dashboard page, but a number of sites — Google properties, most streaming
and banking sites — send an `X-Frame-Options` or `Content-Security-Policy:
frame-ancestors` header that refuses to let any other page embed them. That
restriction is enforced by the browser itself (Tesla's Chromium included)
on the destination site's explicit instruction, so there is no client-side
trick — no different iframe attribute, no clever JavaScript — that
overrides it from the embedding page's side. Stripping or rewriting those
headers to force the embed anyway would mean defeating a security control
another site deliberately put in place, which this project won't do.

**The actual fix:** when the optional backend relay is configured, a link
tile doesn't ask the Tesla browser to load the destination at all. Instead,
the relay launches a real, independent headless Chromium tab (via
[Playwright](https://playwright.dev)) on your server and visits the site
there — a completely normal visit, indistinguishable from you opening it
yourself. The relay then streams that tab to the dashboard as a sequence of
JPEG frames over a WebSocket (`/ws/browse`), using the same Chrome DevTools
Protocol screencast that browser-automation and remote-debugging tools use,
and the dashboard renders those frames onto a `<canvas>` — architecturally
the same pattern as the video-stream player, just driven by a live browser
instead of ffmpeg. Taps, scrolls, and typed text on that canvas are relayed
back and replayed as real input events (`page.mouse.click`,
`page.mouse.wheel`, `page.keyboard.type`) on the actual server-side tab.

Because the destination is never framed — there's no `<iframe>` involved
in this path at all — `X-Frame-Options` and `frame-ancestors` simply don't
apply. This is the same technique commercial "remote browser isolation"
products (Zscaler, Menlo Security, Cloudflare's browser isolation, etc.)
use for the opposite purpose — keeping a *risky* page's code off the
viewer's machine — repurposed here to keep the *viewer* inside one page.

**What this doesn't solve:** sites with separate bot-detection or DRM
requirements (Netflix's video DRM, a login page behind a CAPTCHA challenge,
Cloudflare's "verify you're human" interstitial) may still refuse or
degrade for an automated browser, for reasons that have nothing to do with
framing. This architecture fixes the framing problem specifically; it isn't
a guarantee that literally any site works flawlessly.

**Resource cost:** each open link tile is a real headless Chromium process
on your server for as long as it's open — expect roughly 200–400MB of RAM
per active tile, not the negligible cost of a plain iframe. `MAX_BROWSE_SESSIONS`
(default `3`) caps how many can run at once; opening one more than that
returns a clear in-app error instead of overloading the server. Idle
sessions (no input for 10 minutes) close themselves automatically.

**Without the backend configured:** there's no server available to run a
headless tab, so link tiles fall back to a plain `<iframe>` — which still
keeps the user inside the dashboard, and works for any site that doesn't
send an anti-framing header. For a site that does, the box will appear
blank; rather than pretend to detect that (there is no reliable way to,
from the embedding page's side — see the code comments in
`EmbeddedFrameView.jsx`), the dashboard shows an honest hint after a few
seconds pointing at the relay-backed option, alongside an explicit,
user-triggered **"Open outside"** button. That button is the only case in
this app where the Tesla browser ever navigates away from the dashboard,
and it only fires when tapped — never automatically.

## Adding tiles and streams

- **Web link tiles** (navigation, Plex, weather, custom bookmarks): add
  them from the settings drawer (gear icon, top right) — title + URL is
  enough. See the section above for exactly how these render.
- **Video stream tiles**: first register the source with the relay:

  ```bash
  curl -X POST http://<server-ip>:4000/api/streams \
    -H "Content-Type: application/json" \
    -d '{
      "label": "Driveway Camera",
      "input_url": "rtsp://user:pass@192.168.1.20:554/stream1",
      "width": 1280, "height": 720, "fps": 30,
      "video_bitrate": "1500k"
    }'
  ```

  The response includes an `id`. In the settings drawer, add a tile with
  kind **Video stream** and set its URL field to that `id`.

## Launching it in the Tesla

1. Open the Tesla browser and navigate to your dashboard's address (see the
   QR-code helper in the in-app help modal — tap the `?` icon — to push the
   URL from your phone instead of typing it on the center screen).
2. The layout is built edge-to-edge with no body scrolling, so it already
   fills the screen without a native fullscreen API (Tesla's browser doesn't
   expose one). The help modal covers two further tricks: opening the page
   via Tesla Theater or a YouTube-link redirect (both hide browser chrome
   more aggressively than a direct address-bar visit), and bookmarking the
   page to the car's home screen shortcuts.
3. If you're relying on cellular data, keep video bitrate conservative
   (720p @ 1.5 Mbps is the default) — the relay only transcodes once per
   stream regardless of viewer count, but your car's own LTE/5G connection
   is still the bottleneck.

## Configuration notes

- Tile and stream config live in `backend/data/dashboard.sqlite`, mounted
  as a Docker volume so it survives container rebuilds. Back that file up
  if you've customized your layout.
- `MAX_BROWSE_SESSIONS` (env var on the relay, default `3`) caps how many
  concurrent in-dashboard browser tabs can run — each one is a real
  headless Chromium process. Raise it only if your server has the RAM to
  spare (roughly 200–400MB per active session).
- The frontend also caches the last-fetched tile list to `localStorage`, so
  the dashboard still renders (read-only) if the relay is briefly
  unreachable — the connection indicator in the header will show
  `relay unreachable` in that state.
- CORS is wide open (`CORS_ORIGIN=*`) by default for convenience on a home
  network. If you expose the relay beyond your LAN, set `CORS_ORIGIN` to
  your dashboard's real origin in `docker-compose.yml`.
- This project assumes you have the legal right to the streams and sites
  you point it at (your own cameras, your own Plex server, IPTV sources
  you're licensed to use, sites you're authorized to browse, etc.) — it's a
  relay and a personal remote-browsing tool, not a source of content and
  not a way around any site's terms of service.

## Tech stack

- **Backend:** Node.js, Express, `ws`, `fluent-ffmpeg` (system FFmpeg
  required), `better-sqlite3`, `playwright` (headless Chromium, for
  in-dashboard link-tile browsing).
- **Frontend:** React (Vite), Tailwind CSS, `lucide-react`, `qrcode`,
  jsmpeg (loaded at runtime from a CDN).
- **Deployment:** Docker + Docker Compose, two containers (relay, dashboard
  served by nginx).
