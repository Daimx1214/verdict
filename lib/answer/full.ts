// Full answer path (post-experiment product fixes, 28 November 2026).
// Wraps retrieval + answerWithCompletion with two measured improvements
// aimed at the deep audit's remaining failure classes:
//
// 1. Wide-context completeness. The draft is generated from the shipped
//    configuration's passages exactly as before, but the completeness
//    checker also sees the next few ranked passages. Four partial answers
//    in the final audit were missing facts ranked 4-8, just below the
//    top-3 cut; the checker can now add those facts, citing them.
//
// 2. Decline rescue. If the draft declines, retrieval is retried once
//    with a much wider pool (top 25) and the question is answered again
//    from that pool. Three audit questions declined only because their
//    gold page ranked 9-19. A rescue that still finds nothing declines
//    again, so genuine corpus gaps keep declining. The rescue never
//    changes an answer that was already given.
//
// The experiment ran on 27 November 2026 with the original path; these
// changes post-date it, do not touch its record, and are disclosed in
// the README alongside the earlier post-experiment fixes.
import { retrieve, type RetrievalResult } from "../retrieval/strategies";
import type { RetrievalConfig } from "../flagsmith/config-schema";
import { answerWithCompletion, type PassageLike } from "./complete";
import { NO_ANSWER } from "./prompt";
import type { Usage } from "./provider";

export interface FullAnswer {
  text: string;
  usage: Usage;
  retrieval: RetrievalResult;
  rescued: boolean;
}

const toPassages = (r: RetrievalResult): PassageLike[] =>
  r.passages.map((p) => ({
    title: p.chunk.pageTitle,
    headingPath: p.chunk.headingPath,
    url: p.chunk.url,
    text: p.chunk.text,
  }));

const addUsage = (a: Usage, b: Usage): Usage => ({
  tokensIn: a.tokensIn + b.tokensIn,
  tokensOut: a.tokensOut + b.tokensOut,
  costUsd: a.costUsd + b.costUsd,
});

export async function answerFull(
  question: string,
  cfg: RetrievalConfig,
): Promise<FullAnswer> {
  const primary = await retrieve(question, cfg);
  const wide = await retrieve(question, { ...cfg, topK: 8 });
  const primaryIds = new Set(primary.passages.map((p) => p.chunk.id));
  const extra = wide.passages.filter((p) => !primaryIds.has(p.chunk.id));
  const combined: RetrievalResult = {
    ...primary,
    passages: [...primary.passages, ...extra],
  };

  const first = await answerWithCompletion(
    question,
    toPassages(primary),
    toPassages({ ...wide, passages: extra }),
  );
  if (!first.text.trim().startsWith(NO_ANSWER)) {
    return { text: first.text, usage: first.usage, retrieval: combined, rescued: false };
  }

  // Decline rescue: one wider retry. Any failure keeps the original decline.
  try {
    // Widened passages (the split-chunk context matters here too), with a
    // longer draft timeout because 25 passages take longer to answer from.
    const pool = await retrieve(question, { ...cfg, topK: 25 });
    const second = await answerWithCompletion(question, toPassages(pool), [], 60000);
    if (second.text.trim() && !second.text.trim().startsWith(NO_ANSWER)) {
      return {
        text: second.text,
        usage: addUsage(first.usage, second.usage),
        retrieval: pool,
        rescued: true,
      };
    }
  } catch {
    /* keep the original decline */
  }
  return { text: first.text, usage: first.usage, retrieval: primary, rescued: false };
}
