import { iconFor } from "../lib/icons";
import { Radio } from "lucide-react";

export default function Tile({ tile, onOpen, editing, onEdit }) {
  const Icon = iconFor(tile.icon);

  return (
    <button
      onClick={() => (editing ? onEdit(tile) : onOpen(tile))}
      className="group relative flex min-h-[140px] flex-col items-start justify-between rounded-console border border-line bg-panel p-5 text-left transition-colors active:bg-panel2 md:min-h-[160px]"
    >
      {tile.kind === "stream" && (
        <span className="absolute right-4 top-4 flex items-center gap-1 font-mono text-[11px] text-amber">
          <Radio size={12} className="animate-pulse" />
          live
        </span>
      )}
      <Icon size={30} className="text-cyan" strokeWidth={1.75} />
      <span className="font-display text-lg font-medium leading-tight text-ink">
        {tile.title}
      </span>
      {editing && (
        <span className="font-mono text-xs text-ink-dim">tap to edit</span>
      )}
    </button>
  );
}
