# Component Architecture Documentation

## Overview

Questo documento descrive l'architettura componenti del progetto LeadSpark, progettata per massimizzare maintainability, reusability e consistenza del codice.

## Directory Structure

```
src/
├── components/
│   ├── icons/           # Icon system
│   │   ├── Icon.astro
│   │   └── index.ts
│   ├── ui/              # UI primitives
│   │   ├── Button.astro
│   │   ├── Card.astro
│   │   ├── Section.astro
│   │   └── index.ts
│   ├── sections/        # Page sections
│   │   ├── Hero.astro
│   │   ├── Services.astro
│   │   ├── About.astro
│   │   ├── Contact.astro
│   │   └── Testimonials.astro
│   └── chatbot/         # Chatbot components (legacy)
├── data/                # Data configuration
│   ├── index.ts
│   ├── services.ts
│   └── site.ts
└── layouts/
    └── Layout.astro
```

## Component Library

### 1. Icon System (`src/components/icons/`)

#### Icon.astro
Componente unificato per la gestione delle icone SVG.

**Props Interface:**
```typescript
interface Props {
  name: string;      // Nome dell'icona
  size?: number;     // Dimensione in px (default: 24)
  class?: string;    // Classi CSS aggiuntive
}
```

**Usage:**
```astro
---
import { Icon } from '../components/icons';
---

<!-- Basic usage -->
<Icon name="phone" />

<!-- Custom size -->
<Icon name="star" size={32} />

<!-- With custom classes -->
<Icon name="check" class="text-green-500" />
```

**Available Icons:**
- Service icons: `activity`, `heartpulse`, `hand`
- Stats icons: `calendar`, `users`, `award`, `graduation`
- Contact icons: `phone`, `mail`, `mapPin`, `clock`
- UI icons: `check`, `checkCircle`, `star`, `arrowRight`, `arrowDown`, `send`, `quote`, `menu`, `x`, `chevronRight`, `externalLink`, `shield`, `verified`, `checkBadge`, `calendarDays`, `sparkles`

---

### 2. Button Component (`src/components/ui/Button.astro`)

Componente button riutilizzabile con multiple varianti.

**Props Interface:**
```typescript
interface Props {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  href?: string;           // Renders as <a> if provided
  onclick?: string;        // Click handler
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  class?: string;
  fullWidth?: boolean;
  icon?: string;           // SVG string for icon
  iconPosition?: 'left' | 'right';
}
```

**Usage:**
```astro
---
import { Button } from '../components/ui';
---

<!-- Primary button -->
<Button>Prenota ora</Button>

<!-- Button variants -->
<Button variant="secondary">Scopri di più</Button>
<Button variant="outline">Annulla</Button>
<Button variant="ghost">Chiudi</Button>

<!-- Button sizes -->
<Button size="sm">Piccolo</Button>
<Button size="md">Medio</Button>
<Button size="lg">Grande</Button>

<!-- Link button -->
<Button href="#contact" variant="primary">
  Contattaci
  <Icon name="arrowRight" size={16} />
</Button>

<!-- Loading state -->
<Button loading>Invio in corso...</Button>

<!-- Full width -->
<Button fullWidth>Invia richiesta</Button>
```

---

### 3. Card Component (`src/components/ui/Card.astro`)

Card component unificato con supporto per header, content, footer.

**Props Interface:**
```typescript
interface Props {
  variant?: 'default' | 'outline' | 'ghost' | 'gradient';
  hover?: boolean;         // Enable hover effect (default: true)
  clickable?: boolean;
  href?: string;           // Renders as <a> if provided
  class?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}
```

**Slots:**
- `default` - Main content
- `header` - Header section
- `media` - Media/image section
- `footer` - Footer section

**Usage:**
```astro
---
import { Card } from '../components/ui';
---

<!-- Basic card -->
<Card>
  <h3>Titolo</h3>
  <p>Contenuto della card</p>
</Card>

<!-- Card with header -->
<Card>
  <Fragment slot="header">
    <h3 class="p-6 border-b">Header</h3>
  </Fragment>
  <div class="p-6">Content</div>
</Card>

<!-- Card with media -->
<Card>
  <Fragment slot="media">
    <img src="image.jpg" alt="Description" class="w-full h-48 object-cover" />
  </Fragment>
  <div class="p-6">
    <h3>Titolo</h3>
  </div>
</Card>

<!-- Card variants -->
<Card variant="outline">Outline style</Card>
<Card variant="ghost">Ghost style</Card>
<Card variant="gradient">Gradient background</Card>

<!-- Hover disabled -->
<Card hover={false}>No hover effect</Card>
```

---

### 4. Section Component (`src/components/ui/Section.astro`)

Wrapper consistente per tutte le sezioni della pagina.

**Props Interface:**
```typescript
interface Props {
  id?: string;             // Section ID for anchor links
  class?: string;
  background?: 'white' | 'light' | 'dark' | 'gradient' | 'transparent';
  spacing?: 'sm' | 'md' | 'lg' | 'xl';
  container?: boolean;     // Include max-width container (default: true)
  containerClass?: string;
}
```

