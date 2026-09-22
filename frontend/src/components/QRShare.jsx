import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Check } from "lucide-react";

export default function QRShare({ url }) {
  const [dataUrl, setDataUrl] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(url, { margin: 1, width: 220, color: { dark: "#0a0a0a", light: "#f2f2f0" } })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [url]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard permissions denied — the visible URL still works */
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 rounded-console border border-line bg-panel2 p-5">
      {dataUrl ? (
        <img src={dataUrl} alt="QR code linking to this dashboard" className="rounded-console" />
      ) : (
        <div className="h-[220px] w-[220px] animate-pulse rounded-console bg-line" />
      )}
      <button
        onClick={copy}
        className="flex items-center gap-2 font-mono text-xs text-ink-dim active:text-ink"
      >
        {copied ? <Check size={14} className="text-cyan" /> : <Copy size={14} />}
        {url}
      </button>
    </div>
  );
}
