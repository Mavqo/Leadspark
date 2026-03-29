# Guida Deploy - LeadSpark

Questa guida copre il deployment di LeadSpark su Vercel e Netlify.

---

## 🚀 Vercel (Consigliato)

### Prerequisiti
- Account Vercel (vercel.com)
- Repository su GitHub/GitLab/Bitbucket

### Steps

1. **Importa il progetto**
   ```bash
   # Vercel CLI
   npm i -g vercel
   vercel
   
   # Oppure via dashboard:
   # 1. Vai su vercel.com/new
   # 2. Seleziona il repository
   ```

2. **Build Settings**
   - Framework: Astro
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Node Version: 18.x

3. **Environment Variables**
   ```
   OPENAI_API_KEY=sk-...
   N8N_WEBHOOK_URL=https://...
   WEBHOOK_SECRET=your-secret-here
   ```

4. **Deploy**
   ```bash
   vercel --prod
   ```

---

## 🌐 Netlify

### Build Settings
- Build Command: `npm run build`
- Publish Directory: `dist`
- Node Version: 18

### Redirects (netlify.toml)
```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
```

---

## 🔗 Webhook Configuration

### n8n Webhook URL
Dopo il deploy, aggiorna l'URL webhook:

```bash
# Produzione
N8N_WEBHOOK_URL=https://your-n8n.com/webhook/leadspark

# Test
N8N_WEBHOOK_URL=https://your-n8n.com/webhook-test/leadspark
```

### CORS Configuration
Aggiungi il dominio di produzione ai siti consentiti in n8n.

---

## 🌐 Domain Setup

### Custom Domain su Vercel
1. Vai su Project Settings → Domains
2. Aggiungi il tuo dominio
3. Configura i DNS records indicati

### SSL Certificate
- Vercel e Netlify forniscono SSL automatico
- Certificati Let's Encrypt auto-renewal

---

## ✅ Pre-Deploy Checklist

- [ ] Tutti i test passano (`npm test`)
- [ ] Build locale funziona (`npm run build`)
- [ ] Env variables configurate
- [ ] n8n webhook raggiungibile
- [ ] CORS configurato
- [ ] Secrets cambiati da default

---

## 🐛 Troubleshooting

### Build fallisce
```bash
# Verifica build locale
npm run build

# Controlla errori TypeScript
npx tsc --noEmit
```

### Webhook non raggiungibile
- Verifica URL in env vars
- Controlla firewall n8n
- Testa con curl:
```bash
curl -X POST $N8N_WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### Rate Limiting
- OpenAI: max 3 RPM su free tier
- Configura retry logic in n8n