**Usage:**
```astro
---
import { Section } from '../components/ui';
---

<!-- Basic section -->
<Section id="hero">
  <h1>Hero Content</h1>
</Section>

<!-- Background variants -->
<Section background="light">Light background</Section>
<Section background="dark">Dark background</Section>
<Section background="gradient">Gradient background</Section>

<!-- Spacing variants -->
<Section spacing="sm">Small padding</Section>
<Section spacing="md">Medium padding</Section>
<Section spacing="lg">Large padding</Section>

<!-- Without container -->
<Section container={false}>
  <div class="full-bleed">Full width content</div>
</Section>
```

---

## Data Configuration

### Services (`src/data/services.ts`)

```typescript
export interface Service {
  id: string;
  icon: string;
  title: string;
  description: string;
  features: string[];
  color: 'blue' | 'emerald' | 'teal' | 'cyan' | 'violet';
  image: string;
}

// Exported data
export const services: Service[];
export const colorClasses: Record<string, ColorClasses>;
export function getServiceById(id: string): Service | undefined;
export function getServicesByColor(color: Service['color']): Service[];
```

### Site Configuration (`src/data/site.ts`)

```typescript
export const siteConfig: {
  name: string;
  tagline: string;
  description: string;
  url: string;
  contact: {
    phone: string;
    email: string;
    address: string;
    hours: { weekdays: string; saturday: string; sunday: string };
  };
  business: { founded: number; experience: string; patients: string; rating: number };
  navigation: { main: NavItem[]; cta: NavItem };
  // ...
};

export const team: TeamMember[];
export const stats: Stat[];
export const contactInfo: ContactInfo[];
export const testimonials: Testimonial[];
export const trustBadges: TrustBadge[];
export const missionStatement: { title: string; text: string };
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Data Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ services.ts  │  │  site.ts     │  │  External APIs       │  │
│  │ - services[] │  │  - siteConfig│  │  - Images (Unsplash) │  │
│  │ - colorClasses│ │  - team[]    │  │                      │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────────┘  │
└─────────┼─────────────────┼─────────────────────────────────────┘
          │                 │
          ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Component Layer                             │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  UI Primitives (Button, Card, Section, Icon)            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                           ▲                                     │
│  ┌────────────────────────┼──────────────────────────────┐     │
│  │  Section Components    │  (Hero, Services, About...)  │     │
│  │  - Import data         │  - Compose UI primitives     │     │
│  │  - Map/render lists    │  - Handle layouts            │     │
│  └────────────────────────┴──────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Page Layer                                │
│                      (index.astro)                               │
│              Composes sections into pages                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Best Practices

### 1. Data Flow
- Tutti i dati hardcoded devono essere estratti in `src/data/`
- I componenti di sezione importano dati dai file di configurazione
- I componenti UI sono "dumb" - ricevono dati via props

### 2. Component Composition
- Usare slot per layout flessibili nelle Card
- Comporre UI primitives per creare componenti complessi
- Mantenere i componenti UI il più generici possibile

### 3. Icon Usage
- Usare sempre il componente `Icon` invece di SVG inline
- Aggiungere nuove icone in `Icon.astro` per riutilizzo
- Usare le costanti `ICONS` per type safety

### 4. Styling
- Usare le classi Tailwind esistenti in `globals.css`
- Varianti di colore centralizzate in `colorClasses`
- Hover effects gestiti automaticamente dai componenti UI

### 5. TypeScript
- Esportare sempre le interface Props dai componenti
- Usare i tipi esportati da `src/data/`
- Mantenere strict mode abilitato

---

## Migration Guide

### Da componenti inline a Icon component

**Before:**
```astro
<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3"/>
</svg>
```

**After:**
```astro
---
import { Icon } from '../components/icons';
---
<Icon name="clock" size={24} />
```

### Da HTML buttons a Button component

**Before:**
```astro
<a href="#contact">
  <button class="bg-blue-600 text-white px-6 py-3 rounded-lg">
    Prenota
  </button>
</a>
```

**After:**
```astro
---
import { Button } from '../components/ui';
---
<Button href="#contact" variant="primary">
  Prenota
</Button>
```

### Da div cards a Card component

**Before:**
```astro
<div class="bg-white rounded-xl shadow-sm border p-6 hover:shadow-lg transition-all">
  <h3>Title</h3>
  <p>Content</p>
</div>
```

**After:**
```astro
---
import { Card } from '../components/ui';
---
<Card>
  <h3>Title</h3>
  <p>Content</p>
</Card>
```

---

## Component Checklist

- [x] Icon.astro - Icon system unificato
- [x] Button.astro - Variants: primary, secondary, outline, ghost
- [x] Card.astro - Supporto header/content/footer
- [x] Section.astro - Wrapper consistente
- [x] services.ts - Configurazione servizi
- [x] site.ts - Configurazione sito e dati
- [x] Hero.astro - Refactored
- [x] Services.astro - Refactored
- [x] About.astro - Refactored
- [x] Contact.astro - Refactored
- [x] Testimonials.astro - Refactored
