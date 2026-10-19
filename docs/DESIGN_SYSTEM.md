# Design System Specification
> **Theme:** Minimalist Matte Studio (#151515 Dark & Clean Neutral Light)  
> **Typography:** Space Grotesk (Display / Headings) + Inter (Sans / Body)
> **Version:** 2.5 — Refined palette (Linear / Vercel devtool standard)

---

## 1. Typography

| Role | Font Family | Variable | Weights | Used For |
| :--- | :--- | :--- | :--- | :--- |
| **Display / Headings** | **Space Grotesk** | `--font-display` / `--font-space-grotesk` | `500`, `600`, `700` | `h1`–`h6`, hero titles, brand logo |
| **Body / Sans** | **Inter** | `--font-sans` / `--font-inter` | `400`, `500`, `600` | Body text, labels, buttons, nav, badges |

---

## 2. Color Palette & Design Tokens (v2.5)

### Philosophy
- **Dark mode**: Pure matte `#151515` canvas with calibrated `#1c1c1c` card elevation, neutral `#282828` borders, and high-contrast `#f4f4f5` text. Zero muddy green tints.
- **Light mode**: Crisp `#fafafa` canvas with pure white `#ffffff` cards and neutral `#e5e7eb` borders.
- **Accents**: Semantic green (`#22c55e` / emerald) is reserved strictly for operational states (active database connection status, online API ping). Column types, filters, and standard tags use neutral outline/secondary chips.
- **Radiuses**: Precise, professional developer tool radiuses (`--radius: 0.375rem` / 6px) — `rounded-lg` (8px) for containers/cards, `rounded-md` (6px) for buttons/inputs, `rounded-sm` (4px) for badges and inner controls.

### Token Mapping

| CSS Token | Light Mode | Dark Mode | Description |
| :--- | :--- | :--- | :--- |
| `--background` | `#fafafa` | `#151515` | Main page canvas |
| `--foreground` | `#111827` | `#f4f4f5` | Primary text |
| `--card` | `#ffffff` | `#1c1c1c` | Card / modal surface |
| `--card-foreground` | `#111827` | `#f4f4f5` | Text inside cards |
| `--muted` | `#f3f4f6` | `#242424` | Hover fills, table stripes, secondary bg |
| `--muted-foreground` | `#6b7280` | `#9ca3af` | Secondary text, captions |
| `--border` | `#e5e7eb` | `#282828` | Card borders, dividers |
| `--input` | `#e5e7eb` | `#282828` | Form input borders |
| `--primary` | `#111827` | `#f4f4f5` | High-contrast action foreground |
| `--primary-foreground` | `#ffffff` | `#151515` | Text on primary buttons |
| `--primary-glow` | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.12)` | Subtle ambient highlights |
| `--secondary` | `#f3f4f6` | `#242424` | Secondary buttons / surfaces |
| `--secondary-foreground` | `#111827` | `#f4f4f5` | Text on secondary elements |
| `--accent` | `#f3f4f6` | `#242424` | Active chip fill |
| `--accent-foreground` | `#111827` | `#ffffff` | Text on active chips |
| `--destructive` | `#dc2626` | `#ef4444` | Error / danger states |
| `--destructive-foreground` | `#ffffff` | `#ffffff` | Text on destructive |
| `--success` | `#16a34a` | `#22c55e` | Success states |
| `--success-foreground` | `#ffffff` | `#ffffff` | Text on success |
| `--warning` | `#d97706` | `#f59e0b` | Warning states |
| `--warning-foreground` | `#ffffff` | `#ffffff` | Text on warning |
| `--ring` | `#111827` | `rgba(255,255,255,0.25)` | Focus outline ring |
| `--radius` | `0.375rem` | `0.375rem` | Base border radius (6px) |
| `--sidebar` | `#f8f9fa` | `#121212` | Navigation sidebar background |
| `--sidebar-border` | `#e5e7eb` | `#242424` | Navigation sidebar border |

---

## 3. Component Styling Rules

### A. Cards & Panels
```tsx
className="relative rounded-lg border border-border bg-card p-5 transition-all duration-150 shadow-xs"
```

### B. Navigation / Sticky Header (Glassmorphism)
```tsx
className="fixed top-0 left-0 right-0 z-50 border-b border-border backdrop-blur-xl"
style={{ backgroundColor: "color-mix(in srgb, var(--background) 80%, transparent)" }}
```

### C. Badges / Tech Chips (Pills)
```tsx
className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground transition-all duration-200 hover:border-primary/40 hover:text-foreground"
```

### D. Primary Action Button
```tsx
className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:opacity-90 active:scale-95 btn-glow"
```

### E. Secondary Button
```tsx
className="inline-flex items-center justify-center rounded-xl border border-border bg-secondary px-5 py-2.5 text-sm font-semibold text-secondary-foreground transition-all hover:bg-muted hover:border-primary/40"
```

---

## 4. Dark Mode Elevation Ladder

| Layer | Token | Dark Value | Light Value | Used For |
| :--- | :--- | :--- | :--- | :--- |
| Floor (canvas) | `--background` | `#0f1015` | `#f5f5f6` | Page background |
| Raised (surface) | `--card` | `#17181f` | `#ffffff` | Cards, modals, dropdowns |
| High (overlay) | `--muted` | `#21222b` | `#ebebed` | Hover states, sidebars, inputs |

Depth is communicated by **luminance shift**, not drop shadows.

---

## 5. WCAG 2.2 Contrast Audit

| Combination | Ratio | Grade |
| :--- | :--- | :--- |
| `--foreground` on `--background` (light) | **19.5:1** | ✅ AAA |
| `--foreground` on `--background` (dark) | **15.8:1** | ✅ AAA |
| `--muted-foreground` on `--card` (light) | **5.0:1** | ✅ AA |
| `--muted-foreground` on `--card` (dark) | **4.8:1** | ✅ AA |
| `--primary` on `--card` (light, `#7c3aed`) | **4.6:1** | ✅ AA |
| `--primary` on `--background` (dark, `#8b5cf6`) | **5.8:1** | ✅ AA |
| `--accent-foreground` on `--accent` (light) | **6.1:1** | ✅ AA+ |
| `--accent-foreground` on `--accent` (dark) | **7.4:1** | ✅ AAA |
| White on `--primary` button (light `#7c3aed`) | **5.2:1** | ✅ AA |
| White on `--primary` button (dark `#8b5cf6`) | **4.8:1** | ✅ AA |
