// Answer generation with a completeness pass (post-experiment product fix,
// 28 November 2026, on the owner's explicit order). A deep audit found the
// remaining answer failures were drafts that stopped early: every missing
// fact was already present in the retrieved passages. The draft is still
// produced by the fixed Appendix A prompt; a second call then checks the
// draft against the same passages and adds only passage facts the question
// directly asks about. Declines are never completed into answers, and any
// failure of the second call falls back to the draft unchanged.
import { buildPrompt, NO_ANSWER } from "./prompt";
import { completeChat, type Usage } from "./provider";

export interface PassageLike {
  title: string;
  headingPath: string;
  url: string;
  text: string;
}

const COMPLETION_SYSTEM =
  "You are a completeness checker for a documentation assistant. You are given a question, the numbered passages the assistant used, and its draft answer. Work through the passages one by one and list every fact that bears on the question: the direct answer, any alternatives or contrasts the passages draw (for example a hosted service versus a self-hosted deployment), prerequisites, version numbers, named items in any list the passages give, and configuration values such as environment variables. If the draft omits any of those facts, return the complete answer: keep everything correct in the draft and add the missing facts, citing passages as [n] in the same style. Use only facts present in the passages. If the draft already covers every such fact, return it unchanged, word for word. Never remove correct content from the draft. Output only the answer, with no commentary.";

export async function answerWithCompletion(
  question: string,
  passages: PassageLike[],
  extraPassages: PassageLike[] = [],
  draftTimeoutMs?: number,
): Promise<{ text: string; usage: Usage }> {
  const { system, user } = buildPrompt(question, passages);
  const draft = await completeChat(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { timeoutMs: draftTimeoutMs },
  );
  const text = draft.text.trim();
  if (!text || text.startsWith(NO_ANSWER)) return draft;
  try {
    // The completeness checker may also use a wider context pool than the
    // draft used (post-experiment fix, 28 November 2026): several partial
    // answers were missing facts that sat just below the top-3 retrieval
    // cut. The draft itself is unchanged; the checker only adds facts the
    // question directly asks about, from whichever passages contain them.
    const allPassages = [...passages, ...extraPassages];
    const completionUser = `QUESTION\n${question}\n\nPASSAGES\n${allPassages.map((p, i) => `[${i + 1}] ${p.text}`).join("\n\n")}\n\nDRAFT ANSWER\n${text}`;
    const done = await completeChat(
      [
        { role: "system", content: COMPLETION_SYSTEM },
        { role: "user", content: completionUser },
      ],
      { maxTokens: 900, timeoutMs: 25000 },
    );
    const out = done.text.trim();
    if (out.length < 10) return draft;
    if (out.startsWith(NO_ANSWER)) return draft;
    if (out.length > text.length * 3 + 600) return draft;
    return {
      text: out,
      usage: {
        tokensIn: draft.usage.tokensIn + done.usage.tokensIn,
        tokensOut: draft.usage.tokensOut + done.usage.tokensOut,
        costUsd: draft.usage.costUsd + done.usage.costUsd,
      },
    };
  } catch {
    return draft;
  }
}
