import { pgTable, uuid, text, timestamp, jsonb, boolean, integer, bigint, numeric, bigserial } from "drizzle-orm/pg-core";
// Specification Section 8.1
export const participants = pgTable("participants", {
  id: text("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  trafficType: text("traffic_type").notNull(), // real | simulated | probe
  surface: text("surface"),
  variant: text("variant"),
  variantSource: text("variant_source"), // flagsmith | fallback
  firstExposedAt: timestamp("first_exposed_at", { withTimezone: true }),
  convertedAt: timestamp("converted_at", { withTimezone: true }),
  erasedAt: timestamp("erased_at", { withTimezone: true }),
  botSuspected: boolean("bot_suspected").notNull().default(false),
});
export const questions = pgTable("questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  participantId: text("participant_id").notNull(),
  askedAt: timestamp("asked_at", { withTimezone: true }).notNull().defaultNow(),
  text: text("text").notNull(),
  variant: text("variant"),
  config: jsonb("config"),
  variantSource: text("variant_source"),
  retrieved: jsonb("retrieved"),
  answer: text("answer"),
  declined: boolean("declined").notNull().default(false),
  status: text("status").notNull().default("ok"), // ok | error | rate_limited
  tokensIn: integer("tokens_in"),
  tokensOut: integer("tokens_out"),
  retrievalMs: integer("retrieval_ms"),
  totalMs: integer("total_ms"),
  costUsd: numeric("cost_usd", { precision: 10, scale: 6 }),
});
export const feedback = pgTable("feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  questionId: uuid("question_id").notNull().unique(),
  participantId: text("participant_id").notNull(),
  value: text("value").notNull(), // helpful | not_helpful
  reason: text("reason"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const eventsOutbox = pgTable("events_outbox", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  type: text("type").notNull(), // exposure | conversion
  participantId: text("participant_id").notNull(),
  payload: jsonb("payload"),
  attempts: integer("attempts").notNull().default(0),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  lastError: text("last_error"),
});
export const candidates = pgTable("candidates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  config: jsonb("config").notNull(),
  isBaseline: boolean("is_baseline").notNull().default(false),
});
export const offlineRuns = pgTable("offline_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  candidateId: text("candidate_id").notNull(),
  runAt: timestamp("run_at", { withTimezone: true }).notNull().defaultNow(),
  corpusHash: text("corpus_hash").notNull(),
  seed: integer("seed").notNull(),
  hitRate: numeric("hit_rate", { precision: 6, scale: 4 }),
  mrr: numeric("mrr", { precision: 6, scale: 4 }),
  correctness: numeric("correctness", { precision: 6, scale: 4 }),
  faithfulness: numeric("faithfulness", { precision: 6, scale: 4 }),
  declineAccuracy: numeric("decline_accuracy", { precision: 6, scale: 4 }),
  retrP50Ms: integer("retr_p50_ms"),
  retrP95Ms: integer("retr_p95_ms"),
  costPerAnswer: numeric("cost_per_answer", { precision: 10, scale: 6 }),
  composite: numeric("composite", { precision: 6, scale: 4 }),
  gates: jsonb("gates"),
  status: text("status").notNull(), // baseline | finalist | rejected
  reason: text("reason"),
  perQuestion: jsonb("per_question"),
});
export const decisions = pgTable("decisions", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  phase: text("phase").notNull(), // locked | result | shipped | note
  hypothesis: text("hypothesis"),
  metric: text("metric"),
  control: jsonb("control"),
  challenger: jsonb("challenger"),
  corpusHash: text("corpus_hash"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  stoppedAt: timestamp("stopped_at", { withTimezone: true }),
  result: jsonb("result"),
  flagsmithWinProb: numeric("flagsmith_win_prob", { precision: 6, scale: 4 }),
  guardrails: jsonb("guardrails"),
  decision: text("decision"),
  rationale: text("rationale"),
});
export const dailySpend = pgTable("daily_spend", {
  day: text("day").primaryKey(), // YYYY-MM-DD UTC
  costUsd: numeric("cost_usd", { precision: 10, scale: 6 }).notNull().default("0"),
  answers: integer("answers").notNull().default(0),
});
