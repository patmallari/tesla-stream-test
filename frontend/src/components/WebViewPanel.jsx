import { useEffect, useState } from "react";
import { ArrowLeft, RefreshCw, ExternalLink, Info } from "lucide-react";

/**
 * Keeps the dashboard "page" static: instead of navigating the whole
 * window, this renders an iframe box on top of the dashboard and points it
 * at the tile's URL.
 *
 * Important honesty note: there is no reliable way to detect from this side
 * whether a site refused to be framed. A site that sends X-Frame-Options
 * still fires the iframe's `load` event — it just renders blank — so
 * "did it load" and "is it visibly blank because it was blocked" are
 * indistinguishable from here. Rather than pretend to detect it (and get
 * that pretense wrong, which is worse than saying nothing), this panel
 * always keeps an obvious "open outside the box" control in the toolbar,
 * and surfaces a plain, un-hedged hint after a few seconds so a blank box
 * never just sits there unexplained.
 */
export default function WebViewPanel({ tile, onBack }) {
  const [loadKey, setLoadKey] = useState(0);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    setShowHint(false);
    const timer = setTimeout(() => setShowHint(true), 3000);
    return () => clearTimeout(timer);
  }, [tile.url, loadKey]);

  const reload = () => setLoadKey((k) => k + 1);

  const openOutside = () => {
    window.location.href = tile.url;
  };

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
          onClick={openOutside}
          className="flex shrink-0 items-center gap-2 rounded-full bg-panel2 px-4 py-2.5 text-xs font-medium text-ink active:scale-95"
          aria-label="Open outside the box"
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
                  Blank box? Some sites block being embedded like this and there's no way to tell
                  from here — tap "Open outside" above to load {tile.title} directly instead.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
