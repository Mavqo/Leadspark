# Setup n8n - LeadSpark

Guida completa per configurare l'automazione n8n per LeadSpark.

---

## 📝 Prerequisiti

- Account n8n (cloud o self-hosted)
- n8n versione 1.0+

---

## 🚀 Installazione n8n Cloud

1. **Registrati**
   - Vai su [n8n.io/cloud](https://n8n.io/cloud)
   - Crea account (piano Starter $20/mese o prova gratuita)

2. **Workspace Setup**
   - Crea nuovo workspace
   - Nome: "LeadSpark Automation"

---

## 📥 Importa Workflow

1. **Download workflow JSON**
   ```
   /automation/leadspark-workflow.json
   ```

2. **Importa in n8n**
   - n8n → Workflows → Import from File
   - Seleziona `leadspark-workflow.json`

3. **Configura nodi**

### Webhook Node
```
Method: POST
Path: leadspark
Response Mode: Last Node
```

### WhatsApp Node (Twilio)
```
Account SID: [Twilio Account SID]
Auth Token: [Twilio Auth Token]
From: whatsapp:+[Twilio Number]
To: whatsapp:+[Destinatario]
Body: 🚨 NUOVO LEAD LeadSpark

Nome: {{$json.name}}
Servizio: {{$json.service}}
Urgenza: {{$json.urgency}}
Telefono: {{$json.phone}}
```

### Email Node (Fallback)
```
To: [tua-email@example.com]
Subject: 🚨 Nuovo Lead - {{$json.name}}
Body: Dettagli lead...
```

---

## 🔗 Configura Webhook

### URL Webhook
```
Produzione: https://[instance].n8n.cloud/webhook/leadspark
Test: https://[instance].n8n.cloud/webhook-test/leadspark
```

### Aggiorna Frontend
Copia l'URL di produzione e aggiorna `.env`:
```bash
N8N_WEBHOOK_URL=https://[instance].n8n.cloud/webhook/leadspark
```

---

## 🧪 Testa il Flusso

1. **Test Webhook**
   ```bash
   curl -X POST https://[instance].n8n.cloud/webhook-test/leadspark \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Mario Rossi",
       "phone": "+39123456789",
       "service": "Fisioterapia",
       "urgency": "alta",
       "availability": "Mattina",
       "symptoms": "Mal di schiena"
     }'
   ```

2. **Test da Chatbot**
   - Apri la landing page
   - Avvia chat
   - Completa il flusso
   - Verifica notifica su WhatsApp/Email

---

## 📋 Workflow Structure

```
[Webhook] → [Code: Format] → [If: WhatsApp Configured?]
                                          ↓
                              [Yes] → [Twilio WhatsApp]
                              [No]  → [Send Email]
                                          ↓
                                    [Log to Google Sheets] (opzionale)
```

---

## 🔒 Security

### Webhook Secret
Aggiungi header verification:
```javascript
// n8n Code node
const secret = $env.WEBHOOK_SECRET;
const received = $input.headers['x-webhook-secret'];

if (received !== secret) {
  return [{ json: { error: 'Unauthorized' } }];
}
```

### Rate Limiting
Configura in n8n Settings → Execution → Rate Limiting

---

## 🐛 Troubleshooting

### Webhook non riceve dati
- Verifica URL corretto
- Controlla CORS nel frontend
- Testa con curl

### WhatsApp non invia
- Verifica Twilio credentials
- Controlla numero destinatario (formato internazionale)
- Sandbox Mode per testing

### Email in spam
- Configura SPF/DKIM
- Usare servizio come SendGrid

---

## 💰 Costi

| Servizio | Costo |
|----------|-------|
| n8n Cloud Starter | $20/mese |
| Twilio WhatsApp | ~$0.005/msg |
| Email (SendGrid) | Free tier 100/giorno |
