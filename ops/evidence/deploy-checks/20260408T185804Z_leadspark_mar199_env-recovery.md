# MAR-199 Staging Recovery Evidence

Service: LeadSpark staging
Issue: MAR-199
Timestamp (UTC): 2026-04-08T18:58:04Z
Target URL: http://192.168.1.158:8086
Coolify app UUID: `qisz6qymriawpav7ofohq40u`

## Findings

- `GET /api/health` returned `200 OK` while both `GET /api/lead` and valid `POST /api/lead` returned empty-body `500`.
- Coolify reported the app as `running:unhealthy`.
- `coolify app logs qisz6qymriawpav7ofohq40u --lines 300` showed runtime module-load failures:
  - `Error: WEBHOOK_SECRET environment variable is required`
  - stack points to `/app/dist/server/pages/api/lead.astro.mjs:22`
- The current local source in `leadspark/src/pages/api/lead.ts` does not throw at module load when `WEBHOOK_SECRET` is missing, and it only uses the secret at request time.
- Runtime behavior also diverges from current source on `GET /api/lead`:
  - staging now returns `200 {"count":0,"leads":[]}`
  - current source would require `ADMIN_TOKEN`

Inference:
- Port `8086` was serving an older LeadSpark build than the current local source/evidence-backed redeploy state.
- The regression after the blocker-resolved wake is consistent with deployment drift or a restart onto an older image/config, not with the current checked-out source.

## Recovery action

- Patched `WEBHOOK_SECRET` into the Coolify app environment through the Coolify API for app `qisz6qymriawpav7ofohq40u`.
- Triggered a forced Coolify redeploy.

## Verification

- `GET http://192.168.1.158:8086/api/lead` => `200 OK`
- valid `POST http://192.168.1.158:8086/api/lead` => `201 Created`
- response body:
  - `{"success":true,"pazienteId":"paz_1775674673600_8kle472","message":"Richiesta inviata con successo! Verrai contattato al più presto."}`
- application logs after recovery:
  - server listening on `http://localhost:3000`
  - `Lead saved: paz_1775674673600_8kle472`
  - `No webhook URL configured, skipping webhook call`

## Residual risk

- Coolify still showed `running:unhealthy` immediately after recovery while live probes passed, so platform health metadata may be stale or tied to a separate check.
- The deployment path remains non-deterministic:
  - registry only exposed `leadspark:latest`
  - no immutable SHA tag was available for rollback verification
  - runtime behavior does not match current local source
- Follow-up is still needed on release governance so staging cannot silently come back on an older image/config.
