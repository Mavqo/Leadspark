# Backend Security Review - LeadSpark

## Summary
- **Status**: NEEDS_FIX
- **Risk Level**: HIGH
- **Issues Found**: 2 critical, 5 warnings

---

## Critical Issues

### 1. **HARDCODED_DEFAULT_SECRET** - Default webhook secret in codice sorgente
**File**: `src/pages/api/lead.ts:30`, `src/pages/api/webhook/n8n.ts:18`

**Descrizione**: 
```typescript
const WEBHOOK_SECRET = import.meta.env.WEBHOOK_SECRET || process.env.WEBHOOK_SECRET || 'default-secret';
```

Il codice usa un fallback `'default-secret'` hardcoded. Se la variabile d'ambiente non è configurata, l'applicazione usa una chiave predefinita conosciuta, rendendo l'HMAC verification inutile.

**Fix**:
```typescript
const WEBHOOK_SECRET = import.meta.env.WEBHOOK_SECRET || process.env.WEBHOOK_SECRET;

if (!WEBHOOK_SECRET) {
  throw new Error('WEBHOOK_SECRET environment variable is required');
}
```

**Priority**: CRITICAL - Fix immediato richiesto

---

### 2. **PII_IN_LOGS** - Dati personali sensibili esposti nei log
**File**: `src/pages/api/lead.ts:86`, `src/pages/api/webhook/n8n.ts:171-176`

**Descrizione**:
```typescript
// lead.ts:86
console.log(`[Lead API] Duplicate lead detected for phone: ${data.phone}`);

// n8n.ts:171-176
console.log('[Webhook n8n] Paziente qualified:', {
  pazienteId,
  name: paziente?.name,  // NOME PAZIENTE IN CHIARO
  urgenza: paziente?.urgenza,
  timestamp: event.data.timestamp
});
```

I log contengono:
- Numeri di telefono completi
- Nomi dei pazienti
- Sintomi riportati
- Livello di urgenza medica

Questo viola il GDPR (art. 5 - principio di riservatezza) e può esporre dati sensibili di salute (categoria speciale GDPR art. 9).

**Fix**:
```typescript
// Mascheramento dati sensibili
const maskPhone = (phone: string) => phone.slice(0, 3) + '****' + phone.slice(-2);
const maskName = (name: string) => name.charAt(0) + '***';

console.log(`[Lead API] Duplicate lead detected for phone: ${maskPhone(data.phone)}`);

console.log('[Webhook n8n] Paziente qualified:', {
  pazienteId,
  name: paziente?.name ? maskName(paziente.name) : undefined,
  // Non loggare mai sintomi o dettagli medici
  timestamp: event.data.timestamp
});
```

**Priority**: CRITICAL - Fix immediato richiesto

---

## Warnings

### 3. **NO_CORS_CONFIGURATION** - CORS non configurato
**File**: Tutti gli endpoint API

**Descrizione**: Nessun header CORS (Access-Control-Allow-Origin) presente nelle risposte. Se il frontend è su dominio diverso, le richieste saranno bloccate. Se CORS è troppo permissivo, può consentire CSRF.

**Fix**: Aggiungere middleware CORS configurato:
```typescript
// src/lib/cors.ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*', // Limitare in produzione
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
```

**Priority**: MEDIUM

---

### 4. **NO_INPUT_SANITIZATION_XSS** - Input non sanificato contro XSS
**File**: `src/pages/api/chat.ts:94`, `src/lib/openai.ts:155`

**Descrizione**: Il contenuto dei messaggi chat viene salvato in memoria e potenzialmente restituito ad altri utenti senza sanitizzazione HTML. Se un utente invia `<script>alert('xss')</script>`, questo potrebbe essere eseguito nel browser.

**Fix**: Aggiungere sanitizzazione DOMPurify o simile:
```typescript
import DOMPurify from 'isomorphic-dompurify';

const sanitizedMessage = DOMPurify.sanitize(message, { ALLOWED_TAGS: [] });
```

**Priority**: MEDIUM

---

### 5. **INSECURE_SESSION_ID** - Session ID prevedibile
**File**: `src/lib/openai.ts:213`

**Descrizione**:
```typescript
return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
```

`Math.random()` non è crittograficamente sicuro. Un attaccante potrebbe predire i session ID.

**Fix**: Usare crypto.randomUUID() o crypto.getRandomValues():
```typescript
import { randomUUID } from 'crypto';

export function generateSessionId(): string {
  return `sess_${randomUUID()}`;
}
```

**Priority**: MEDIUM

---

### 6. **NO_REQUEST_SIZE_LIMIT** - Nessun limite alla dimensione del body
**File**: Tutti gli endpoint POST

**Descrizione**: Nessun controllo sulla dimensione del body JSON. Un attaccante potrebbe inviare payload enormi causando DoS per memory exhaustion.

**Fix**: Aggiungere check dimensione:
```typescript
const contentLength = request.headers.get('content-length');
const maxSize = 1024 * 1024; // 1MB

if (contentLength && parseInt(contentLength) > maxSize) {
  return new Response(JSON.stringify({ error: 'Payload too large' }), { status: 413 });
}
```

