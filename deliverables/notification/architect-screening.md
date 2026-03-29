# LeadSpark - Notification Layer Architecture
## Centro Fisioterapia Movimento - Screening Phase

**Document Version:** 1.0.0  
**Date:** 2026-03-29  
**Status:** SCREENING PHASE  
**Stack:** WhatsApp Business API (Twilio) + Email (Resend) + n8n

---

## 1. Channel Strategy

### 1.1 Primary Channel: WhatsApp Business API

| Aspect | Configuration |
|--------|--------------|
| **Provider** | Twilio WhatsApp Business API |
| **Message Type** | Session Messages + Template Messages |
| **Delivery Target** | < 5 seconds |
| **Open Rate** | ~98% (vs 20% email) |
| **Response Rate** | ~45% (vs 3% email) |

**Why WhatsApp Primary:**
- Immediate delivery and read receipts
- Rich media support (images of affected areas)
- Voice message option for elderly patients
- End-to-end encryption by default
- Italian market penetration >85%

### 1.2 Fallback Channel: Email (Resend)

| Aspect | Configuration |
|--------|--------------|
| **Provider** | Resend |
| **From** | LeadSpark <notifiche@leadspark.it> |
| **Reply-To** | segreteria@centrofisioterapiamovimento.it |
| **Trigger** | WhatsApp failure OR user preference |

**Fallback Conditions:**
```
IF whatsapp_delivery_status = 'failed' OR 'undelivered'
  → Trigger email fallback within 60s
IF user_opt_out_whatsapp = true
  → Skip WhatsApp, go directly to email
IF whatsapp_not_registered = true
  → Auto-switch to email for this lead
```

---

## 2. Message Templates

### 2.1 WhatsApp Template - Nuovo Lead Medico

**Template Name:** `lead_nuovo_paziente`  
**Category:** UTILITY  
**Language:** Italian (it)  
**Status:** Pending WhatsApp Approval

```
🔔 *NUOVO LEAD - Centro Fisioterapia Movimento*

*Paziente:* {{1}}
*Telefono:* {{2}}

*Sintomi:*
{{3}}

*Urgenza:* {{4}}

*Disponibilità:*
{{5}}

---
Rispondi per prendere in carico →
```

**Variable Mapping:**

| Variable | Field | Example |
|----------|-------|---------|
| `{{1}}` | `lead.nome_completo` | "Marco Rossi" |
| `{{2}}` | `lead.telefono` | "+39 347 123 4567" |
| `{{3}}` | `lead.sintomi` | "Dolore alla schiena lombare, difficoltà a camminare" |
| `{{4}}` | `lead.livello_urgenza` | "🔴 URGENTE - Entro 24h" |
| `{{5}}` | `lead.disponibilita` | "Lun/Mer/Ven mattina, Mar pomeriggio" |

### 2.2 Urgenza Visual Encoding

```typescript
enum LivelloUrgenza {
  URGENTE = '🔴 URGENTE - Entro 24h',
  MODERATA = '🟡 MODERATA - Entro 3-5 giorni',
  PROGRAMMATA = '🟢 PROGRAMMATA - Entro 1-2 settimane'
}

function mapUrgenza(punteggio: number): LivelloUrgenza {
  if (punteggio >= 7) return LivelloUrgenza.URGENTE;
  if (punteggio >= 4) return LivelloUrgenza.MODERATA;
  return LivelloUrgenza.PROGRAMMATA;
}
```

### 2.3 Email HTML Template - Fallback

