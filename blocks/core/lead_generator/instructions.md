# Lead Generator Block Instructions

When instructed to "Add a Lead Generator" or "Add a Contact Form" to a client repository:

1. **Deploy Logic:**
   - Ensure the `leads` table exists in the tenant's schema by running `blocks/lead_generator/schema.sql`.
   - Copy `blocks/lead_generator/engine.ts` into `src/hooks/useLeadGenerator.ts` in the client's repository.

2. **Generate UI (The Skin):**
   - Create a bespoke UI component (e.g., `src/components/LeadCapture.tsx`).
   - Import `useLeadGenerator` from `src/hooks/useLeadGenerator.ts`.
   - *Do not add raw fetch/Supabase calls in the UI component.* All state (loading, error, success) and submission logic MUST be handled by the hook.
   - Wire your bespoke form inputs to a local React state, and pass them to `submitLead({ name, email, phone, message })` `onSubmit`.
   - Style the form completely uniquely using Tailwind CSS, ensuring it matches the tenant's exact aesthetic (colors, fonts, dark/light mode from `tenant.config.json`).
   - Render the `loading` state (e.g. spinning button) and `error`/`success` states gracefully.

3. **Admin Integration:**
   - Add a Data Table or Kanban board to the `/admin` route that fetches from `leads` to let the business owner manage submissions.
