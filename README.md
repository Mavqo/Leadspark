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

## 🧪 Test

```bash
npm test              # Run all tests
npm run test:coverage # Coverage report
```

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
