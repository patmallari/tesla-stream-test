import { WebSocketServer } from "ws";
import { StreamStore } from "./config.js";
import { streamManager } from "./streamManager.js";

// Matches /ws/video/:streamId — one muxed MPEG-TS (video+audio) socket per stream
const ROUTE_RE = /^\/ws\/video\/([\w-]+)\/?$/;

export function attachWsRelay(httpServer) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url, "http://localhost");
    const match = url.pathname.match(ROUTE_RE);
    if (!match) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req, { streamId: match[1] });
    });
  });

  wss.on("connection", (ws, _req, { streamId }) => {
    const streamCfg = StreamStore.get(streamId);
    if (!streamCfg) {
      ws.close(4404, "unknown stream id");
      return;
    }

    const emitter = streamManager.attach(streamId, streamCfg);

    const onData = (chunk) => {
      if (ws.readyState === ws.OPEN) ws.send(chunk, { binary: true });
    };
    const onError = (err) => {
      if (ws.readyState === ws.OPEN) ws.close(4500, String(err?.message || err).slice(0, 120));
    };
    const onEnd = () => {
      if (ws.readyState === ws.OPEN) ws.close(1000, "upstream ended");
    };

    emitter.on("data", onData);
    emitter.on("error", onError);
    emitter.on("end", onEnd);

    ws.on("close", () => {
      emitter.off("data", onData);
      emitter.off("error", onError);
      emitter.off("end", onEnd);
      streamManager.detach(streamId);
    });

    // Low-latency mode: if a client can't keep up, it should drop frames on
    // its own end (see CanvasVideoPlayer's jsmpeg `streaming`/buffer config)
    // rather than us buffering server-side.
    ws.on("error", () => ws.terminate());
  });

  return wss;
}
