import { useState } from "react";
import { X, ChevronUp, ChevronDown, Trash2, Save, Server, CheckCircle2, XCircle } from "lucide-react";
import { ICON_NAMES, iconFor } from "../lib/icons";
import { getRelayConfig, setRelayConfig, clearRelayConfig, deriveWsFromHttp } from "../lib/relayConfig";

const emptyDraft = { title: "", url: "", icon: "link", kind: "link" };

function RelaySettings() {
  const [httpUrl, setHttpUrl] = useState(getRelayConfig().http);
  const [testResult, setTestResult] = useState(null); // null | 'ok' | 'fail'
  const [testing, setTesting] = useState(false);

  const test = async () => {
    if (!httpUrl) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${httpUrl.replace(/\/+$/, "")}/health`);
      setTestResult(res.ok ? "ok" : "fail");
    } catch {
      setTestResult("fail");
    } finally {
      setTesting(false);
    }
  };

  const save = () => {
    if (!httpUrl) {
      clearRelayConfig();
    } else {
      setRelayConfig({ http: httpUrl, ws: deriveWsFromHttp(httpUrl) });
    }
    // Tile source (local vs. relay-backed) and the WebSocket base are picked
    // up once on load, so a clean reload is the simplest way to apply this.
    window.location.reload();
  };

  return (
    <div className="mb-6 space-y-3 border-b border-line pb-6">
      <h3 className="flex items-center gap-2 font-mono text-xs uppercase text-ink-dim">
        <Server size={13} />
        Video relay
      </h3>
      <p className="font-mono text-[11px] leading-relaxed text-ink-dim">
        Only needed for video-stream tiles. Point this at wherever you're running the
        backend relay (see the README) — for example{" "}
        <span className="text-ink">https://relay.yourhome.example</span>. Leave it blank to run
        this dashboard with link tiles only, stored in this browser.
      </p>
      <div className="flex gap-2">
        <input
          value={httpUrl}
          onChange={(e) => setHttpUrl(e.target.value)}
          placeholder="https://your-relay-address"
          className="flex-1 rounded-console border border-line bg-void px-3 py-2.5 text-sm text-ink placeholder:text-ink-dim outline-none focus-visible:border-cyan"
        />
        <button
          onClick={test}
          disabled={!httpUrl || testing}
          className="shrink-0 rounded-console border border-line px-3 text-xs text-ink-dim active:bg-void disabled:opacity-40"
        >
          {testing ? "testing…" : "test"}
        </button>
      </div>
      {testResult === "ok" && (
        <p className="flex items-center gap-1.5 font-mono text-xs text-cyan">
          <CheckCircle2 size={13} /> relay reachable
        </p>
      )}
      {testResult === "fail" && (
        <p className="flex items-center gap-1.5 font-mono text-xs text-amber">
          <XCircle size={13} /> couldn't reach it — check the address and that it's HTTPS if this
          page is
        </p>
      )}
      <button
        onClick={save}
        className="w-full rounded-console bg-panel2 py-2.5 text-sm font-medium text-ink active:opacity-80"
      >
        Save &amp; reload
      </button>
    </div>
  );
}

export default function QuickSettingsDrawer({
  open,
  onClose,
  tiles,
  onAddTile,
  onUpdateTile,
  onRemoveTile,
  onReorderTiles,
}) {
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState(null);

  if (!open) return null;

  const startEdit = (tile) => {
    setEditingId(tile.id);
    setDraft({ title: tile.title, url: tile.url, icon: tile.icon, kind: tile.kind });
  };

  const resetForm = () => {
    setEditingId(null);
    setDraft(emptyDraft);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!draft.title || !draft.url) return;
    if (editingId) await onUpdateTile(editingId, draft);
    else await onAddTile(draft);
    resetForm();
  };

  const move = (index, dir) => {
    const next = [...tiles];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onReorderTiles(next.map((t) => t.id));
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/60" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-md flex-col bg-panel border-l border-line"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-lg text-ink">Tiles</h2>
          <button onClick={onClose} className="text-ink-dim active:text-ink" aria-label="Close">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-4">
          <RelaySettings />

          <ul className="space-y-2">
            {tiles.map((tile, i) => {
              const Icon = iconFor(tile.icon);
              return (
                <li
                  key={tile.id}
                  className="flex items-center gap-3 rounded-console border border-line bg-panel2 px-3 py-2.5"
                >
                  <Icon size={18} className="shrink-0 text-cyan" />
                  <button
                    className="flex-1 truncate text-left text-sm text-ink"
                    onClick={() => startEdit(tile)}
                  >
                    {tile.title}
                  </button>
                  <div className="flex items-center gap-1">
                    <button onClick={() => move(i, -1)} className="p-1 text-ink-dim active:text-ink" aria-label="Move up">
                      <ChevronUp size={16} />
                    </button>
                    <button onClick={() => move(i, 1)} className="p-1 text-ink-dim active:text-ink" aria-label="Move down">
                      <ChevronDown size={16} />
                    </button>
                    <button
                      onClick={() => onRemoveTile(tile.id)}
                      className="p-1 text-ink-dim active:text-amber"
                      aria-label="Delete tile"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <form onSubmit={submit} className="mt-6 space-y-3 border-t border-line pt-5">
            <h3 className="font-mono text-xs uppercase text-ink-dim">
              {editingId ? "Edit tile" : "New tile"}
            </h3>

            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Title"
              className="w-full rounded-console border border-line bg-void px-3 py-2.5 text-sm text-ink placeholder:text-ink-dim outline-none focus-visible:border-cyan"
            />
            <input
              value={draft.url}
              onChange={(e) => setDraft({ ...draft, url: e.target.value })}
              placeholder="https://example.com"
              className="w-full rounded-console border border-line bg-void px-3 py-2.5 text-sm text-ink placeholder:text-ink-dim outline-none focus-visible:border-cyan"
            />

            <div className="flex gap-2">
              <select
                value={draft.kind}
                onChange={(e) => setDraft({ ...draft, kind: e.target.value })}
                className="flex-1 rounded-console border border-line bg-void px-3 py-2.5 text-sm text-ink outline-none"
              >
                <option value="link">Web link</option>
                <option value="stream">Video stream</option>
              </select>
              <select
                value={draft.icon}
                onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
                className="flex-1 rounded-console border border-line bg-void px-3 py-2.5 text-sm text-ink outline-none"
              >
                {ICON_NAMES.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <p className="font-mono text-[11px] leading-relaxed text-ink-dim">
              {draft.kind === "stream"
                ? "Register the source (RTSP/IPTV/HLS/file) as a stream from the relay's /api/streams endpoint first, then set the URL field here to that stream's id."
                : "Opens in a new tab — most sites refuse to load inside another page."}
            </p>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex flex-1 items-center justify-center gap-2 rounded-console bg-cyan py-2.5 text-sm font-medium text-void active:opacity-80"
              >
                <Save size={16} />
                {editingId ? "Save changes" : "Add tile"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-console border border-line px-4 text-sm text-ink-dim active:bg-void"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
