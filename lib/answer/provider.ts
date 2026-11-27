// LlmProvider interface (Section 5.2): any OpenAI-compatible endpoint, configured
// only by environment variables. Default target: OpenRouter free models.
export interface ChatMessage { role: "system" | "user" | "assistant"; content: string }
export interface StreamChunk { text: string }
export interface Usage { tokensIn: number; tokensOut: number; costUsd: number }

const BASE = process.env.LLM_BASE_URL || "https://openrouter.ai/api/v1";
export const ANSWER_MODEL = process.env.LLM_MODEL || "meta-llama/llama-3.3-70b-instruct:free";
export const JUDGE_MODEL = process.env.JUDGE_MODEL || "qwen/qwen-2.5-72b-instruct:free";
// Nominal per-1M-token prices used only for the budget guardrail display; free-tier
// models are billed 0 by the provider, so recorded cost stays 0 unless priced here.
const PRICE_PER_M: Record<string, { in: number; out: number }> = {};
export function costFor(model: string, tokensIn: number, tokensOut: number): number {
  const p = PRICE_PER_M[model]; if (!p) return 0;
  return (tokensIn * p.in + tokensOut * p.out) / 1_000_000;
}
function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.LLM_API_KEY || ""}`,
    "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    "X-Title": "Verdict",
  };
}
export async function* streamChat(messages: ChatMessage[], opts: { model?: string; maxTokens?: number; timeoutMs?: number } = {}): AsyncGenerator<StreamChunk, Usage> {
  const model = opts.model || ANSWER_MODEL;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs || 25000);
  let usage: Usage = { tokensIn: 0, tokensOut: 0, costUsd: 0 };
  try {
    const res = await fetch(`${BASE}/chat/completions`, {
      method: "POST", headers: headers(), signal: ctrl.signal,
      body: JSON.stringify({ model, messages, temperature: 0, max_tokens: opts.maxTokens || 600, stream: true, stream_options: { include_usage: true } }),
    });
    if (!res.ok || !res.body) throw new Error(`llm http ${res.status}`);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n"); buf = lines.pop() || "";
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith("data:")) continue;
        const data = t.slice(5).trim();
        if (data === "[DONE]") continue;
        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) yield { text: delta };
          if (json.usage) usage = { tokensIn: json.usage.prompt_tokens || 0, tokensOut: json.usage.completion_tokens || 0, costUsd: 0 };
        } catch { /* partial line */ }
      }
    }
  } finally { clearTimeout(timer); }
  usage.costUsd = costFor(model, usage.tokensIn, usage.tokensOut);
  return usage;
}
export async function completeChat(messages: ChatMessage[], opts: { model?: string; maxTokens?: number; timeoutMs?: number } = {}): Promise<{ text: string; usage: Usage }> {
  const model = opts.model || JUDGE_MODEL;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs || 25000);
  try {
    const res = await fetch(`${BASE}/chat/completions`, {
      method: "POST", headers: headers(), signal: ctrl.signal,
      body: JSON.stringify({ model, messages, temperature: 0, max_tokens: opts.maxTokens || 400 }),
    });
    if (!res.ok) throw new Error(`llm http ${res.status}`);
    const json = await res.json();
    const text = json.choices?.[0]?.message?.content || "";
    const u = json.usage || {};
    const usage: Usage = { tokensIn: u.prompt_tokens || 0, tokensOut: u.completion_tokens || 0, costUsd: costFor(model, u.prompt_tokens || 0, u.completion_tokens || 0) };
    return { text, usage };
  } finally { clearTimeout(timer); }
}
