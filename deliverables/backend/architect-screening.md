# Backend API Architecture

## 1. API Endpoints Design

### POST /api/chat
- **Purpose**: Gestisce conversazione chatbot per qualificazione paziente
- **Request**:
  ```typescript
  {
    message: string;           // Messaggio utente
    sessionId: string;         // ID sessione conversazione
    context?: {
      step: 'greeting' | 'symptoms' | 'duration' | 'urgency' | 'availability' | 'contact';
      data: Partial<PazienteData>;
    };
  }
  ```
- **Response**:
  ```typescript
  {
    reply: string;             // Risposta chatbot
    actions?: Array<{
      type: 'collect_symptom' | 'ask_duration' | 'ask_urgency' | 'ask_availability' | 'ask_contact' | 'complete';
      payload?: Record<string, any>;
    }>;
    pazienteData?: Partial<PazienteData>;
    sessionId: string;
  }
  ```
- **OpenAI Integration**: Streaming per UX ottimale (< 2s TTFB)

### POST /api/lead
- **Purpose**: Riceve paziente qualificato e lo persiste
- **Request**:
  ```typescript
  {
    name: string;
    phone: string;
    email?: string;
    sintomi: string[];
    durata: string;            // es: "3 giorni", "2 settimane"
    urgenza: 'bassa' | 'media' | 'alta';
    disponibilita: string[];   // es: ["lunedi_mattina", "mercoledi_pomeriggio"]
    note?: string;
    sessionId: string;
  }
  ```
- **Response**:
  ```typescript
  {
    success: boolean;
    pazienteId: string;
    message: string;
    nextSteps?: string[];
  }
  ```
- **Validation**: Zod schema strict

### POST /api/webhook/n8n
- **Purpose**: Callback da n8n per automazioni esterne
- **Security**: 
  - Webhook signature verification (HMAC-SHA256)
  - Header: `X-N8N-Signature`
  - Timestamp validation (±5 min)
- **Payload**:
  ```typescript
  {
    event: 'lead.created' | 'lead.updated' | 'followup.scheduled';
    data: Record<string, any>;
    timestamp: string;
  }
  ```

---

## 2. OpenAI Integration Pattern

### Configurazione Modello
| Parametro | Valore | Rationale |
|-----------|--------|-----------|
| Model | `gpt-4o-mini` | Cost-effective, sufficiente per chatbot qualificazione |
| Temperature | `0.7` | Bilanciato tra creatività e consistenza |
| Max Tokens | `500` | Risposte concise, < 2s response time |
| Stream | `true` | UX migliore, feedback immediato |

### System Prompt Strategy

```typescript
const SYSTEM_PROMPT = `Sei Emma, assistente virtuale del Centro Fisioterapia Movimento.

OBIETTIVO: Qualificare pazienti con empatia e professionalità medica.

CONTESTO MEDICO:
- Specialità: fisioterapia, riabilitazione, terapia del dolore
- Patologie comuni: mal di schiena, cervicalgia, sciatalgia, dolore articolare
- Servizi: valutazione, terapia manuale, esercizio terapeutico, tecarterapia

FLUSSO QUALIFICAZIONE (segui in ordine):
1. SALUTO: Benvenuto caloroso, presentati come Emma
2. SINTOMI: Chiedi cosa li ha portati a contattarci (ascolta attivamente)
3. DURATA: Da quanto tempo hanno il problema
4. URGENZA: Valuta se necessita attenzione prioritaria
5. DISPONIBILITÀ: Quando possono venire per una valutazione
6. CONTATTO: Nome e telefono per conferma appuntamento

LINEE GUIDA COMUNICAZIONE:
- Usa italiano naturale e caldo
- Mostra empatia per il dolore descritto
- Non fare diagnosi mediche
- Offri sempre una valutazione in studio
- Se urgenza alta: suggerisci contatto immediato

RISPOSTE:
- Max 2-3 frasi per messaggio
- Chiedi UNA informazione alla volta
- Riconferma i dati raccolti`;
```

---

## 3. Data Flow

```
┌─────────────┐     POST /api/chat      ┌─────────────┐
│   Utente    │ ───────────────────────>│  Astro API  │
│   (Chat)    │                         │   Routes    │
└─────────────┘                         └──────┬──────┘
       ^                                       │
       │         Stream Response               │ OpenAI SDK
       └───────────────────────────────────────┤
                                               ▼
                                        ┌─────────────┐
                                        │  GPT-4o-mini│
                                        │  + Context  │
                                        └──────┬──────┘
                                               │
                                               │ Qualification
                                               │ Complete
                                               ▼
┌─────────────┐     POST /api/lead      ┌─────────────┐
│   n8n CRM   │ <───────────────────────│  Persist    │
│  (Webhook)  │                         │  Lead Data  │
└─────────────┘                         └─────────────┘
```

