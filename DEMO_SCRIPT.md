# Demo video script (2-3 minutes)

Record at 1080p or higher, 125 percent browser zoom, light theme (dark theme
shown briefly in Scene 2). Mouse slow and deliberate. No background music over
narration. Captions burned in. Never show the Flagsmith server key or any
environment variables. Keep the Lab on screen during every claim.

| # | Scene | On screen | Narration (final wording) |
|---|-------|-----------|---------------------------|
| 1 | Problem | Home page headline | "Teams change how their documentation search works and judge it by feel. This is Verdict: it proves a change helps before it ships." |
| 2 | The product | /ask: type a question, answer streams, sources, citation hover | "Ask a Flagsmith question. You get a cited answer from the documentation. Every answer is one click from the source." |
| 3 | Flagsmith core | Flagsmith dashboard: multivariate flag `retrieval_strategy`, two values, 50/50, experiment with the single metric | "The retrieval pipeline is a multivariate flag. During the run, half of visitors got the keyword baseline and half got the challenger. One metric: did the visitor mark the answer helpful." |
| 4 | Screening | /lab/candidates funnel | "Before any visitor saw it, eight pipelines were scored offline on forty held-out questions. One cleared every gate." |
| 5 | The experiment | /lab/experiment: locked protocol, arm cards, interval, SRM, guardrails | "The protocol was locked at the start. Here are the counts, the uncertainty, and the checks that the split was fair." |
| 6 | Disclosure | Traffic mix bar and /data#traffic | "In this hackathon window the traffic was simulated, and it is labelled as such everywhere. Real and simulated counts are never merged." |
| 7 | Result and ship | Flagsmith results, decision rule, completed experiment with control rolled out | "The rule was fixed in advance: ninety-five percent to ship, and every guardrail green. The challenger reached eighty-three percent and failed the latency guardrail. So the control stays. I completed the experiment and rolled out the control from the same flag." |
| 8 | No redeploy proof | /lab/rollout: decision record (locked, result, shipped) and the configuration now served; run a probe | "The decision is on record, and the site now serves the control to everyone. The build never changed. No redeploy." |
| 9 | Close | Home page, repository link | "Verdict: screen, test, ship. Everything is open source and reproducible." |

Scene 7's decision was filled in from the actual experiment result on
27 November 2026 (keep the control), exactly as this script required.
