import AskAssistant from "@/components/assistant/AskAssistant";
export const metadata = { title: "Ask the Flagsmith documentation" };
export default async function AskPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return (
    <div className="mx-auto w-full max-w-[760px] px-4 py-10 md:px-6">
      <h1 className="font-display text-[30px] font-semibold leading-9 md:text-[38px] md:leading-[44px]">Ask the Flagsmith documentation</h1>
      <p className="mt-2 text-ink-2">Answers are drawn only from the public documentation and always show sources.</p>
      <div className="mt-6"><AskAssistant surface="web" initialQuestion={q || ""} /></div>
    </div>
  );
}