**Subject:** `[LeadSpark] Nuovo Lead - {{nome_paziente}} - {{livello_urgenza}}`

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nuovo Lead - Centro Fisioterapia Movimento</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">🔔 Nuovo Lead In Arrivo</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Centro Fisioterapia Movimento</p>
  </div>
  
  <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
    
    <!-- Urgenza Badge -->
    <div style="text-align: center; margin-bottom: 25px;">
      <span style="display: inline-block; padding: 10px 25px; border-radius: 25px; font-weight: bold; font-size: 16px;
        {{#if_eq urgenza '🔴 URGENTE'}}
          background: #fee2e2; color: #dc2626; border: 2px solid #dc2626;
        {{else if_eq urgenza '🟡 MODERATA'}}
          background: #fef3c7; color: #d97706; border: 2px solid #d97706;
        {{else}}
          background: #d1fae5; color: #059669; border: 2px solid #059669;
        {{/if_eq}}">
        {{livello_urgenza}}
      </span>
    </div>
    
    <!-- Info Paziente -->
    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <h2 style="margin: 0 0 15px 0; color: #1e293b; font-size: 18px;">📋 Dati Paziente</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #64748b; width: 120px;">Nome:</td>
          <td style="padding: 8px 0; font-weight: 600;">{{nome_completo}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Telefono:</td>
          <td style="padding: 8px 0;">
            <a href="tel:{{telefono}}" style="color: #667eea; text-decoration: none; font-weight: 600;">{{telefono}}</a>
          </td>
        </tr>
      </table>
    </div>
    
    <!-- Sintomi -->
    <div style="margin-bottom: 20px;">
      <h2 style="color: #1e293b; font-size: 16px; margin-bottom: 10px;">🏥 Sintomi Riferiti</h2>
      <p style="background: #fff7ed; padding: 15px; border-radius: 8px; border-left: 4px solid #f97316; margin: 0;">
        {{sintomi}}
      </p>
    </div>
    
    <!-- Disponibilità -->
    <div style="margin-bottom: 25px;">
      <h2 style="color: #1e293b; font-size: 16px; margin-bottom: 10px;">📅 Disponibilità</h2>
      <p style="background: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 0;">
        {{disponibilita}}
      </p>
    </div>
    
    <!-- CTA Buttons -->
    <div style="text-align: center;">
      <a href="https://dashboard.leadspark.it/leads/{{lead_id}}" 
         style="display: inline-block; background: #667eea; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-right: 10px;">
        📲 Chiama Ora
      </a>
      <a href="https://dashboard.leadspark.it/leads/{{lead_id}}/schedule" 
         style="display: inline-block; background: #fff; color: #667eea; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; border: 2px solid #667eea;">
        📅 Programma Visita
      </a>
    </div>
    
  </div>
  
  <div style="background: #f1f5f9; padding: 20px; border-radius: 0 0 12px 12px; text-align: center; font-size: 12px; color: #64748b;">
    <p style="margin: 0;">Notifica generata da LeadSpark - AI Lead Capture Suite</p>
    <p style="margin: 5px 0 0 0;">
      <a href="{{unsubscribe_url}}" style="color: #64748b;">Preferenze notifiche</a>
    </p>
  </div>
  
</body>
</html>
```

---

## 3. Integration Pattern

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              LEADSPARK PLATFORM                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              n8n WORKFLOW ENGINE                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │  Webhook    │───▶│  Process    │───▶│  Channel    │───▶│  Confirm    │  │
│  │  Receiver   │    │  Lead Data  │    │  Router     │    │  Delivery   │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    ▼                                   ▼
┌─────────────────────────────────┐    ┌─────────────────────────────────────┐
│    PRIMARY: TWILIO WHATSAPP     │    │    FALLBACK: RESEND EMAIL          │
│  ┌───────────────────────────┐  │    │  ┌───────────────────────────────┐  │
│  │  WhatsApp Business API    │  │    │  │  Transactional Email API      │  │
│  │  - Template Messages      │  │    │  │  - HTML Templates             │  │
│  │  - Session Messages       │  │    │  │  - Fallback Delivery          │  │
│  │  - Delivery Webhooks      │  │    │  │  - Open/Click Tracking        │  │
│  └───────────────────────────┘  │    │  └───────────────────────────────┘  │
└─────────────────────────────────┘    └─────────────────────────────────────┘
                    │                                   │
                    └─────────────────┬─────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CENTRO FISIOTERAPIA MOVIMENTO                        │
│                      (Dr. Rossi - Segreteria WhatsApp)                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 n8n Workflow Definition

```json
{
  "name": "LeadSpark - Notify New Lead",
  "nodes": [
    {
      "type": "n8n-nodes-base.webhook",
      "name": "Lead Received",
      "webhookId": "leadspark-new-lead",
      "path": "leadspark/new-lead",
      "responseMode": "responseNode"
    },
    {
      "type": "n8n-nodes-base.function",
      "name": "Prepare WhatsApp Payload",
      "functionCode": "const lead = $input.first().json;\nreturn [{\n  json: {\n    to: 'whatsapp:' + $env.WHATSAPP_DESTINATION_NUMBER,\n    templateSid: $env.WHATSAPP_TEMPLATE_SID,\n    parameters: [\n      lead.nome_completo,\n      lead.telefono,\n      lead.sintomi.substring(0, 160),\n      lead.urgenza_label,\n      lead.disponibilita\n    ]\n  }\n}];"
    },
    {
      "type": "n8n-nodes-base.httpRequest",
      "name": "Send WhatsApp (Twilio)",
      "method": "POST",
      "url": "https://api.twilio.com/2010-04-01/Accounts/{{$env.TWILIO_ACCOUNT_SID}}/Messages.json",
      "authentication": "genericCredentialType",
      "genericAuthType": "httpBasicAuth",
      "sendBody": true,
      "contentType": "multipart-form-data",
      "options": {
        "ignoreSslIssues": true
      }
    },
    {
      "type": "n8n-nodes-base.if",
      "name": "WhatsApp Success?",
      "conditions": {
        "options": {
          "caseSensitive": true,
          "leftValue": "",
          "typeValidation": "strict"
        },
        "conditions": [
          {
            "id": "check-status",
            "leftValue": "={{ $json.status }}",
            "rightValue": "queued",
            "operator": {
              "type": "string",
              "operation": "equals"
            }
          }
        ],
        "combinator": "and"
      }
    },
    {
      "type": "n8n-nodes-base.httpRequest",
      "name": "Send Email Fallback (Resend)",
      "method": "POST",
      "url": "https://api.resend.com/emails",
      "authentication": "genericCredentialType",
      "genericAuthType": "httpHeaderAuth",
      "sendBody": true,
      "contentType": "json"
    }
  ],
  "connections": {
    "Lead Received": {
      "main": [[{"node": "Prepare WhatsApp Payload"}]]
    },
    "Prepare WhatsApp Payload": {
      "main": [[{"node": "Send WhatsApp (Twilio)"}]]
    },
    "Send WhatsApp (Twilio)": {
      "main": [[{"node": "WhatsApp Success?"}]]
    },
    "WhatsApp Success?": {
      "main": [
        [{"node": "Confirm Delivery"}],
        [{"node": "Send Email Fallback (Resend)"}]
      ]
    }
  }
}
```

### 3.3 Delivery State Machine

```
                    ┌──────────────────┐
                    │   LEAD CREATED   │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
         ┌─────────│  ROUTE DECISION  │─────────┐
         │         └──────────────────┘         │
         │                                      │
    User prefers                            User prefers
    WhatsApp                                 Email
         │                                      │
         ▼                                      ▼
┌──────────────────┐                    ┌──────────────────┐
│  SEND WHATSAPP   │                    │   SEND EMAIL     │
└────────┬─────────┘                    └────────┬─────────┘
         │                                      │
         ▼                                      ▼
┌──────────────────┐                    ┌──────────────────┐
│  DELIVERED?      │                    │  DELIVERED?      │
└────────┬─────────┘                    └────────┬─────────┘
    Yes /   \ No                              Yes /   \ No
        /     \                                   /     \
       ▼       ▼                                 ▼       ▼
┌──────────┐ ┌──────────┐                ┌──────────┐ ┌──────────┐
│ SUCCESS  │ │  EMAIL   │                │ SUCCESS  │ │  ALERT   │
│  (done)  │ │ FALLBACK │                │  (done)  │ │  ADMIN   │
└──────────┘ └────┬─────┘                └──────────┘ └────┬─────┘
                  │                                        │
                  ▼                                        ▼
           ┌──────────┐                             ┌──────────┐
           │  EMAIL   │                             │  RETRY   │
           │ SENT?    │                             │ QUEUE    │
           └────┬─────┘                             └──────────┘
           Yes / \ No
              /   \
             ▼     ▼
      ┌────────┐ ┌────────┐
      │ DONE   │ │ ALERT  │
      └────────┘ │ ADMIN  │
                 └────────┘
```

---

## 4. Security & Privacy

### 4.1 GDPR Compliance Matrix

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| **Lawful Basis** | Legitimate interest (pre-contractual) + Consent for marketing | ✅ Configured |
| **Data Minimization** | Only collect necessary medical/availability data | ✅ Enforced |
| **Storage Limitation** | Auto-delete after 24 months inactive | ✅ Scheduled |
| **Purpose Limitation** | Data used only for appointment scheduling | ✅ Documented |
| **Right to Access** | Dashboard export in 30 days | ✅ Available |
| **Right to Erasure** | One-click deletion + confirmation | ✅ Implemented |
| **Data Portability** | JSON/CSV export | ✅ Available |

### 4.2 Data Encryption Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                      ENCRYPTION LAYERS                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐    TLS 1.3    ┌─────────────┐              │
│  │   Client    │◄─────────────►│   Server    │              │
│  └─────────────┘               └─────────────┘              │
│                                       │                      │
│                                       ▼                      │
│  ┌─────────────────────────────────────────────┐            │
│  │           DATABASE (Supabase/Postgres)       │            │
│  │  ┌─────────────────────────────────────┐    │            │
│  │  │  Field-Level Encryption (AES-256)   │    │            │
│  │  │  • telefono: encrypted              │    │            │
│  │  │  • sintomi: encrypted               │    │            │
│  │  │  • nome: plaintext (searchable)     │    │            │
│  │  └─────────────────────────────────────┘    │            │
│  └─────────────────────────────────────────────┘            │
│                                       │                      │
│  ┌─────────────┐    TLS 1.3    ┌──────┴──────┐              │
│  │   Twilio    │◄─────────────►│   n8n       │              │
│  │   WhatsApp  │               │   Engine    │              │
│  └─────────────┘               └─────────────┘              │
│                                                              │
│  WhatsApp E2E Encryption (Signal Protocol) ─────────────────┤
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Environment Variables (Security)

```bash
# .env.example - NEVER COMMIT ACTUAL VALUES

# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
WHATSAPP_DESTINATION_NUMBER=+393xxxxxxxx
WHATSAPP_TEMPLATE_SID=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Resend Configuration
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=notifiche@leadspark.it
RESEND_TO_EMAIL=segreteria@centrofisioterapiamovimento.it

# n8n Configuration
N8N_WEBHOOK_URL=https://n8n.leadspark.it/webhook
N8N_API_KEY=n8n_api_xxxxxxxxxxxxxxxx

# Encryption
ENCRYPTION_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 4.4 Access Control

```typescript
interface NotificationPermissions {
  // Role-based access
  roles: {
    admin: ['send', 'read', 'config', 'template_edit'];
    segretaria: ['send', 'read'];
    fisioterapista: ['read', 'reply'];
  };
  
  // Rate limiting
  rateLimits: {
    whatsapp_per_hour: 100;
    email_per_hour: 500;
    burst_allowance: 10;
  };
  
  // Audit logging
  audit: {
    log_all_sends: true;
    log_all_failures: true;
    retention_days: 365;
  };
}
```

---

## 5. Demo Setup - Twilio Sandbox

### 5.1 Prerequisites

- [ ] Twilio Account (free trial sufficient)
- [ ] WhatsApp installed on mobile
- [ ] n8n instance (cloud or self-hosted)
- [ ] Resend account (optional for email fallback)

### 5.2 Step-by-Step Setup

#### Step 1: Twilio Account Setup

```bash
# 1. Sign up at https://www.twilio.com/try-twilio
# 2. Complete email verification
# 3. Verify your phone number

# Get your credentials from Console Dashboard:
# Account SID: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# Auth Token: Click "Show" to reveal
```

#### Step 2: Enable WhatsApp Sandbox

```bash
# Navigate to: https://console.twilio.com/us1/develop/sandbox

# 1. Join the sandbox by sending WhatsApp message TO:
#    +1 415 523 8886

# 2. Message content (replace with your sandbox keyword):
#    join <your-unique-keyword>
#    Example: join silver-apple

# 3. You should receive confirmation:
#    "Twilio Sandbox: Congratulations! You are all set..."
```

#### Step 3: Configure n8n Credentials

```bash
# In n8n, go to Settings → Credentials

# Create new credential: Twilio API
{
  "accountSid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "authToken": "your_auth_token_here"
}

# Create new credential: Resend API (optional)
{
  "apiKey": "re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

#### Step 4: Test Webhook

```bash
# Test the complete flow with curl:

curl -X POST https://your-n8n-instance.webhook.leadspark/new-lead \
  -H "Content-Type: application/json" \
  -d '{
    "nome_completo": "Mario Rossi",
    "telefono": "+39 347 123 4567",
    "sintomi": "Dolore alla schiena lombare, difficoltà a muoversi al mattino",
    "urgenza_label": "🔴 URGENTE - Entro 24h",
    "disponibilita": "Lun/Mer/Ven mattina, preferibilmente prima delle 11"
  }'
```

#### Step 5: Verify Delivery

```bash
# Check Twilio Logs:
# https://console.twilio.com/us1/monitor/logs/debugger

# Expected successful response:
{
  "sid": "SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "status": "queued",
  "to": "whatsapp:+39xxxxxxxxxx",
  "from": "whatsapp:+14155238886",
  "body": "🔔 *NUOVO LEAD...",
  "date_created": "2026-03-29T10:00:00Z"
}
```

### 5.3 Sandbox Limitations

| Limitation | Value | Production Note |
|------------|-------|-----------------|
| Sandbox Duration | 72 hours | Apply for WhatsApp Business API |
| Daily Messages | 1,000 | Unlimited with business account |
| Template Required | Yes | Pre-approved templates only |
| Recipient | Only joined numbers | Requires opt-in for each number |

### 5.4 Production Checklist

- [ ] Apply for WhatsApp Business API
- [ ] Submit message templates for approval
- [ ] Verify business with Meta
- [ ] Set up dedicated phone number
- [ ] Configure production n8n instance
- [ ] Set up monitoring & alerting
- [ ] Document incident response plan

---

## Appendix A: Message Template JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "LeadSpark WhatsApp Template",
  "type": "object",
  "required": ["nome_completo", "telefono", "sintomi", "urgenza_label", "disponibilita"],
  "properties": {
    "nome_completo": {
      "type": "string",
      "maxLength": 100,
      "description": "Nome completo del paziente"
    },
    "telefono": {
      "type": "string",
      "pattern": "^\\+39\\s?\\d{3}\\s?\\d{3}\\s?\\d{4}$",
      "description": "Numero di telefono italiano"
    },
    "sintomi": {
      "type": "string",
      "maxLength": 160,
      "description": "Descrizione sintomi (truncated)"
    },
    "urgenza_label": {
      "type": "string",
      "enum": [
        "🔴 URGENTE - Entro 24h",
        "🟡 MODERATA - Entro 3-5 giorni",
        "🟢 PROGRAMMATA - Entro 1-2 settimane"
      ]
    },
    "disponibilita": {
      "type": "string",
      "maxLength": 100,
      "description": "Fasce orarie disponibili"
    }
  }
}
```

---

**Document maintained by:** LeadSpark Team  
**Next Review:** 2026-04-15  
**Related Documents:**
- `/projects/leadspark/architecture/overview.md`
- `/projects/leadspark/security/gdpr-compliance.md`
