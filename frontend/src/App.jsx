import { useState } from "react";
import Dashboard from "./components/Dashboard";
import PlayerScreen from "./components/PlayerScreen";
import QuickSettingsDrawer from "./components/QuickSettingsDrawer";
import FullscreenHelpModal from "./components/FullscreenHelpModal";
import { useTiles } from "./hooks/useTiles";

export default function App() {
  const { tiles, addTile, updateTile, removeTile, reorderTiles } = useTiles();
  const [activeStreamTile, setActiveStreamTile] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const openTile = (tile) => {
    if (tile.kind === "stream") {
      setActiveStreamTile(tile);
    } else {
      // Same-window navigation, on purpose: this is a single-browser car
      // dashboard, not a multi-tab desktop setup. Use the browser's back
      // button (or reopen this page's URL) to return — tiles persist in
      // localStorage, so nothing is lost.
      window.location.href = tile.url;
    }
  };

  return (
    <div className="h-[100dvh] w-screen overflow-hidden bg-void">
      <Dashboard
        tiles={tiles}
        onOpenTile={openTile}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenHelp={() => setHelpOpen(true)}
      />

      {activeStreamTile && (
        <PlayerScreen tile={activeStreamTile} onBack={() => setActiveStreamTile(null)} />
      )}

      <QuickSettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        tiles={tiles}
        onAddTile={addTile}
        onUpdateTile={updateTile}
        onRemoveTile={removeTile}
        onReorderTiles={reorderTiles}
      />

      <FullscreenHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
