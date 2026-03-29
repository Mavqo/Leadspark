# Frontend Architecture Decision Record

## Progetto: LeadSpark - Centro Fisioterapia Movimento
**Stack:** Astro 5.x + React 19 + TypeScript 5.7 + Tailwind 4 + shadcn/ui + shadcn-chatbot-kit  
**Target:** Landing page conversion + Chatbot widget per lead capture

---

## 1. Component Structure

### Albero Componenti

```
Layout.astro (shell)
├── <head> SEO + Fonts + Analytics
├── <body>
│   ├── Navbar.tsx (React island - hydrated on scroll)
│   ├── <main>
│   │   ├── HeroSection.astro (static)
│   │   ├── ServicesSection.astro (static)
│   │   ├── BenefitsSection.astro (static)
│   │   ├── TestimonialsSection.tsx (React - carousel interattivo)
│   │   ├── TeamSection.astro (static)
│   │   ├── FAQSection.tsx (React - accordion interattivo)
│   │   └── ContactSection.tsx (React - form + mappa)
│   ├── Footer.astro (static)
│   └── ChatbotWidget.tsx (React island - always mounted, lazy loaded)
```

### Separazione di Responsabilità

| Layer | Tecnologia | Responsabilità |
|-------|------------|----------------|
| **Content Layer** | Astro `.astro` | SEO-critical content, markup semantico, LCP elements |
| **Interaction Layer** | React `.tsx` | Stato locale, animazioni, gesture, forms |
| **Widget Layer** | React + Portal | Chatbot autonomo, isolato dal DOM principale |
| **Style Layer** | Tailwind 4 | Utility classes, design tokens, responsive |

### Pattern: Hybrid Rendering

```astro
---
// Sections con contenuto statico = Astro
import HeroSection from './sections/HeroSection.astro';
---

<!-- Componenti interattivi = React islands -->
<ChatbotWidget client:visible />  <!-- Hydrate quando visibile -->
<TestimonialsSection client:load />  <!-- Hydrate immediato -->
<FAQSection client:visible />
```

---

## 2. State Management

### Approccio: Local First + Context Isolato

#### Chatbot State Architecture

```typescript
// Stato locale per widget isolato
// src/components/chatbot/ChatbotWidget.tsx

interface ChatbotState {
  isOpen: boolean;
  messages: Message[];
  currentStep: 'welcome' | 'symptoms' | 'booking' | 'contact';
  userData: Partial<UserData>;
}

// useReducer per complessità del flow conversazionale
const [state, dispatch] = useReducer(chatbotReducer, initialState);
```

#### Decisione: NO Context API Globale

```typescript
// ❌ Evitare: Context provider a livello root
// ✅ Usare: Props drilling limitato + Composition

// Il chatbot è un'isola isolata - non condivide stato con il resto della page
// Comunicazione tramite API calls, non state condiviso
```

#### State Distribution

| Scope | Strumento | Caso d'uso |
|-------|-----------|------------|
| Widget interno | `useReducer` | Flow conversazionale multi-step |
| Form inputs | `useState` | Controlled inputs |
| UI state | `useState` | Toggle, hover, animations |
| Server state | `fetch` + `useEffect` | API calls, booking data |
| Persistenza | `localStorage` | Sessione chat, preferenze |

---

## 3. Chatbot Widget Integration

### Pattern: Portal + Fixed Positioning

```typescript
// src/components/chatbot/ChatbotWidget.tsx
// Render via Portal per isolamento z-index e overflow

import { createPortal } from 'react-dom';

export function ChatbotWidget() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => setMounted(true), []);
  
  if (!mounted) return null;
  
  return createPortal(
    <div className="fixed bottom-4 right-4 z-50">
      {/* Widget UI */}
    </div>,
    document.body
  );
}
```

### Comunicazione con API

```typescript
// src/lib/chatbot/api.ts

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

async function sendMessage(
  message: string, 
  sessionId: string,
  context: ConversationContext
): Promise<ChatResponse> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sessionId, context }),
  });
  
  return response.json();
}

// Endpoint: POST /api/chat
// - Validazione input (zod)
// - Rate limiting (per sessione)
// - OpenAI/Anthropic API call
// - Response streaming (SSE o chunked)
```

