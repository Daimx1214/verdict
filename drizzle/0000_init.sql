CREATE TABLE IF NOT EXISTS participants (
  id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  traffic_type text NOT NULL,
  surface text,
  variant text,
  variant_source text,
  first_exposed_at timestamptz,
  converted_at timestamptz,
  erased_at timestamptz,
  bot_suspected boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id text NOT NULL,
  asked_at timestamptz NOT NULL DEFAULT now(),
  text text NOT NULL,
  variant text,
  config jsonb,
  variant_source text,
  retrieved jsonb,
  answer text,
  declined boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'ok',
  tokens_in integer,
  tokens_out integer,
  retrieval_ms integer,
  total_ms integer,
  cost_usd numeric(10,6)
);
CREATE INDEX IF NOT EXISTS questions_participant_idx ON questions(participant_id);
CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL UNIQUE,
  participant_id text NOT NULL,
  value text NOT NULL,
  reason text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS events_outbox (
  id bigserial PRIMARY KEY,
  type text NOT NULL,
  participant_id text NOT NULL,
  payload jsonb,
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  last_error text
);
CREATE TABLE IF NOT EXISTS candidates (
  id text PRIMARY KEY, name text NOT NULL, config jsonb NOT NULL, is_baseline boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS offline_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id text NOT NULL,
  run_at timestamptz NOT NULL DEFAULT now(),
  corpus_hash text NOT NULL,
  seed integer NOT NULL,
  hit_rate numeric(6,4), mrr numeric(6,4), correctness numeric(6,4), faithfulness numeric(6,4),
  decline_accuracy numeric(6,4), retr_p50_ms integer, retr_p95_ms integer,
  cost_per_answer numeric(10,6), composite numeric(6,4),
  gates jsonb, status text NOT NULL, reason text, per_question jsonb
);
CREATE TABLE IF NOT EXISTS decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  phase text NOT NULL,
  hypothesis text, metric text, control jsonb, challenger jsonb, corpus_hash text,
  started_at timestamptz, stopped_at timestamptz, result jsonb,
  flagsmith_win_prob numeric(6,4), guardrails jsonb, decision text, rationale text
);
CREATE TABLE IF NOT EXISTS daily_spend (
  day text PRIMARY KEY, cost_usd numeric(10,6) NOT NULL DEFAULT 0, answers integer NOT NULL DEFAULT 0
);
