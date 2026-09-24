import { useState } from "react";
import Dashboard from "./components/Dashboard";
import PlayerScreen from "./components/PlayerScreen";
import RemoteBrowserView from "./components/RemoteBrowserView";
import EmbeddedFrameView from "./components/EmbeddedFrameView";
import QuickSettingsDrawer from "./components/QuickSettingsDrawer";
import FullscreenHelpModal from "./components/FullscreenHelpModal";
import { useTiles } from "./hooks/useTiles";
import { isRelayConfigured } from "./lib/relayConfig";

export default function App() {
  const { tiles, addTile, updateTile, removeTile, reorderTiles } = useTiles();
  // The tile currently layered on top of the dashboard, or null. The
  // dashboard underneath stays mounted the whole time — nothing here ever
  // calls window.location or window.open on its own. "Open outside" inside
  // the child views is the one explicit, user-triggered exception.
  const [activeView, setActiveView] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const openTile = (tile) => setActiveView(tile);
  const closeView = () => setActiveView(null);
  const openOutside = (url) => {
    window.location.href = url;
  };

  return (
    <div className="h-[100dvh] w-screen overflow-hidden bg-void">
      <Dashboard
        tiles={tiles}
        onOpenTile={openTile}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenHelp={() => setHelpOpen(true)}
      />

      {activeView?.kind === "stream" && <PlayerScreen tile={activeView} onBack={closeView} />}

      {activeView && activeView.kind !== "stream" && isRelayConfigured() && (
        <RemoteBrowserView tile={activeView} onBack={closeView} onOpenOutside={openOutside} />
      )}

      {activeView && activeView.kind !== "stream" && !isRelayConfigured() && (
        <EmbeddedFrameView
          tile={activeView}
          onBack={closeView}
          onOpenOutside={openOutside}
          onOpenSettings={() => {
            closeView();
            setSettingsOpen(true);
          }}
        />
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
