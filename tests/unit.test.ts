import { describe, it, expect } from "vitest";
import { BM25Index } from "../lib/retrieval/bm25";
import { wilsonInterval, posteriorDiff, srmTest, sampleSizePerArm } from "../lib/stats/beta";
import { parseConfig, CONTROL_CONFIG } from "../lib/flagsmith/config-schema";

describe("bm25", () => {
  const docs = [
    { id: "a", text: "feature flags let you toggle features for users" },
    { id: "b", text: "identities are users with traits in flagsmith" },
    { id: "c", text: "banana bread recipe with walnuts and sugar" },
  ];
  it("ranks the flags page first for a flags query", () => {
    const idx = new BM25Index(docs);
    const res = idx.search("feature flags toggle") as { id: string }[];
    expect(res[0].id).toBe("a");
  });
  it("returns empty for an empty query", () => {
    const idx = new BM25Index(docs);
    expect((idx.search("") as unknown[]).length).toBe(0);
  });
});
describe("rrf via strategies math", () => {
  it("rrf score for rank 0 with k=60 is 1/61", () => {
    expect(1 / (60 + 0 + 1)).toBeCloseTo(0.01639, 4);
  });
});
describe("stats", () => {
  it("wilson interval contains the point estimate", () => {
    const ci = wilsonInterval(30, 100);
    expect(ci.low).toBeLessThan(0.3); expect(ci.high).toBeGreaterThan(0.3);
  });
  it("posterior favours the better arm", () => {
    const p = posteriorDiff(30, 100, 50, 100, 20000, 42);
    expect(p.pChallengerBetter).toBeGreaterThan(0.95);
  });
  it("srm flags a bad split", () => {
    expect(srmTest(90, 10).p).toBeLessThan(0.001);
    expect(srmTest(52, 48).p).toBeGreaterThan(0.5);
  });
  it("power calculation reproduces 356 per arm for 0.30 -> 0.40", () => {
    expect(sampleSizePerArm(0.3, 0.4)).toBe(356);
  });
});
describe("config schema", () => {
  it("accepts the control config", () => {
    expect(parseConfig(JSON.stringify(CONTROL_CONFIG))?.id).toBe("bm25_k3");
  });
  it("rejects an unknown strategy", () => {
    expect(parseConfig(JSON.stringify({ id: "x", strategy: "magic", topK: 3, rerank: false }))).toBeNull();
  });
  it("rejects malformed JSON", () => { expect(parseConfig("{oops")).toBeNull(); });
});
