import { useState } from "react";
import Dashboard from "./components/Dashboard";
import PlayerScreen from "./components/PlayerScreen";
import WebViewPanel from "./components/WebViewPanel";
import QuickSettingsDrawer from "./components/QuickSettingsDrawer";
import FullscreenHelpModal from "./components/FullscreenHelpModal";
import { useTiles } from "./hooks/useTiles";
import { likelyBlocksFraming } from "./lib/embedPolicy";

export default function App() {
  const { tiles, addTile, updateTile, removeTile, reorderTiles } = useTiles();
  // The tile currently layered on top of the dashboard, or null. The
  // dashboard underneath stays mounted the whole time — nothing navigates
  // away from this page, except for the known-blocked-host case below.
  const [activeView, setActiveView] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const openTile = (tile) => {
    if (tile.kind === "link" && likelyBlocksFraming(tile.url)) {
      // Known to refuse embedding (e.g. any google.com page) — showing the
      // box here would just be a blank frame with no way to tell why, so
      // skip straight to a direct navigation instead.
      window.location.href = tile.url;
      return;
    }
    setActiveView(tile);
  };
  const closeView = () => setActiveView(null);

  return (
    <div className="h-[100dvh] w-screen overflow-hidden bg-void">
      <Dashboard
        tiles={tiles}
        onOpenTile={openTile}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenHelp={() => setHelpOpen(true)}
      />

      {activeView?.kind === "stream" && <PlayerScreen tile={activeView} onBack={closeView} />}
      {activeView && activeView.kind !== "stream" && (
        <WebViewPanel tile={activeView} onBack={closeView} />
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