### Mobile Responsiveness Strategy

| Viewport | Behavior | Breakpoint |
|----------|----------|------------|
| **Mobile** (< 640px) | Full-screen overlay on open, floating FAB closed | `sm:` |
| **Tablet** (640-1024px) | Drawer da destra (60% width), FAB bottom-right | `md:` |
| **Desktop** (> 1024px) | Card flottante (400x600px), FAB bottom-right | `lg:` |

```typescript
// Responsive behavior
const isMobile = useMediaQuery('(max-width: 640px)');

// Mobile: w-screen h-screen quando aperto
// Desktop: w-[400px] h-[600px] fixed positioning
```

### Stile Widget

```typescript
// Palette medical-clean + branding
const widgetTheme = {
  primary: 'bg-medical-blue-600',      // Azzurro trust
  secondary: 'bg-sage-500',            // Verde salvia calm
  background: 'bg-white',
  surface: 'bg-slate-50',
  text: 'text-slate-800',
  textMuted: 'text-slate-500',
  accent: 'bg-medical-blue-100',       // Highlight risposte
  borderRadius: 'rounded-2xl',
  shadow: 'shadow-2xl shadow-slate-900/10',
};
```

---

## 4. Performance Strategy

### Astro Islands Architecture

```astro
---
// Strategia di hydration selettiva
---

<!-- Solo quando visibile nel viewport -->
<ChatbotWidget client:visible />

<!-- Hydrate immediatamente (priorità alta) -->
<TestimonialsSection client:load />

<!-- Hydrate solo se necessario (media query) -->
<MobileNav client:media="(max-width: 768px)" />

<!-- Nessuna hydration (completamente statico) -->
<HeroSection />  <!-- Default: no client directive -->
```

### Lazy Loading Components

```typescript
// Dynamic import per componenti pesanti
const LazyMap = lazy(() => import('./MapComponent'));

// Suspense boundary con fallback
<Suspense fallback={<MapSkeleton />}>
  <LazyMap coordinates={coords} />
</Suspense>
```

### Image Optimization

```astro
---
// Astro Image component con ottimizzazione automatica
import { Image } from 'astro:assets';
import heroImage from '../assets/hero-fisioterapia.jpg';
---

<Image 
  src={heroImage} 
  alt="Fisioterapista in sessione di trattamento"
  widths={[400, 800, 1200]}
  sizes="(max-width: 800px) 100vw, 800px"
  format="avif"
  quality={80}
  priority  <!-- LCP image -->
/>
```

### Performance Budget

| Metric | Target | Budget |
|--------|--------|--------|
| **LCP** | < 2.5s | Ottimizzare hero image |
| **INP** | < 200ms | Limitare hydration islands |
| **TTFB** | < 600ms | Static generation |
| **JS Bundle** | < 100KB (initial) | Code splitting per route |
| **CLS** | < 0.1 | Dimensioni fisse per images/widget |

### Font Strategy

```css
/* System font stack per body, Google Fonts solo per headings */
/* preload del font principale */
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>
```

---

## 5. File Structure

```
[src/]
├── components/
│   ├── chatbot/
│   │   ├── ChatbotWidget.tsx       # Entry point portal
│   │   ├── ChatContainer.tsx       # UI container (mobile/desktop)
│   │   ├── ChatMessage.tsx         # Singolo messaggio
│   │   ├── ChatInput.tsx           # Input con invio
│   │   ├── ChatHeader.tsx          # Header con close/reset
│   │   ├── MessageList.tsx         # Lista messaggi virtuale
│   │   ├── SuggestionChips.tsx     # Bottoni rapidi ("Mal di schiena")
│   │   ├── hooks/
│   │   │   ├── useChatSession.ts   # Gestione sessione
│   │   │   ├── useChatAPI.ts       # Chiamate API
│   │   │   └── useScrollToBottom.ts
│   │   ├── types/
│   │   │   └── chat.types.ts
│   │   └── utils/
│   │       └── message-formatter.ts
│   ├── sections/
│   │   ├── HeroSection.astro
│   │   ├── ServicesSection.astro
│   │   ├── BenefitsSection.astro
│   │   ├── TestimonialsSection.tsx
│   │   ├── TeamSection.astro
│   │   ├── FAQSection.tsx
│   │   └── ContactSection.tsx
│   └── ui/                         # shadcn components
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── accordion.tsx
│       └── ...
├── layouts/
│   └── Layout.astro                # Root layout con SEO
├── pages/
│   └── index.astro                 # Landing page
├── lib/
│   ├── chatbot/
│   │   └── api.ts                  # Client API per chat
│   └── utils/
│       └── cn.ts                   # Tailwind merge
├── hooks/
│   └── useMediaQuery.ts
├── styles/
│   └── globals.css
└── types/
    └── index.ts

[public/]
├── fonts/
├── images/
│   ├── hero/
│   ├── team/
│   └── services/
└── favicon.svg
```

