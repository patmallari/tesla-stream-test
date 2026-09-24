import { WebSocketServer } from "ws";
import { nanoid } from "nanoid";
import { browserSessions } from "./browserSessions.js";

// Matches /ws/browse — a fresh headless-Chromium tab is created per connection
export const BROWSE_ROUTE_RE = /^\/ws\/browse\/?$/;

export function createBrowseWss() {
  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", (ws) => {
    const sessionId = nanoid(10);
    let page = null;

    const send = (obj) => {
      if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
    };

    const reportStatus = async (extra = {}) => {
      if (!page) return;
      try {
        send({ type: "status", url: page.url(), ...extra });
      } catch {
        /* page may be mid-navigation or closing */
      }
    };

    ws.on("message", async (raw, isBinary) => {
      if (isBinary) return; // control channel is JSON text frames only
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      try {
        if (msg.type === "start") {
          if (browserSessions.atCapacity()) {
            send({
              type: "error",
              message: "This server is already running its maximum number of in-dashboard browser sessions — close one and try again.",
            });
            ws.close(4429, "capacity");
            return;
          }

          send({ type: "status", url: msg.url, loading: true });
          const entry = await browserSessions.create(sessionId, (frame) => {
            if (ws.readyState === ws.OPEN) ws.send(frame, { binary: true });
          });
          page = entry.page;
          page.on("load", () => reportStatus());

          send({ type: "meta", viewport: browserSessions.viewportSize() });
          try {
            await page.goto(msg.url, { waitUntil: "domcontentloaded", timeout: 20000 });
          } catch (err) {
            send({ type: "error", message: `Couldn't load that page: ${firstLine(err)}` });
          }
          await reportStatus();
          return;
        }

        if (!page) return; // ignore input sent before a session exists
        browserSessions.touch(sessionId);

        switch (msg.type) {
          case "click": {
            const { width, height } = browserSessions.viewportSize();
            await page.mouse.click(clamp01(msg.x) * width, clamp01(msg.y) * height);
            break;
          }
          case "wheel":
            await page.mouse.wheel(Number(msg.dx) || 0, Number(msg.dy) || 0);
            break;
          case "type":
            await page.keyboard.type(String(msg.text || "").slice(0, 2000));
            break;
          case "key":
            await page.keyboard.press(String(msg.key || "").slice(0, 40));
            break;
          case "nav":
            if (msg.action === "back") await page.goBack({ waitUntil: "domcontentloaded" }).catch(() => {});
            else if (msg.action === "forward") await page.goForward({ waitUntil: "domcontentloaded" }).catch(() => {});
            else if (msg.action === "reload") await page.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
            await reportStatus();
            break;
          case "goto":
            send({ type: "status", url: msg.url, loading: true });
            try {
              await page.goto(msg.url, { waitUntil: "domcontentloaded", timeout: 20000 });
            } catch (err) {
              send({ type: "error", message: `Couldn't load that page: ${firstLine(err)}` });
            }
            await reportStatus();
            break;
          default:
            break;
        }
      } catch (err) {
        send({ type: "error", message: String(err?.message || err).slice(0, 200) });
      }
    });

    ws.on("close", () => {
      browserSessions.destroy(sessionId);
    });
    ws.on("error", () => ws.terminate());
  });

  return wss;
}

function clamp01(n) {
  const v = Number(n);
  if (Number.isNaN(v)) return 0;
  return Math.min(1, Math.max(0, v));
}

function firstLine(err) {
  return String(err?.message || err).split("\n")[0];
}
