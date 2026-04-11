# LeadSpark - AI Lead Capture Suite

> Landing page professionale + Chatbot AI qualificatore + Automation n8n per Professionisti Salute & Benessere

## 🎯 Concept

LeadSpark dimostra come l'AI e le automazioni riducano la perdita di lead per studi medici, fisioterapisti, dentisti e centri estetici.

**Flusso:**
1. Paziente visita landing page del centro
2. Chatbot AI qualifica il paziente (sintomi, urgenza, disponibilità)
3. Dati inviati via API a n8n
4. Notifica istantanea al professionista (WhatsApp/Email)

## 🚀 Demo Live

**Centro Fisioterapia Movimento** (fittizio)
- URL: [da deployare]
- Chatbot: Widget in basso a destra
- Test: Scrivi "Ho mal di schiena" e segui il flusso

## 🛠️ Stack

- **Frontend:** Astro 4.15 + React 18 + TypeScript + Tailwind + shadcn/ui
- **Backend:** Astro API Routes + OpenAI GPT-4o-mini + Zod
- **Automation:** n8n (workflow) + Webhooks
- **Notifications:** WhatsApp Business API (Twilio) + Email fallback

## 📦 Installazione

```bash
# Clone
git clone [repo-url]
cd leadspark

# Install
npm install

# Configura env
cp .env.example .env
# Edita .env con le tue chiavi

# Dev
npm run dev

# Build
npm run build
```

### Backend persistence setup

- `LEADSPARK_DATA_DIR` controls where API state is stored (`./data` by default).
- Runtime file: `${LEADSPARK_DATA_DIR}/storage.json`
- This file now persists:
  - lead submissions from `POST /api/lead`
  - intake submissions + workflow events from `POST /api/intake`
  - chat session context from `POST /api/chat`

### Rate limiting persistence and tuning

- Runtime file: `${LEADSPARK_DATA_DIR}/rate-limits.json` (or `RATE_LIMIT_STORAGE_FILE` override).
- Rate-limit counters survive process restart and redeploy in single-instance deployments.
- If the file cannot be written/read, limiter falls back to in-memory counters and logs a warning.
- `RATE_LIMIT_MAX_ENTRIES` bounds stored counters to avoid unbounded growth (default `5000`).

Per-endpoint tuning knobs:

- `RATE_LIMIT_CHAT_IP_WINDOW_MS`, `RATE_LIMIT_CHAT_IP_MAX_REQUESTS`
- `RATE_LIMIT_CHAT_SESSION_WINDOW_MS`, `RATE_LIMIT_CHAT_SESSION_MAX_REQUESTS`
- `RATE_LIMIT_LEAD_IP_WINDOW_MS`, `RATE_LIMIT_LEAD_IP_MAX_REQUESTS`
- `RATE_LIMIT_WEBHOOK_IP_WINDOW_MS`, `RATE_LIMIT_WEBHOOK_IP_MAX_REQUESTS`
- `RATE_LIMIT_ADMIN_LEAD_WINDOW_MS`, `RATE_LIMIT_ADMIN_LEAD_MAX_REQUESTS`

### Intake API contract (AI Intake & Follow-up)

- `POST /api/intake`
  - validates structured intake payload
  - persists submission + event trail
  - queues n8n dispatch (`N8N_INTAKE_WEBHOOK_URL`, fallback `N8N_WEBHOOK_URL`)
- `GET /api/intake/:id` (admin token required)
  - returns current workflow status and ordered event history

`POST /api/intake` payload:

```json
{
  "name": "Marco Rossi",
  "email": "marco@example.com",
  "phone": "+393331112223",
  "company": "Studio Rossi",
  "website": "https://studiorossi.it",
  "message": "Need intake automation and follow-up workflow.",
  "serviceType": "automation",
  "urgency": "medium",
  "consent": true,
  "source": "portfolio_form"
}
```

### Migration and rollback notes

- Migration: no DB migration required; first API write bootstraps `storage.json`.
- Rollback to previous in-memory behavior: unset `LEADSPARK_DATA_DIR` support in code and redeploy.
- Data retention impact: rolling back to in-memory disables restart persistence and stored leads/sessions will no longer be read.

## 🧪 Test

```bash
npm test              # Run all tests
npm run test:coverage # Coverage report
```

## 🔎 Post-Deploy Verification

```bash
npm run verify:deploy
```

The command checks homepage + `/api/health`, writes a timestamped artifact to `ops/evidence/deploy-checks/`, and exits non-zero on failure.

For explicit release identity and non-default target:

```bash
TARGET_URL=https://your-leadspark-domain EXPECTED_SHA_TAG=<git-sha> npm run verify:deploy
```

Detailed operator contract and rollback checkpoint:
- `ops/runbooks/post-deploy-verification.md`

## CI Registry Deploy

LeadSpark now follows the standard CI registry path for Docker-based deploys:

- Workflow: `.github/workflows/build-push-registry.yml`
- Registry image: `192.168.1.158:5000/leadspark`
- Tags pushed on `main`: `latest` and `<git-sha>`
- Coolify trigger: API webhook first, signed manual webhook fallback
- Runbook: `ops/runbooks/ci-registry-coolify-runbook.md`

## 📁 Structure

```
/src/
  /components/     # UI components
  /pages/          # Astro pages + API routes
  /lib/            # Utils, OpenAI, prompts
  /types/          # TypeScript types
/automation/       # n8n workflows
/tests/            # E2E tests
```

## ⚠️ Security Notes

- [ ] Cambiare default secrets in produzione
- [ ] Configurare CORS
- [ ] Mascherare PII nei log
- [ ] Usare HTTPS per webhook

## 📄 License

MIT - Creato per portfolio demo.
# Cache invalidation
