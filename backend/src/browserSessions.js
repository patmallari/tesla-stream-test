import { chromium } from "playwright";

/**
 * Each session is a real, independent headless Chromium tab running on the
 * server. The target site is loaded exactly as it would be for any normal
 * visitor — nothing about its response headers is touched, read, or
 * stripped. X-Frame-Options / frame-ancestors are irrelevant here because
 * there is no framing happening: the dashboard never asks the browser to
 * embed the page's DOM. Instead we screen-share the tab (via the Chrome
 * DevTools Protocol's screencast) to the client as a sequence of JPEG
 * frames, and relay the viewer's taps/scrolls/typing back as real input
 * events on that same tab. This is the same architecture used by
 * commercial "remote browser isolation" products — the target site sees a
 * normal visit, and the dashboard only ever displays pixels + forwards
 * input, the same as a remote-desktop session.
 */

const MAX_SESSIONS = Number(process.env.MAX_BROWSE_SESSIONS || 3);
const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // close an untouched tab after 10 minutes
const VIEWPORT = { width: 1280, height: 800 };

class BrowserSessionManager {
  constructor() {
    this.sessions = new Map(); // id -> { browser, context, page, cdp, idleTimer }
  }

  count() {
    return this.sessions.size;
  }

  atCapacity() {
    return this.sessions.size >= MAX_SESSIONS;
  }

  async create(id, onFrame) {
    if (this.atCapacity()) {
      throw new Error(
        `Server is already running ${MAX_SESSIONS} in-dashboard browser session(s) — close one and try again.`
      );
    }

    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    const context = await browser.newContext({ viewport: VIEWPORT });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);

    const entry = { browser, context, page, cdp, idleTimer: null };
    this.sessions.set(id, entry);
    this._bumpIdleTimer(id);

    cdp.on("Page.screencastFrame", async ({ data, sessionId: cdpSessionId }) => {
      onFrame(Buffer.from(data, "base64"));
      try {
        await cdp.send("Page.screencastFrameAck", { sessionId: cdpSessionId });
      } catch {
        /* session may already be tearing down */
      }
    });

    await cdp.send("Page.startScreencast", {
      format: "jpeg",
      quality: 60,
      maxWidth: VIEWPORT.width,
      maxHeight: VIEWPORT.height,
      everyNthFrame: 1,
    });

    return entry;
  }

  get(id) {
    return this.sessions.get(id);
  }

  touch(id) {
    this._bumpIdleTimer(id);
  }

  _bumpIdleTimer(id) {
    const entry = this.sessions.get(id);
    if (!entry) return;
    clearTimeout(entry.idleTimer);
    entry.idleTimer = setTimeout(() => this.destroy(id), IDLE_TIMEOUT_MS);
  }

  async destroy(id) {
    const entry = this.sessions.get(id);
    if (!entry) return;
    clearTimeout(entry.idleTimer);
    this.sessions.delete(id);
    try {
      await entry.browser.close();
    } catch {
      /* already gone */
    }
  }

  async shutdownAll() {
    await Promise.all([...this.sessions.keys()].map((id) => this.destroy(id)));
  }

  viewportSize() {
    return VIEWPORT;
  }
}

export const browserSessions = new BrowserSessionManager();
