# Simulated traffic disclosure

Verdict's live experiment runs on real visitors. In addition, a disclosed
simulated-traffic run exercises the full pipeline (exposure, answer, feedback,
outbox delivery) so the mechanics can be verified end to end before and during
the real run.

## How it works

- Script: `scripts/simulate.ts` in this repository.
- Simulated participants carry IDs prefixed `sim-` and are recorded with the
  trait `traffic_type = simulated` in Flagsmith and in the database.
- Each simulated visit asks one question drawn from a fixed public list.
- Feedback is **not** scripted to favour either arm. A model judge grades each
  answer against the fixed rubric (Appendix B of the build specification).
  The probability of a "Helpful" press is 0.75 when the judge grades the answer
  correct and 0.10 when it does not; about 35 percent of simulated visits press
  nothing, mirroring real visitor behaviour.
- Simulated rows are excluded from every headline claim. The Lab separates real
  and simulated traffic, and any result quoted in the README or the demo video
  uses real participants only, unless it is explicitly labelled simulated.

## Run record

<!-- Filled in after the run: date, number of simulated participants per arm,
     Flagsmith environment, and any anomalies. -->
