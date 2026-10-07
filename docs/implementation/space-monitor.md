# Hugging Face workspace monitoring

## Behavior

The Next.js homepage and both image-to-3D pages embed a stable public URL, `/api/space-workspaces/{model}`. Supported IDs are `pixal3d`, `trellis` and `hunyuan3d`. The route reads the last verified destination from PostgreSQL and returns a non-cacheable 307 redirect. It accepts no destination parameter. Missing state or a database error falls back to the original configured Space. It never checks HF or starts generation on a visitor request.

The existing Cloudflare trigger runs daily at 08:00 UTC (16:00 Shanghai). It dispatches one authenticated request per model. A PostgreSQL due time permits HF checks only every 72 hours; the trigger's fixed scheduled time prevents delivery jitter from adding a day. The first scheduled run initializes state. Missed deliveries are checked on the next daily run. No computer or Codex session needs to remain open.

An atomic upsert claims a ten-minute lease. Only its current, unexpired owner can publish a result. Hard failures are checked twice, two seconds apart. Sleep/start/build states, rate limits, access uncertainty and unknown responses preserve the active target. A confirmed failure starts bounded discovery:

1. Check reviewed fallbacks for the same model and release.
2. If none qualify, search public HF Spaces and consider only matches to reviewed entry/backend and requirements source hashes and the complete repository tree (excluding only root README metadata), with matching declared models and live UI controls. Paginated or incomplete tree evidence is rejected.
3. Verify public metadata, exact assigned app origin, embedding headers, application document and input/export controls. Persist the verified revision and source profile.
4. If no candidate qualifies, keep the current target and record `unresolved`.

Reviewed source changes require the same checked source hashes; a model title or duplication ancestry alone is insufficient. Source review lives in `config/space-workspaces.ts`. A maintainer must review legitimate implementation changes before updating the pinned profile. Hosts that cannot be bound safely to the Space ID are rejected.

The service does not upload an image, invoke generation, reserve a trial, consume credits, accept a license or work around quota. A frontend health check cannot prove GPU availability or successful model generation. Forks can have different login, quota, storage and interface behavior. The reviewed TRELLIS backup also has a text-generation tab; its image-to-3D tab remains required. A compatible fallback is not guaranteed to exist.

## Runtime and API

- `libs/space-monitor/provider.ts`: bounded anonymous HF GETs and source/UI checks.
- `libs/space-monitor/engine.ts`: confirmation, failover and rollback policy.
- `libs/space-monitor/store.ts`: durable state, due time, lease and last 20 audit entries.
- `scripts/cloudflare-scheduled.mjs`: tested scheduled dispatch, copied into the OpenNext Worker during build.
- `SPACE_MONITOR_SECRET`: required for monitor control routes. This is independent of `CRON_SECRET` so enabling monitoring does not enable an unconfigured yearly-credit task.
- Existing `APP_BASE_URL` and `DATABASE_URL` bindings are reused.

Authenticated routes accept `x-cron-secret: <SPACE_MONITOR_SECRET>` or a Bearer token. Never put a secret in the URL. For each model:

| Request | Result |
| --- | --- |
| `GET /api/cron/space-monitor/{model}` | Current target, previous target, check times and audit; lease token omitted |
| `POST /api/cron/space-monitor/{model}` | Check only if due; concurrent or early calls return `skipped` |
| `POST /api/cron/space-monitor/{model}?action=rollback` | Recheck the recorded previous destination and swap back only if healthy; honors the lease |

Rollback does not accept a target URL. A rejected rollback leaves the active destination and its next check time intact. New loads and explicit iframe retries resolve the updated target. Already mounted iframe sessions are never replaced automatically. Scientific references and downloaded-sample provenance continue to cite their original sources.

The scheduler logs meaningful outcomes without secrets or remote response bodies. `unresolved` is a recorded condition, not a successful switch. There is no email/Slack notification integration. Inspect the authenticated status route or Worker logs.

## Deployment

1. Verify the intended `pixal3d-tinyship` Worker and its production PostgreSQL target.
2. Back up the database according to `libs/database/AGENTS.md`. Apply only `libs/database/drizzle/0003_space_monitor.sql` in a transaction after confirming the table does not exist. Do not run a broad schema push or all historical migrations: the checkout lacks historical migration0000 SQL.
3. Store a strong random `SPACE_MONITOR_SECRET` as a Worker secret. Keep its operator copy in a secure local secret store; do not commit it. Leave `CRON_SECRET` unchanged.
4. Build with `corepack pnpm build:next:cf`, deploy the tested Worker with existing variables preserved, and confirm the daily Cron Trigger.
5. Check each public resolver and unauthenticated control-route rejection. Perform an authenticated check for each model, inspect its saved status, and confirm a repeated check is skipped. Do not claim inference was tested.

To pause only this monitor, remove its dedicated secret from the Worker; do not remove the shared daily Cron Trigger. To undo one destination change, use the authenticated rollback endpoint. Keep the audit table when rolling back application code; it contains no visitor data.

## Verification

Unit tests cover metadata/app failure classes, source identity, request limits, redirects/SSRF boundaries, confirmation, lease ownership, rollback, auth, scheduler isolation and API contracts. An opt-in PostgreSQL test uses `BEGIN`, an isolated `pg_temp` search path and the exact table DDL, then always rolls back. It validates actual SQL behavior without persistent objects or business-data access; it does not simulate multiple database sessions racing.

Related browser E2E uses inert provider fixtures for repeatability, with actual Next resolver HTTP checks separately. It checks SSR loading, models staying in the page, session retention and updated destinations on explicit retry/new load. Live anonymous provider checks are separate from fixture tests.

### Validation recorded 2026-10-07

| Check | Result |
| --- | --- |
| Focused monitor, scheduler and homepage unit suites | 126 passed; one opt-in PostgreSQL case skipped in this default run |
| Opt-in temporary PostgreSQL suite | 10 passed including the actual SQL case; transaction rolled back |
| Related Next.js browser E2E | 29 passed, including the existing 24 scenarios |
| Next.js `typecheck` and `build` | Passed; 43 prerendered pages; existing middleware deprecation notice remains |
| Live anonymous metadata/document/config checks | All six reviewed current/fallback frontends healthy; no inference performed |
| Cloudflare package and Wrangler `deploy --dry-run` | Passed in isolated WSL Linux, Node 22.23.3 / pnpm 9.4.0 / Wrangler 4.93.0; 95 assets, 2580.42 KiB compressed Worker |
| Native Windows Cloudflare package | Failed during static-asset bundling with native exit 3221226505; the same source packages successfully on Linux |

Production state at handoff: no migration, monitor secret or application deployment has been applied. The production Worker was inspected read-only; it has the application/database bindings but no cron secret. Production activation remains a separate final step because the deployment also includes the earlier page changes in this working tree. A successful local build or dry-run does not enable scheduled monitoring.
