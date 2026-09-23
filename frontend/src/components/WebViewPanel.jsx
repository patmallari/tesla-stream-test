import { useEffect, useRef, useState } from "react";
import { ArrowLeft, RefreshCw, ExternalLink, AlertTriangle } from "lucide-react";

/**
 * Keeps the dashboard "page" static: instead of navigating the whole
 * window, this renders an iframe box on top of the dashboard and points it
 * at the tile's URL. Many sites (Google properties, most streaming and
 * banking sites) send an X-Frame-Options / CSP frame-ancestors header that
 * refuses to be embedded this way — there is no client-side way around
 * that, so this panel offers an explicit "open outside the box" escape
 * hatch rather than silently failing.
 */
export default function WebViewPanel({ tile, onBack }) {
  const [loadKey, setLoadKey] = useState(0);
  const [suspectBlocked, setSuspectBlocked] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    loadedRef.current = false;
    setSuspectBlocked(false);
    // There's no reliable cross-origin signal that a site refused to frame
    // itself — the iframe often just stays blank. As a heuristic, if we
    // never see a load event within a few seconds, assume it's blocked and
    // surface the fallback rather than leaving an empty box unexplained.
    const timer = setTimeout(() => {
      if (!loadedRef.current) setSuspectBlocked(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, [tile.url, loadKey]);

  const handleLoad = () => {
    loadedRef.current = true;
    setSuspectBlocked(false);
  };

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
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-panel2 text-ink active:scale-95"
          aria-label="Open outside the box"
        >
          <ExternalLink size={16} />
        </button>
      </div>

      <div className="relative flex-1">
        <iframe
          key={loadKey}
          src={tile.url}
          title={tile.title}
          className="h-full w-full border-0 bg-white"
          onLoad={handleLoad}
          allow="geolocation; autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />

        {suspectBlocked && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-4">
            <div className="pointer-events-auto flex max-w-md items-start gap-3 rounded-console border border-line bg-panel px-4 py-3 shadow-lg">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber" />
              <div className="flex-1 text-sm text-ink-dim">
                <p>
                  {tile.title} may be refusing to load inside this box — some sites block that for
                  security reasons.
                </p>
                <button
                  onClick={openOutside}
                  className="mt-2 font-mono text-xs text-cyan underline underline-offset-2"
                >
                  open it outside the box instead
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
