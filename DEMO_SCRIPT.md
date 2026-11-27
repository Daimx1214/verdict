# Demo video script (2-3 minutes)

Record at 1080p or higher, 125 percent browser zoom, light theme (dark theme
shown briefly in Scene 2). Mouse slow and deliberate. No background music over
narration. Captions burned in. Never show the Flagsmith server key or any
environment variables. Keep the Lab on screen during every claim.

| # | Scene | On screen | Narration (final wording) |
|---|-------|-----------|---------------------------|
| 1 | Problem | Home page headline | "Teams change how their documentation search works and judge it by feel. This is Verdict: it proves a change helps before it ships." |
| 2 | The product | /ask: type a question, answer streams, sources, citation hover | "Ask a Flagsmith question. You get a cited answer from the documentation. Every answer is one click from the source." |
| 3 | Flagsmith core | Flagsmith dashboard: multivariate flag `retrieval_strategy`, two values, 50/50, experiment with the single metric | "The retrieval pipeline is a multivariate flag. Half of visitors get the keyword baseline, half get the challenger. One metric: did the visitor mark the answer helpful." |
| 4 | Screening | /lab/candidates funnel | "Before any visitor sees it, eight pipelines were scored offline on forty held-out questions. One cleared every gate." |
| 5 | The experiment | /lab/experiment: locked protocol, arm cards, interval, SRM, guardrails | "The protocol is locked at the start. Here are the real visitors, the uncertainty, and the checks that the split was fair." |
| 6 | Disclosure | Traffic mix bar and /data#traffic | "Some traffic in this run is simulated. It is always shown separately and the headline uses real visitors only." |
| 7 | Result and ship | Flagsmith results, decision rule, promote winner in the Flagsmith dashboard | "The rule was fixed in advance. The data says {decision}. I promote the winner from the same flag." |
| 8 | No redeploy proof | /lab/rollout live proof panel: served config changes, build and process start unchanged; run a probe | "The served config changed. The build and process did not. No redeploy." |
| 9 | Close | Home page, repository link | "Verdict: screen, test, ship. Everything is open source and reproducible." |

Rehearse the no-redeploy moment (Scene 8) until it takes no more than a few
seconds on screen. Scene 7's `{decision}` is filled in from the actual
experiment result - never scripted in advance.
