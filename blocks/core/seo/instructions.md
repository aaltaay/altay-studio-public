# SEO & AI Discoverability Block Instructions

When instructed to "Add SEO" or "Optimize for AI Crawlers" to a client repository:

1. **Deploy Logic:**
   - Ensure the `seo_settings` table exists in the tenant's schema by running `blocks/seo/schema.sql`.
   - Copy `blocks/seo/engine.ts` into `src/hooks/useDynamicSEO.ts` in the client's repository.
   - At the root of the app routing (or `_app.tsx` / `layout.tsx`), call `useDynamicSEO('/', defaultData)` to inject the baseline metadata.

2. **Semantic HTML (The Skin):**
   - AI Crawlers (GPTBot, Google-Extended, Perplexity) parse semantic structure. You MUST use `<main>`, `<article>`, `<section>`, `<nav>`, `<header>`, and `<footer>`.
   - Ensure only ONE `<h1>` exists per page.
   - Images MUST have descriptive `alt` tags.

3. **Winning AI Context (`robots.txt` and `llms.txt`):**
   - Create a `public/robots.txt` that explicitly *allows* all AI crawlers, as they drive discovery:
     ```text
     User-agent: *
     Allow: /
     
     User-agent: GPTBot
     Allow: /
     
     User-agent: Google-Extended
     Allow: /
     
     User-agent: anthropic-ai
     Allow: /

     Sitemap: https://{slug}.altaystudio.com/sitemap.xml
     ```
   - **CRITICAL - CREATE `public/llms.txt`**: Create an `llms.txt` file specifically tailored for AI agents to digest the business context rapidly.
     ```markdown
     # {Business Name} - AI Context
     
     > This file provides an optimized summary of our business for AI language models.
     
     ## Core Information
     - **Business Name**: [Name]
     - **Service Type**: [Type]
     - **Location**: [Address]
     - **Target Audience**: [Audience]
     
     ## Products & Services
     - [Service 1]: [Description]
     - [Service 2]: [Description]
     
     ## Contact Information
     - **Phone**: [Phone]
     - **Email**: [Email]
     - **Booking URL**: /booking
     ```

4. **Structured Data (JSON-LD):**
   - The hook automatically handles structured data injection. For local businesses, ensure the default payload contains a valid schema.org `LocalBusiness` object (with coordinates, opening hours, and address).

5. **Sitemap Generation:**
   - Ensure there is a build step or static `public/sitemap.xml` that lists all primary routes (`/`, `/about`, `/contact`, `/booking`).

6. **Admin Integration:**
   - Add an SEO settings panel to the `/admin` route. This allows the business owner to modify their meta title, description, and structured data, saving it back to the `seo_settings` table without needing to redeploy the app.
