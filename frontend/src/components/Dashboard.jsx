import ConsoleHeader from "./ConsoleHeader";
import TileGrid from "./TileGrid";

export default function Dashboard({ tiles, onOpenTile, onOpenSettings, onOpenHelp }) {
  return (
    <div className="flex h-full flex-col">
      <ConsoleHeader onOpenSettings={onOpenSettings} onOpenHelp={onOpenHelp} />
      <main className="flex-1 overflow-y-auto no-scrollbar px-6 py-6">
        {tiles.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-ink-dim">
            <p className="font-display text-lg">No tiles yet</p>
            <p className="font-mono text-xs">open settings to add your first one</p>
          </div>
        ) : (
          <TileGrid tiles={tiles} onOpen={onOpenTile} editing={false} />
        )}
      </main>
    </div>
  );
}
