// Build-time stub for @xenova/transformers, aliased in only when
// EMBED_BACKEND=gemini (serverless deploy): the local models are never loaded
// in that configuration, and excluding the package keeps the function bundle
// small. Any accidental use throws, which embed.ts treats as "unavailable".
const unavailable = () => { throw new Error("local transformers unavailable in this deployment"); };
export const pipeline = unavailable;
export const AutoTokenizer = { from_pretrained: unavailable };
export const AutoModelForSequenceClassification = { from_pretrained: unavailable };
export const env: Record<string, unknown> = {};