---

## Decisioni Chiave

### 1. **Astro per Static Generation + React per Interattività**
**Rationale:** Astro offre il miglior TTFB e LCP per landing pages. React viene usato solo dove necessario (chatbot, form, carousel), minimizzando il JS inviato al client. Target: 90+ Lighthouse performance score.

### 2. **Chatbot come React Portal isolato**
**Rationale:** Il widget deve essere completamente indipendente dalla pagina - z-index massimo, nessun conflitto CSS, possibilità di spostarlo su qualsiasi pagina senza modifiche. Il pattern Portal garantisce isolation dal DOM padre.

### 3. **NO State Management Globale (Redux/Zustand)**
**Rationale:** L'applicazione è una landing page con un widget isolato. `useReducer` + `useState` sono sufficienti. Aggiungere Redux aumenterebbe il bundle size di ~10KB senza benefici reali. Props drilling è accettabile per 2-3 livelli di nesting.

### 4. **Mobile-First Responsive Design**
**Rationale:** Il 70%+ degli utenti nel settore health ricerca da mobile. Il chatbot in modalità mobile diventa full-screen per facilità d'uso. Breakpoint: `sm:640px`, `md:768px`, `lg:1024px`.

### 5. **Palette Medical-Clean: Azzurro Trust + Verde Salvia**
**Rationale:** 
- **Azzurro (#2563EB → #3B82F6):** Colore medico per eccellenza, trasmette professionalità e fiducia
- **Verde Salvia (#10B981 → #34D399):** Associato a salute, benessere, calm
- **Bianco/Slate:** Clean, spazio aperto, non affatica la lettura
- Evitare rosso (allarme), giallo (attenzione) nel primary palette

### 6. **Hydration Selettiva con `client:visible`**
**Rationale:** Il chatbot viene hydratato solo quando l'utente scrolla in fondo (dove appare il FAB) o interagisce. Riduce il JS iniziale del ~40% rispetto a `client:load`.

### 7. **API Route `/api/chat` con Streaming**
**Rationale:** Le risposte AI possono richiedere 2-5s. Lo streaming (Server-Sent Events o chunked response) permette di mostrare la risposta man mano che arriva, migliorando la percezione di velocità.

### 8. **shadcn/ui come Design System Base**
**Rationale:** Componenti accessibili, customizzabili, senza runtime overhead (sono copiati nel progetto). shadcn-chatbot-kit fornisce i pattern per il widget conversazionale.

---

## Dipendenze Chiave

```json
{
  "dependencies": {
    "astro": "^5.x",
    "react": "^19.x",
    "react-dom": "^19.x",
    "@astrojs/react": "^4.x",
    "tailwindcss": "^4.x",
    "class-variance-authority": "^0.7.x",
    "clsx": "^2.x",
    "tailwind-merge": "^2.x",
    "lucide-react": "^0.x"
  }
}
```

---

## Checklist Pre-Implementation

- [ ] Configurare Astro con React integration
- [ ] Setup Tailwind 4 con design tokens custom
- [ ] Installare shadcn/ui base components
- [ ] Creare struttura directory chatbot/
- [ ] Definire types condivisi (ChatMessage, UserData)
- [ ] Setup API route `/api/chat` (stub iniziale)
- [ ] Implementare ChatbotWidget con Portal pattern
- [ ] Testare responsive mobile (iPhone SE → iPhone 15 Pro Max)
- [ ] Verificare performance Lighthouse (target: 90+)

---

*Documento creato in fase: SCREENING*  
*Prossima fase: DESIGN SPECIFICATION*
