import { useEffect, useState } from "react";
import { ArrowLeft, RefreshCw, ExternalLink, Info } from "lucide-react";

/**
 * Used only when no relay backend is configured. A plain iframe keeps the
 * user fully inside the dashboard for any site that allows it — no backend
 * needed for that case. For sites that refuse framing, there's no way to
 * detect that reliably from here (see the note in the project README), so
 * rather than pretend to detect it, this always keeps "Open outside"
 * visible and surfaces an honest, un-hedged hint after a few seconds that
 * points at the relay-backed alternative instead of guessing.
 */
export default function EmbeddedFrameView({ tile, onBack, onOpenOutside, onOpenSettings }) {
  const [loadKey, setLoadKey] = useState(0);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    setShowHint(false);
    const timer = setTimeout(() => setShowHint(true), 3000);
    return () => clearTimeout(timer);
  }, [tile.url, loadKey]);

  const reload = () => setLoadKey((k) => k + 1);

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-void">
      <div
        className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-3"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 12px)" }}
      >
        <button
          onClick={onBack}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-panel2 text-ink active:scale-95"
          aria-label="Back to dashboard"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm text-ink">{tile.title}</p>
          <p className="truncate font-mono text-[11px] text-ink-dim">{tile.url}</p>
        </div>
        <button
          onClick={reload}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-panel2 text-ink active:scale-95"
          aria-label="Reload"
        >
          <RefreshCw size={16} />
        </button>
        <button
          onClick={() => onOpenOutside(tile.url)}
          className="flex shrink-0 items-center gap-2 rounded-full bg-panel2 px-4 py-2.5 text-xs font-medium text-ink active:scale-95"
        >
          <ExternalLink size={15} />
          <span className="hidden sm:inline">Open outside</span>
        </button>
      </div>

      <div className="relative flex-1">
        <iframe
          key={loadKey}
          src={tile.url}
          title={tile.title}
          className="h-full w-full border-0 bg-white"
          allow="geolocation; autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />

        {showHint && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-4">
            <div className="pointer-events-auto flex max-w-md items-start gap-3 rounded-console border border-line bg-panel px-4 py-3 shadow-lg">
              <Info size={18} className="mt-0.5 shrink-0 text-cyan" />
              <div className="flex-1 text-sm text-ink-dim">
                <p>
                  Blank box? There's no way to tell from here whether {tile.title} refused to be
                  embedded like this — tap "Open outside" above for now, or{" "}
                  <button onClick={onOpenSettings} className="text-cyan underline underline-offset-2">
                    set up the relay backend
                  </button>{" "}
                  for a version of this that works even when a site blocks framing.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
