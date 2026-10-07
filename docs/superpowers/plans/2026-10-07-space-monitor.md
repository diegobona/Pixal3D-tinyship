# Hugging Face workspace availability and failover

The user selected a website background service that checks every three days and switches to a working Space for the same model. It must continue while the user's computer and Codex are closed.

## Acceptance and design

- [x] Record acceptance scenarios in the E2E catalog before implementation.
- [x] Reuse the existing Cloudflare scheduled handler. Use a dedicated monitor secret because production has no CRON_SECRET; enabling this monitor must not activate the unrelated yearly-credit job. A persistent 72-hour due time prevents daily HF requests and calendar-boundary surprises.
- [x] Keep durable per-model state, an expiring execution lease, the last confirmed target and a bounded switch history in the existing Postgres database.
- [x] Check public HF metadata and lightweight application endpoints without uploading inputs or requesting inference. Distinguish hard downtime from sleeping/building, rate limits, login and GPU quota.
- [x] Retry a hard failure before searching. Discover bounded candidates for the exact model/version; reject ambiguous identities, private/gated or non-embeddable apps and arbitrary destinations. Preserve the current choice when evidence is insufficient.
- [x] Serve iframe loads through a stable public resolver route. Resolve the latest confirmed target without rebuilding pages or interrupting already open iframe sessions. Fall back to the configured original Space on storage failures.
- [x] Support authenticated status inspection and rollback using recorded targets; do not expose administrative mutations publicly.
- [x] Verify provider policy, scheduler intervals/leases, failover/recovery, SSR iframe loading, model switching and auth boundaries. Run Next typecheck, build and related E2E; validate Cloudflare packaging. Final results: 126 focused unit tests, 10 PostgreSQL-suite checks, 29 E2E passed; Next typecheck/build and Linux Cloudflare package/dry-run passed.
- [ ] Record live deployment state separately from local implementation and simulation results. Verify the intended Worker, scheduler and storage before enabling the live service.

The three targets are Pixal3D (current TRELLIS.2-based release), TRELLIS.2 and Hunyuan3D 2.1. A healthy page does not prove GPU generation will succeed. No paid or anonymous generation is used as a monitor probe, and a candidate list cannot guarantee an alternative exists for every outage.
