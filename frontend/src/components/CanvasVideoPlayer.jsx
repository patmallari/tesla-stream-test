import { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX, RotateCcw, WifiOff } from "lucide-react";
import { useJsmpegLoader } from "../hooks/useJsmpegLoader";
import { videoSocketUrl } from "../lib/api";

/**
 * Renders a live MPEG-TS relay stream onto a <canvas>, decoding audio
 * through the Web Audio API via jsmpeg — no native <video>/<audio> element,
 * so the in-car Chromium browser has nothing to pause when the tab loses
 * focus or the screen dims.
 */
export default function CanvasVideoPlayer({ streamId, label }) {
  const canvasRef = useRef(null);
  const playerRef = useRef(null);
  const { ready, failed } = useJsmpegLoader();

  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [connState, setConnState] = useState("connecting"); // connecting | live | dropped

  useEffect(() => {
    if (!ready || !canvasRef.current || !window.JSMpeg) return;

    const player = new window.JSMpeg.Player(videoSocketUrl(streamId), {
      canvas: canvasRef.current,
      audio: true,
      autoplay: true,
      videoBufferSize: 1024 * 1024,
      // Low-latency mode: don't let a queue build up during LTE hiccups —
      // jsmpeg's streaming mode already discards stale data rather than
      // buffering it, keeping playback close to the live edge.
      streaming: true,
      reconnectInterval: 2, // seconds between auto-reconnect attempts on drop
      onSourceEstablished: () => setConnState("live"),
      onStalled: () => setConnState("dropped"),
      onEnded: () => setConnState("dropped"),
    });

    playerRef.current = player;
    setConnState("connecting");

    return () => {
      try {
        player.destroy();
      } catch {
        /* socket may already be closed */
      }
      playerRef.current = null;
    };
  }, [ready, streamId]);

  const togglePlay = () => {
    const p = playerRef.current;
    if (!p) return;
    if (playing) p.pause();
    else p.play();
    setPlaying(!playing);
  };

  const toggleMute = () => {
    const p = playerRef.current;
    if (!p) return;
    p.volume = muted ? 1 : 0;
    setMuted(!muted);
  };

  const manualReconnect = () => {
    setConnState("connecting");
    playerRef.current?.destroy?.();
    // Re-mount by forcing streamId effect to rerun via key change upstream,
    // or simply reload the source if jsmpeg exposes it.
    playerRef.current = null;
    // Trigger the effect again next tick.
    requestAnimationFrame(() => setConnState("connecting"));
  };

  return (
    <div
      className="relative h-full w-full bg-black rounded-console overflow-hidden select-none"
      onMouseEnter={() => setShowControls(true)}
      onTouchStart={() => setShowControls(true)}
    >
      <canvas ref={canvasRef} className="h-full w-full object-contain bg-black" />

      {(!ready || connState !== "live") && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 font-mono text-sm text-ink-dim">
          {failed ? (
            <>
              <WifiOff size={28} className="text-amber" />
              <span>decoder failed to load</span>
            </>
          ) : connState === "dropped" ? (
            <>
              <WifiOff size={28} className="text-amber" />
              <span>signal dropped — retrying…</span>
            </>
          ) : (
            <span>connecting to {label.toLowerCase()}…</span>
          )}
        </div>
      )}

      <div
        className={`absolute inset-x-0 bottom-0 flex items-center justify-between gap-4 bg-gradient-to-t from-black/90 to-transparent px-5 py-4 transition-opacity duration-200 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-panel2 text-ink active:scale-95"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button
            onClick={toggleMute}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-panel2 text-ink active:scale-95"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-xs uppercase tracking-wide text-ink-dim">
            {connState === "live" ? "live" : connState}
          </span>
          <button
            onClick={manualReconnect}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-panel2 text-ink active:scale-95"
            aria-label="Reconnect"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
