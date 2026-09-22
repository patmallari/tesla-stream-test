import { ArrowLeft } from "lucide-react";
import CanvasVideoPlayer from "./CanvasVideoPlayer";

export default function PlayerScreen({ tile, onBack }) {
  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-black">
      <div
        className="flex items-center gap-3 px-5 py-3"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 12px)" }}
      >
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-panel2 text-ink active:scale-95"
          aria-label="Back to dashboard"
        >
          <ArrowLeft size={18} />
        </button>
        <span className="font-display text-sm text-ink-dim">{tile.title}</span>
      </div>
      <div className="flex-1 px-3 pb-3">
        <CanvasVideoPlayer streamId={tile.url} label={tile.title} />
      </div>
    </div>
  );
}
