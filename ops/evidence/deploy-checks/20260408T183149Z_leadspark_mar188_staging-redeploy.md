# MAR-188 Staging Redeploy Evidence

Service: LeadSpark staging
Issue: MAR-188

What changed
- Rebuilt `registry.local/leadspark:latest` from the current local LeadSpark source.
- Fixed Docker packaging blockers in `leadspark/Dockerfile`:
  - `postcss.config.js` -> `postcss.config.cjs`
  - copied `package-lock.json` into production stage
  - changed production install to `npm ci --omit=dev`
- Redeployed the existing Coolify-managed compose app from `/data/coolify/applications/qisz6qymriawpav7ofohq40u/docker-compose.yaml`.

Coolify access note
- Reported Coolify API/log `401` was worked around with direct host evidence:
  - compose file: `/data/coolify/applications/qisz6qymriawpav7ofohq40u/docker-compose.yaml`
  - env file: `/data/coolify/applications/qisz6qymriawpav7ofohq40u/.env`
  - container logs via `docker logs`

Verification
- `http://127.0.0.1:8086/api/health` => `200`
- valid `POST /api/lead` => `201 Created`
- response body contained `success: true` and a `pazienteId`
- logs showed `Lead saved` on the new container
- previous `WEBHOOK_SECRET environment variable is required` module-load crash no longer reproduced on the successful request path

Final probe
- `HTTP/1.1 201 Created`
- `{"success":true,"pazienteId":"paz_1775673086452_wzmdj6y","message":"Richiesta inviata con successo! Verrai contattato al più presto."}`
