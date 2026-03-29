# LeadSpark Test Suite

Test di integrazione end-to-end per il progetto LeadSpark - AI Lead Capture Suite.

## Struttura Test

```
tests/
├── e2e/
│   ├── chat-flow.test.ts      # Test flusso conversazionale completo
│   └── api-integration.test.ts # Test API endpoint
├── fixtures/
│   └── pazienti.ts            # Dati di test (pazienti, contesti, webhook)
├── mocks/
│   ├── openai.ts              # Mock API OpenAI
│   ├── storage.ts             # Mock storage in-memory
│   └── webhook.ts             # Mock webhook n8n
├── setup.ts                   # Setup Vitest
└── README.md                  # Questo file
```

## Requisiti

- Node.js 18+
- Vitest (incluso nello stack Astro)
- TypeScript

## Installazione

```bash
# Dalla root del progetto LeadSpark
npm install

# O se usi pnpm/yarn
pnpm install
# yarn install
```

## Configurazione Vitest

Aggiungi a `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:e2e": "vitest run tests/e2e",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest run --coverage"
  }
}
```

Crea `vitest.config.ts` nella root del progetto:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/']
    }
  },
  resolve: {
    alias: {
      '@': './src'
    }
  }
});
```

## Esecuzione Test

### Tutti i test
```bash
npm run test:run
```

### Solo test E2E
```bash
npm run test:e2e
```

### Modalità watch (durante sviluppo)
```bash
npm run test:watch
```

### Con coverage
```bash
npm run test:coverage
```

### Test specifico
```bash
npx vitest run tests/e2e/chat-flow.test.ts
```

### Test con filtro
```bash
npx vitest run --reporter=verbose --testNamePattern="dovrebbe creare"
```

## Test Suite

### 1. Chat Flow Test (`e2e/chat-flow.test.ts`)

Verifica il flusso conversazionale completo:

- ✅ **Greeting step** - Risposta al saluto iniziale
- ✅ **Symptom collection** - Raccolta sintomi paziente
- ✅ **Duration collection** - Raccolta durata sintomi
- ✅ **Urgency assessment** - Valutazione livello urgenza
- ✅ **Contact collection** - Raccolta nome e telefono
- ✅ **Availability collection** - Raccolta disponibilità
- ✅ **Lead submission** - Salvataggio lead completo
- ✅ **Flusso integrato** - Conversazione end-to-end

### 2. API Integration Test (`e2e/api-integration.test.ts`)

Verifica tutti gli endpoint API:

**Chat API (`/api/chat`)**:
- ✅ Valid request - Risposta corretta
- ✅ JSON invalido - Errore 400
- ✅ Campi mancanti - Validazione
- ✅ Rate limiting headers
- ✅ Health check endpoint

**Lead API (`/api/lead`)**:
- ✅ Valid patient - Creazione 201
- ✅ Paziente senza email (opzionale)
- ✅ Telefono mancante - Validazione
- ✅ Email invalida - Validazione
- ✅ Nome troppo corto - Validazione
- ✅ Urgenza invalida - Validazione
- ✅ Rilevamento duplicati (24h)
- ✅ Admin list con auth

**Webhook API (`/api/webhook/n8n`)**:
- ✅ Valid signature - 200 OK
- ✅ Missing signature - 401
- ✅ Invalid signature - 401
- ✅ Invalid JSON - 400
- ✅ Invalid event format - 400
- ✅ Eventi: paziente.qualified, notification.sent, notification.failed
- ✅ Health check endpoint

**Rate Limiting**:
- ✅ Rate limit exceeded simulation
- ✅ Retry-After header

## Fixtures

### Pazienti (`fixtures/pazienti.ts`)

Dati di test predefiniti:

```typescript
// Paziente completo valido
pazienteCompleto: LeadRequest

// Paziente senza email (opzionale)
pazienteSenzaEmail: LeadRequest

// Paziente con urgenza alta
pazienteUrgenzaAlta: LeadRequest

// Dati incompleti per test errori
pazienteMancaTelefono
pazienteMancaNome
pazienteTelefonoInvalido
pazienteEmailInvalida
pazienteNomeCorto
pazienteUrgenzaInvalida

// Contesti chat
contestoIniziale
contestoConSintomi
contestoCompleto

// Flusso conversazione step-by-step
flussoConversazione: Array<{
  step: string;
  input: string;
  expectedReplyContains: string[];
  expectedNextStep: string;
  expectedData?: object;
  expectedComplete?: boolean;
}>

// Webhook events
webhookPazienteQualificato
webhookNotificaInviata
webhookNotificaFallita
webhookInvalido

// Utility
generateTestSessionId()
createPaziente(overrides)
createContesto(overrides)
```

## Mocks

### OpenAI Mock (`mocks/openai.ts`)

Mock delle chiamate API OpenAI:
- `createChatCompletion` - Simula risposte AI
- `extractLeadData` - Estrazione dati conversazione
- `generateSessionId` - Generazione ID sessione

### Storage Mock (`mocks/storage.ts`)

Storage in-memory per test:
- `mockLeadsStore` - Storage leads
- `mockSessionsStore` - Storage sessioni chat
- `saveMockLead` / `getMockLead`
- `findMockLeadByPhone`
- `saveMockSession` / `getMockSession`
- `resetMockStorage`

### Webhook Mock (`mocks/webhook.ts`)

Mock per webhook n8n:
- `mockWebhookFetch` - Simula fetch webhook
- `generateMockSignature` - Genera firma HMAC valida
- `generateInvalidSignature` - Firma invalida per test
- `webhookStore` - Traccia chiamate webhook
- `wasWebhookCalled` - Verifica chiamate

## API Contracts

I test verificano i contratti API definiti in `deliverables/backend/api-contracts.yaml`:

### Chat API
- **POST** `/api/chat` - Processa messaggi chatbot
- **GET** `/api/chat` - Health check

### Lead API
- **POST** `/api/lead` - Cattura lead paziente
- **GET** `/api/lead` - Lista leads (admin)

### Webhook API
- **POST** `/api/webhook/n8n` - Riceve eventi n8n
- **GET** `/api/webhook/n8n` - Health check

## Environment Variables per Test

```bash
# .env.test
OPENAI_API_KEY=test-key
WEBHOOK_SECRET=test-secret
N8N_WEBHOOK_URL=https://n8n.test/webhook
ADMIN_TOKEN=test-admin-token
```

## Troubleshooting

### Errori di importazione
Assicurati che `tsconfig.json` includa:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

### Mock non funzionanti
Verifica che `vi.mock` sia chiamato prima degli import:
```typescript
import { vi } from 'vitest';
vi.mock('../path/to/module');
// poi gli altri import
```

### Timeout nei test
Aumenta timeout in `vitest.config.ts`:
```typescript
test: {
  testTimeout: 10000 // 10 secondi
}
```

## Report Risultati

Il formato di output è:

```markdown
# Test Results

## E2E Chat Flow
- [x] Greeting step
- [x] Symptom collection
- [x] Duration collection
- [x] Urgency assessment
- [x] Contact collection
- [x] Lead submission
- Result: [PASS]

## API Tests
- [x] Chat endpoint
- [x] Lead endpoint
- [x] Webhook endpoint
- [x] Rate limiting
- Result: [PASS]
```

## CI/CD Integration

Per GitHub Actions:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run test:run
```

## Contribuire

1. Aggiungi nuovi test in `tests/e2e/`
2. Aggiungi fixtures in `tests/fixtures/`
3. Aggiorna questo README
4. Esegui `npm run test:run` per verificare
