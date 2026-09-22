import { useEffect, useState } from "react";

const SRC = "https://cdn.jsdelivr.net/npm/jsmpeg@0.2.0/jsmpeg.min.js";
let loadPromise = null;

function loadScript() {
  if (window.JSMpeg) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SRC}"]`);
    if (existing) {
      existing.addEventListener("load", resolve);
      existing.addEventListener("error", reject);
      return;
    }
    const script = document.createElement("script");
    script.src = SRC;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * jsmpeg (phoboslab/jsmpeg) decodes the MPEG-TS stream fully client-side:
 * MPEG-1 video frames go to a <canvas> via WebGL/Canvas2D, and MP2 audio is
 * decoded and played through the Web Audio API. Nothing here ever touches a
 * native <video> or <audio> element, so the in-car browser has no media
 * element to pause when the tab is backgrounded or the screen locks.
 */
export function useJsmpegLoader() {
  const [ready, setReady] = useState(!!window.JSMpeg);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (ready) return;
    loadScript()
      .then(() => setReady(true))
      .catch(() => setFailed(true));
  }, [ready]);

  return { ready, failed };
}
