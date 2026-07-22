import OpenAI from "openai";
import fs from "fs";

export default defineComponent({
  async run({ steps, $ }) {
    const trim = steps.Trim_audio_if_needed || steps.trim_audio_if_needed;
    const chunkPaths =
      trim?.exports?.chunkPaths ??
      trim?.$return_value?.chunkPaths ??
      [];

    if (!Array.isArray(chunkPaths) || chunkPaths.length === 0) {
      throw new Error("No chunkPaths found from Trim_audio_if_needed.");
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const MODEL = "gpt-4o-transcribe"; // or "gpt-4o-mini-transcribe" / "whisper-1"

    // Loop through chunks and merge text without tags
    const texts = [];
    for (const filePath of chunkPaths) {
      console.log("Transcribing:", filePath);
      const res = await client.audio.transcriptions.create({
        model: MODEL,
        file: fs.createReadStream(filePath),
        temperature: 0,
      });
      texts.push((res.text || "").trim());
    }

    // Merge without any "[Part X]" markers
    const transcript = texts.join(" ").replace(/\s+/g, " ").trim();

    $.export("transcript", transcript);
    return { transcript };
  },
});