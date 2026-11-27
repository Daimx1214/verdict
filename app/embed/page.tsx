import AskAssistant from "@/components/assistant/AskAssistant";
export const metadata = { title: "Verdict assistant" };
export default function EmbedPage() {
  return (
    <div className="mx-auto w-full max-w-[760px] px-4 py-6">
      <AskAssistant surface="embed" />
      <p className="mt-6 border-t border-border pt-3 text-[13px] text-ink-3">
        Verdict assistant. Answers come from the public Flagsmith documentation.{" "}
        <a href="/" target="_blank" rel="noopener noreferrer" className="text-accent underline">Open Verdict</a>
      </p>
    </div>
  );
}
