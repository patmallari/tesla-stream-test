import ffmpeg from "fluent-ffmpeg";
import { EventEmitter } from "node:events";

/**
 * One ffmpeg child process is kept alive per streamId and shared across
 * every connected viewer, so ten tablets watching the same IPTV feed don't
 * spin up ten transcodes. Each process is ref-counted: the last
 * disconnecting viewer kills it after a short grace period (in case of a
 * quick page reload / reconnect from LTE flakiness).
 *
 * Output is a single muxed MPEG-TS stream (MPEG-1 video + MP2 audio). This
 * is the standard jsmpeg transport: the client-side player demuxes it and
 * renders video onto a <canvas> while decoding audio through the Web Audio
 * API internally — no native <video>/<audio> element ever gets a media
 * source, so the in-car Chromium browser has nothing to pause on backgrounding.
 */
class StreamManager extends EventEmitter {
  constructor() {
    super();
    this.processes = new Map(); // streamId -> { command, refs, killTimer }
  }

  /**
   * Attach a viewer to a stream. Returns an EventEmitter that emits
   * 'data' (Buffer chunks) and 'error'. Call detach() when the viewer leaves.
   */
  attach(streamId, streamConfig) {
    let entry = this.processes.get(streamId);

    if (!entry) {
      entry = this._spawn(streamConfig);
      this.processes.set(streamId, entry);
    } else if (entry.killTimer) {
      clearTimeout(entry.killTimer);
      entry.killTimer = null;
    }

    entry.refs += 1;
    return entry.emitter;
  }

  detach(streamId) {
    const entry = this.processes.get(streamId);
    if (!entry) return;

    entry.refs -= 1;
    if (entry.refs <= 0 && !entry.killTimer) {
      // Grace period lets a client reconnecting after a signal drop reuse
      // the still-warm ffmpeg process instead of a cold restart.
      entry.killTimer = setTimeout(() => {
        entry.command.kill("SIGKILL");
        this.processes.delete(streamId);
      }, 10_000);
    }
  }

  _spawn(cfg) {
    const emitter = new EventEmitter();
    const command = ffmpeg(cfg.input_url).inputOptions([
      "-fflags", "nobuffer+genpts",
      "-flags", "low_delay",
      "-rtsp_transport", "tcp", // ignored for non-rtsp inputs
    ]);

    command
      .videoCodec("mpeg1video")
      .size(`${cfg.width}x${cfg.height}`)
      .fps(cfg.fps)
      .outputOptions([
        "-b:v", cfg.video_bitrate,
        "-bf", "0",             // no B-frames: cuts latency for live glass-to-glass
        "-muxdelay", "0.001",
        "-muxpreload", "0.001",
      ])
      .format("mpegts");

    if (cfg.audio_enabled) {
      command.audioCodec("mp2").audioBitrate("128k").audioChannels(2).audioFrequency(44100);
    } else {
      command.noAudio();
    }

    command
      .on("start", (cmdLine) => emitter.emit("start", cmdLine))
      .on("error", (err) => emitter.emit("error", err))
      .on("end", () => emitter.emit("end"));

    const proc = command.pipe();
    proc.on("data", (chunk) => emitter.emit("data", chunk));
    proc.on("error", (err) => emitter.emit("error", err));

    return { command, emitter, refs: 0, killTimer: null };
  }

  shutdownAll() {
    for (const { command } of this.processes.values()) {
      try {
        command.kill("SIGKILL");
      } catch {
        /* already dead */
      }
    }
    this.processes.clear();
  }
}

export const streamManager = new StreamManager();
