## Prometheus

To enable the Prometheus `/metrics` endpoint, set the `PROMETHEUS_ENABLED` environment variable to `true`.

When enabled, Flagsmith serves the `/metrics` endpoint on port 9100.

The metrics provided by Flagsmith are described below.

## StatsD

The Flagsmith WSGI worker emits per-request access log metrics (request counts, durations, HTTP statuses) to StatsD
when configured. See [StatsD](/deployment-self-hosting/observability/monitoring#statsd) for setup.
