# Simulated traffic — method and run record

Simulated traffic exists so the experiment pipeline can be exercised end to
end inside the hackathon window. It is labelled everywhere it appears:
participant IDs are prefixed `sim-`, the database stores
`traffic_type = simulated`, and the Flagsmith traits carry
`traffic_type: simulated`. It is never merged into headline claims; the Lab's
default view is real traffic only.

## Method (fixed in code before any run)

- Script: `scripts/simulate.ts`, run against the production deployment.
- Each session is one simulated participant asking two questions drawn from a
  fixed 16-question pool (including one question the documentation cannot
  answer, to exercise the decline path).
- The participant's variant is assigned by Flagsmith through the normal
  request path — the simulator cannot choose or see its arm in advance.
- After each answer, the same fixed-rubric model judge used in offline
  screening grades the answer. The participant presses "Helpful" with
  probability 0.75 if the judge scored the answer fully correct, 0.10
  otherwise; about 35% of participants never press anything. The rule is in
  the script and was not changed between runs.

## Runs (27 November 2026, all times PKT)

| Run | Configured | Answers shown | Feedback pressed | Notes |
|---|---|---|---|---|
| Smoke test, seed 7 | 1 | 1 | 1 (1 helpful) | First end-to-end check after the experiment started |
| Burst seed 7 | 200 | 96 | 64 (27 helpful) | One of four parallel runs |
| Burst seed 101 | 200 | 40 | 33 (18 helpful) | Parallel |
| Burst seed 202 | 200 | 63 | 42 (23 helpful) | Parallel |
| Burst seed 303 | 200 | 36 | 27 (11 helpful) | Parallel |
| Quota check, seed 999 | 2 | 2 | 1 (0 helpful) | Verified the answer path after the burst |
| Top-up, seed 404 | 600 | 167 | 112 (49 helpful) | Single sequential run |

A first sequential run (800 configured, seed 7) was stopped after a few
sessions and replaced by the parallel burst; its handful of participants are
inside the database totals below but it produced no run summary.

## What went wrong, plainly

The four parallel runs together asked questions faster than the free-tier
model provider allows. About 56% of all questions across the day ended in an
error status — the provider's rate limit, not the retrieval under test — in
both arms at similar rates (control 55.1%, challenger 56.7% of questions).
The later sequential top-up ran cleanly per-request but the provider's limits
still cut many sessions short. Error answers send no exposure or conversion
events, so failed sessions simply do not appear in the experiment's counts.

## Reconciliation with the database (ground truth)

- Simulated participants created: 644; exposed (variant assigned and at
  least one answer shown): 303 — control 159, challenger 144.
- Questions stored: 937 — 413 answered, 524 errored.
- Feedback presses: 285 — 132 helpful, 153 not helpful. Converted
  participants (first Helpful press): 123 — control 60, challenger 63.
- Events delivered to Flagsmith: 303 exposures, 123 conversions, zero
  pending in the outbox.
- Real participants in the same window: 0. Every live number in the Lab's
  simulated view comes from the runs above.
