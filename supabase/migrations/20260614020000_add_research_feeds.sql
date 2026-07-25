-- Migration: Add Research Feeds table for Clay and other lead sources
SET search_path TO "schema_crm";

CREATE TABLE IF NOT EXISTS research_feeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'clay' CHECK (type IN ('clay', 'scraper', 'apify', 'n8n', 'zapier', 'webhook')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error')),
  cadence TEXT NOT NULL DEFAULT 'manual' CHECK (cadence IN ('manual', 'hourly', 'daily', 'weekly', 'monthly')),
  search_brief TEXT,
  segment TEXT DEFAULT 'mep',
  tier_default INTEGER DEFAULT 2 CHECK (tier_default IN (1, 2, 3)),
  geography TEXT,
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ,
  imported_count INTEGER DEFAULT 0,
  error_message TEXT,
  webhook_secret TEXT NOT NULL DEFAULT substring(md5(random()::text) from 1 for 16),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add feed_id to target_accounts to link back to the research feed
ALTER TABLE target_accounts ADD COLUMN IF NOT EXISTS feed_id UUID REFERENCES research_feeds(id) ON DELETE SET NULL;

-- Enable Row Level Security
ALTER TABLE research_feeds ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage research feeds" ON research_feeds FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Grant permissions to authenticated and service role
GRANT ALL ON research_feeds TO authenticated, service_role;
