# Tesla Dashboard

A self-hosted, full-screen launcher dashboard built for the Chromium-based
in-car browser on Tesla vehicles. It combines a tile-based app launcher
(navigation, Plex, weather, game streaming, custom links) with a canvas-based
video player that decodes a live transcoded stream without ever handing a
native `<video>`/`<audio>` element to the browser — which is what stops
Tesla's browser from pausing playback when the tab loses focus or the screen
dims.

```
tesla-dashboard/
├── docker-compose.yml
├── backend/          Node.js relay: Express API + WebSocket + ffmpeg transcoding
│   └── src/
│       ├── server.js         HTTP API + WS upgrade wiring
│       ├── wsRelay.js        /ws/video/:streamId handler
│       ├── streamManager.js  ref-counted ffmpeg process pool
│       └── config.js         SQLite store for tiles + stream definitions
└── frontend/         Vite + React + Tailwind dashboard UI
    └── src/
        ├── components/
        │   ├── Dashboard.jsx, TileGrid.jsx, Tile.jsx
        │   ├── ConsoleHeader.jsx        clock / connection / weather strip
        │   ├── QuickSettingsDrawer.jsx  add / edit / reorder tiles
        │   ├── CanvasVideoPlayer.jsx    jsmpeg canvas + Web Audio player
        │   ├── PlayerScreen.jsx         fullscreen video route
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

At this point, link tiles (navigation, Plex, weather, custom bookmarks) work
completely — add/edit/reorder them from the settings drawer (gear icon).

**Video-stream tiles are the one thing that still needs a real server**,
because live transcoding runs `ffmpeg` continuously — that can't run on
GitHub Pages' static hosting. To add it later without touching the deployed
site or rebuilding anything:

1. Run the backend relay somewhere with a persistent process — your home
   server, a small VPS, or any host that can run the provided Dockerfile
   (Railway, Render, Fly.io, etc. all build from a `Dockerfile` directly).
2. **Put it behind HTTPS.** Your GitHub Pages dashboard is served over
   `https://`, so the browser will block plain `http://`/`ws://` calls to
   the relay as mixed content — this is a hard browser rule, not something
   this app can work around. The easiest ways to get HTTPS for a home
   server: a [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
   (no port forwarding, free TLS), a [Tailscale Funnel](https://tailscale.com/kb/1223/funnel),
   or a reverse proxy like [Caddy](https://caddyserver.com/) in front of the
   relay container, which issues certificates automatically.
3. On the dashboard, open settings (gear icon) → **Video relay**, paste the
   relay's `https://` address, tap **test**, then **Save & reload**. The
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
npm run dev

# Terminal 2 — dashboard
cd frontend
cp .env.example .env   # adjust if the relay isn't on localhost:4000
npm install
npm run dev
```

## Adding tiles and streams

- **Web link tiles** (Navigation, Plex, Weather, custom bookmarks): add them
  from the settings drawer (gear icon, top right) — title + URL is enough.
  They open in a box layered on top of this same page (an iframe), so the
  dashboard itself never navigates away. **Caveat:** a number of sites —
  Google properties, most streaming services, most banking sites — send a
  header that refuses to let other pages embed them this way, and there's
  no client-side workaround for that. When a tile is blocked like this, the
  box shows an "open it outside the box instead" link after a few seconds,
  which falls back to a normal same-window navigation for that one site.
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
- The frontend also caches the last-fetched tile list to `localStorage`, so
  the dashboard still renders (read-only) if the relay is briefly
  unreachable — the connection indicator in the header will show
  `relay unreachable` in that state.
- CORS is wide open (`CORS_ORIGIN=*`) by default for convenience on a home
  network. If you expose the relay beyond your LAN, set `CORS_ORIGIN` to
  your dashboard's real origin in `docker-compose.yml`.
- This project assumes you have the legal right to the streams you point it
  at (your own cameras, your own Plex server, IPTV sources you're licensed
  to use, etc.) — it's a relay/transcoder, not a source of content.

## Tech stack

- **Backend:** Node.js, Express, `ws`, `fluent-ffmpeg` (system FFmpeg
  required), `better-sqlite3`.
- **Frontend:** React (Vite), Tailwind CSS, `lucide-react`, `qrcode`,
  jsmpeg (loaded at runtime from a CDN).
- **Deployment:** Docker + Docker Compose, two containers (relay, dashboard
  served by nginx).
