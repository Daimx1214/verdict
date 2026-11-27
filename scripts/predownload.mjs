// Pre-downloads the local models into the transformers cache so the first
// request in production does not pay the download cost (Docker build step).
import { pipeline, env, AutoTokenizer, AutoModelForSequenceClassification } from "@xenova/transformers";
env.cacheDir = process.env.TRANSFORMERS_CACHE || ".transformers-cache";
await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", { quantized: true });
await AutoTokenizer.from_pretrained("Xenova/ms-marco-MiniLM-L-6-v2");
await AutoModelForSequenceClassification.from_pretrained("Xenova/ms-marco-MiniLM-L-6-v2", { quantized: true });
console.log("models cached in", env.cacheDir);
