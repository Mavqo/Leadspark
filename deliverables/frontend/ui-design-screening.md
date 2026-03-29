# UI Design System - Centro Fisioterapia Movimento

## 1. Color Palette

### Primary
| Nome | Hex | Uso |
|------|-----|-----|
| Primary Blue | `#2563EB` | Header, CTA primari, link, elementi di trust |
| Deep Blue | `#1E40AF` | Hover states, enfasi |
| Sage Green | `#10B981` | Accenti salute, success, indicatori positivi |
| Soft Teal | `#14B8A6` | Elementi secondari, icone wellness |

### Neutral
| Nome | Hex | Uso |
|------|-----|-----|
| White | `#FFFFFF` | Background primario |
| Gray 50 | `#F9FAFB` | Background sezioni alternate |
| Gray 100 | `#F3F4F6` | Input backgrounds, hover subtle |
| Gray 200 | `#E5E7EB` | Bordi, divider |
| Gray 300 | `#D1D5DB` | Bordi disabilitati |
| Gray 400 | `#9CA3AF` | Placeholder text |
| Gray 500 | `#6B7280` | Testo secondario |
| Gray 600 | `#4B5563` | Testo body |
| Gray 700 | `#374151` | Testo headings |
| Gray 800 | `#1F2937` | Testo principale |
| Gray 900 | `#111827` | Testo emphasis |

### Semantic
| Nome | Hex | Uso |
|------|-----|-----|
| Success | `#059669` | Conferme, disponibilità, stati positivi |
| Warning | `#F59E0B` | Attenzione, slot quasi pieni |
| Error | `#DC2626` | Errori form (usato con parsimonia) |
| Info | `#3B82F6` | Info, tooltip, notifiche |

> **Nota:** Rosso limitato ai soli errori critici. Preferire verde/blu per feedback positivi.

---

## 2. Typography

### Headings
- **Font Family:** Inter (sans-serif)
- **Weights:** 600 (semibold) per H1-H2, 500 (medium) per H3-H6

| Elemento | Size | Line Height | Letter Spacing |
|----------|------|-------------|----------------|
| H1 | 2.5rem (40px) | 1.2 | -0.02em |
| H2 | 2rem (32px) | 1.25 | -0.01em |
| H3 | 1.5rem (24px) | 1.3 | 0 |
| H4 | 1.25rem (20px) | 1.4 | 0 |
| H5 | 1.125rem (18px) | 1.4 | 0 |
| H6 | 1rem (16px) | 1.5 | 0 |

### Body
- **Font Family:** Inter (sans-serif)
- **Weight:** 400 (regular)

| Elemento | Size | Line Height |
|----------|------|-------------|
| Body Large | 1.125rem (18px) | 1.6 |
| Body | 1rem (16px) | 1.6 |
| Body Small | 0.875rem (14px) | 1.5 |
| Caption | 0.75rem (12px) | 1.4 |

### Chat Typography
- **Font Family:** Inter (sans-serif) - massima leggibilità
- **Message Text:** 0.9375rem (15px), line-height 1.5
- **Timestamp:** 0.75rem (12px), Gray 400
- **Bot Name:** 0.875rem (14px), weight 500, Primary Blue

---

## 3. Component Specs

### Chatbot Widget

#### Closed State (Floating Button)
| Proprietà | Valore |
|-----------|--------|
| Dimensioni | 56px × 56px |
| Posizione | Fixed, bottom: 24px, right: 24px |
| Background | Primary Blue `#2563EB` |
| Icona | MessageCircle (Lucide), 24px, White |
| Border Radius | Full (50%) |
| Shadow | `0 4px 12px rgba(37, 99, 235, 0.3)` |
| Hover | Scale 1.05, shadow aumentato |
| Animation | Pulse subtle ogni 5s (opzionale) |

#### Open State (Chat Window)
| Proprietà | Valore |
|-----------|--------|
| Dimensioni Desktop | 380px × 550px |
| Dimensioni Mobile | 100vw × 80vh (fullscreen-like) |
| Posizione | Fixed, bottom: 24px, right: 24px (desktop) |
| Background | White |
| Border Radius | 16px (desktop), 0 (mobile top) |
| Shadow | `0 20px 50px rgba(0, 0, 0, 0.15)` |

#### Header
| Proprietà | Valore |
|-----------|--------|
| Altezza | 64px |
| Background | Primary Blue `#2563EB` |
| Avatar | 36px circle, border 2px white |
| Titolo | "Movimento Assistant", White, 16px, weight 500 |
| Subtitle | "Online", Sage Green `#10B981`, 12px |
| Close Button | X icon, 24px, White, hover: opacity 0.8 |

#### Message Bubbles

**User Message:**
| Proprietà | Valore |
|-----------|--------|
| Background | Primary Blue `#2563EB` |
| Text Color | White |
| Border Radius | 16px 16px 4px 16px |
| Padding | 12px 16px |
| Max Width | 80% |
| Font Size | 15px |

**Bot Message:**
| Proprietà | Valore |
|-----------|--------|
| Background | Gray 100 `#F3F4F6` |
| Text Color | Gray 800 `#1F2937` |
| Border Radius | 16px 16px 16px 4px |
| Padding | 12px 16px |
| Max Width | 80% |
| Font Size | 15px |

**Typing Indicator:**
| Proprietà | Valore |
|-----------|--------|
| Background | Gray 100 |
| Dots | 3 cerchi 8px, animazione stagger |
| Color | Gray 400 → Gray 600 animate |

