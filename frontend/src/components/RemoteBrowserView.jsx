import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, RotateCw, ExternalLink, Keyboard, X } from "lucide-react";
import { getRelayConfig } from "../lib/relayConfig";

/**
 * How this stays inside the dashboard for sites that refuse iframes:
 * the backend runs a real headless Chromium tab (Playwright) and streams
 * it here as a sequence of JPEG frames over a WebSocket (Chrome DevTools
 * Protocol screencast) — the same technique commercial "remote browser
 * isolation" products use. The target site is never embedded or framed;
 * it's simply visited by a normal browser on the server, and we relay
 * pixels one way and input (clicks/scroll/typing) the other. X-Frame-Options
 * and frame-ancestors are irrelevant to this path because there is no
 * frame — this is a screen-share of an independent browser tab.
 */
export default function RemoteBrowserView({ tile, onBack, onOpenOutside }) {
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const viewportRef = useRef({ width: 1280, height: 800 });
  const lastFrameUrl = useRef(null);

  const [status, setStatus] = useState("connecting"); // connecting | loading | ready | error
  const [errorMsg, setErrorMsg] = useState("");
  const [currentUrl, setCurrentUrl] = useState(tile.url);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [typedText, setTypedText] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const { ws: wsBase } = getRelayConfig();
    const ws = new WebSocket(`${wsBase}/ws/browse`);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("loading");
      ws.send(JSON.stringify({ type: "start", url: tile.url }));
    };

    ws.onmessage = (event) => {
      if (typeof event.data === "string") {
        const msg = JSON.parse(event.data);
        if (msg.type === "meta") {
          viewportRef.current = msg.viewport;
        } else if (msg.type === "status") {
          if (msg.url) setCurrentUrl(msg.url);
          setStatus(msg.loading ? "loading" : "ready");
        } else if (msg.type === "error") {
          setStatus("error");
          setErrorMsg(msg.message);
        }
        return;
      }

      // Binary JPEG frame from the CDP screencast
      const blob = new Blob([event.data], { type: "image/jpeg" });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        if (canvas.width !== img.width) canvas.width = img.width;
        if (canvas.height !== img.height) canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        if (lastFrameUrl.current) URL.revokeObjectURL(lastFrameUrl.current);
        lastFrameUrl.current = url;
        setStatus((s) => (s === "loading" ? "ready" : s));
      };
      img.src = url;
    };

    ws.onerror = () => setStatus("error");
    ws.onclose = () => setStatus((s) => (s === "error" ? s : "error"));

    return () => {
      ws.close();
      if (lastFrameUrl.current) URL.revokeObjectURL(lastFrameUrl.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tile.url]);

  const send = (obj) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(obj));
  };

  const canvasPointToNormalized = (clientX, clientY) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    };
  };

  const lastClick = useRef({ x: 0.5, y: 0.5 });

  const handleTap = (e) => {
    const point = "touches" in e ? e.changedTouches[0] : e;
    const { x, y } = canvasPointToNormalized(point.clientX, point.clientY);
    lastClick.current = { x, y };
    send({ type: "click", x, y });
  };

  const dragStart = useRef(null);
  const handleDragStart = (e) => {
    const point = "touches" in e ? e.touches[0] : e;
    dragStart.current = { x: point.clientX, y: point.clientY };
  };
  const handleDragMove = (e) => {
    if (!dragStart.current) return;
    const point = "touches" in e ? e.touches[0] : e;
    const dx = dragStart.current.x - point.clientX;
    const dy = dragStart.current.y - point.clientY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      send({ type: "wheel", dx, dy });
      dragStart.current = { x: point.clientX, y: point.clientY };
    }
  };
  const handleDragEnd = () => {
    dragStart.current = null;
  };

  const submitTyped = () => {
    if (!typedText) return;
    send({ type: "click", x: lastClick.current.x, y: lastClick.current.y });
    send({ type: "type", text: typedText });
    setTypedText("");
  };

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-void">
      <div
        className="flex shrink-0 items-center gap-2 border-b border-line px-3 py-2.5"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 10px)" }}
      >
        <button
          onClick={onBack}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-panel2 text-ink active:scale-95"
          aria-label="Back to dashboard"
        >
          <ArrowLeft size={18} />
        </button>
        <button
          onClick={() => send({ type: "nav", action: "back" })}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-panel2 text-ink-dim active:scale-95"
          aria-label="Page back"
        >
          <ArrowLeft size={15} />
        </button>
        <button
          onClick={() => send({ type: "nav", action: "forward" })}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-panel2 text-ink-dim active:scale-95"
          aria-label="Page forward"
        >
          <ArrowRight size={15} />
        </button>
        <button
          onClick={() => send({ type: "nav", action: "reload" })}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-panel2 text-ink-dim active:scale-95"
          aria-label="Reload"
        >
          <RotateCw size={15} />
        </button>

        <p className="min-w-0 flex-1 truncate rounded-console bg-panel px-3 py-2 font-mono text-xs text-ink-dim">
          {currentUrl}
        </p>

        <button
          onClick={() => setKeyboardOpen((v) => !v)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-panel2 text-ink active:scale-95"
          aria-label="Type"
        >
          <Keyboard size={16} />
        </button>
        <button
          onClick={() => onOpenOutside(currentUrl)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-panel2 text-ink active:scale-95"
          aria-label="Open outside the dashboard"
        >
          <ExternalLink size={16} />
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden bg-black">
        <canvas
          ref={canvasRef}
          className="h-full w-full touch-none object-contain"
          onClick={handleTap}
          onMouseDown={handleDragStart}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onTouchStart={(e) => {
            handleDragStart(e);
          }}
          onTouchMove={handleDragMove}
          onTouchEnd={(e) => {
            handleDragEnd();
            handleTap(e);
          }}
        />

        {status === "connecting" && (
          <Overlay text={`Starting a browser session for ${tile.title.toLowerCase()}…`} />
        )}
        {status === "loading" && <Overlay text="Loading…" />}
        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 px-6 text-center">
            <p className="max-w-sm text-sm text-ink-dim">
              {errorMsg || "Lost the connection to this browsing session."}
            </p>
            <div className="flex gap-2">
              <button
                onClick={onBack}
                className="rounded-console border border-line px-4 py-2 text-sm text-ink-dim active:bg-panel"
              >
                Back to dashboard
              </button>
              <button
                onClick={() => onOpenOutside(currentUrl)}
                className="rounded-console bg-panel2 px-4 py-2 text-sm text-ink active:opacity-80"
              >
                Open outside instead
              </button>
            </div>
          </div>
        )}
      </div>

      {keyboardOpen && (
        <div
          className="flex shrink-0 items-center gap-2 border-t border-line bg-panel px-3 py-3"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 10px)" }}
        >
          <input
            autoFocus
            value={typedText}
            onChange={(e) => setTypedText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                submitTyped();
                send({ type: "key", key: "Enter" });
              }
            }}
            placeholder="Tap the field on screen first, then type here"
            className="flex-1 rounded-console border border-line bg-void px-3 py-2.5 text-sm text-ink placeholder:text-ink-dim outline-none focus-visible:border-cyan"
          />
          <button
            onClick={submitTyped}
            className="rounded-console bg-cyan px-4 py-2.5 text-sm font-medium text-void active:opacity-80"
          >
            Send
          </button>
          <button
            onClick={() => setKeyboardOpen(false)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-console border border-line text-ink-dim active:bg-void"
            aria-label="Close keyboard"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

function Overlay({ text }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/70">
      <p className="font-mono text-sm text-ink-dim">{text}</p>
    </div>
  );
}
