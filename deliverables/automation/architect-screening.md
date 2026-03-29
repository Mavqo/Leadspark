# n8n Automation Architecture

## 1. Infrastructure Setup

### Option A: n8n Cloud (recommended for demo)
- **Pros**: Zero setup, automatic updates, hosted SSL
- **Cons**: Limited executions/month on free tier (200/month)
- **Cost**: Free tier sufficient for demo
- **Setup**: Register at n8n.io → Create account → Start building workflows

### Option B: Self-hosted (Docker)
- **Pros**: Full control, unlimited executions, data sovereignty
- **Cons**: Requires VPS, maintenance, SSL configuration
- **Use if**: Client wants on-premise solution or high volume

```yaml
# docker-compose.yml
version: '3'
services:
  n8n:
    image: n8nio/n8n:latest
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=secure_password
      - WEBHOOK_URL=https://your-domain.com/
    volumes:
      - ~/.n8n:/home/node/.n8n
```

---

## 2. Workflow Design

### Workflow 1: Paziente Capture Pipeline
```
Webhook Trigger (POST /webhook/capture)
    ↓
Validate Input (Function node)
    ↓
Assess Urgency (IF node)
    ├─ alta → Priority Queue
    └─ media/bassa → Standard Queue
    ↓
Save to Google Sheets (or Airtable)
    ↓
Trigger Notification Workflow (HTTP Request)
    ↓
Return 200 OK
```

**Node Details:**

| Node | Type | Purpose |
|------|------|---------|
| Webhook Trigger | Webhook | Receives patient data from chatbot |
| Validate Input | Function | Check required fields: name, phone, sintomi |
| Assess Urgency | IF | Route based on urgency field value |
| Google Sheets | Google Sheets | Append row to spreadsheet |
| Trigger Notify | HTTP Request | Call Workflow 2 webhook |
| Response | Respond to Webhook | Return 200 OK immediately |

**Input Schema:**
```json
{
  "nome": "string (required)",
  "telefono": "string (required)",
  "sintomi": "string (required)",
  "urgenza": "alta|media|bassa",
  "timestamp": "ISO8601"
}
```

---

### Workflow 2: Notification Trigger
```
Receive from Workflow 1 (Webhook)
    ↓
Format Message (Set node + template)
    ↓
Send WhatsApp (HTTP Request → Twilio)
    ├─ Success → Log to Sheet
    └─ Fail → Send Email Fallback
    ↓
Log Notification Status
```

**Message Template (WhatsApp):**
```
🚨 *Nuovo Lead - LeadSpark*

👤 *Nome:* {{$json.nome}}
📞 *Telefono:* {{$json.telefono}}
🏥 *Sintomi:* {{$json.sintomi}}
⚡ *Urgenza:* {{$json.urgenza}}

🕐 Ricevuto: {{$json.timestamp}}
```

**Email Fallback Template:**
```
Subject: [LeadSpark] Nuovo Lead {{urgenza === 'alta' ? 'URGENTE' : ''}}

Nuovo lead ricevuto:
- Nome: {{nome}}
- Telefono: {{telefono}}
- Sintomi: {{sintomi}}
- Urgenza: {{urgenza}}
- Orario: {{timestamp}}
```

---

## 3. Error Handling

### Retry Logic
- **3 attempts** with exponential backoff (1s, 3s, 10s)
- Implement using n8n's built-in "Retry On Fail" option
- Configure at node level for external services

### Dead Letter Queue
- Failed notifications logged to separate sheet: `Failed_Notifications`
- Columns: timestamp, patient_data, error_message, retry_count
- Manual review workflow triggered daily

### Alerting
- **Condition**: 3+ consecutive failures
- **Action**: Send email to admin
- **Template**: "Alert: Notification system experiencing issues"

```javascript
// Error Handler Function Node
const errors = $input.all()[0].json.errors || [];
if (errors.length >= 3) {
  return [{
    json: {
      alert: true,
      message: `System alert: ${errors.length} consecutive failures`,
      timestamp: new Date().toISOString()
    }
  }];
}
return [];
```

---

## 4. Data Storage

### Option A: Google Sheets (simple)
**Sheet: `LeadSpark_Leads`**

| Column | Type | Description |
|--------|------|-------------|
| A | Timestamp | ISO8601 received time |
| B | Nome | Patient name |
| C | Telefono | Phone number |
| D | Sintomi | Symptoms/description |
| E | Urgenza | alta/media/bassa |
| F | Status | nuovo/contattato/chiuso |
| G | Notified | TRUE/FALSE |

- **Pros**: Client familiar, free, easy sharing
- **Cons**: Limited querying, no relational features

### Option B: Airtable (recommended)
**Base: `LeadSpark CRM`**

**Table: Leads**
- Fields: Name, Phone, Sintomi, Urgenza (Single Select), Status, Created
- Views: All Leads, Urgent Only, Today, Follow-up Needed

**Table: Notifications**
- Fields: Lead (Linked), Channel, Status, Sent At, Error

- **Pros**: Structured database, API, automation, views
- **Cons**: Free tier limited to 1,200 records/base

---

## 5. Webhook Security

### Signature Verification
```javascript
// Function node: Verify Signature
const crypto = require('crypto');
const secret = $env.WEBHOOK_SECRET; // Set in n8n credentials

const signature = $headers['x-signature'];
const payload = JSON.stringify($input.first().json);

const expected = crypto
  .createHmac('sha256', secret)
  .update(payload)
  .digest('hex');

if (signature !== expected) {
  return [{ json: { error: 'Invalid signature' }, status: 401 }];
}
return $input.all();
```

### Security Checklist
- [ ] Enable signature verification with shared secret
- [ ] Set `WEBHOOK_SECRET` in n8n environment variables
- [ ] Configure IP allowlisting if static IP available
- [ ] Enable rate limiting (max 10 req/min per IP)
- [ ] Use HTTPS only (enforced by n8n Cloud)
- [ ] Rotate secrets monthly

### Rate Limiting
Configure at Webhook node:
- Max requests: 10 per minute
- Time window: 60 seconds
- Response: 429 Too Many Requests

---

## 6. Export & Import Instructions

### Export Workflow
1. Open workflow in n8n
2. Click "..." (three dots) → Download
3. Save as JSON file
4. Store in `/projects/leadspark/workflows/`

### Import Workflow
1. n8n Dashboard → Workflows → Import From File
2. Select JSON file
3. Update credentials (Google Sheets, Twilio, Email)
4. Activate workflow

### Files to Export
```
/workflows/
├── patient-capture-pipeline.json
├── notification-trigger.json
└── error-handler.json
```

---

## 7. Credentials Required

| Service | Credential Type | Used In |
|---------|-----------------|---------|
| Google Sheets | OAuth2 or API Key | Workflow 1 |
| Twilio | API Key + SID | Workflow 2 |
| SMTP | Email credentials | Workflow 2 (fallback) |
| Airtable | API Key | Workflow 1 (alt) |

---

## Summary

| Aspect | Recommendation |
|--------|----------------|
| Hosting | n8n Cloud (free tier) |
| Storage | Airtable (structured) or Google Sheets (simple) |
| Notifications | WhatsApp via Twilio + Email fallback |
| Security | Signature verification + rate limiting |
| Error Handling | 3 retries + dead letter queue |

---

*Document generated for LeadSpark - Automation Layer - Phase: SCREENING*
