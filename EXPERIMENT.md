# Experiment protocol (pre-registered)

Written before any traffic arrives. Copied from the build specification, Section 3.
If anything here changes, the change is a new experiment and is recorded in the
README under "Experiment history".

## Question
Does a better retrieval pipeline, chosen by offline screening, make more visitors
mark an answer as helpful than the simple keyword baseline?

- Null hypothesis: the share of exposed participants who mark at least one answer
  helpful is the same in both arms.
- Alternative: the challenger arm has a higher share than the control arm.
- Unit of analysis: participant (anonymous stable ID), counted once.

## Arms (multivariate flag `retrieval_strategy`)
- A - Control: {"id":"bm25_k3","strategy":"bm25","topK":3,"rerank":false}
  Keyword ranking (BM25), three passages.
- B - Challenger: the best candidate that passed all offline screening gates
  (Section 7 of the specification), written into the flag before the start.

Everything else is identical across arms: corpus snapshot, chunking, embedding
model, answer prompt, answer model, temperature 0, maximum output length, interface.

## Metric, exposure, conversion
- Primary metric `answer_helpful`: the participant pressed "Helpful" on an answer.
  Counted once per participant. Locked.
- Exposure: sent the first time the server evaluates the flag for a participant and
  applies the returned config to produce an answer that is actually shown.
- Conversion: sent on the participant's first "Helpful" press, same participant ID.
- Not counted: fallback answers, probe requests, rate-limited requests, requests
  that errored before any answer text, participants flagged as bots.
- "Not helpful" presses are stored as secondary evidence, never merged into the metric.

## Assignment and identity
- Server-issued random UUID v4 in an HttpOnly, Secure, SameSite=Lax cookie `vd_pid`
  (one year). The same UUID is the Flagsmith identity for evaluation and both events.
- Split 50/50 performed by Flagsmith. Application code never decides the arm.

## Sample size and stopping rule
- Baseline helpful share assumed 30 percent; smallest effect worth shipping
  +10 points; alpha 0.05 two-sided, power 0.80 -> 356 per arm, rounded to
  **400 exposed participants per arm (800 total)**.
- Stop when both arms reach 400 exposed, or at the submission cut-off.
- No early stopping for a good-looking result.
- If real traffic is below plan at the stop point, the result is reported as
  **underpowered** with the real numbers. Simulated traffic may demonstrate the
  pipeline but headline claims use real participants only.

## Decision rule (fixed)
- Ship challenger: Flagsmith win probability for the challenger >= 95 percent AND
  every guardrail passes.
- Keep control: control better with >= 95 percent, or a guardrail fails.
- Inconclusive: neither holds at the stop point. Keep control, say "inconclusive".

## Guardrails (application database, not Flagsmith)
- G1 Latency: challenger p95 total answer latency at most 1.5x control.
- G2 Cost: mean cost per answer at most 1.5x control.
- G3 No-answer rate: not more than 10 points above control.
- G4 Error rate: not more than 2 points above control.

## Data quality
- SRM chi-square against 50/50; p below 0.001 stops use of the result until explained.
- Honeypot, rate limits, 1 second minimum answer-view time before feedback counts.
- Every participant labelled real or simulated from creation; never changes.
- Corpus hash printed in the Lab and stored in the decision record.
