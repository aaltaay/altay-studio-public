# Platform Gotchas

A condensed log of the most instructive production incidents from building this multi-tenant provisioning platform, trimmed from the full internal `AGENTS.md` history for public readability. Each one reflects a real root cause and fix, not a hypothetical.

1. **Framework detection must be per-business-type, not hardcoded.** Vercel builds for `template-clinic` (Vite) failed with "No Next.js version detected" because the provisioning engine hardcoded `framework: "nextjs"` after migrating `template-barber` to Next.js. Fixed by resolving the Vercel `framework` value from the business type instead of a global constant.

2. **Dual environment variable injection for legacy + current stacks.** Vercel builds failed with "Missing Supabase environment variables" because the engine only injected `VITE_*` vars while the Next.js template read `NEXT_PUBLIC_*`. The provisioning engine now injects both prefixes for every deploy, keeping older Vite-based tenants working alongside the current Next.js architecture.

3. **Private shared packages need a GitHub Packages alias, not a `file:` path.** A shared UI/engine package (`@altaystudio/core`) referenced via `file:../altaystudio-core` broke on Vercel with `ERR_MODULE_NOT_FOUND`, since local file paths don't exist on a fresh CI checkout. Fixed by publishing to GitHub Packages and importing through an npm alias (`"@altaystudio/core": "npm:@scope/altaystudio-core@^x"`), plus removing stale lockfiles that had baked in the old local path.

4. **Tailwind must scan compiled dependency output, not just local source.** Tenant sites rendered as unstyled HTML because Tailwind's `content` globs only covered `./src/**`, tree-shaking away every class used inside the shared component package living in `node_modules`. Fixed by adding the package's `dist` output to the Tailwind content array.

5. **ESM `package.json` + CJS build tooling config is a common silent-failure combo.** With `"type": "module"` set, PostCSS silently failed to load a CommonJS Tailwind config, leaving raw `@tailwind` directives in the shipped CSS. The fix is an ESM PostCSS config (`postcss.config.mjs`) paired with a CJS Tailwind config (`tailwind.config.cjs`) — mixing the wrong pair breaks the build without an obvious error.

6. **Per-tenant config must be written into the generated repo, not just injected as env vars.** Every provisioned tenant looked identical despite having distinct configuration in the database, because the engine never wrote `tenant.config.json` into the new GitHub repo — every clone inherited the template's default file. Env vars alone weren't a complete substitute for a config file baked into the repo.

7. **PostgREST schema exposure must be additive, never a full overwrite.** Newly provisioned tenant schemas need to be appended to the `authenticator` role's `pgrst.db_schemas` setting so PostgREST can serve them. A naive read using `current_setting()` from an edge function context returned `null` (wrong role), which led to an overwrite that deleted every other tenant's schema from the exposed list. The fix reads the setting from `pg_db_role_setting` for the correct role and only ever appends.

8. **Never expose `vector()` columns in a schema PostgREST introspects.** Adding pgvector columns and HNSW indexes to a tenant table that PostgREST was scanning made the schema-cache rebuild query so expensive it hung indefinitely — taking down API access for every tenant on the platform simultaneously. Vector operations for agent memory now go through a direct Postgres connection instead of being exposed via the REST API.

9. **Direct Postgres connections from Windows dev machines can fail on IPv6 routing.** Scripts using a direct driver connection intermittently failed with DNS/`ENOTFOUND` errors because Windows attempted to route the connection over IPv6. The workaround is to generate SQL as a file and execute it through the hosted platform's CLI/Management API rather than connecting directly.

10. **Bypassing the real auth flow for an admin panel breaks server-side auth checks.** An admin dashboard that used a local UI flag to represent "logged in" sent unauthenticated requests to backend functions that required a real user session, failing with silent 401s. The fix was wiring the login form to the actual auth provider's sign-in call so a valid session token is always attached to privileged requests.
