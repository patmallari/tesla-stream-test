import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { isRelayConfigured } from "../lib/relayConfig";

const LOCAL_KEY = "dash:local-tiles";

const DEFAULT_TILES = [
  {
    id: "nav",
    title: "Map",
    // OpenStreetMap explicitly supports being embedded like this — a real,
    // working example rather than something that'll just sit blank.
    url: "https://www.openstreetmap.org/export/embed.html?bbox=-122.52%2C37.70%2C-122.35%2C37.83&layer=mapnik",
    icon: "map",
    kind: "link",
    sort_order: 0,
  },
  {
    id: "example",
    title: "Example",
    // A plain, known-embeddable test page — tap it to confirm the box
    // itself works before wiring up your real sites.
    url: "https://example.com",
    icon: "globe",
    kind: "link",
    sort_order: 1,
  },
  {
    id: "plex",
    title: "Plex (edit me)",
    // Placeholder on purpose — replace with your actual server's reachable
    // address (not a .local hostname, which only resolves on your home
    // network) before this tile will do anything.
    url: "http://your-plex-server:32400/web",
    icon: "clapperboard",
    kind: "link",
    sort_order: 2,
  },
];

function loadLocal() {
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_KEY));
    return Array.isArray(raw) ? raw : null;
  } catch {
    return null;
  }
}

function saveLocal(tiles) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(tiles));
}

/**
 * Two modes, chosen automatically:
 *  - No relay configured (e.g. a static GitHub Pages deploy with nothing
 *    else running): tiles live entirely in this browser's localStorage.
 *    Everything works with zero backend except "video stream" tiles, which
 *    need a relay to actually play.
 *  - Relay configured: tiles are fetched from and written to the relay's
 *    SQLite store, with a localStorage cache as a read-only fallback if the
 *    relay is briefly unreachable.
 */
export function useTiles() {
  const [usingRelay] = useState(isRelayConfigured());
  const [tiles, setTiles] = useState(() => loadLocal() || DEFAULT_TILES);
  const [source, setSource] = useState(usingRelay ? "cache" : "local");
  const [loading, setLoading] = useState(usingRelay);

  const refresh = useCallback(async () => {
    if (!usingRelay) {
      setLoading(false);
      return;
    }
    try {
      const data = await api.tiles.list();
      setTiles(data);
      setSource("server");
      saveLocal(data);
    } catch {
      // Relay unreachable (e.g. cold LTE handoff) — keep showing the cache.
      setSource("cache");
    } finally {
      setLoading(false);
    }
  }, [usingRelay]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addTile = async (tile) => {
    if (!usingRelay) {
      const created = { ...tile, id: crypto.randomUUID(), sort_order: tiles.length };
      const next = [...tiles, created];
      setTiles(next);
      saveLocal(next);
      return created;
    }
    const created = await api.tiles.create(tile);
    setTiles((t) => {
      const next = [...t, created];
      saveLocal(next);
      return next;
    });
    return created;
  };

  const updateTile = async (id, fields) => {
    if (!usingRelay) {
      const next = tiles.map((t) => (t.id === id ? { ...t, ...fields } : t));
      setTiles(next);
      saveLocal(next);
      return next.find((t) => t.id === id);
    }
    const updated = await api.tiles.update(id, fields);
    setTiles((t) => {
      const next = t.map((tile) => (tile.id === id ? updated : tile));
      saveLocal(next);
      return next;
    });
    return updated;
  };

  const removeTile = async (id) => {
    if (!usingRelay) {
      const next = tiles.filter((t) => t.id !== id);
      setTiles(next);
      saveLocal(next);
      return;
    }
    await api.tiles.remove(id);
    setTiles((t) => {
      const next = t.filter((tile) => tile.id !== id);
      saveLocal(next);
      return next;
    });
  };

  const reorderTiles = async (orderedIds) => {
    const next = orderedIds.map((id, i) => ({ ...tiles.find((t) => t.id === id), sort_order: i }));
    setTiles(next);
    saveLocal(next);
    if (usingRelay) {
      try {
        await api.tiles.reorder(orderedIds);
      } catch {
        /* optimistic update stands even if the write fails offline */
      }
    }
  };

  return { tiles, source, usingRelay, loading, refresh, addTile, updateTile, removeTile, reorderTiles };
}
