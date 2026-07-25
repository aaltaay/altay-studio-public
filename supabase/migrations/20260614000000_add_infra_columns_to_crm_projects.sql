-- Add infrastructure columns to schema_crm.projects
-- These columns link CRM projects to the Altay Studio provisioning infrastructure
-- (GitHub repo, Vercel project, database schema, subdomain)
-- 
-- NOTE: These columns may already exist in production (added manually).
-- IF NOT EXISTS ensures this migration is idempotent.

SET search_path TO "schema_crm";

-- business_id links back to the provisioned business record
ALTER TABLE projects ADD COLUMN IF NOT EXISTS business_id UUID;

-- Infrastructure fields populated by the provisioning engine
ALTER TABLE projects ADD COLUMN IF NOT EXISTS github_repo TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS vercel_project_id TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS schema_name TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS subdomain TEXT;
