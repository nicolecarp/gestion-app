---
name: frontend-design
description: Use this skill whenever designing or modifying UI components, CSS styles, layouts, color schemes, or user-facing interactions. Prevents generic AI aesthetics and enforces distinctive, purposeful design systems.
---

# Frontend Design & Visual Craftsmanship

This skill guides UI and frontend development to eliminate generic, template-driven "AI aesthetics" (predictable purple gradients, low-contrast washed grays, identical rounded cards) in favor of high-craft, domain-grounded interfaces.

---

## 1. Domain Grounding & Personality
- **Domain**: Nicole is a unified personal ERP, academic engine, enterprise operations dashboard, and health tracker.
- **Aesthetic Direction**: High data density, industrial precision, tactile contrast, and purposeful typography.
- **Color Philosophy**:
  - Dark Mode: Deep near-black background (`#101010`), clean neutral elevated surfaces (`#181818`, `#202020`), subtle crisp borders (`#2d2d2d`).
  - Accent Color: Intentional vibrant pink/magenta (`#FF79C6` / `#e2559b`) used sparingly for primary focal points, brand accents, and key interactions.
  - Semantic Status Colors:
    - Success / Paid / Approved: `#22c55e` (Emerald)
    - Warning / Pending Detracción / Due Soon: `#f59e0b` (Amber)
    - Danger / Overdue / Error: `#ef4444` (Coral red)
    - Info / Academic / Active: `#38bdf8` (Sky blue)

---

## 2. Token Planning & CSS Variable Enforcement
- **Never Hardcode Hex Values in JS or Inline Styles**:
  Always leverage CSS custom properties defined in `web/css/style.css`:
  - `--bg-primary`, `--bg-secondary`, `--bg-card`, `--bg-hover`
  - `--text-primary`, `--text-secondary`, `--text-muted`
  - `--border-color`, `--accent`, `--accent-hover`
- **Dark/Light Theme Parity**:
  Any new component must render legibly in both dark and light modes. Test contrast ratios for text (`>= 4.5:1`).

---

## 3. Layout, Spacing & Information Density
- **Tabular Data & Grids**:
  - Align numbers to the right (`text-align: right; font-variant-numeric: tabular-nums;`).
  - Align text to the left; center badges and status pills.
  - Keep padding tight and compact for dense enterprise tables (`padding: 8px 12px;`).
- **Modals & Overlays**:
  - Max width constrained logically (`max-width: 600px` for simple forms, `850px` for complex multi-column dialogs).
  - Esc key to close, backdrop click dismissal, autofocus on first relevant input.
- **Mobile Touch Targets**:
  - Touch targets for buttons and interactive controls on mobile/PWA must be at least `44x44px`.
  - Use flexible grid/flexbox layouts (`flex-wrap: wrap`, `grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))`).

---

## 4. Intentional Microcopy & UX States
- **Action-Oriented Verbs**:
  - Never use vague labels like "Enviar", "Aceptar", or "Click aquí".
  - Use explicit, context-rich labels: *"Emitir Factura"*, *"Generar Cotización DOCX"*, *"Registrar Dosis 4mg"*, *"Descargar Respaldo DB"*.
- **State Feedback**:
  - Always show visual feedback on async operations: disable submit button and show spinner or loading state during backend Eel calls.
  - Display clear, non-intrusive toast notifications on success or failure.

---

## 5. Invariant Rule for Nicole
- **Asset Cache Invalidation**:
  Whenever modifying `web/css/style.css` or `web/js/app.js`, you **MUST increment the query parameter version** in `web/index.html`:
  ```html
  <link rel="stylesheet" href="css/style.css?v=23">
  <script src="js/app.js?v=23"></script>
  ```
  Failing to bump `?v=XX` causes desktop and mobile browsers to serve stale cached assets.
