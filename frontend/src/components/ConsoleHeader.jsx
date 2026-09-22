import { Wifi, WifiOff, CloudSun, Settings2, HelpCircle } from "lucide-react";
import { useClock } from "../hooks/useClock";
import { useConnectionStatus } from "../hooks/useConnectionStatus";

export default function ConsoleHeader({ onOpenSettings, onOpenHelp }) {
  const { time, date } = useClock();
  const { online, relayState } = useConnectionStatus();

  let linkLabel = "connected";
  let linkColor = "text-cyan";
  let LinkIcon = Wifi;

  if (!online) {
    linkLabel = "offline";
    linkColor = "text-amber";
    LinkIcon = WifiOff;
  } else if (relayState === "unconfigured") {
    linkLabel = "no relay";
    linkColor = "text-ink-dim";
    LinkIcon = Wifi;
  } else if (relayState === "down") {
    linkLabel = "relay unreachable";
    linkColor = "text-amber";
    LinkIcon = WifiOff;
  }

  return (
    <header
      className="flex shrink-0 items-center justify-between border-b border-line px-6"
      style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 14px)", paddingBottom: "14px" }}
    >
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-2xl tracking-tight text-ink">{time}</span>
        <span className="font-mono text-sm text-ink-dim">{date}</span>
      </div>

      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2 font-mono text-xs text-ink-dim">
          <CloudSun size={16} className="text-ink-dim" />
          <span>—°</span>
        </div>

        <div className={`flex items-center gap-1.5 font-mono text-xs ${linkColor}`}>
          <LinkIcon size={15} />
          <span className="hidden sm:inline">{linkLabel}</span>
        </div>

        <button
          onClick={onOpenHelp}
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink-dim active:bg-panel"
          aria-label="Fullscreen help"
        >
          <HelpCircle size={19} />
        </button>
        <button
          onClick={onOpenSettings}
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink-dim active:bg-panel"
          aria-label="Settings"
        >
          <Settings2 size={19} />
        </button>
      </div>
    </header>
  );
}
