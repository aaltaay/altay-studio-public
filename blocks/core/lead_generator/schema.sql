-- blocks/core/lead_generator/schema.sql
-- Lead Generator Schema (Production Ready)
-- Run this into the tenant's schema (e.g. schema_slug)

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- Business or Lead name
  contact TEXT,       -- Contact person name
  email TEXT,
  phone TEXT,
  address TEXT,
  source TEXT,        -- Referral, Ads, Cold call, etc.
  type TEXT,          -- Restaurant, Barber, Contractor, etc.
  value INTEGER DEFAULT 0, -- Deal value in USD
  status TEXT DEFAULT 'New', -- 'New', 'Contacted', 'Quoted', 'Won', 'Lost'
  outcome TEXT,       -- 'Won' / 'Lost' outcome log
  reason TEXT,        -- Reason for lost outcome
  hot BOOLEAN DEFAULT false,
  message TEXT,       -- Freeform query message
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Allow public (anon) to insert leads
CREATE POLICY "Public can insert leads" 
  ON leads FOR INSERT 
  TO anon
  WITH CHECK (true);

-- Only authenticated users (admins) can view, update, delete
CREATE POLICY "Admins can select leads" 
  ON leads FOR SELECT 
  TO authenticated 
  USING (true);

-- Admins can update leads (for Kanban transitions)
CREATE POLICY "Admins can update leads" 
  ON leads FOR UPDATE 
  TO authenticated 
  USING (true)
  WITH CHECK (true);

-- Admins can delete leads
CREATE POLICY "Admins can delete leads" 
  ON leads FOR DELETE 
  TO authenticated 
  USING (true);

-- ══════════════════════════════════════════════════════════════════════════════
-- AUTONOMOUS AGENT WEBHOOK
-- Triggers the agent-director Edge Function on every new lead.
-- Requires pg_net extension to be enabled.
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION notify_agent_director()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  payload jsonb;
  tenant_slug text;
BEGIN
  -- Extract tenant slug from schema name (e.g., schema_democlinic -> democlinic)
  tenant_slug := replace(TG_TABLE_SCHEMA, 'schema_', '');
  
  payload := jsonb_build_object(
    'trigger_type', TG_TABLE_NAME || '_' || lower(TG_OP),
    'slug', tenant_slug,
    'data', row_to_json(NEW)
  );

  PERFORM net.http_post(
    url := 'https://[YOUR_SUPABASE_PROJECT_REF].supabase.co/functions/v1/agent-director',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := payload
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lead_insert_trigger ON leads;
CREATE TRIGGER lead_insert_trigger
  AFTER INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_agent_director();
