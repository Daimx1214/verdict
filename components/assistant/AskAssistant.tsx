"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import { CornerDownLeft, ThumbsUp, ThumbsDown, Copy, Check, ExternalLink, Info, Link as LinkIcon, X } from "lucide-react";
import { Alert, btnPrimary } from "@/components/ui/primitives";

export const EXAMPLES = [
  "How do I create a multivariate flag?",
  "What is an identity in Flagsmith?",
  "How do I roll out a feature to 10% of users?",
  "What is the difference between segments and traits?",
  "How do I self-host Flagsmith with Docker?",
  "How do I run an A/B experiment?",
];
interface Source { n: number; title: string; headingPath: string; url: string; text: string }
type Phase = "idle" | "loading" | "streaming" | "complete" | "noanswer" | "error";
const REASONS = ["Wrong answer", "Missing information", "Out of date", "Hard to understand"];

export default function AskAssistant({ surface = "web", initialQuestion = "" }: { surface?: "web" | "embed"; initialQuestion?: string }) {
  const [question, setQuestion] = useState(initialQuestion);
  const [phase, setPhase] = useState<Phase>("idle");
  const [status, setStatus] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [askedQuestion, setAskedQuestion] = useState("");
  const [questionId, setQuestionId] = useState<string | null>(null);
  const [alertMsg, setAlertMsg] = useState<{ kind: "info" | "warning" | "danger"; text: string } | null>(null);
  const [feedback, setFeedback] = useState<"helpful" | "not_helpful" | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [feedbackReady, setFeedbackReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [coldStart, setColdStart] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [embedOpen, setEmbedOpen] = useState(false);
  const renderStamp = useRef(Date.now());
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try { setRecent(JSON.parse(localStorage.getItem("vd_recent") || "[]")); } catch {}
    if (initialQuestion) void ask(initialQuestion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tooLong = question.length > 500;
  const piiHint = /[\w.]+@[\w.]+\.\w+|\d{7,}/.test(question);

  const ask = useCallback(async (q: string) => {
    const text = q.trim();
    if (text.length < 3 || text.length > 500) {
      setAlertMsg({ kind: "danger", text: "Please enter a question between 3 and 500 characters." });
      return;
    }
    setAlertMsg(null); setAnswer(""); setSources([]); setFeedback(null); setReason(null); setNote("");
    setQuestionId(null); setFeedbackReady(false); setCopied(false); setColdStart(false);
    setAskedQuestion(text); setPhase("loading"); setStatus("Searching the documentation...");
    const coldTimer = setTimeout(() => setColdStart(true), 3000);
    const ctrl = new AbortController(); abortRef.current = ctrl;
    try {
      const res = await fetch("/api/ask", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: ctrl.signal,
        body: JSON.stringify({ question: text, surface, hp: "" }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const kind = j.code === "rate_limited" || j.code === "budget_reached" ? "warning" : j.code === "assistant_disabled" ? "info" : "danger";
        setAlertMsg({ kind, text: j.message || "Something went wrong on our side. Your question was not counted." });
        setPhase("idle");
        return;
      }
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "", full = "", gotMeta = false;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n"); buf = parts.pop() || "";
        for (const part of parts) {
          const ev = part.match(/^event: (\w+)/)?.[1];
          const dataLine = part.split("\n").find((l) => l.startsWith("data: "));
          if (!ev || !dataLine) continue;
          const data = JSON.parse(dataLine.slice(6));
          if (ev === "meta") { gotMeta = true; setSources(data.sources); setStatus("Writing the answer..."); setPhase("streaming"); }
          if (ev === "delta") { full += data.text; setAnswer(full); }
          if (ev === "done") {
            setQuestionId(data.questionId);
            setPhase(data.declined ? "noanswer" : "complete");
            setTimeout(() => setFeedbackReady(true), 1000);
            try {
              const r = [text, ...JSON.parse(localStorage.getItem("vd_recent") || "[]")].filter((v, i, a) => a.indexOf(v) === i).slice(0, 10);
              localStorage.setItem("vd_recent", JSON.stringify(r)); setRecent(r);
            } catch {}
          }
          if (ev === "error") { setAlertMsg({ kind: "danger", text: data.message }); setPhase("error"); }
        }
      }
      if (!gotMeta && phase !== "error") { /* stream ended without meta */ }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setAlertMsg({ kind: "warning", text: "You appear to be offline." });
        setPhase("idle");
      }
    } finally { clearTimeout(coldTimer); setColdStart(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surface]);

  async function sendFeedback(value: "helpful" | "not_helpful", r?: string, n?: string) {
    if (!questionId) return;
    setFeedback(value);
    await fetch("/api/feedback", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, value, reason: r || undefined, note: n || undefined }),
    }).catch(() => {});
  }
  function copyAnswer() {
    const text = answer + "\n\nSources:\n" + sources.map((s) => `${s.title} - ${s.url}`).join("\n");
    navigator.clipboard.writeText(text).then(() => setCopied(true)).catch(() => {});
    setTimeout(() => setCopied(false), 2500);
  }
  const citedNums = new Set([...answer.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])));
  const cited = sources.filter((s) => citedNums.has(s.n));
  const consulted = sources.filter((s) => !citedNums.has(s.n));
  const showSources = cited.length ? cited : sources;

  return (
    <div className="w-full">
      <form onSubmit={(e) => { e.preventDefault(); void ask(question); }}>
        <label htmlFor="vd-q" className="text-[13px] font-medium text-ink">Your question</label>
        <div className="mt-1.5 rounded border border-border-strong bg-surface focus-within:outline focus-within:outline-2 focus-within:outline-accent focus-within:outline-offset-2">
          <textarea id="vd-q" rows={3} value={question} maxLength={600}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void ask(question); }}
            placeholder="Ask about flags, identities, segments, SDKs, self-hosting..."
            className="w-full resize-y bg-transparent px-3.5 py-3 text-base text-ink placeholder:text-ink-3 focus:outline-none"
            aria-describedby="vd-count vd-hint" />
          <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
          <div className="flex items-center justify-between px-3.5 pb-3">
            <span id="vd-count" className={`font-mono text-[13px] ${tooLong ? "text-danger" : "text-ink-3"}`}>{question.length} / 500</span>
            <span className="hidden text-[13px] text-ink-3 md:block">Ctrl + Enter</span>
            <button type="submit" disabled={!question.trim() || tooLong || phase === "loading" || phase === "streaming"} className={btnPrimary}>
              {phase === "loading" || phase === "streaming" ? "Asking..." : "Ask"} <CornerDownLeft size={16} strokeWidth={1.5} />
            </button>
          </div>
        </div>
        <p id="vd-hint" className="mt-1.5 text-[13px] text-ink-3">
          {piiHint ? <span className="text-warning">Please remove personal data. </span> : null}
          Answers are drawn only from the public documentation.
        </p>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-medium text-ink-3">Try:</span>
        {EXAMPLES.map((ex) => (
          <button key={ex} onClick={() => { setQuestion(ex); void ask(ex); }}
            className="rounded border border-border bg-surface px-3 py-1.5 text-[13px] text-ink-2 transition-colors duration-120 hover:border-accent hover:text-ink">
            {ex}
          </button>
        ))}
      </div>

      {alertMsg && <div className="mt-5"><Alert kind={alertMsg.kind}>{alertMsg.text}</Alert></div>}

      {(phase === "loading" || phase === "streaming" || phase === "complete" || phase === "noanswer" || phase === "error") && phase !== "error" && (
        <article className="fade-up relative mt-6 overflow-hidden rounded-md border border-border bg-surface" aria-live="polite">
          {(phase === "loading" || phase === "streaming") && (
            <div className="absolute inset-x-0 top-0 h-[2px] overflow-hidden bg-border" role="progressbar" aria-label="Working">
              <div className="progress-indeterminate h-full w-2/5 bg-accent" />
            </div>
          )}
          <div className={`border-l-[3px] px-5 py-5 ${phase === "streaming" || phase === "loading" ? "border-accent" : "border-border"}`}>
            <p className="text-sm text-ink-3">Question: {askedQuestion}</p>
            {(phase === "loading") && <p className="mt-3 text-ink-2">{status}{coldStart ? " The server is waking up. This can take up to a minute the first time." : ""}</p>}
            {phase === "noanswer" ? (
              <div className="mt-3">
                <p className="flex items-center gap-2 text-base text-ink"><Info size={17} strokeWidth={1.5} /> I could not find this in the Flagsmith documentation.</p>
                {sources.length > 0 && <>
                  <p className="mt-4 text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-3">Closest pages</p>
                  <SourceRows sources={sources.slice(0, 3)} />
                </>}
              </div>
            ) : (
              <div className="mt-3 text-[18px] leading-7 text-ink [&_a]:text-accent [&_a]:underline [&_code]:rounded [&_code]:bg-surface-2 [&_code]:px-1 [&_code]:font-mono [&_code]:text-[15px] [&_h3]:mt-4 [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:my-2 [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-surface-2 [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-[13px] [&_ul]:my-2">
                <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{answer || (phase === "streaming" ? status : "")}</ReactMarkdown>
              </div>
            )}
            {(phase === "complete" || phase === "noanswer") && (
              <>
                {phase === "complete" && showSources.length > 0 && (
                  <div className="mt-5">
                    <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-3">Sources</p>
                    <SourceRows sources={showSources} />
                    {consulted.length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-[13px] text-ink-2">Also consulted ({consulted.length})</summary>
                        <SourceRows sources={consulted} />
                      </details>
                    )}
                  </div>
                )}
                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                  <span className="text-sm text-ink-2">Was this helpful?</span>
                  <button disabled={!feedbackReady} onClick={() => void sendFeedback("helpful")}
                    className={`inline-flex min-h-[40px] items-center gap-1.5 rounded border px-3.5 text-sm font-medium transition-colors duration-120 disabled:opacity-50 ${feedback === "helpful" ? "border-accent bg-accent-subtle text-accent" : "border-border-strong bg-surface text-ink-2 hover:border-accent hover:text-accent"}`}>
                    {feedback === "helpful" ? <Check size={15} strokeWidth={2} /> : <ThumbsUp size={15} strokeWidth={1.5} />} {feedback === "helpful" ? "Marked helpful" : "Helpful"}
                  </button>
                  <button disabled={!feedbackReady} onClick={() => void sendFeedback("not_helpful")}
                    className={`inline-flex min-h-[40px] items-center gap-1.5 rounded border px-3.5 text-sm font-medium transition-colors duration-120 disabled:opacity-50 ${feedback === "not_helpful" ? "border-ink-3 bg-surface-2 text-ink" : "border-border-strong bg-surface text-ink-2 hover:border-accent hover:text-accent"}`}>
                    <ThumbsDown size={15} strokeWidth={1.5} /> Not helpful
                  </button>
                  <button onClick={copyAnswer} className="inline-flex min-h-[40px] items-center gap-1.5 rounded px-3 text-sm font-medium text-accent transition-colors duration-120 hover:bg-accent-subtle">
                    {copied ? <Check size={15} strokeWidth={2} /> : <Copy size={15} strokeWidth={1.5} />} {copied ? "Answer copied." : "Copy"}
                  </button>
                </div>
                {feedback === "helpful" && <p className="mt-2 text-sm text-ink-2">Marked helpful. Thank you.</p>}
                {feedback === "not_helpful" && (
                  <div className="mt-3">
                    <div className="flex flex-wrap gap-2">
                      {REASONS.map((r) => (
                        <button key={r} aria-pressed={reason === r} onClick={() => { setReason(r); void sendFeedback("not_helpful", r, note); }}
                          className={`rounded border px-3 py-1.5 text-[13px] transition-colors duration-120 ${reason === r ? "border-accent bg-accent-subtle text-accent" : "border-border bg-surface text-ink-2 hover:border-accent"}`}>{r}</button>
                      ))}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Optional note (200 characters)"
                        className="min-h-[40px] flex-1 rounded border border-border-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-3" aria-label="Optional note" />
                      <button onClick={() => void sendFeedback("not_helpful", reason || undefined, note)}
                        className="min-h-[40px] rounded border border-border-strong bg-surface px-4 text-sm font-medium text-ink hover:bg-surface-2">Send</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </article>
      )}

      {surface === "web" && recent.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-3">Recent questions (stored on this device)</h2>
            <button className="text-[13px] text-accent hover:underline" onClick={() => { localStorage.removeItem("vd_recent"); setRecent([]); }}>Clear</button>
          </div>
          <ul className="mt-2 divide-y divide-border rounded border border-border bg-surface">
            {recent.map((r) => (
              <li key={r}><button className="w-full px-3.5 py-2.5 text-left text-sm text-ink-2 hover:text-ink" onClick={() => setQuestion(r)}>{r}</button></li>
            ))}
          </ul>
        </div>
      )}

      {surface === "web" && (
        <p className="mt-8 text-sm text-ink-3">
          This assistant can be wrong. Open the sources.{" "}
          <button className="inline-flex items-center gap-1 text-accent hover:underline" onClick={() => setEmbedOpen(true)}><LinkIcon size={13} strokeWidth={1.5} /> Embed this assistant</button>
        </p>
      )}
      {embedOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" role="dialog" aria-modal="true" aria-label="Embed this assistant">
          <div className="w-full max-w-[560px] rounded-[10px] border border-border-strong bg-surface p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">Embed this assistant</h2>
              <button aria-label="Close" onClick={() => setEmbedOpen(false)} className="flex h-9 w-9 items-center justify-center rounded hover:bg-surface-2"><X size={18} strokeWidth={1.5} /></button>
            </div>
            <p className="mt-2 text-sm text-ink-2">Paste this snippet where the assistant should appear:</p>
            <pre className="mt-3 overflow-x-auto rounded bg-surface-2 p-3 font-mono text-[13px] text-ink">{`<iframe src="${typeof window !== "undefined" ? window.location.origin : ""}/embed" width="100%" height="560" style="border:1px solid #DAD4C6;border-radius:6px" title="Verdict assistant"></iframe>`}</pre>
            <button className={btnPrimary + " mt-4"} onClick={() => { navigator.clipboard.writeText(`<iframe src="${window.location.origin}/embed" width="100%" height="560" style="border:1px solid #DAD4C6;border-radius:6px" title="Verdict assistant"></iframe>`).catch(() => {}); setEmbedOpen(false); }}>Copy snippet</button>
          </div>
        </div>
      )}
      <span className="hidden">{renderStamp.current ? "" : ""}</span>
    </div>
  );
}

function SourceRows({ sources }: { sources: Source[] }) {
  return (
    <ul className="mt-2 flex flex-col gap-1.5">
      {sources.map((s) => (
        <li key={s.n}>
          <a href={s.url} target="_blank" rel="noopener noreferrer" title={s.text.slice(0, 240)}
            className="group flex items-baseline gap-2.5 rounded border border-border bg-surface-2 px-3 py-2 transition-colors duration-120 hover:border-accent"
            aria-label={`${s.title} (opens in new tab)`}>
            <span className="rounded-sm bg-accent-subtle px-1.5 font-mono text-xs text-accent">[{s.n}]</span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-ink">{s.title}</span>
              <span className="block truncate text-[13px] text-ink-3">{s.headingPath} · <span className="font-mono">{s.url.replace("https://", "")}</span></span>
            </span>
            <ExternalLink size={14} strokeWidth={1.5} className="ml-auto shrink-0 text-ink-3" />
          </a>
        </li>
      ))}
    </ul>
  );
}