### Flow Dettagliato

1. **User Message** → `/api/chat`
   - Validazione input (Zod)
   - Recupero/creazione sessione
   - Costruzione contesto conversazione

2. **Context Building**
   - Stato conversazione nel session store
   - Dati parziali raccolti
   - History ultimi 10 messaggi

3. **OpenAI Call**
   - System prompt + context + user message
   - Streaming response al client
   - Parsing intent e slot filling

4. **Qualification Complete** → `/api/lead`
   - Trigger quando tutti i campi obbligatori sono raccolti
   - Validazione Zod completa
   - Salvataggio lead + webhook n8n

---

## 4. Error Handling Strategy

| Status | Scenario | Response | Fallback |
|--------|----------|----------|----------|
| `400` | Validation errors (Zod) | `{ error: "Dati non validi", details: [...] }` | Mostra errore campo-specifico |
| `401` | Unauthorized webhook | `{ error: "Firma non valida" }` | Log e reject |
| `429` | Rate limiting (IP/Session) | `{ error: "Troppe richieste", retryAfter: 30 }` | Queue locale |
| `500` | OpenAI API error | `{ error: "Servizio temporaneamente indisponibile" }` | Risposta statica fallback |
| `503` | Service unavailable | `{ error: "Manutenzione in corso" }` | Pagina offline |

### Error Response Format
```typescript
{
  error: {
    code: string;           // Machine-readable
    message: string;        // Human-readable (IT)
    details?: unknown;      // Debug info (dev only)
  };
  requestId: string;        // Per tracing
  timestamp: string;
}
```

### OpenAI Fallback
```typescript
const FALLBACK_RESPONSES = {
  greeting: "Ciao! Sono Emma dal Centro Fisioterapia Movimento. Come posso aiutarti oggi?",
  symptoms: "Capisco, mi dispiace che tu abbia questo problema. Da quanto tempo lo avverti?",
  generic: "Grazie per l'informazione. Potresti dirmi di più per aiutarti al meglio?"
};
```

---

## 5. Security Considerations

### Rate Limiting

| Scope | Limit | Window |
|-------|-------|--------|
| Per IP | 30 req | 1 minuto |
| Per Session | 10 req | 1 minuto |
| Per Endpoint (chat) | 20 req | 1 minuto |
| Per Endpoint (lead) | 5 req | 5 minuti |

**Implementazione**: In-memory LRU per MVP, upgrade a Redis per produzione.

### Environment Variables
```bash
# .env
OPENAI_API_KEY=sk-...
N8N_WEBHOOK_SECRET=whsec_...
SESSION_SECRET=...
RATE_LIMIT_ENABLED=true
CORS_ALLOWED_ORIGINS=https://leadspark.example.com
```

### CORS Configuration
```typescript
export const corsConfig = {
  origin: process.env.CORS_ALLOWED_ORIGINS?.split(',') || [],
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400
};
```

### Input Sanitization
- Zod validation strict su tutti gli endpoint
- XSS protection: escape HTML in responses
- NoSQL injection prevention: tipizzazione rigida
- PII handling: minimizzazione dati sensibili nei log

### Webhook Security
```typescript
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

---

## 6. Performance Targets

| Metric | Target | Max |
|--------|--------|-----|
| Time to First Byte (TTFB) | < 500ms | 1s |
| Full Response (streaming) | < 2s | 3s |
| Lead persistence | < 500ms | 1s |
| Webhook delivery | < 1s | 2s |

---

## 7. File Structure

```
src/
├── pages/
│   └── api/
│       ├── chat.ts           # POST /api/chat
│       ├── lead.ts           # POST /api/lead
│       └── webhook/
│           └── n8n.ts        # POST /api/webhook/n8n
├── lib/
│   ├── openai.ts             # OpenAI client + streaming
│   ├── validation.ts         # Zod schemas
│   ├── session.ts            # Session store
│   ├── rate-limit.ts         # Rate limiting logic
│   └── security.ts           # Webhook verification, CORS
└── prompts/
    └── system.ts             # System prompt templates
```
