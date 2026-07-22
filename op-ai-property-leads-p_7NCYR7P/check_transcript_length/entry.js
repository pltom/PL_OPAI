export default defineComponent({
  async run({ steps, $ }) {

    const text = steps.transcribe.transcript || "";
    const wordCount = text.trim().split(/\s+/).length;

    if (wordCount <= 150) {
      $.export("$summary", `⛔ Workflow stopped: transcript is only ${wordCount} words.`);
      throw new Error("STOP_WORKFLOW: Transcript too short.");
    }

    return {
      wordCount,
      status: "OK — continuing workflow."
    };
  }
})