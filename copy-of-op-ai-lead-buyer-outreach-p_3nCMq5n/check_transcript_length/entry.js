export default defineComponent({
  async run({ steps, $ }) {
    const text = steps.transcribe?.transcript || "";
    const trimmedText = text.trim();
    const wordCount = trimmedText ? trimmedText.split(/\s+/).length : 0;

    if (wordCount <= 150) {
      const message = `⛔ Workflow stopped: transcript is only ${wordCount} words.`;

      console.log(message);
      $.export("$summary", message);

      return $.flow.exit(message);
    }

    return {
      wordCount,
      status: "OK - continuing workflow."
    };
  }
});