import fs from "fs";
import axios from "axios";
import { execFile } from "child_process";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { access } from "fs/promises";

// robustly resolve an ffmpeg binary
async function resolveFfmpeg() {
  const candidate = ffmpegInstaller?.path;
  if (candidate) {
    try { await access(candidate, fs.constants.X_OK); return candidate; } catch {}
  }
  // fallback to system ffmpeg if available in PATH
  return "ffmpeg";
}

export default defineComponent({
  async run({ steps, $ }) {
    const CHUNK_SEC = 1380;                 // stay below 1400s model limit
    const IN_PATH   = "/tmp/in.mp3";
    const ffmpegPath = await resolveFfmpeg();

    let url = steps.trigger.event.body.RecordingUrl || steps.trigger.event.body.recordingUrl;
    if (!url) throw new Error("No recordingUrl / RecordingUrl in payload.");
    if (!/\.(mp3|wav|m4a|ogg|webm)$/i.test(url)) url += ".mp3";

    console.log("Using ffmpeg at:", ffmpegPath);
    console.log("Downloading:", url);

    const { data } = await axios.get(url, { responseType: "arraybuffer" });
    fs.writeFileSync(IN_PATH, data);
    console.log("Saved to", IN_PATH, "bytes:", fs.statSync(IN_PATH).size);

    // Always segment; if short, you'll just get one chunk
    await new Promise((resolve, reject) => {
      execFile(
        ffmpegPath,
        [
          "-hide_banner", "-loglevel", "error",
          "-i", IN_PATH,
          "-f", "segment",
          "-segment_time", String(CHUNK_SEC),
          "-c", "copy",
          "/tmp/chunk%03d.mp3",
        ],
        (e) => (e ? reject(e) : resolve())
      );
    });

    const chunkPaths = fs.readdirSync("/tmp")
      .filter(f => /^chunk\d+\.mp3$/.test(f))
      .sort()
      .map(f => `/tmp/${f}`);

    if (chunkPaths.length === 0) {
      // belt-and-suspenders: if segmentation didn't emit chunks, fall back to single file
      chunkPaths.push(IN_PATH);
    }

    console.log("Chunks:", chunkPaths);
    $.export("chunkPaths", chunkPaths);
    $.export("parts", chunkPaths.length);
    return { chunkPaths, parts: chunkPaths.length };
  }
});