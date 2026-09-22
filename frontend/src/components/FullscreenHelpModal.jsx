import { X } from "lucide-react";
import QRShare from "./QRShare";

export default function FullscreenHelpModal({ open, onClose }) {
  if (!open) return null;
  const url = window.location.href;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-console border border-line bg-panel p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg text-ink">Getting to full screen</h2>
          <button onClick={onClose} className="text-ink-dim active:text-ink" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3 text-sm leading-relaxed text-ink-dim">
          <p>
            The Tesla browser doesn't expose a standard fullscreen API, so this dashboard is
            already built edge-to-edge to use all the space it's given. Two things help beyond that:
          </p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Open this page from Tesla Theater or from a YouTube link redirect rather than typing
              the address bar directly — both hide the browser chrome more aggressively than a
              plain address-bar visit.
            </li>
            <li>
              Bookmark this page to your car's home screen shortcuts so it reopens without the
              address bar showing on the next launch.
            </li>
          </ol>
          <p>
            Community tools like TeslaSend can push a URL from your phone straight to the car's
            browser, which is faster than typing it on the center screen — the QR code below is a
            local alternative if your phone's camera app opens links directly.
          </p>
        </div>

        <div className="mt-5">
          <QRShare url={url} />
        </div>
      </div>
    </div>
  );
}
