-- Account-based lead radar tables for target accounts, contacts, touchpoints,
-- and signals. These live in the tenant CRM schema beside clients/projects.

SET search_path TO "schema_crm";

CREATE TABLE IF NOT EXISTS target_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  segment TEXT DEFAULT 'mep',
  tier INTEGER DEFAULT 2 CHECK (tier IN (1, 2, 3)),
  status TEXT DEFAULT 'untouched' CHECK (status IN ('untouched', 'engaging', 'active', 'opportunity', 'cold', 'won')),
  website TEXT,
  location TEXT,
  reasoning TEXT,
  owner TEXT DEFAULT 'Ahmi',
  last_touched_at TIMESTAMPTZ,
  source TEXT DEFAULT 'manual',
  external_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS account_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES target_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('champion', 'dm', 'user', 'blocker')),
  email TEXT,
  phone TEXT,
  linkedin TEXT,
  source TEXT DEFAULT 'manual',
  external_id TEXT,
  last_touched_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS account_touchpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES target_accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES account_contacts(id) ON DELETE SET NULL,
  channel TEXT DEFAULT 'note' CHECK (channel IN ('email', 'call', 'linkedin', 'event', 'demo', 'note')),
  direction TEXT DEFAULT 'out' CHECK (direction IN ('in', 'out')),
  notes TEXT NOT NULL,
  outcome TEXT DEFAULT 'logged',
  at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS account_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES target_accounts(id) ON DELETE SET NULL,
  kind TEXT DEFAULT 'news' CHECK (kind IN ('job_post', 'news', 'funding', 'conference', 'referral', 'website_visit', 'stale_touch', 'quote_intent', 'apollo')),
  summary TEXT NOT NULL,
  source_url TEXT,
  reviewed BOOLEAN DEFAULT false,
  reviewed_at TIMESTAMPTZ,
  action_taken TEXT,
  confidence INTEGER DEFAULT 70 CHECK (confidence >= 0 AND confidence <= 100),
  source TEXT DEFAULT 'manual',
  external_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS target_accounts_status_idx ON target_accounts(status);
CREATE INDEX IF NOT EXISTS target_accounts_tier_idx ON target_accounts(tier);
CREATE INDEX IF NOT EXISTS account_contacts_account_id_idx ON account_contacts(account_id);
CREATE INDEX IF NOT EXISTS account_touchpoints_account_id_at_idx ON account_touchpoints(account_id, at DESC);
CREATE INDEX IF NOT EXISTS account_signals_reviewed_at_idx ON account_signals(reviewed, at DESC);
CREATE INDEX IF NOT EXISTS account_signals_account_id_idx ON account_signals(account_id);

ALTER TABLE target_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_touchpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage target accounts" ON target_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can manage account contacts" ON account_contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can manage account touchpoints" ON account_touchpoints FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can manage account signals" ON account_signals FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT USAGE ON SCHEMA schema_crm TO authenticated, service_role;
GRANT ALL ON target_accounts TO authenticated, service_role;
GRANT ALL ON account_contacts TO authenticated, service_role;
GRANT ALL ON account_touchpoints TO authenticated, service_role;
GRANT ALL ON account_signals TO authenticated, service_role;
