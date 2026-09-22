import express from "express";
import cors from "cors";
import http from "node:http";
import { TileStore, StreamStore } from "./config.js";
import { attachWsRelay } from "./wsRelay.js";
import { streamManager } from "./streamManager.js";

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

// ---- Tiles (dashboard launcher config) ----
app.get("/api/tiles", (_req, res) => res.json(TileStore.list()));

app.post("/api/tiles", (req, res) => {
  const { title, url, icon, kind } = req.body || {};
  if (!title || !url) return res.status(400).json({ error: "title and url are required" });
  res.status(201).json(TileStore.create({ title, url, icon, kind }));
});

app.put("/api/tiles/:id", (req, res) => {
  const updated = TileStore.update(req.params.id, req.body || {});
  if (!updated) return res.status(404).json({ error: "tile not found" });
  res.json(updated);
});

app.post("/api/tiles/reorder", (req, res) => {
  const { orderedIds } = req.body || {};
  if (!Array.isArray(orderedIds)) return res.status(400).json({ error: "orderedIds must be an array" });
  res.json(TileStore.reorder(orderedIds));
});

app.delete("/api/tiles/:id", (req, res) => {
  TileStore.remove(req.params.id);
  res.status(204).end();
});

// ---- Streams (video sources for the canvas player) ----
app.get("/api/streams", (_req, res) => res.json(StreamStore.list()));

app.post("/api/streams", (req, res) => {
  const { label, input_url, width, height, fps, video_bitrate, audio_enabled } = req.body || {};
  if (!label || !input_url) return res.status(400).json({ error: "label and input_url are required" });
  res.status(201).json(
    StreamStore.create({ label, input_url, width, height, fps, video_bitrate, audio_enabled })
  );
});

app.delete("/api/streams/:id", (req, res) => {
  StreamStore.remove(req.params.id);
  res.status(204).end();
});

const port = process.env.PORT || 4000;
const server = http.createServer(app);
attachWsRelay(server);

server.listen(port, () => {
  console.log(`[relay] listening on :${port}`);
  console.log(`[relay] video+audio ws:  ws://localhost:${port}/ws/video/:streamId`);
});

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    console.log(`[relay] ${sig} received, shutting down transcodes...`);
    streamManager.shutdownAll();
    server.close(() => process.exit(0));
  });
}
