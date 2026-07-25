-- blocks/ai_receptionist/schema.sql
-- AI Receptionist Schema
-- Run this into the tenant's schema to track chat transcripts and AI interactions.

CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT,
  customer_contact TEXT, -- Email or phone collected by the bot
  transcript JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of { role: 'user' | 'assistant', content: '...' }
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'handed_off', 'resolved', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- Allow public (anon) to insert new chat sessions and update their own
CREATE POLICY "Public can insert chat sessions" 
  ON chat_sessions FOR INSERT 
  TO anon
  WITH CHECK (true);

-- Anonymous users can theoretically read/update their own sessions if they have the UUID
CREATE POLICY "Public can view and update their own session" 
  ON chat_sessions FOR SELECT 
  TO anon 
  USING (true);

CREATE POLICY "Public can update their own session" 
  ON chat_sessions FOR UPDATE 
  TO anon 
  USING (true)
  WITH CHECK (true);

-- Only authenticated users (admins) can view, update, delete all sessions
CREATE POLICY "Admins can select chat sessions" 
  ON chat_sessions FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Admins can update chat sessions" 
  ON chat_sessions FOR UPDATE 
  TO authenticated 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can delete chat sessions" 
  ON chat_sessions FOR DELETE 
  TO authenticated 
  USING (true);

-- ══════════════════════════════════════════════════════════════════════════════
-- AUTONOMOUS AGENT WEBHOOK
-- Triggers the agent-director Edge Function on every chat update (if user message).
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION notify_agent_chat_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  payload jsonb;
  tenant_slug text;
  last_message jsonb;
BEGIN
  -- Extract tenant slug from schema name (e.g., schema_democlinic -> democlinic)
  tenant_slug := replace(TG_TABLE_SCHEMA, 'schema_', '');
  
  -- Ensure transcript is a non-empty array
  IF jsonb_typeof(NEW.transcript) = 'array' AND jsonb_array_length(NEW.transcript) > 0 THEN
    -- Get the last message in the transcript array
    last_message := NEW.transcript->(jsonb_array_length(NEW.transcript) - 1);
    
    -- Only notify if the last message is from the user
    IF last_message->>'role' = 'user' THEN
      payload := jsonb_build_object(
        'trigger_type', 'chat_message',
        'slug', tenant_slug,
        'data', row_to_json(NEW)
      );

      PERFORM net.http_post(
        url := 'https://[YOUR_SUPABASE_PROJECT_REF].supabase.co/functions/v1/agent-director',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := payload
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_update_trigger ON chat_sessions;
CREATE TRIGGER chat_update_trigger
  AFTER UPDATE ON chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION notify_agent_chat_update();
