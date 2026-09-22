import { Plus } from "lucide-react";
import Tile from "./Tile";

export default function TileGrid({ tiles, onOpen, editing, onEdit, onAdd }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {tiles.map((tile) => (
        <Tile key={tile.id} tile={tile} onOpen={onOpen} editing={editing} onEdit={onEdit} />
      ))}

      {editing && (
        <button
          onClick={onAdd}
          className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-console border border-dashed border-line text-ink-dim active:bg-panel md:min-h-[160px]"
        >
          <Plus size={26} />
          <span className="font-mono text-xs">add tile</span>
        </button>
      )}
    </div>
  );
}
