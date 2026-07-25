-- blocks/core/crm_client_360/schema.sql
-- Client 360 CRM Schema (Production Ready)
-- Run this into the tenant's schema (e.g. schema_slug)

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact TEXT,
  email TEXT,
  phone TEXT,
  type TEXT,
  address TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'churned')),
  billing JSONB DEFAULT '{}'::jsonb, -- e.g. { method: 'ACH', rate: 125, terms: 'Net 15' }
  notes TEXT,
  since TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  template_id TEXT,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  due TEXT, -- Target completion date
  stage TEXT DEFAULT 'Kickoff', -- 'Kickoff', 'Design', 'Build', 'Review', 'Live', 'On hold'
  updated TEXT, -- Relative time updated label
  -- Infrastructure fields (populated by Altay Studio provisioning engine)
  business_id UUID,         -- Links back to the provisioned business record
  github_repo TEXT,         -- e.g. "aaltaay/ahmiclinic-site"
  vercel_project_id TEXT,   -- Vercel project ID for deployment management
  schema_name TEXT,         -- e.g. "schema_ahmiclinic" — tenant database schema
  subdomain TEXT,           -- e.g. "ahmiclinic.altaystudio.com"
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tasks table for Kanban boards
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  linked_id UUID,
  linked_name TEXT,
  linked_type TEXT CHECK (linked_type IN ('client', 'lead', 'project')),
  due_date TEXT,
  done BOOLEAN DEFAULT false,
  stage TEXT DEFAULT 'To do', -- 'To do', 'In progress', 'Review', 'Add to Invoice'
  priority TEXT DEFAULT 'med', -- 'low', 'med', 'high'
  page TEXT DEFAULT '—', -- Specific page/module link
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create activities table for audit trail
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT CHECK (type IN ('call', 'email', 'meeting', 'note')),
  text TEXT NOT NULL,
  linked_id UUID,
  linked_name TEXT,
  linked_type TEXT CHECK (linked_type IN ('client', 'lead')),
  ts TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Admins RLS Policies
CREATE POLICY "Admins can manage clients" ON clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can manage projects" ON projects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can manage tasks" ON tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can manage activities" ON activities FOR ALL TO authenticated USING (true) WITH CHECK (true);