**Priority**: MEDIUM

---

### 7. **INSECURE_ADMIN_ENDPOINT** - GET /api/lead espone tutti i dati
**File**: `src/pages/api/lead.ts:166-191`

**Descrizione**: L'endpoint GET ha un auth check semplice con Bearer token da env, ma:
1. Non c'è rate limiting sull'endpoint admin
2. Se ADMIN_TOKEN non è configurato, l'endpoint è pubblico (line 171: `if (adminToken && ...)`)
3. Espone TUTTI i dati dei pazienti in una singola risposta

**Fix**:
```typescript
export const GET: APIRoute = ({ request }) => {
  const adminToken = import.meta.env.ADMIN_TOKEN || process.env.ADMIN_TOKEN;
  
  // Richiedi sempre autenticazione
  if (!adminToken) {
    return new Response(JSON.stringify({ error: 'Admin not configured' }), { status: 503 });
  }
  
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${adminToken}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  
  // Aggiungi rate limiting
  const ipLimit = rateLimiter.checkWithHeaders(clientIP, 'admin:ip');
  if (!ipLimit.allowed) {
    return createRateLimitResponse(ipLimit.retryAfter || 60);
  }
  
  // Implementa paginazione
  // ...
};
```

**Priority**: HIGH

---

## Suggestions

### 1. **ADD_SECURITY_HEADERS** - Aggiungere header di sicurezza
Aggiungere a tutte le risposte:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`

### 2. **ADD_REQUEST_ID** - Tracciamento richieste
Aggiungere un header `X-Request-ID` per tracciare le richieste attraverso i log senza esporre PII.

### 3. **VALIDATE_ENV_VARS** - Validazione env vars all'avvio
Verificare che tutte le variabili d'ambiente richieste siano presenti all'avvio dell'applicazione.

### 4. **IMPLEMENT_AUDIT_LOG** - Log di audit separati
Creare un sistema di audit logging separato dai log di debug, con politiche di retention specifiche.

---

## Compliance Check

| Requisito | Status | Note |
|-----------|--------|------|
| **GDPR Art. 5** - Principio riservatezza | ❌ FAIL | PII in log non mascherati |
| **GDPR Art. 9** - Dati sensibili salute | ❌ FAIL | Sintomi in log, no cifratura |
| **Data retention** | ⚠️ PARTIAL | Cleanup 30 giorni OK, ma in-memory |
| **Right to deletion** | ❌ FAIL | Nessun endpoint per cancellare dati specifici |
| **Data encryption at rest** | ❌ FAIL | Storage in-memory non cifrato |
| **Data encryption in transit** | ⚠️ PARTIAL | Dipende da hosting (assumere HTTPS) |
| **Rate limiting** | ✅ PASS | Implementato correttamente |
| **Input validation** | ✅ PASS | Zod schemas presenti |

---

## Positive Security Features

✅ **Zod Validation** - Tutti gli endpoint usano Zod per validazione strict degli input

✅ **Rate Limiting** - Implementazione completa con headers RateLimit-Limit/Remaining/Reset

✅ **HMAC Webhook Verification** - Timing-safe comparison implementata correttamente in `n8n.ts`

✅ **No Stack Trace Leaks** - Errori generici per client, dettagli solo server-side

✅ **OpenAI API Key in Env** - Nessuna hardcoded key, usa import.meta.env

✅ **Phone Normalization** - Rimuove caratteri speciali per deduplicazione

✅ **Session-based Rate Limiting** - Doppio rate limit (IP + Session)

✅ **Automatic Cleanup** - setInterval per pulizia sessioni (1h) e leads (30 giorni)

✅ **Webhook Timeout** - AbortController con 10s timeout per chiamate webhook

✅ **Duplicate Detection** - Previene lead duplicati per stesso telefono in 24h

---

## Action Items

1. **IMMEDIATO**: Rimuovere i fallback `'default-secret'` da lead.ts e n8n.ts
2. **IMMEDIATO**: Implementare mascheramento PTI nei log
3. **HIGH**: Correggere l'endpoint admin GET /api/lead (sempre richiedere auth)
4. **MEDIUM**: Aggiungere middleware CORS configurato
5. **MEDIUM**: Sanitizzare input HTML per prevenire XSS
6. **MEDIUM**: Usare crypto.randomUUID() per session ID
7. **LOW**: Aggiungere security headers standard
8. **LOW**: Implementare paginazione endpoint admin

---

## Risk Matrix

| Vulnerabilità | Probabilità | Impatto | Risk Score |
|--------------|-------------|---------|------------|
| Hardcoded secret | HIGH | CRITICAL | **CRITICAL** |
| PII in logs | HIGH | HIGH | **CRITICAL** |
| Admin endpoint insecure | MEDIUM | HIGH | **HIGH** |
| XSS via chat messages | MEDIUM | MEDIUM | **MEDIUM** |
| No CORS | LOW | MEDIUM | **MEDIUM** |
| Predictable session ID | LOW | LOW | **LOW** |

---

*Review completed: 2026-03-29*
*Reviewer: Security Reviewer Agent*
*Scope: LeadSpark Backend API*
