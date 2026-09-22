import { useEffect, useState } from "react";
import { api, RelayNotConfigured } from "../lib/api";
import { isRelayConfigured } from "../lib/relayConfig";

export function useConnectionStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  // 'unconfigured' | 'up' | 'down' | null (unknown yet)
  const [relayState, setRelayState] = useState(isRelayConfigured() ? null : "unconfigured");
  const [effectiveType, setEffectiveType] = useState(navigator.connection?.effectiveType || null);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    const conn = navigator.connection;
    const onChange = () => setEffectiveType(conn?.effectiveType || null);
    conn?.addEventListener?.("change", onChange);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      conn?.removeEventListener?.("change", onChange);
    };
  }, []);

  useEffect(() => {
    if (!isRelayConfigured()) {
      setRelayState("unconfigured");
      return;
    }
    let cancelled = false;
    const ping = async () => {
      try {
        await api.health();
        if (!cancelled) setRelayState("up");
      } catch (err) {
        if (cancelled) return;
        setRelayState(err instanceof RelayNotConfigured ? "unconfigured" : "down");
      }
    };
    ping();
    const id = setInterval(ping, 15_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // re-run whenever the settings drawer changes the relay config
  }, [isRelayConfigured()]);

  return { online, relayState, effectiveType };
}