#### Input Field
| Proprietà | Valore |
|-----------|--------|
| Altezza | 56px |
| Background | White |
| Border | 1px solid Gray 200, top only |
| Placeholder | "Scrivi un messaggio...", Gray 400 |
| Send Button | ArrowUp icon, 20px, Primary Blue |
| Padding | 16px |
| Focus | Border-top Primary Blue |

### Landing Sections

#### Hero Section
| Proprietà | Valore |
|-----------|--------|
| Layout | 2-col grid (desktop), stack (mobile) |
| Altezza Min | 100vh - 80px (header) |
| Background | White con gradiente subtle (Gray 50 → White) |
| Heading | H1, Gray 900, max-width 600px |
| Subhead | Body Large, Gray 600, max-width 500px |
| CTA Primario | "Prenota Valutazione Gratuita", Primary Blue, 48px height |
| CTA Secondario | "Scopri i Trattamenti", outline, Gray 700 |
| Hero Image | Fisioterapista con paziente, rounded 16px, shadow |

#### Services Section
| Proprietà | Valore |
|-----------|--------|
| Layout | 3-col grid (desktop), 2-col (tablet), 1-col (mobile) |
| Gap | 24px |
| Card Background | White |
| Card Border | 1px solid Gray 200 |
| Card Radius | 12px |
| Card Padding | 24px |
| Icon | 48px circle, Sage Green bg, white icon |
| Title | H4, Gray 800 |
| Description | Body, Gray 600 |
| Hover | Shadow aumentato, border Primary Blue |

#### Testimonials Section
| Proprietà | Valore |
|-----------|--------|
| Layout | Carousel (mobile), Grid 2-col (tablet+), max 4 visibili |
| Card Background | Gray 50 |
| Card Radius | 12px |
| Card Padding | 24px |
| Quote Icon | 24px, Sage Green, opacity 0.3 |
| Quote Text | Body Large, Italic, Gray 700 |
| Author | Body Small, weight 500, Gray 800 |
| Role | Caption, Gray 500 |
| Stars | 5 stelle, Amber `#F59E0B` |

---

## 4. Responsive Breakpoints

| Breakpoint | Min Width | Target |
|------------|-----------|--------|
| Mobile | 0px | Smartphone portrait |
| Tablet | 640px | Tablet portrait, large phones |
| Desktop | 1024px | Laptop, desktop standard |
| Wide | 1280px | Desktop large, monitor |

### Mobile Adaptations
- Chatbot: fullscreen overlay (100vw × 100vh)
- Hero: single column, heading size ridotto (2rem)
- Services: single column cards
- Testimonials: horizontal scroll o carousel
- Font: riduzione 10% su tutti i size
- Spacing: padding 16px laterale (vs 24px desktop)

### Tablet Adaptations
- Chatbot: 400px × 500px, bottom-right
- Hero: 2-col con testo più piccolo
- Services: 2-col grid
- Spacing: padding 24px laterale

---

## 5. Accessibility

### Color Contrast Ratios
| Elemento | Contrasto Minimo | Stato |
|----------|------------------|-------|
| Body text (Gray 800 su White) | 12.6:1 | ✅ Pass |
| Secondary text (Gray 600 su White) | 6.3:1 | ✅ Pass |
| Placeholder (Gray 400 su White) | 2.9:1 | ⚠️ Avoid for critical info |
| Primary CTA (White su Blue) | 4.5:1 | ✅ Pass |
| Links (Blue su White) | 5.8:1 | ✅ Pass |
| Error text (Red su White) | 5.9:1 | ✅ Pass |

### Focus Indicators
- Tutti gli elementi interattivi: `outline: 2px solid #2563EB, outline-offset: 2px`
- Rimozione solo con `:focus-visible` (non `:focus`)
- Tab order logico segue DOM

### ARIA Labels per Chatbot
```html
<!-- Widget button -->
<button aria-label="Apri chat con assistente virtuale" aria-expanded="false">

<!-- Chat window -->
<div role="dialog" aria-label="Chat Movimento" aria-modal="true">

<!-- Message list -->
<div role="log" aria-live="polite" aria-relevant="additions">

<!-- User message -->
<div role="article" aria-label="Messaggio inviato">

<!-- Bot message -->
<div role="article" aria-label="Risposta assistente">

<!-- Typing indicator -->
<div aria-label="Assistente sta scrivendo">
```

### Keyboard Navigation
- `Tab`: Naviga tra elementi interattivi
- `Enter/Space`: Attiva button, invia messaggio
- `Escape`: Chiude chatbot
- `Shift + Tab`: Navigazione inversa
- Focus trap all'interno del chatbot aperto

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Screen Reader Considerations
- Stato "Online/Offline" annunciato
- Nuovi messaggi letti automaticamente (`aria-live`)
- Timestamp leggibili ma non intrusivi
- Alternative testuali per icone decorative

---

## 6. Micro-interactions

### Chatbot Button
- Hover: `transform: scale(1.05)`, `transition: 200ms ease`
- Active: `transform: scale(0.95)`
- New message badge: badge rosso (solo per notifiche non lette)

### Message Appear
- User: slide in from right, 200ms
- Bot: slide in from left, 200ms, delay 100ms
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)`

### Button Hover
- Primary: darken 10%, shadow aumentato
- Duration: 150ms
- Easing: ease-out

---

*Design System v1.0 - LeadSpark Project*
*Target: Centro Fisioterapia Movimento*
*Stack: Astro + React + TypeScript + Tailwind + shadcn/ui*
