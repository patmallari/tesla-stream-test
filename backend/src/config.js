import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { nanoid } from "nanoid";

const DATA_DIR = path.resolve(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "dashboard.sqlite"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS tiles (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    icon TEXT DEFAULT 'link',
    kind TEXT DEFAULT 'link',      -- 'link' | 'stream'
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS streams (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    input_url TEXT NOT NULL,       -- RTSP / HLS / IPTV / local file path
    width INTEGER DEFAULT 1280,
    height INTEGER DEFAULT 720,
    fps INTEGER DEFAULT 30,
    video_bitrate TEXT DEFAULT '1500k',
    audio_enabled INTEGER DEFAULT 1
  );
`);

// Seed a few default tiles on first run
const tileCount = db.prepare("SELECT COUNT(*) AS n FROM tiles").get().n;
if (tileCount === 0) {
  const seed = db.prepare(
    "INSERT INTO tiles (id, title, url, icon, kind, sort_order) VALUES (?,?,?,?,?,?)"
  );
  const defaults = [
    ["Map", "https://www.openstreetmap.org/export/embed.html?bbox=-122.52%2C37.70%2C-122.35%2C37.83&layer=mapnik", "map", "link"],
    ["Example", "https://example.com", "globe", "link"],
    ["Plex (edit me)", "http://your-plex-server:32400/web", "clapperboard", "link"],
  ];
  defaults.forEach(([title, url, icon, kind], i) =>
    seed.run(nanoid(8), title, url, icon, kind, i)
  );
}

export const TileStore = {
  list() {
    return db.prepare("SELECT * FROM tiles ORDER BY sort_order ASC").all();
  },
  create({ title, url, icon = "link", kind = "link" }) {
    const id = nanoid(8);
    const order = db.prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM tiles").get().n;
    db.prepare(
      "INSERT INTO tiles (id, title, url, icon, kind, sort_order) VALUES (?,?,?,?,?,?)"
    ).run(id, title, url, icon, kind, order);
    return { id, title, url, icon, kind, sort_order: order };
  },
  update(id, fields) {
    const existing = db.prepare("SELECT * FROM tiles WHERE id = ?").get(id);
    if (!existing) return null;
    const merged = { ...existing, ...fields };
    db.prepare(
      "UPDATE tiles SET title=?, url=?, icon=?, kind=?, sort_order=? WHERE id=?"
    ).run(merged.title, merged.url, merged.icon, merged.kind, merged.sort_order, id);
    return merged;
  },
  reorder(orderedIds) {
    const stmt = db.prepare("UPDATE tiles SET sort_order = ? WHERE id = ?");
    const tx = db.transaction((ids) => ids.forEach((id, i) => stmt.run(i, id)));
    tx(orderedIds);
    return this.list();
  },
  remove(id) {
    db.prepare("DELETE FROM tiles WHERE id = ?").run(id);
  },
};

export const StreamStore = {
  list() {
    return db.prepare("SELECT * FROM streams").all();
  },
  get(id) {
    return db.prepare("SELECT * FROM streams WHERE id = ?").get(id);
  },
  create(fields) {
    const id = fields.id || nanoid(8);
    db.prepare(
      `INSERT INTO streams (id, label, input_url, width, height, fps, video_bitrate, audio_enabled)
       VALUES (@id, @label, @input_url, @width, @height, @fps, @video_bitrate, @audio_enabled)`
    ).run({
      id,
      label: fields.label,
      input_url: fields.input_url,
      width: fields.width ?? 1280,
      height: fields.height ?? 720,
      fps: fields.fps ?? 30,
      video_bitrate: fields.video_bitrate ?? "1500k",
      audio_enabled: fields.audio_enabled ?? 1,
    });
    return this.get(id);
  },
  remove(id) {
    db.prepare("DELETE FROM streams WHERE id = ?").run(id);
  },
};

export default db;
