# Altay Studio: Platform Architecture & Invariants

This document serves as the immutable "Constitution" of the Altay Studio control plane. The infrastructure detailed below **must never be altered** unless a massive, coordinated refactor occurs across the Database, Edge Functions, and Headless Blocks.

## 1. Architectural History: Why Headless Blocks?
Historically, Altay Studio relied on a **Monolithic Template Architecture** (Phase 2). We copied massive, bloated template repositories and toggled features on/off via a massive `tenant_config` JSON blob. This approach failed at scale because:
1. **AI Token Limits:** Passing the entire bloated monolithic UI structure to AI agents to generate custom styles was too expensive and exceeded context windows.
2. **Technical Debt:** Unused code was deployed to every client.
3. **Rigidity:** It was impossible to build truly bespoke UI skins without breaking the shared generic components.

**The Solution:** We transitioned to the **Headless Block Architecture**. Every feature (Booking Calendar, Lead Gen, etc.) is now decentralized into isolated `blocks/`.
- `schema.sql`: Contains the database plumbing.
- `engine.ts`: Contains the headless business logic and state management.
- `instructions.md`: The exact prompt passed to the AI to generate a highly bespoke, low-token UI "Skin" for that specific tenant.

By keeping the control plane lightweight and relying on AI composition, we achieve infinite scalability.

---

## 2. The Database Multi-Tenant Schema Model
Altay Studio uses a single, master Supabase PostgreSQL database to host hundreds of isolated tenant sites.

### The Immutable Rules:
1. **Schema per Tenant:** Every client is completely isolated into their own schema named `schema_{slug}` (e.g., `schema_ahmiclinic`).
2. **Hub vs Tenant Data:**
    - The `public` schema is reserved **exclusively** for the Control Plane (the `businesses` table, admin profiles). Tenant data NEVER enters `public`.
    - Tenant data is strictly contained within their respective `schema_{slug}` schemas.
3. **Row Level Security (RLS) Configuration:**
    - RLS is applied *within* the schema.
    - PostgREST exposes the schema via the `pgrst.db_schemas` configuration. 
    - **CRITICAL WARNING**: When exposing a new schema to PostgREST, you must query the existing comma-separated list of schemas assigned to the `authenticator` role and append to it. Overwriting the list will destroy API access for all other active tenants.
4. **No Global Schema Fallbacks:** Never hardcode a schema in the code. The schema must always be dynamically injected at build-time via `VITE_DB_SCHEMA` (or Next.js equivalent) and passed into the Supabase JS client instantiation.

---

## 3. The 7-Step Provisioning Pipeline
Every time a client is launched, the `provision-client` Edge Function executes this exact pipeline sequentially. Getting the order wrong guarantees a rollback failure.

1. **AUTHENTICATE:** Verify the user's JWT via `supabase.auth.getUser(token)`.
2. **DB RECORD (INIT):** Insert into `public.businesses` with the status set to `in_progress`.
3. **DB SCHEMA:** Create a new Postgres schema (`schema_{slug}`) and execute the chosen Template Contract's `schema.sql`.
4. **GITHUB REPO:** Call the GitHub Generate API to clone the Template Contract into a new private repo named `{slug}-site`. Wait 3 seconds for async creation.
5. **INJECT CONFIG:** Programmatically PUT tenant-specific configuration via the GitHub Contents API to overwrite defaults.
6. **VERCEL PROJECT:** Call the Vercel API to create a new project linked to the GitHub repo, heavily injecting all environment variables (especially `VITE_DB_SCHEMA` and `NPM_TOKEN`).
7. **CLOUDFLARE DNS:** No per-client API calls needed due to a global wildcard CNAME (`*.altaystudio.com`).

---

## 4. Mandatory SEO & Discoverability
Every headless block and every tenant site MUST implement the following SEO baseline:

- **`robots.txt` & Sitemaps:** Sitemaps must be dynamically generated based on the client's active pages.
- **`llms.txt`:** All sites must expose a standard `/llms.txt` file at the root to ensure optimal parsing by AI web crawlers (ChatGPT, Perplexity, Claude).
- **Semantic HTML:** Heavy usage of `<nav>`, `<article>`, `<section>`, and strict `h1`-`h6` hierarchies.
- **Unique IDs:** All interactive elements must possess unique, descriptive IDs for both accessibility and automated E2E testing frameworks.
