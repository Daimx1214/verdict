import Link from "next/link";
export const metadata = { title: "Method" };
const H2 = "mt-10 font-display text-[28px] font-semibold leading-[34px]";
const P = "mt-3 text-[18px] leading-7 text-ink-2";
const TOC = ["The question", "Screening offline", "The live experiment", "How we read the result", "What could mislead you", "Shipping without a redeploy", "Reproduce it", "Embed it"];
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
export default function MethodPage() {
  return (
    <div className="mx-auto grid w-full max-w-[1120px] gap-10 px-4 py-10 md:px-6 lg:grid-cols-[220px_680px]">
      <aside className="hidden lg:block">
        <nav className="sticky top-24 flex flex-col gap-2" aria-label="On this page">
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-3">On this page</p>
          {TOC.map((t) => <a key={t} href={`#${slug(t)}`} className="text-sm text-ink-2 hover:text-accent">{t}</a>)}
        </nav>
      </aside>
      <article>
        <h1 className="font-display text-[30px] font-semibold leading-9 md:text-[38px] md:leading-[44px]">Method</h1>
        <p className={P}>How Verdict decides whether a change to its own answer-finding is worth shipping, in plain language.</p>

        <h2 id={slug(TOC[0])} className={H2}>The question</h2>
        <p className={P}>Does a better retrieval pipeline, chosen by offline screening, make more visitors mark an answer as helpful than the simple keyword baseline? The unit of analysis is the participant, counted once, because one person asking five questions is not five people.</p>

        <h2 id={slug(TOC[1])} className={H2}>Screening offline</h2>
        <p className={P}>Sixty questions were written from the documentation: 20 dev questions used to tune thresholds, 40 test questions used only for the reported numbers. Each test question names the pages that contain its answer. Eight candidate pipelines retrieve passages for every question; an automated judge grades the answers against reference answers with a fixed rubric (correctness and faithfulness, each 0, 0.5 or 1). Candidates must pass gates on faithfulness, decline accuracy, latency and cost, and beat the baseline composite by at least 0.03. The full table is on the <Link href="/lab/candidates" className="text-accent underline">Candidates page</Link>. Reproduce it with one command: <span className="font-mono text-base">pnpm eval:offline</span>.</p>

        <h2 id={slug(TOC[2])} className={H2}>The live experiment</h2>
        <p className={P}>The retrieval pipeline is a Flagsmith multivariate flag, <span className="font-mono text-base">retrieval_strategy</span>. Half of visitors get the keyword baseline, half get the screened challenger; Flagsmith performs the split, never the application. On the first visit the server issues an anonymous random ID in one cookie; the same ID evaluates the flag, records the exposure when an answer is shown, and records the conversion if the visitor presses Helpful. One metric, <span className="font-mono text-base">answer_helpful</span>, locked before the start. The flag values are locked while the experiment runs.</p>
        <div className="mt-4 rounded-md border border-border bg-surface p-4 font-mono text-[13px] leading-6 text-ink-2">
          visitor -&gt; /api/ask -&gt; evaluate flag (identity) -&gt; retrieve -&gt; answer shown -&gt; exposure event<br />
          visitor presses Helpful -&gt; /api/feedback -&gt; conversion event (same identity)
        </div>

        <h2 id={slug(TOC[3])} className={H2}>How we read the result</h2>
        <p className={P}>Two numbers are shown side by side and never merged. The <strong className="text-ink">Flagsmith result</strong> is the win probability in the Flagsmith dashboard; it is the source of truth for the ship decision. The <strong className="text-ink">Verdict estimate</strong> is computed here from the same counts: a Beta posterior over each arm, the probability the challenger is better, and a 95 percent credible interval for the difference, which is the range that plausibly contains the true difference given the data. The decision rule was fixed before the start: ship the challenger only at a Flagsmith win probability of at least 95 percent with all four guardrails passing (latency, cost, no-answer rate, error rate). Otherwise keep control, or say inconclusive.</p>

        <h2 id={slug(TOC[4])} className={H2}>What could mislead you</h2>
        <ul className="mt-3 flex list-disc flex-col gap-2 pl-6 text-[18px] leading-7 text-ink-2">
          <li>Helpful presses are a noisy proxy for answer quality, and not everyone presses. Mitigation: the metric is defined per participant and the feedback row is prominent but quiet.</li>
          <li>Participants are mostly hackathon participants: a narrow, technical audience. Results may not generalise.</li>
          <li>Cookie-based identity can split one person into several participants (two browsers, cleared cookies). This is accepted and disclosed.</li>
          <li>The automated judge used in offline screening shares biases with language models in general. Mitigation: a different model judges than answers, the rubric is fixed text, and raw judge output is stored.</li>
          <li>Real traffic may be too small for a confident conclusion. If so, the Lab says so, and the result is reported as underpowered.</li>
          <li>Simulated traffic exists to exercise the pipeline. It is labelled everywhere and never merged into headline claims.</li>
        </ul>

        <h2 id={slug(TOC[5])} className={H2}>Shipping without a redeploy</h2>
        <p className={P}>The flag carries the full retrieval config as its value: strategy, number of passages, fusion and rerank switches. Promoting the winner means changing the flag in Flagsmith; the running process reads the new config on the next request. The <Link href="/lab/rollout" className="text-accent underline">Rollout page</Link> proves it: the served config changes while the build identifier and the process start time stay the same.</p>

        <h2 id={slug(TOC[6])} className={H2}>Reproduce it</h2>
        <p className={P}>Clone the repository, copy <span className="font-mono text-base">.env.example</span> to <span className="font-mono text-base">.env</span> and fill in the variables by name (a Flagsmith server-side key, a Postgres URL, a model provider key). Then:</p>
        <pre className="mt-3 overflow-x-auto rounded bg-surface-2 p-4 font-mono text-[13px] leading-6">pnpm install{"\n"}pnpm ingest{"\n"}pnpm build:index{"\n"}pnpm eval:offline{"\n"}pnpm dev</pre>

        <h2 id={slug(TOC[7])} className={H2}>Embed it</h2>
        <p className={P}>The assistant can be embedded on any page:</p>
        <pre className="mt-3 overflow-x-auto rounded bg-surface-2 p-4 font-mono text-[13px]">&lt;iframe src="https://your-verdict-url/embed" width="100%" height="560" title="Verdict assistant"&gt;&lt;/iframe&gt;</pre>
      </article>
    </div>
  );
}
