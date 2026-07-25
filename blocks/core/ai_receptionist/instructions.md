# AI Receptionist Block Instructions

When instructed to "Add an AI Receptionist" or "Add a Chat Bot" to a client repository:

1. **Deploy Logic:**
   - Ensure the `chat_sessions` table exists in the tenant's schema by running `blocks/ai_receptionist/schema.sql`.
   - Copy `blocks/ai_receptionist/engine.ts` into `src/hooks/useAIReceptionist.ts` in the client's repository.
   - Note: The edge function `ai-receptionist-chat` must be deployed in the Supabase project to process actual AI responses. If it's missing, the hook will use a safe fallback.

2. **Generate UI (The Skin):**
   - Create a bespoke Chat Widget UI component (e.g., `src/components/AIChatWidget.tsx`).
   - Import `useAIReceptionist` from `src/hooks/useAIReceptionist.ts`.
   - Initialize the session using a `useEffect` that calls `initSession()` once when the chat widget is opened.
   - Map over the `messages` array to render bubbles for `'user'` and `'assistant'`.
   - Wire a text input and send button to `sendMessage(content)`.
   - Style the widget using Tailwind CSS, adhering strictly to the tenant's aesthetic (e.g., brand colors for user bubbles, glassmorphism, appropriate shadows).
   - Render the `loading` state using a subtle typing indicator ("...") when waiting for the AI response.

3. **Admin Integration:**
   - Add an inbox view to the `/admin` route that fetches from `chat_sessions`, allowing business owners to view raw transcripts or take over "handed_off" chats manually.
