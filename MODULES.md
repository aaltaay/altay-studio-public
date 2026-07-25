# Altay Studio — Modular Template Architecture

> **For AI Agents**: Read this file to understand how the module system works before making any changes to templates or provisioning logic.

---

## How It Works (TL;DR)

Every business website deployed by Altay Studio runs from the **same template codebase**. The difference between Barber A (booking + gallery + staff) and Barber B (booking only) is a JSON config blob — not different code.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Barber A       │     │   Barber B       │     │   Restaurant C   │
│ booking: ✅      │     │ booking: ✅      │     │ menu: ✅         │
│ gallery: ✅      │     │ gallery: ❌      │     │ ordering: ✅     │
│ staff: ✅        │     │ staff: ❌        │     │ reservations: ✅ │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌────────────────────────────────────────────────────────────────┐
│              SAME TEMPLATE CODEBASE                             │
│  src/modules/booking/   src/modules/gallery/   src/modules/...  │
│  src/lib/features.ts    src/components/FeatureGate.tsx           │
└────────────────────────────────────────────────────────────────┘
```

---

## The Three Layers

### Layer 1: Tenant Config (per business)

A JSON blob stored in `public.businesses.tenant_config` and injected as `VITE_TENANT_CONFIG` at deploy time.

```json
{
  "features": {
    "booking_calendar": { "enabled": true, "required": true },
    "gallery":          { "enabled": true },
    "staff_profiles":   { "enabled": false },
    "reviews":          { "enabled": false },
    "contact_form":     { "enabled": true }
  },
  "pages": ["home", "booking", "gallery", "contact"],
  "theme": {
    "primary_color": "#2D3A2E",
    "accent_color": "#F5A623",
    "font_heading": "Playfair Display",
    "font_body": "Inter",
    "hero_layout": "split",
    "border_radius": "rounded",
    "button_style": "filled"
  }
}
```

### Layer 2: Feature Registry (shared modules)

Each module is a self-contained directory inside `src/modules/`:

```
src/modules/booking/
  ├── BookingCalendar.tsx    ← main component
  ├── TimeSlotPicker.tsx     ← sub-component
  ├── useBooking.ts          ← data hook
  └── index.ts               ← public exports
```

**CRITICAL RULE**: Modules can NEVER import from or reference each other. They only know about:
- The core config (`src/lib/features.ts`)
- Shared UI components (`src/components/ui/`)
- The Supabase client (`src/lib/supabase.ts`)

This isolation guarantees that disabling a module cannot break any other module.

### Layer 3: Shared Core (always on)

- Auth (Supabase)
- Theming (CSS variables driven by config)
- Routing (auto-generated from active pages)
- Supabase client (schema-targeted)
- SEO defaults

---

## Template Contract

Every template repository MUST include:

| File | Purpose |
|---|---|
| `altay.config.json` | Declares supported features, defaults, required env vars, build config |
| `supabase/schema.sql` | Full database schema (all modules) |
| `src/lib/supabase.ts` | Dynamic Supabase client (schema-neutral) |
| `src/lib/features.ts` | Feature gate utilities (reads VITE_TENANT_CONFIG) |
| `src/components/FeatureGate.tsx` | Conditional renderer component |
| `vercel.json` | SPA routing rewrites |
| `.env.example` | Documents all required VITE_ env vars |

### `altay.config.json` Schema

```json
{
  "name": "barber",
  "version": "1.0.0",
  "display_name": "Barber Shop",
  "framework": "vite",
  "build_command": "npm run build",
  "output_directory": "dist",
  "features": {
    "feature_key": {
      "label": "Human-readable name",
      "description": "What this feature does",
      "required": false,
      "default_enabled": true,
      "db_tables": ["tables_this_feature_needs"],
      "components": ["ComponentNames"],
      "routes": ["/route-paths"]
    }
  },
  "env_vars": ["VITE_SUPABASE_URL", "VITE_TENANT_CONFIG", "..."]
}
```

---

## FeatureGate Usage

```tsx
import { FeatureGate } from "./components/FeatureGate";

// Only renders if "gallery" is enabled in tenant config
<FeatureGate feature="gallery">
  <Gallery />
</FeatureGate>

// With fallback
<FeatureGate feature="reviews" fallback={<p>Reviews coming soon</p>}>
  <ReviewList />
</FeatureGate>
```

When `VITE_TENANT_CONFIG` is absent (e.g., legacy sites), all features default to ON. This ensures backward compatibility.

---

## Provisioning Flow (How Config Gets to the Site)

1. User submits signup form → selects features via toggles
2. `provision-client` Edge Function builds `tenant_config` JSON
3. Config stored in `businesses.tenant_config` (source of truth)
4. Config injected as `VITE_TENANT_CONFIG` Vercel env var (stringified JSON)
5. Template reads `VITE_TENANT_CONFIG` at build time via `features.ts`
6. `FeatureGate` components conditionally render enabled modules

---

## Theme System (How Sites Look Different)

Two independent concerns:
- **What exists** = features/modules (toggled via `features` in config)
- **How it looks** = theme (colors, fonts, layout variants via `theme` in config)

Theme values become CSS custom properties at the layout level:

```css
:root {
  --primary: var(--tenant-primary, #3B82F6);
  --font-heading: var(--tenant-font-heading, 'Inter');
  --border-radius: var(--tenant-border-radius, 0.5rem);
}
```

Same module, completely different look per tenant.

---

## Phase 3: Core Library Extraction (Completed)

We have successfully extracted the shared module infrastructure into a private npm package: `@altaystudio/core`.

Each tenant (e.g. `template-barber`) is now an extremely lightweight Next.js (App Router) repository with just config, assets, and overrides.

### The Consumer Override Mechanism
Tenants can override ANY core component, page, or module by placing a file with the exact same path inside their `custom/` directory.
For example, to override `@altaystudio/core/src/components/Navbar.tsx`, create `custom/components/Navbar.tsx` in the tenant repository.

This is powered by a custom Webpack plugin (`withAltayCore` exposed from `@altaystudio/core/config`) which intercepts imports at build time, ensuring strict SSR boundaries without runtime hydration issues.

### Automated Updates
Renovate Bot is configured in every tenant repo (`renovate.json`) to automatically merge patch and minor updates to `@altaystudio/core`.
One bug fix = one commit = all tenants updated automatically.

### The Escape Hatch (`altay-eject`)
If a tenant outgrows the factory model, they can fully decouple from the platform. By running `npx altay-eject` inside their repository, the script:
1. Copies all core source code into the local repository.
2. Intelligently merges their `custom/` overrides over the core defaults.
3. Rewrites all import paths.
4. Cleans up `package.json` and `next.config.mjs`.

See `gemini.md` for full architectural context.
