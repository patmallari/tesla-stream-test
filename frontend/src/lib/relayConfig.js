const STORAGE_KEY = "dash:relay-config";

// Build-time defaults still work for local dev (frontend/.env), but anyone
// running the static build (e.g. from GitHub Pages) configures this at
// runtime instead — see the "Video relay" section of the settings drawer.
const BUILD_HTTP = import.meta.env.VITE_RELAY_HTTP_URL || "";
const BUILD_WS = import.meta.env.VITE_RELAY_WS_URL || "";

function read() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

export function getRelayConfig() {
  const stored = read();
  return {
    http: stored.http || BUILD_HTTP || "",
    ws: stored.ws || BUILD_WS || "",
  };
}

export function isRelayConfigured() {
  const { http, ws } = getRelayConfig();
  return Boolean(http && ws);
}

export function setRelayConfig({ http, ws }) {
  const cleanHttp = http.trim().replace(/\/+$/, "");
  const cleanWs = ws.trim().replace(/\/+$/, "");
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ http: cleanHttp, ws: cleanWs }));
  return { http: cleanHttp, ws: cleanWs };
}

export function clearRelayConfig() {
  localStorage.removeItem(STORAGE_KEY);
}

/** Derive a wss/ws relay URL from an http/https one, so the settings form only needs one field. */
export function deriveWsFromHttp(httpUrl) {
  return httpUrl.trim().replace(/^http/i, "ws").replace(/\/+$/, "");
}
