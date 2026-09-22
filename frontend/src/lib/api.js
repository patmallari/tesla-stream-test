import { getRelayConfig, isRelayConfigured } from "./relayConfig";

class RelayNotConfigured extends Error {
  constructor() {
    super("No relay configured");
    this.name = "RelayNotConfigured";
  }
}

async function request(path, options = {}) {
  const { http } = getRelayConfig();
  if (!http) throw new RelayNotConfigured();

  const res = await fetch(`${http}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`${options.method || "GET"} ${path} failed: ${res.status}`);
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  tiles: {
    list: () => request("/api/tiles"),
    create: (tile) => request("/api/tiles", { method: "POST", body: JSON.stringify(tile) }),
    update: (id, fields) => request(`/api/tiles/${id}`, { method: "PUT", body: JSON.stringify(fields) }),
    reorder: (orderedIds) =>
      request("/api/tiles/reorder", { method: "POST", body: JSON.stringify({ orderedIds }) }),
    remove: (id) => request(`/api/tiles/${id}`, { method: "DELETE" }),
  },
  streams: {
    list: () => request("/api/streams"),
    create: (stream) => request("/api/streams", { method: "POST", body: JSON.stringify(stream) }),
    remove: (id) => request(`/api/streams/${id}`, { method: "DELETE" }),
  },
  health: () => request("/health"),
};

export function videoSocketUrl(streamId) {
  const { ws } = getRelayConfig();
  return `${ws}/ws/video/${streamId}`;
}

export { isRelayConfigured, RelayNotConfigured };
