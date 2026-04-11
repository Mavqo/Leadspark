# Deploy Checklist Vercel

## Pre-deploy (fai ora)
- [ ] Vai su https://vercel.com/dashboard
- [ ] Clicca "Add New Project"
- [ ] Importa da GitHub o upload zip

## Environment Variables (da impostare su Vercel)
- [ ] OPENAI_API_KEY = sk-...
- [ ] N8N_WEBHOOK_URL = https://...
- [ ] N8N_WEBHOOK_SECRET = ...

## Build Settings (verifica)
- Framework: Other
- Build Command: npm run build
- Output Directory: dist

## Post-deploy
- [ ] Esegui `npm run verify:deploy` (con `TARGET_URL` produzione)
- [ ] Conferma `Result: PASS` nel file evidenza in `ops/evidence/deploy-checks/`
- [ ] Testa chatbot sulla URL
- [ ] Verifica API endpoints
- [ ] Controlla console errori
